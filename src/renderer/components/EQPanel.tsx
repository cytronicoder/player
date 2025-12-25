import React from 'react';
import { useAppStore } from '../store/useAppStore';
import { EQBand } from '../../shared/types';

export const EQPanel = ({ onClose }: { onClose: () => void }) => {
  const setEQ = useAppStore(state => state.setEQ);
  const saveSettings = useAppStore(state => state.saveSettings);
  const settings = useAppStore(state => state.settings);
  const showToast = useAppStore(state => state.showToast);
  const toggleEQ = useAppStore(state => state.toggleEQ);

  React.useEffect(() => {
    console.log('[EQPanel] mounted');
    return () => console.log('[EQPanel] unmounted');
  }, []);

  const frequencies = [32, 64, 125, 250, 500, 1000, 2000, 4000, 8000, 16000];
  const [gains, setGains] = React.useState<number[]>(new Array(10).fill(0));

  // Built-in presets
  const builtInPresets = React.useMemo(() => ([
    { id: 'preset-flat', name: 'Flat', bands: new Array(10).fill(0).map((_, i) => ({ frequency: frequencies[i], gain: 0 })) },
    { id: 'preset-bass', name: 'Bass Boost', bands: frequencies.map((f, i) => ({ frequency: f, gain: i <= 1 ? 6 : (i <= 3 ? 2 : 0) })) },
    { id: 'preset-treble', name: 'Treble Boost', bands: frequencies.map((f, i) => ({ frequency: f, gain: i >= 8 ? 6 : (i >= 6 ? 2 : 0) })) },
    { id: 'preset-vocal', name: 'Vocal', bands: frequencies.map((f, i) => ({ frequency: f, gain: (i >= 3 && i <= 6) ? 3 : 0 })) },
    { id: 'preset-rock', name: 'Rock', bands: frequencies.map((f, i) => ({ frequency: f, gain: (i <= 1 ? 4 : (i >= 8 ? 4 : (i >=4 && i<=5 ? -2 : 0))) })) },
    { id: 'preset-pop', name: 'Pop', bands: frequencies.map((f, i) => ({ frequency: f, gain: (i >=4 && i<=7) ? 2 : (i >=8 ? 2 : 0) })) }
  ]), [frequencies]);

  const customPresets = settings?.customEqPresets || [];
  const selectedPresetId = settings?.selectedEqPresetId;

  React.useEffect(() => {
    // If a preset is selected in settings, apply it on open
    try {
      const preset = customPresets.find(p => p.id === selectedPresetId) || builtInPresets.find(p => p.id === selectedPresetId);
      if (preset) {
        const g = preset.bands.map(b => b.gain);
        setGains(g);
        setEQ(preset.bands);
      }
    } catch (err) {
      console.error('[EQPanel] error applying preset on mount', err);
    }
  }, [selectedPresetId, customPresets, builtInPresets, setEQ]);

  const applyPreset = (presetId: string) => {
    try {
      const preset = (customPresets || []).find(p => p.id === presetId) || builtInPresets.find(p => p.id === presetId);
      if (!preset) return;
      setGains(preset.bands.map(b => b.gain));
      setEQ(preset.bands);
      saveSettings({ selectedEqPresetId: presetId });
      showToast(`Applied preset: ${preset.name}`, 'success');
    } catch (err) {
      console.error('[EQPanel] applyPreset error', err);
      showToast('Failed to apply preset', 'error');
    }
  };

  const handleChange = (index: number, value: number) => {
    const newGains = [...gains];
    newGains[index] = value;
    setGains(newGains);
    
    const bands: EQBand[] = newGains.map((g, i) => ({
      frequency: frequencies[i],
      gain: g
    }));
    setEQ(bands);
    // deselect any preset when manual adjust
    saveSettings({ selectedEqPresetId: undefined });
  };

  const saveAsPreset = () => {
    const name = window.prompt('Preset name');
    if (!name) return;
    const newPreset = {
      id: `${Date.now()}`,
      name,
      bands: gains.map((g, i) => ({ frequency: frequencies[i], gain: g }))
    } as any;
    const next = [...customPresets, newPreset];
    saveSettings({ customEqPresets: next, selectedEqPresetId: newPreset.id });
    showToast(`Saved preset: ${name}`, 'success');
  };

  const deleteCustomPreset = (id: string) => {
    const next = (customPresets || []).filter(p => p.id !== id);
    const nextSelected = settings.selectedEqPresetId === id ? undefined : settings.selectedEqPresetId;
    saveSettings({ customEqPresets: next, selectedEqPresetId: nextSelected });
    showToast('Preset deleted', 'info');
  };

  return (
    <div className="absolute bottom-24 right-4 bg-gray-900 border border-gray-700 p-4 rounded-lg shadow-xl w-96 z-50">
      <div className="flex justify-between items-center mb-4">
        <h3 className="text-white font-bold text-sm">Equalizer</h3>
        <div className="flex items-center gap-4">
          <label className="flex items-center gap-2 text-xs text-gray-300">
            <input type="checkbox" checked={settings.eqEnabled} onChange={() => toggleEQ()} className="accent-green-500" />
            Enable
          </label>
          <button onClick={saveAsPreset} className="text-gray-400 hover:text-white text-xs">Save Preset</button>
          <button onClick={onClose} className="text-gray-400 hover:text-white text-xs">Close</button>
        </div>
      </div>

      <div className="mb-3 flex gap-2 items-center">
        <div className="text-xs text-gray-400 mr-2">Presets:</div>
        {builtInPresets.map(p => (
          <button key={p.id} onClick={() => applyPreset(p.id)} className={`px-2 py-1 rounded text-xs ${settings.selectedEqPresetId === p.id ? 'bg-green-600 text-white' : 'bg-gray-800 text-gray-300'}`}>
            {p.name}
          </button>
        ))}
        {customPresets.map(p => (
          <div key={p.id} className="flex items-center gap-1">
            <button onClick={() => applyPreset(p.id)} className={`px-2 py-1 rounded text-xs ${settings.selectedEqPresetId === p.id ? 'bg-green-600 text-white' : 'bg-gray-800 text-gray-300'}`}>
              {p.name}
            </button>
            <button onClick={() => deleteCustomPreset(p.id)} className="text-red-400 text-xs px-1">✕</button>
          </div>
        ))}
      </div>
      
      <div className="flex justify-between h-32 items-end gap-2">
        {frequencies.map((freq, i) => (
          <div key={freq} className="flex flex-col items-center gap-2 h-full">
            <input
              type="range"
              min="-12"
              max="12"
              step="1"
              value={gains[i]}
              onChange={(e) => handleChange(i, Number(e.target.value))}
              className="h-full w-1 bg-gray-700 appearance-none cursor-pointer [&::-webkit-slider-thumb]:appearance-none [&::-webkit-slider-thumb]:w-3 [&::-webkit-slider-thumb]:h-3 [&::-webkit-slider-thumb]:bg-green-500 [&::-webkit-slider-thumb]:rounded-full -rotate-180 writing-mode-vertical-lr"
              style={{ WebkitAppearance: 'slider-vertical' } as any}
            />
            <span className="text-[10px] text-gray-500 w-6 text-center">
              {freq >= 1000 ? `${freq/1000}k` : freq}
            </span>
          </div>
        ))}
      </div>
    </div>
  );
};
