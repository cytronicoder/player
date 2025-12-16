import { app, BrowserWindow, ipcMain, dialog, protocol } from 'electron';
import * as path from 'path';
import * as fs from 'fs/promises';
import * as mm from 'music-metadata';
import { Playlist, Track } from '../shared/types';
import { v4 as uuidv4 } from 'uuid';

let mainWindow: BrowserWindow | null = null;

// Register custom protocol for media files
protocol.registerSchemesAsPrivileged([
  { scheme: 'media', privileges: { secure: true, supportFetchAPI: true, bypassCSP: true } }
]);

async function createWindow() {
  mainWindow = new BrowserWindow({
    width: 1200,
    height: 800,
    webPreferences: {
      preload: path.join(__dirname, 'preload.js'),
      nodeIntegration: false,
      contextIsolation: true,
    },
  });

  if (process.env.NODE_ENV === 'development') {
    // In development, expect a Vite dev server at localhost:5173 or 5174
    try {
      await mainWindow.loadURL('http://localhost:5173');
      console.log('[main] connected to renderer dev server at http://localhost:5173');
    } catch (e) {
      console.log('[main] Failed to load port 5173, trying 5174');
      try {
        await mainWindow.loadURL('http://localhost:5174');
        console.log('[main] connected to renderer dev server at http://localhost:5174');
      } catch (e2) {
        console.error('[main] Failed to load dev server URL', e2);
        dialog.showErrorBox('Dev Server Missing', 'Unable to load http://localhost:5173 or 5174. Start the renderer dev server (pnpm run dev) or run `pnpm run dev:all`.');
        app.quit();
      }
    }

    // Watch for renderer process crashes and offer a restart
    mainWindow.webContents.on('render-process-gone', (_event, details) => {
      console.error('Renderer process gone:', details);
      const choice = dialog.showMessageBoxSync(mainWindow!, {
        type: 'error',
        buttons: ['Restart', 'Quit'],
        defaultId: 0,
        cancelId: 1,
        title: 'Renderer crashed',
        message: 'The renderer process crashed. Would you like to restart the app?'
      });
      if (choice === 0) {
        app.relaunch();
        app.exit(0);
      } else {
        app.quit();
      }
    });

    return;
  }

  // Production: ensure built renderer exists before loading
  const indexPath = path.join(__dirname, '../renderer/index.html');
  try {
    await fs.access(indexPath);
    await mainWindow.loadFile(indexPath);

    // Watch for renderer process crashes in production as well
    mainWindow.webContents.on('render-process-gone', (_event, details) => {
      console.error('Renderer process gone:', details);
      dialog.showErrorBox('Renderer crashed', 'The renderer process crashed. Please restart the application.');
      app.quit();
    });
  } catch (e) {
    console.error('Renderer build not found at', indexPath, e);
    dialog.showErrorBox('Missing Renderer', 'Built renderer not found. Run `pnpm run build` to generate production files.');
    app.quit();
  }
}

app.whenReady().then(() => {
  // Register a file protocol so renderer can use media://local/path
  // This returns local filesystem paths directly, avoiding fetch errors
  console.log('[main] registering media:// file protocol');
  protocol.registerFileProtocol('media', (request, callback) => {
    try {
      const url = request.url;
      console.debug('[main] media request URL:', url);
      const filePath = decodeURIComponent(url.slice('media://'.length));
      console.debug('[main] media resolved path:', filePath);
      callback({ path: filePath });
    } catch (err) {
      console.error('[main] media protocol error', err);
      // -6 corresponds to net::ERR_FILE_NOT_FOUND
      callback({ error: -6 });
    }
  });

  createWindow();

  app.on('activate', () => {
    if (BrowserWindow.getAllWindows().length === 0) createWindow();
  });
});

app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') app.quit();
});

// IPC Handlers

ipcMain.handle('select-directory', async () => {
  const result = await dialog.showOpenDialog(mainWindow!, {
    properties: ['openDirectory']
  });
  return result.filePaths[0];
});

// Try to detect a default music folder in a few common locations
ipcMain.handle('find-default-music-folder', async () => {
  const candidates = [
    path.join(process.cwd(), 'music'),
    path.join(app.getAppPath(), 'music'),
    path.join(app.getPath('home'), 'Music')
  ];

  for (const c of candidates) {
    try {
      const stat = await fs.stat(c);
      if (stat && stat.isDirectory()) return c;
    } catch (e) {
      // ignore
    }
  }
  return null;
});

ipcMain.handle('scan-library', async (_, libraryPath: string) => {
  console.log(`[main] scan-library request for: ${libraryPath}`);
  if (!libraryPath) return [];
  
  const entries = await fs.readdir(libraryPath, { withFileTypes: true });
  const playlists: Playlist[] = [];

  for (const entry of entries) {
    if (entry.isDirectory()) {
      const folderPath = path.join(libraryPath, entry.name);
      console.debug(`[main] scanning folder: ${folderPath}`);
      const playlist = await parsePlaylistFolder(folderPath, entry.name);
      playlists.push(playlist);
    }
  }
  console.log(`[main] scan-library completed, found ${playlists.length} playlists`);
  return playlists;
});

async function parsePlaylistFolder(folderPath: string, folderName: string): Promise<Playlist> {
  const files = await fs.readdir(folderPath);
  const tracks: Track[] = [];
  let metadata: any = {};
  let coverImage: string | undefined;

  // Check for playlist.json
  if (files.includes('playlist.json')) {
    const content = await fs.readFile(path.join(folderPath, 'playlist.json'), 'utf-8');
    try {
      metadata = JSON.parse(content);
    } catch (e) {
      console.error(`Error parsing playlist.json in ${folderPath}`, e);
    }
  }

  // Check for cover image
  const imageFile = files.find(f => f.match(/^cover\.(jpg|png|jpeg)$/i));
  if (imageFile) {
    // store only filename so UI can compose media:// paths reliably
    coverImage = imageFile;
    console.debug(`[main] found cover image for ${folderName}: ${imageFile}`);
  }

  // Scan tracks
  for (const file of files) {
    if (file.match(/\.(mp3|flac|wav|ogg)$/i)) {
      const filePath = path.join(folderPath, file);
      console.debug(`[main] found track: ${filePath}`);
      // Basic track info, metadata parsing happens lazily or here
      tracks.push({
        id: uuidv4(),
        filename: file,
        path: filePath,
        format: path.extname(file).slice(1)
      });
    }
  }

  return {
    id: metadata.id || uuidv4(),
    title: metadata.title || folderName,
    description: metadata.description,
    coverImage,
    createdAt: metadata.createdAt || new Date().toISOString(),
    lastModified: metadata.lastModified || new Date().toISOString(),
    sortMode: metadata.sortMode || 'filename',
    loopDefault: metadata.loopDefault || false,
    path: folderPath,
    tracks
  };
}

const metadataCache = new Map<string, any>();

ipcMain.handle('read-metadata', async (_, filePath: string) => {
  console.log(`[main] read-metadata request for: ${filePath}`);
  if (metadataCache.has(filePath)) {
    console.debug(`[main] metadata cache HIT for: ${filePath}`);
    return metadataCache.get(filePath);
  }
  try {
    const metadata = await mm.parseFile(filePath);
    let picture: string | undefined;
    const pic = (metadata.common as any).picture && (metadata.common as any).picture[0];
    if (pic && pic.data) {
      picture = `data:${pic.format};base64,${(pic.data as Buffer).toString('base64')}`;
      console.debug(`[main] extracted picture for ${filePath} (bytes: ${pic.data.length})`);
    }

    const result = {
      title: metadata.common.title,
      artist: metadata.common.artist,
      album: metadata.common.album,
      trackNumber: metadata.common.track?.no,
      duration: metadata.format.duration,
      picture
    };
    metadataCache.set(filePath, result);
    console.log(`[main] read-metadata completed for: ${filePath} (duration: ${result.duration})`);
    return result;
  } catch (e) {
    console.error(`[main] Failed to read metadata for ${filePath}`, e);
    return {};
  }
});

ipcMain.handle('save-playlist-metadata', async (_, folderPath: string, metadata: any) => {
  await fs.writeFile(path.join(folderPath, 'playlist.json'), JSON.stringify(metadata, null, 2));
});

ipcMain.handle('rename-playlist', async (_, oldPath: string, newPath: string) => {
  await fs.rename(oldPath, newPath);
});
