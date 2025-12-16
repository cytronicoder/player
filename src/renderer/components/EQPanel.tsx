import React from 'react';
import { useAppStore } from '../store/useAppStore';
import { EQBand } from '../../shared/types';

export const EQPanel = ({ onClose }: { onClose: () => void }) => {
  const setEQ = useAppStore(state => state.setEQ);
  // In a real app, we'd read the current EQ state from the store/audio engine
  // For now, we'll just render the sliders.
  
  const frequencies = [32, 64, 125, 250, 500, 1000, 2000, 4000, 8000, 16000];
  const [gains, setGains] = React.useState<number[]>(new Array(10).fill(0));

  const handleChange = (index: number, value: number) => {
    const newGains = [...gains];
    newGains[index] = value;
    setGains(newGains);
    
    const bands: EQBand[] = newGains.map((g, i) => ({
      frequency: frequencies[i],
      gain: g
    }));
    setEQ(bands);
  };

  return (
    <div className="absolute bottom-24 right-4 bg-gray-900 border border-gray-700 p-4 rounded-lg shadow-xl w-96 z-50">
      <div className="flex justify-between items-center mb-4">
        <h3 className="text-white font-bold text-sm">Equalizer</h3>
        <button onClick={onClose} className="text-gray-400 hover:text-white text-xs">Close</button>
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
