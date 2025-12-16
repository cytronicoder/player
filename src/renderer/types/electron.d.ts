import { Playlist } from '../../shared/types';

export interface ElectronAPI {
  scanLibrary: (path: string) => Promise<Playlist[]>;
  readMetadata: (filePath: string) => Promise<any>;
  savePlaylistMetadata: (folderPath: string, metadata: any) => Promise<void>;
  renamePlaylist: (oldPath: string, newPath: string) => Promise<void>;
  selectDirectory: () => Promise<string>;
  findDefaultMusicFolder: () => Promise<string | null>;
}

declare global {
  interface Window {
    electronAPI: ElectronAPI;
  }
}

declare global {
  interface Window {
    electronAPI: ElectronAPI;
  }
}
