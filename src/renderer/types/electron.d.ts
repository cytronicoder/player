import { Playlist } from '../../shared/types';

export interface ElectronAPI {
  scanLibrary: (path: string) => Promise<Playlist[]>;
  readMetadata: (filePath: string) => Promise<any>;
  savePlaylistMetadata: (folderPath: string, metadata: any) => Promise<void>;
  renamePlaylist: (oldPath: string, newPath: string) => Promise<void>;
  selectDirectory: () => Promise<string>;
  findDefaultMusicFolder: () => Promise<string | null>;
  listAlbums: (libraryPath: string) => Promise<any[]>;
  getAlbum: (libraryPath: string, albumName: string, artist?: string) => Promise<any | null>;
  listArtists: (libraryPath: string) => Promise<any[]>;
  getArtist: (libraryPath: string, artistName: string) => Promise<any | null>;
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
