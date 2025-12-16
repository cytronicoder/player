import { contextBridge, ipcRenderer } from 'electron';

contextBridge.exposeInMainWorld('electronAPI', {
  scanLibrary: (path: string) => {
    console.log('[preload] ipc:scan-library', path);
    return ipcRenderer.invoke('scan-library', path);
  },
  readMetadata: (filePath: string) => {
    console.log('[preload] ipc:read-metadata', filePath);
    return ipcRenderer.invoke('read-metadata', filePath);
  },
  savePlaylistMetadata: (folderPath: string, metadata: any) => {
    console.log('[preload] ipc:save-playlist-metadata', folderPath);
    return ipcRenderer.invoke('save-playlist-metadata', folderPath, metadata);
  },
  renamePlaylist: (oldPath: string, newPath: string) => {
    console.log('[preload] ipc:rename-playlist', oldPath, '->', newPath);
    return ipcRenderer.invoke('rename-playlist', oldPath, newPath);
  },
  selectDirectory: () => {
    console.log('[preload] ipc:select-directory');
    return ipcRenderer.invoke('select-directory');
  },
  findDefaultMusicFolder: () => {
    console.log('[preload] ipc:find-default-music-folder');
    return ipcRenderer.invoke('find-default-music-folder');
  }
});
