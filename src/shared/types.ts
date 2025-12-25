export interface Playlist {
  id: string;
  title: string;
  description?: string;
  coverImage?: string;
  createdAt: string;
  lastModified: string;
  sortMode: 'filename' | 'trackNumber' | 'title';
  loopDefault: boolean;
  path: string; // Absolute path to the folder
  tracks: Track[];
}

export interface Track {
  id: string;
  filename: string;
  path: string;
  title?: string;
  artist?: string;
  album?: string;
  trackNumber?: number;
  duration?: number;
  format: string;
  artwork?: string; // data URL or file path
}

export interface Album {
  name: string;
  artist?: string;
  year?: number;
  artwork?: string; // data URL or path
  tracks: Track[];
}

export interface Artist {
  name: string;
  albums?: Album[];
  topTracks?: Track[];
}

export interface AudioState {
  isPlaying: boolean;
  currentTime: number;
  duration: number;
  volume: number;
  muted: boolean;
  loopMode: 'off' | 'track' | 'playlist';
  shuffle: boolean;
}

export interface EQBand {
  frequency: number;
  gain: number; // -12 to +12
}

export interface EQPreset {
  id: string;
  name: string;
  bands: EQBand[];
}

export interface AppSettings {
  volume: number;
  lastPlayedPlaylistId?: string;
  lastPlayedTrackId?: string;
  playbackPosition: number;
  loopMode: 'off' | 'track' | 'playlist';
  shuffle: boolean;
  eqEnabled: boolean;
  selectedEqPresetId?: string;
  autoplay?: boolean;
  theme?: 'dark' | 'light';
  showToasts?: boolean;
  musicLibraryPath: string;
  customEqPresets: EQPreset[];
}
