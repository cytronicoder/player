import { Album, Artist } from '../../shared/types';

export const albumService = {
  async listAlbums(libraryPath: string): Promise<Album[]> {
    try {
      // @ts-ignore electronAPI
      return await (window as any).electronAPI.listAlbums(libraryPath);
    } catch (e) {
      console.error('[albumService] listAlbums failed', e);
      return [];
    }
  },
  async getAlbum(libraryPath: string, albumName: string, artist?: string): Promise<Album | null> {
    try {
      // @ts-ignore
      return await (window as any).electronAPI.getAlbum(libraryPath, albumName, artist);
    } catch (e) {
      console.error('[albumService] getAlbum failed', e);
      return null;
    }
  },
  async listArtists(libraryPath: string): Promise<Artist[]> {
    try {
      // @ts-ignore
      return await (window as any).electronAPI.listArtists(libraryPath);
    } catch (e) {
      console.error('[albumService] listArtists failed', e);
      return [];
    }
  },
  async getArtist(libraryPath: string, artistName: string): Promise<Artist | null> {
    try {
      // @ts-ignore
      return await (window as any).electronAPI.getArtist(libraryPath, artistName);
    } catch (e) {
      console.error('[albumService] getArtist failed', e);
      return null;
    }
  }
};

export default albumService;
