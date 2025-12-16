import { contextBridge, ipcRenderer } from 'electron';

contextBridge.exposeInMainWorld('electronAPI', {
  scanLibrary: (path: string) => ipcRenderer.invoke('scan-library', path),
  readMetadata: (filePath: string) => ipcRenderer.invoke('read-metadata', filePath),
  savePlaylistMetadata: (folderPath: string, metadata: any) => ipcRenderer.invoke('save-playlist-metadata', folderPath, metadata),
  renamePlaylist: (oldPath: string, newPath: string) => ipcRenderer.invoke('rename-playlist', oldPath, newPath),
  selectDirectory: () => ipcRenderer.invoke('select-directory'),
  findDefaultMusicFolder: () => ipcRenderer.invoke('find-default-music-folder')
});
