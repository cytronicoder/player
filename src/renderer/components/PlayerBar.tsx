import { useState } from 'react';
import { useAppStore } from '../store/useAppStore';
import { Play, Pause, SkipBack, SkipForward, Repeat, Shuffle, Volume2, Sliders } from 'lucide-react';
import { clsx } from 'clsx';
import { EQPanel } from './EQPanel';
import { Visualizer } from './Visualizer';

export const PlayerBar = () => {
  const { 
    audioState, 
    currentTrack, 
    togglePlay, 
    nextTrack, 
    prevTrack, 
    seek, 
    setVolume, 
    toggleLoop, 
    toggleShuffle 
  } = useAppStore();

  const [showEQ, setShowEQ] = useState(false);

  const formatTime = (time: number) => {
    if (!time) return '0:00';
    const mins = Math.floor(time / 60);
    const secs = Math.floor(time % 60);
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  };

  return (
    <div className="h-24 bg-gray-950 border-t border-gray-800 px-4 flex items-center justify-between z-50 relative">
      {showEQ && <EQPanel onClose={() => setShowEQ(false)} />}
      {/* Track Info */}
      <div className="w-1/3 flex items-center gap-4">
        {currentTrack && (
          <>
            <div className="w-14 h-14 bg-gray-800 rounded overflow-hidden relative group">
              {currentTrack.artwork ? (
                <img src={currentTrack.artwork} alt="art" className="w-full h-full object-cover" />
              ) : (
                <div className="w-full h-full bg-gray-700 flex items-center justify-center">
                  <Visualizer width={56} height={28} color="#34d399" />
                </div>
              )}
            </div>
            <div className="overflow-hidden">
              <div className="text-white text-sm font-medium truncate">{currentTrack.title || currentTrack.filename}</div>
              <div className="text-gray-400 text-xs truncate">{currentTrack.artist || 'Unknown Artist'}</div>
            </div>
          </>
        )}
      </div>

      {/* Controls */}
      <div className="w-1/3 flex flex-col items-center gap-2">
        <div className="flex items-center gap-6">
          <button 
            onClick={toggleShuffle}
            className={clsx("text-gray-400 hover:text-white transition-colors", audioState.shuffle && "text-green-500")}
          >
            <Shuffle className="w-4 h-4" />
          </button>
          <button onClick={prevTrack} className="text-gray-400 hover:text-white transition-colors">
            <SkipBack className="w-5 h-5" />
          </button>
          <button 
            onClick={togglePlay}
            className="w-8 h-8 bg-white rounded-full flex items-center justify-center hover:scale-105 transition-transform"
          >
            {audioState.isPlaying ? (
              <Pause className="w-4 h-4 text-black fill-current" />
            ) : (
              <Play className="w-4 h-4 text-black fill-current ml-0.5" />
            )}
          </button>
          <button onClick={nextTrack} className="text-gray-400 hover:text-white transition-colors">
            <SkipForward className="w-5 h-5" />
          </button>
          <button 
            onClick={toggleLoop}
            className={clsx("text-gray-400 hover:text-white transition-colors", audioState.loopMode !== 'off' && "text-green-500")}
          >
            <Repeat className="w-4 h-4" />
            {audioState.loopMode === 'track' && <span className="text-[8px] absolute ml-3 -mt-2">1</span>}
          </button>
        </div>
        
        <div className="w-full flex items-center gap-2 text-xs text-gray-500 font-mono">
          <span className="w-10 text-right">{formatTime(audioState.currentTime)}</span>
          <input 
            type="range" 
            min={0} 
            max={audioState.duration || 100} 
            value={audioState.currentTime}
            onChange={(e) => seek(Number(e.target.value))}
            className="flex-1 h-1 bg-gray-800 rounded-lg appearance-none cursor-pointer [&::-webkit-slider-thumb]:appearance-none [&::-webkit-slider-thumb]:w-3 [&::-webkit-slider-thumb]:h-3 [&::-webkit-slider-thumb]:bg-white [&::-webkit-slider-thumb]:rounded-full hover:[&::-webkit-slider-thumb]:scale-110"
          />
          <span className="w-10">{formatTime(audioState.duration)}</span>
        </div>
      </div>

      {/* Volume & EQ */}
      <div className="w-1/3 flex items-center justify-end gap-4">
        <div className="hidden md:block w-32 h-8">
           <Visualizer width={128} height={32} color="#10b981" />
        </div>
        <button 
          onClick={() => setShowEQ(!showEQ)}
          className={clsx("text-gray-400 hover:text-white transition-colors", showEQ && "text-green-500")}
        >
          <Sliders className="w-4 h-4" />
        </button>
        <div className="flex items-center gap-2 w-32">
          <Volume2 className="w-4 h-4 text-gray-400" />
          <input 
            type="range" 
            min={0} 
            max={1} 
            step={0.01}
            value={audioState.volume}
            onChange={(e) => setVolume(Number(e.target.value))}
            className="flex-1 h-1 bg-gray-800 rounded-lg appearance-none cursor-pointer [&::-webkit-slider-thumb]:appearance-none [&::-webkit-slider-thumb]:w-3 [&::-webkit-slider-thumb]:h-3 [&::-webkit-slider-thumb]:bg-white [&::-webkit-slider-thumb]:rounded-full"
          />
        </div>
      </div>
    </div>
  );
};
