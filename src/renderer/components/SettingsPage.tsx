import React from 'react';
import { useAppStore } from '../store/useAppStore';
import { settingsService } from '../services/SettingsService';

export const SettingsPage = () => {
  const settings = useAppStore(state => state.settings);
  const saveSettings = useAppStore(state => state.saveSettings);
  const toggleEQ = useAppStore(state => state.toggleEQ);

  const handleToggle = (key: keyof typeof settings) => {
    saveSettings({ [key]: !settings[key as keyof typeof settings] } as any);
  };

  const handlePresetChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    saveSettings({ selectedEqPresetId: e.target.value });
  };

  const handleThemeChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    saveSettings({ theme: e.target.value as any });
    // Apply immediately
    try {
      if (e.target.value === 'light') {
        document.documentElement.classList.add('theme-light');
        document.documentElement.classList.remove('theme-dark');
      } else {
        document.documentElement.classList.add('theme-dark');
        document.documentElement.classList.remove('theme-light');
      }
    } catch (err) { console.error('Failed to apply theme', err); }
  };

  const handleExportPresets = () => {
    const data = JSON.stringify(settings.customEqPresets || [], null, 2);
    const blob = new Blob([data], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'eq-presets.json';
    a.click();
    URL.revokeObjectURL(url);
  };

  const handleImportPresets = (file: File | null) => {
    if (!file) return;
    const reader = new FileReader();
    reader.onload = () => {
      try {
        const parsed = JSON.parse(String(reader.result));
        if (!Array.isArray(parsed)) throw new Error('Invalid preset file');
        saveSettings({ customEqPresets: parsed });
        console.log('Imported presets', parsed.length);
      } catch (err) {
        console.error('Failed to import presets', err);
        saveSettings({});
      }
    };
    reader.readAsText(file);
  };

  const handleResetPresets = () => {
    saveSettings({ customEqPresets: [], selectedEqPresetId: undefined });
  };

  const handleResetAll = () => {
    if (!confirm('Reset all settings to defaults?')) return;
    settingsService.reset();
    saveSettings({});
    window.location.reload();
  };

  return (
    <div className="p-10">
      <h2 className="text-2xl font-bold mb-6">Settings</h2>

      <section className="mb-6 bg-gray-900 p-4 rounded-lg border border-gray-800">
        <h3 className="text-sm font-semibold text-gray-300 mb-2">Playback</h3>
        <div className="flex items-center justify-between py-2">
          <div>
            <div className="font-medium">Autoplay</div>
            <div className="text-sm text-gray-400">Automatically play the next track when the current one ends</div>
          </div>
          <div>
            <label className="inline-flex items-center gap-2">
              <input type="checkbox" checked={!!settings.autoplay} onChange={() => handleToggle('autoplay')} className="accent-green-500" />
            </label>
          </div>
        </div>

        <div className="flex items-center justify-between py-2">
          <div>
            <div className="font-medium">Loop mode</div>
            <div className="text-sm text-gray-400">Default loop behavior for playback</div>
          </div>
          <div className="text-sm text-gray-300">{settings.loopMode}</div>
        </div>

        <div className="flex items-center justify-between py-2">
          <div>
            <div className="font-medium">Theme</div>
            <div className="text-sm text-gray-400">Switch between light and dark themes</div>
          </div>
          <div>
            <select value={settings.theme || 'dark'} onChange={handleThemeChange} className="bg-gray-800 border border-gray-700 rounded px-3 py-2 text-sm">
              <option value="dark">Dark</option>
              <option value="light">Light</option>
            </select>
          </div>
        </div>
      </section>

      <section className="mb-6 bg-gray-900 p-4 rounded-lg border border-gray-800">
        <h3 className="text-sm font-semibold text-gray-300 mb-2">Equalizer</h3>
        <div className="flex items-center justify-between py-2">
          <div>
            <div className="font-medium">Enable Equalizer</div>
            <div className="text-sm text-gray-400">Toggle the global equalizer</div>
          </div>
          <div>
            <label className="inline-flex items-center gap-2">
              <input type="checkbox" checked={!!settings.eqEnabled} onChange={() => toggleEQ()} className="accent-green-500" />
            </label>
          </div>
        </div>

        <div className="mt-4">
          <label className="text-sm text-gray-300">Active preset</label>
          <select value={settings.selectedEqPresetId || ''} onChange={handlePresetChange} className="mt-2 bg-gray-800 border border-gray-700 rounded px-3 py-2 text-sm">
            <option value="">(None)</option>
            <option value="preset-flat">Flat</option>
            <option value="preset-bass">Bass</option>
            <option value="preset-treble">Treble</option>
            <option value="preset-vocal">Vocal</option>
            <option value="preset-rock">Rock</option>
            <option value="preset-pop">Pop</option>
            {settings.customEqPresets?.map(p => (
              <option key={p.id} value={p.id}>{p.name}</option>
            ))}
          </select>
        </div>

        <div className="mt-4 flex gap-2">
          <button onClick={handleExportPresets} className="px-3 py-2 rounded bg-gray-800 border border-gray-700 text-sm">Export Presets</button>
          <label className="px-3 py-2 rounded bg-gray-800 border border-gray-700 text-sm cursor-pointer">
            Import Presets
            <input type="file" accept="application/json" onChange={(e) => handleImportPresets(e.target.files?.[0] || null)} className="hidden" />
          </label>
          <button onClick={handleResetPresets} className="px-3 py-2 rounded bg-red-800 border border-red-700 text-sm">Reset Presets</button>
        </div>
      </section>

      <section className="mb-6 bg-gray-900 p-4 rounded-lg border border-gray-800">
        <h3 className="text-sm font-semibold text-gray-300 mb-2">Notifications</h3>
        <div className="flex items-center justify-between py-2">
          <div>
            <div className="font-medium">In-app Toasts</div>
            <div className="text-sm text-gray-400">Show informational toasts (errors always show)</div>
          </div>
          <div>
            <label className="inline-flex items-center gap-2">
              <input type="checkbox" checked={!!settings.showToasts} onChange={() => handleToggle('showToasts')} className="accent-green-500" />
            </label>
          </div>
        </div>
      </section>

      <section className="bg-gray-900 p-4 rounded-lg border border-gray-800">
        <h3 className="text-sm font-semibold text-gray-300 mb-2">Advanced</h3>
        <div className="text-sm text-gray-400 mb-4">More settings coming soon (keyboard shortcuts, audio device selection).</div>
        <div className="flex gap-2">
          <button onClick={handleResetAll} className="px-3 py-2 rounded bg-red-800 border border-red-700 text-sm">Reset All Settings</button>
        </div>
      </section>

      {process.env.NODE_ENV === 'development' && (
        <section className="mt-4 bg-gray-900 p-4 rounded-lg border border-gray-800">
          <h3 className="text-sm font-semibold text-gray-300 mb-2">Developer Tools</h3>
          <div className="flex flex-col gap-2">
            <div className="flex items-center gap-2">
              <button onClick={async () => { const stats = await import('../services/ThumbnailCache').then(m => m.getThumbStats()); alert(`Thumbs: ${stats.count}`); }} className="px-3 py-2 rounded bg-gray-800 border border-gray-700 text-sm">Thumb Count</button>
              <button onClick={async () => { await import('../services/ThumbnailCache').then(m => m.evictOldThumbnails(0)); alert('Thumbnails evicted'); }} className="px-3 py-2 rounded bg-gray-800 border border-gray-700 text-sm">Evict All Thumbs</button>
            </div>
            <div className="flex items-center gap-2">
              <button onClick={() => { import('../services/AudioEngine').then(m => m.audioEngine.clearPreloads()); alert('Cleared audio preloads'); }} className="px-3 py-2 rounded bg-gray-800 border border-gray-700 text-sm">Clear Audio Preloads</button>
            </div>
          </div>
        </section>
      )}

    </div>
  );
};