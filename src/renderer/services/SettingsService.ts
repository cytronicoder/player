import { AppSettings } from '../../shared/types';

const DEFAULT_SETTINGS: AppSettings = {
  volume: 1.0,
  playbackPosition: 0,
  loopMode: 'off',
  shuffle: false,
  eqEnabled: false,
  musicLibraryPath: '',
  customEqPresets: []
};

const STORAGE_KEY = 'music_player_settings_v1';

export class SettingsService {
  private settings: AppSettings;

  constructor() {
    this.settings = this.load();
  }

  private load(): AppSettings {
    try {
      const stored = localStorage.getItem(STORAGE_KEY);
      if (stored) {
        return { ...DEFAULT_SETTINGS, ...JSON.parse(stored) };
      }
    } catch (e) {
      console.error('Failed to load settings', e);
    }
    return DEFAULT_SETTINGS;
  }

  save(settings: Partial<AppSettings>) {
    this.settings = { ...this.settings, ...settings };
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(this.settings));
    } catch (e) {
      console.error('Failed to save settings', e);
    }
  }

  get(): AppSettings {
    return this.settings;
  }
}

export const settingsService = new SettingsService();
