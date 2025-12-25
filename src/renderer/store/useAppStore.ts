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
  // Shuffle support: a shuffled ordering of track IDs and current position
  shuffleOrder: string[];
  shufflePosition: number;
  // User-managed up-next queue and UI
  userQueue: Track[];
  showQueuePanel: boolean;
  // History stack to support previous navigation
  history: Track[];

  currentView: 'library' | 'settings' | 'album' | 'artist';
  selectedAlbum?: { name: string; artist?: string } | null;
  selectedArtist?: string | null;
  
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
  saveSettings: (updates: Partial<AppSettings>) => void;
  toggleEQ: () => void;
  toggleLoop: () => void;
  toggleShuffle: () => void;
  toggleAutoplay: () => void;
  handleTrackEnd: () => void;
  openSettings: () => void;
  openLibrary: () => void;
  openAlbum: (name: string, artist?: string) => void;
  openArtist: (name: string) => void;

  // Queue actions
  addToQueue: (track: Track, at?: number) => void;
  removeFromQueue: (id: string) => void;
  moveQueueItem: (from: number, to: number) => void;
  clearQueue: () => void;
  toggleQueuePanel: () => void;
  playQueueItem: (id: string) => Promise<void>;
}

export const useAppStore = create<AppState>((set, get) => ({
  playlists: [],
  currentPlaylist: null,
  currentTrack: null,
  queue: [],
  shuffleOrder: [],
  shufflePosition: -1,
  // User-managed up-next queue (like Spotify's queue). Tracks here take priority
  // over the playlist order when advancing.
  userQueue: [],
  showQueuePanel: false,
  history: [],
  
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
  currentView: 'library',
  selectedAlbum: null,
  selectedArtist: null,


  // Notifications
  notifications: [],
  showToast: (message, type = 'info') => {
    // Only display toasts when settings.showToasts is true, or always for errors
    const showAll = settingsService.get().showToasts;
    if (type !== 'error' && !showAll) return;
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
    // Changing playlist should cancel preloads
    audioEngine.clearPreloads();
    // Reset shuffle state when changing playlist
    set({ shuffleOrder: [], shufflePosition: -1 });
    // NOTE: Do not auto-play when a playlist is selected. "Autoplay" only
    // controls whether the next track starts automatically after the current
    // track finishes (not initial selection).

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
    // Also push current track onto history for prev navigation
    set(state => ({ history: state.currentTrack ? [...state.history, state.currentTrack] : state.history }));
    set({ currentTrack: track, currentPlaylist: playlist });
    const tracks = playlist.tracks;
    set({ queue: tracks });

    // If this track was in the userQueue, remove it (it is now playing)
    set(state => ({ userQueue: state.userQueue.filter(t => t.id !== track.id) }));

    // Maintain shuffleOrder when shuffle is enabled
    const shuffleEnabled = get().settings.shuffle || get().audioState.shuffle;
    if (shuffleEnabled && tracks && tracks.length > 0) {
      // Create a shuffled list of track ids and set position to current track
      const ids = tracks.map(t => t.id);
      // Fisher-Yates shuffle
      for (let i = ids.length - 1; i > 0; i--) {
        const j = Math.floor(Math.random() * (i + 1));
        [ids[i], ids[j]] = [ids[j], ids[i]];
      }
      const pos = ids.findIndex(id => id === track.id);
      set({ shuffleOrder: ids, shufflePosition: pos });
    } else {
      set({ shuffleOrder: [], shufflePosition: -1 });
    }

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
    console.log('[store] playTrack starting', { track: track.path });
    try {
      // Pass a raw filesystem path; AudioEngine will normalize file:// if needed
      const duration = await audioEngine.loadTrack(track.path);
      console.log('[store] loadTrack returned duration', duration);
      set(state => ({ audioState: { ...state.audioState, duration } }));
    } catch (e) {
      console.error('[store] Failed to load track', e);
      get().showToast('Failed to load track', 'error');
      return;
    }

    // Attempt to play
    try {
      await audioEngine.play();
      console.log('[store] playback started');
      set(state => ({ audioState: { ...state.audioState, isPlaying: true } }));
      get().showToast(`Playing ${metadata?.title || track.filename}`, 'info');
    } catch (e) {
      console.error('[store] Playback failed', e);
      get().showToast('Playback failed. Please click play to allow audio', 'error');
    }

    // Preload next track metadata / audio buffer to make manual play snappier when autoplay is off
    try {
      // Clear any stale preloads when starting a new play, but keep a buffer for the track we are about to load (if present)
      audioEngine.clearPreloadsExcept([track.path]);

      const idx = tracks.findIndex(t => t.id === track.id);
      const nextIdx = idx + 1;
      if (nextIdx < tracks.length) {
        const next = tracks[nextIdx];
        // Preload metadata (cached) and audio buffer
        playlistManager.getTrackMetadata(next.path).catch(() => {});
        // Only fetch buffer when autoplay is disabled, so manual play can start fast
        if (!get().settings.autoplay) {
          audioEngine.preload(next.path);
        }
      }
    } catch (e) {
      console.debug('[store] preload next failed', e);
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
    // Manual next: prefer userQueue, then shuffle order when shuffle is enabled
    const { currentTrack, queue, shuffleOrder, shufflePosition, userQueue } = get();
    if (!currentTrack) return;

    // 1) user queue has priority
    if (userQueue && userQueue.length > 0) {
      const next = userQueue[0];
      // consume it and play
      set(state => ({ userQueue: state.userQueue.slice(1) }));
      audioEngine.cancelPreload(currentTrack.path);
      audioEngine.clearPreloads();
      get().playTrack(next, get().currentPlaylist!);
      return;
    }

    const shuffleEnabled = get().settings.shuffle || get().audioState.shuffle;
    if (shuffleEnabled && shuffleOrder && shuffleOrder.length > 0) {
      // Use shuffleOrder to determine next position
      let pos = shufflePosition;
      if (pos === -1) pos = shuffleOrder.findIndex(id => id === currentTrack.id);
      let nextPos = pos + 1;
      if (nextPos >= shuffleOrder.length) {
        if (get().settings.loopMode === 'playlist') nextPos = 0; else return;
      }
      const nextId = shuffleOrder[nextPos];
      const next = queue.find(t => t.id === nextId);
      if (next) {
        // update shuffle position and play
        set({ shufflePosition: nextPos });
        audioEngine.cancelPreload(currentTrack.path);
        audioEngine.clearPreloads();
        get().playTrack(next, get().currentPlaylist!);
      }
      return;
    }

    // Fallback: chronological behavior
    const idx = queue.findIndex(t => t.id === currentTrack.id);
    let nextIdx = idx + 1;
    if (nextIdx >= queue.length) {
      // wrap if playlist loop mode
      if (get().settings.loopMode === 'playlist') nextIdx = 0; else return;
    }
    const next = queue[nextIdx];
    if (next) {
      // Cancel any preloads that are no longer relevant
      audioEngine.cancelPreload(currentTrack.path);
      audioEngine.clearPreloads();
      get().playTrack(next, get().currentPlaylist!);
    }
  },

  prevTrack: () => {
    // Manual prev: follow shuffle order when shuffle is enabled
    const { currentTrack, queue, shuffleOrder, shufflePosition } = get();
    if (!currentTrack) return;

    const shuffleEnabled = get().settings.shuffle || get().audioState.shuffle;
    if (shuffleEnabled && shuffleOrder && shuffleOrder.length > 0) {
      let pos = shufflePosition;
      if (pos === -1) pos = shuffleOrder.findIndex(id => id === currentTrack.id);
      let prevPos = pos - 1;
      if (prevPos < 0) {
        if (get().settings.loopMode === 'playlist') prevPos = shuffleOrder.length - 1; else return;
      }
      const prevId = shuffleOrder[prevPos];
      const prev = queue.find(t => t.id === prevId);
      if (prev) {
        set({ shufflePosition: prevPos });
        audioEngine.cancelPreload(currentTrack.path);
        audioEngine.clearPreloads();
        get().playTrack(prev, get().currentPlaylist!);
      }
      return;
    }

    const idx = queue.findIndex(t => t.id === currentTrack.id);
    if (idx > 0) {
      const prev = queue[idx - 1];
      // Clean up preloads
      audioEngine.cancelPreload(currentTrack.path);
      audioEngine.clearPreloads();
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
    // Save EQ state (we store selected bands in a preset-less way)
    settingsService.save({});
    set({ settings: settingsService.get() });
  },

  saveSettings: (updates) => {
    settingsService.save(updates);
    set({ settings: settingsService.get() });
  },

  // Queue management
  addToQueue: (track, at) => {
    set(state => {
      const q = [...state.userQueue];
      if (typeof at === 'number' && at >= 0 && at <= q.length) q.splice(at, 0, track);
      else q.push(track);
      return { userQueue: q } as any;
    });
  },
  removeFromQueue: (id) => {
    set(state => ({ userQueue: state.userQueue.filter(t => t.id !== id) }));
  },
  moveQueueItem: (from, to) => {
    set(state => {
      const q = [...state.userQueue];
      if (from < 0 || from >= q.length || to < 0 || to >= q.length) return {} as any;
      const [item] = q.splice(from, 1);
      q.splice(to, 0, item);
      return { userQueue: q } as any;
    });
  },
  clearQueue: () => set({ userQueue: [] }),
  toggleQueuePanel: () => set(state => ({ showQueuePanel: !state.showQueuePanel })),
  playQueueItem: async (id) => {
    const state = get();
    const track = state.userQueue.find(t => t.id === id);
    if (!track) return;
    // Remove it from the queue then play
    set({ userQueue: state.userQueue.filter(t => t.id !== id) });
    await get().playTrack(track, state.currentPlaylist || ({} as any));
  },

  toggleEQ: () => {
    const next = !get().settings.eqEnabled;
    settingsService.save({ eqEnabled: next });
    set({ settings: settingsService.get() });
    console.log('[store] EQ enabled:', next);
  },

  openSettings: () => {
    set({ currentView: 'settings' });
  },

  openLibrary: () => {
    set({ currentView: 'library' });
  },

  openAlbum: (name: string, artist?: string) => {
    set({ currentView: 'album', selectedAlbum: { name, artist } });
  },

  openArtist: (name: string) => {
    set({ currentView: 'artist', selectedArtist: name });
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
    // Only show toasts on error; use console.log for positive feedback
    console.log('[store] loop changed:', next);
  },

  toggleShuffle: () => {
    const next = !get().audioState.shuffle;
    set(state => ({ 
      audioState: { ...state.audioState, shuffle: next },
      settings: { ...state.settings, shuffle: next }
    }));
    settingsService.save({ shuffle: next });

    // Build or clear shuffle order depending on new state
    const queue = get().queue || [];
    if (next && queue.length > 0) {
      const ids = queue.map(t => t.id);
      for (let i = ids.length - 1; i > 0; i--) {
        const j = Math.floor(Math.random() * (i + 1));
        [ids[i], ids[j]] = [ids[j], ids[i]];
      }
      const pos = get().currentTrack ? ids.findIndex(id => id === get().currentTrack!.id) : -1;
      set({ shuffleOrder: ids, shufflePosition: pos });
    } else {
      set({ shuffleOrder: [], shufflePosition: -1 });
    }

    console.log('[store] shuffle changed:', next);
  },

  toggleAutoplay: () => {
    const next = !get().settings.autoplay;
    settingsService.save({ autoplay: next });
    set({ settings: settingsService.get() });
    console.log('[store] autoplay changed:', next);
  },

  // Called when a track naturally ends
  handleTrackEnd: () => {
    const { currentTrack, queue, settings, currentPlaylist } = get();
    if (!currentTrack || !queue) return;

    const idx = queue.findIndex(t => t.id === currentTrack.id);

    // Loop current track
    if (settings.loopMode === 'track') {
      try {
        // restart current track
        audioEngine.seek(0);
        audioEngine.play();
        return;
      } catch (err) {
        console.error('[store] failed to loop track', err);
        return;
      }
    }

    // Determine next index (shuffle support)
    let nextIdx: number;
    if (settings.shuffle) {
      nextIdx = Math.floor(Math.random() * queue.length);
      if (nextIdx === idx) {
        nextIdx = (idx + 1) % queue.length;
      }
    } else {
      nextIdx = idx + 1;
    }

    // End of queue handling
    if (nextIdx >= queue.length) {
      if (settings.loopMode === 'playlist') {
        nextIdx = 0;
      } else {
        // Stop playback at end
        set(state => ({ audioState: { ...state.audioState, isPlaying: false } }));
        return;
      }
    }

    const next = queue[nextIdx];
    if (!next) return;

    if (settings.autoplay) {
      // Auto-play the next track
      try {
        get().playTrack(next, currentPlaylist!);
      } catch (err) {
        console.error('[store] failed to autoplay next track', err);
      }
    } else {
      // Advance to next track but do not start playback
      set({ currentTrack: next });
      // Update shuffle position if applicable
      const shuffleEnabled = settings.shuffle || get().audioState.shuffle;
      if (shuffleEnabled) {
        const so = get().shuffleOrder;
        const pos = so.findIndex(id => id === next.id);
        if (pos !== -1) set({ shufflePosition: pos });
      }
      // If a userQueue existed and we advanced to the next track in the playlist
      // ensure we do not inadvertently keep a stale user-queue head that was already consumed.
      if (get().userQueue && get().userQueue.length > 0 && get().userQueue[0].id === next.id) {
        set(state => ({ userQueue: state.userQueue.slice(1) }));
      }
    }
  }
}));

// Sync audio engine events to store
audioEngine.onTimeUpdate((time) => {
  // console.debug to avoid spamming info-level logs
  console.debug('[store] audio time update:', time);
  useAppStore.setState(state => ({
    audioState: { ...state.audioState, currentTime: time }
  }));
});

audioEngine.onEnded(() => {
  console.log('[store] track ended, handling end sequence');
  useAppStore.getState().handleTrackEnd();
});
