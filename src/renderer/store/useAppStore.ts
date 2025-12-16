import { create } from 'zustand';
import { Playlist, Track, AudioState, AppSettings, EQBand } from '../../shared/types';
import { audioEngine } from '../services/AudioEngine';
import { playlistManager } from '../services/PlaylistManager';
import { settingsService } from '../services/SettingsService';

interface AppState {
  // Library
  playlists: Playlist[];
  currentPlaylist: Playlist | null;
  currentTrack: Track | null;
  queue: Track[];
  
  // Audio State
  audioState: AudioState;
  
  // Settings
  settings: AppSettings;

  // Notifications
  notifications: { id: string; message: string; type?: 'success' | 'error' | 'warning' | 'info' }[];
  showToast: (message: string, type?: 'success' | 'error' | 'warning' | 'info') => void;
  removeToast: (id: string) => void;
  
  // Actions
  loadLibrary: () => Promise<void>;
  setMusicLibraryPath: (path: string) => Promise<void>;
  selectPlaylist: (id: string) => void;
  savePlaylistMetadata: (playlist: Playlist, updates: Partial<Playlist>) => Promise<void>;
  renamePlaylist: (playlist: Playlist, newName: string) => Promise<void>;
  playTrack: (track: Track, playlist: Playlist) => Promise<void>;
  togglePlay: () => void;
  nextTrack: () => void;
  prevTrack: () => void;
  seek: (time: number) => void;
  setVolume: (volume: number) => void;
  setEQ: (bands: EQBand[]) => void;
  toggleLoop: () => void;
  toggleShuffle: () => void;
}

export const useAppStore = create<AppState>((set, get) => ({
  playlists: [],
  currentPlaylist: null,
  currentTrack: null,
  queue: [],
  
  audioState: {
    isPlaying: false,
    currentTime: 0,
    duration: 0,
    volume: settingsService.get().volume,
    muted: false,
    loopMode: settingsService.get().loopMode,
    shuffle: settingsService.get().shuffle
  },
  
  settings: settingsService.get(),

  // Notifications
  notifications: [],
  showToast: (message, type = 'info') => {
    const id = String(Date.now());
    set(state => ({ notifications: [...state.notifications, { id, message, type }] }));
    // Auto-dismiss
    setTimeout(() => {
      get().removeToast(id);
    }, 4000);
  },
  removeToast: (id) => {
    set(state => ({ notifications: state.notifications.filter(n => n.id !== id) }));
  },

  loadLibrary: async () => {
    const path = settingsService.get().musicLibraryPath;
    if (!path) return;
    get().showToast('Scanning library...', 'info');
    try {
      const playlists = await playlistManager.loadLibrary(path);
      set({ playlists });
      if (!playlists || playlists.length === 0) {
        get().showToast('No playlists found in selected folder', 'warning');
      } else {
        get().showToast(`${playlists.length} playlist${playlists.length === 1 ? '' : 's'} loaded`, 'success');
      }
    } catch (e) {
      console.error('Failed to load library', e);
      get().showToast('Failed to load library', 'error');
    }
  },

  setMusicLibraryPath: async (path) => {
    // Persist to settings, update store copy and reload library
    settingsService.save({ musicLibraryPath: path });
    set({ settings: settingsService.get() });
    await get().loadLibrary();
  },

  selectPlaylist: (id) => {
    const playlist = get().playlists.find(p => p.id === id) || null;
    set({ currentPlaylist: playlist });
    if (playlist) get().showToast(`Selected playlist: ${playlist.title}`, 'info');
  },

  savePlaylistMetadata: async (playlist, updates) => {
    try {
      await playlistManager.updatePlaylistMetadata(playlist, updates);
      get().showToast('Playlist metadata saved', 'success');
      await get().loadLibrary();
    } catch (e) {
      console.error('Failed to save playlist metadata', e);
      get().showToast('Failed to save playlist metadata', 'error');
    }
  },

  renamePlaylist: async (playlist, newName) => {
    try {
      await playlistManager.renamePlaylist(playlist, newName);
      get().showToast('Playlist renamed', 'success');
      await get().loadLibrary();
    } catch (e) {
      console.error('Failed to rename playlist', e);
      get().showToast('Failed to rename playlist', 'error');
    }
  },


  playTrack: async (track, playlist) => {
    // Update current track/playlist and queue early so UI responds
    set({ currentTrack: track, currentPlaylist: playlist });
    const tracks = playlist.tracks;
    set({ queue: tracks });

    // Read metadata (cached)
    const metadata = await playlistManager.getTrackMetadata(track.path);
    if (metadata && Object.keys(metadata).length > 0) {
      // Update the track object with metadata (duration, title, artist, artwork)
      const updatedTrack = { ...track } as any;
      if (metadata.title) updatedTrack.title = metadata.title;
      if (metadata.artist) updatedTrack.artist = metadata.artist;
      if (metadata.duration) updatedTrack.duration = metadata.duration;
      if (metadata.picture) updatedTrack.artwork = metadata.picture;

      // Update playlists store (mutate the playlist's track list immutably)
      set(state => {
        const playlists = state.playlists.map(p => {
          if (p.id !== playlist.id) return p;
          return {
            ...p,
            tracks: p.tracks.map(t => t.id === track.id ? updatedTrack : t)
          };
        });
        return { playlists, currentPlaylist: playlists.find(p => p.id === playlist.id) || state.currentPlaylist, currentTrack: updatedTrack } as any;
      });
    } else {
      get().showToast('Could not read track metadata', 'warning');
    }

    // Load track into audio engine and get duration
    try {
      const duration = await audioEngine.loadTrack(`file://${track.path}`);
      set(state => ({ audioState: { ...state.audioState, duration } }));
    } catch (e) {
      console.error('Failed to load track', e);
      get().showToast('Failed to load track', 'error');
      return;
    }

    // Attempt to play
    try {
      await audioEngine.play();
      set(state => ({ audioState: { ...state.audioState, isPlaying: true } }));
      get().showToast(`Playing ${metadata?.title || track.filename}`, 'info');
    } catch (e) {
      console.error('Playback failed', e);
      get().showToast('Playback failed. Please click play to allow audio', 'error');
    }
  },

  togglePlay: () => {
    const { isPlaying } = get().audioState;
    if (isPlaying) {
      audioEngine.pause();
      get().showToast('Paused', 'info');
    } else {
      audioEngine.play();
      get().showToast('Playing', 'info');
    }
    set(state => ({ 
      audioState: { ...state.audioState, isPlaying: !isPlaying } 
    }));
  },

  nextTrack: () => {
    // Implement next track logic based on queue/shuffle
    const { currentTrack, queue } = get();
    if (!currentTrack) return;
    
    const idx = queue.findIndex(t => t.id === currentTrack.id);
    if (idx < queue.length - 1) {
      const next = queue[idx + 1];
      get().playTrack(next, get().currentPlaylist!);
    }
  },

  prevTrack: () => {
    const { currentTrack, queue } = get();
    if (!currentTrack) return;
    
    const idx = queue.findIndex(t => t.id === currentTrack.id);
    if (idx > 0) {
      const prev = queue[idx - 1];
      get().playTrack(prev, get().currentPlaylist!);
    }
  },

  seek: (time) => {
    audioEngine.seek(time);
    set(state => ({ 
      audioState: { ...state.audioState, currentTime: time } 
    }));
  },

  setVolume: (volume) => {
    const prev = get().audioState.volume;
    audioEngine.setVolume(volume);
    set(state => ({ 
      audioState: { ...state.audioState, volume },
      settings: { ...state.settings, volume }
    }));
    settingsService.save({ volume });
    if (Math.abs(prev - volume) > 0.05) {
      get().showToast(`Volume ${Math.round(volume * 100)}%`, 'info');
    }
  },

  setEQ: (bands) => {
    audioEngine.setEQ(bands);
    get().showToast('EQ updated', 'info');
    // Save EQ state
  },

  toggleLoop: () => {
    const modes: ('off' | 'track' | 'playlist')[] = ['off', 'track', 'playlist'];
    const current = get().audioState.loopMode;
    const next = modes[(modes.indexOf(current) + 1) % modes.length];
    
    set(state => ({ 
      audioState: { ...state.audioState, loopMode: next },
      settings: { ...state.settings, loopMode: next }
    }));
    settingsService.save({ loopMode: next });
    get().showToast(`Loop: ${next}`, 'info');
  },

  toggleShuffle: () => {
    const next = !get().audioState.shuffle;
    set(state => ({ 
      audioState: { ...state.audioState, shuffle: next },
      settings: { ...state.settings, shuffle: next }
    }));
    settingsService.save({ shuffle: next });
    get().showToast(`Shuffle ${next ? 'enabled' : 'disabled'}`, 'info');
  }
}));

// Sync audio engine events to store
audioEngine.onTimeUpdate((time) => {
  useAppStore.setState(state => ({
    audioState: { ...state.audioState, currentTime: time }
  }));
});

audioEngine.onEnded(() => {
  useAppStore.getState().nextTrack();
});
