import { Playlist } from '../../shared/types';

export class PlaylistManager {
  private metadataCache = new Map<string, any>();

  async loadLibrary(path: string): Promise<Playlist[]> {
    if (!window.electronAPI) return [];
    return await window.electronAPI.scanLibrary(path);
  }

  async getTrackMetadata(filePath: string) {
    if (this.metadataCache.has(filePath)) return this.metadataCache.get(filePath);
    if (!window.electronAPI) return {};
    const meta = await window.electronAPI.readMetadata(filePath);
    this.metadataCache.set(filePath, meta);
    return meta;
  }

  async updatePlaylistMetadata(playlist: Playlist, updates: Partial<Playlist>) {
    const newMetadata = {
      id: playlist.id,
      title: updates.title || playlist.title,
      description: updates.description || playlist.description,
      coverImage: playlist.coverImage ? playlist.coverImage.split('/').pop() : undefined, // Store relative path
      createdAt: playlist.createdAt,
      lastModified: new Date().toISOString(),
      sortMode: updates.sortMode || playlist.sortMode,
      loopDefault: updates.loopDefault !== undefined ? updates.loopDefault : playlist.loopDefault
    };

    if (window.electronAPI) {
      await window.electronAPI.savePlaylistMetadata(playlist.path, newMetadata);
    }
  }

  async renamePlaylist(playlist: Playlist, newName: string) {
    const parentDir = playlist.path.split('/').slice(0, -1).join('/');
    const newPath = `${parentDir}/${newName}`;
    
    if (window.electronAPI) {
      await window.electronAPI.renamePlaylist(playlist.path, newPath);
      // Also update the internal metadata title
      await this.updatePlaylistMetadata({ ...playlist, path: newPath }, { title: newName });
    }
  }
}

export const playlistManager = new PlaylistManager();
