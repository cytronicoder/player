import { useState } from 'react';
import { useAppStore } from '../store/useAppStore';
import { Play, Pause, SkipBack, SkipForward, Repeat, Shuffle, Volume2, List } from 'lucide-react';
import { clsx } from 'clsx';
import { EQPanel } from './EQPanel';
import { Visualizer } from './Visualizer';
import Artwork from './Artwork';

export const PlayerBar = () => {
  const { 
    audioState, 
    currentTrack, 
    queue,
    togglePlay, 
    nextTrack, 
    prevTrack, 
    setVolume, 
    toggleLoop, 
    toggleShuffle 
  } = useAppStore();
  const settings = useAppStore(state => state.settings);

  const [showEQ, setShowEQ] = useState(false);
  const toggleQueuePanel = useAppStore(state => state.toggleQueuePanel);
  const queueCount = useAppStore(state => state.userQueue.length);


  // Up-next preview: prefer userQueue, then playlist/shuffle ordering
  const userQueue = useAppStore(state => state.userQueue);
  const upcomingFromQueue = userQueue.slice(0, 3);
  const upcomingFallback = (() => {
    // if no userQueue, show next 3 tracks from queue (respecting shuffle)
    if (!currentTrack || !queue || queue.length === 0) return [] as any[];
    const shuffleEnabled = settings.shuffle || audioState.shuffle;
    if (shuffleEnabled && useAppStore.getState().shuffleOrder.length > 0) {
      const so = useAppStore.getState().shuffleOrder;
      const pos = useAppStore.getState().shufflePosition >= 0 ? useAppStore.getState().shufflePosition : so.findIndex(id => id === currentTrack.id);
      const res: any[] = [];
      for (let i = 1; i <= 3; i++) {
        const idx = (pos + i) % so.length;
        const id = so[idx];
        const t = queue.find(q => q.id === id);
        if (t) res.push(t);
      }
      return res;
    }
    const idx = queue.findIndex(t => t.id === currentTrack.id);
    const res: any[] = [];
    for (let i = 1; i <= 3; i++) {
      const nextIdx = idx + i;
      if (nextIdx < queue.length) res.push(queue[nextIdx]);
    }
    return res;
  })();
  const upcoming = upcomingFromQueue.length > 0 ? upcomingFromQueue : upcomingFallback;

  return (
    <div className="h-28 bg-gray-950 border-t border-gray-800 px-6 flex items-center justify-between z-50 relative">
      {showEQ && <EQPanel onClose={() => setShowEQ(false)} />}
      {/* Track Info */}
      <div className="w-1/3 flex items-center gap-5">
        {currentTrack && (
          <>
            <div className="w-20 h-20 bg-gray-800 rounded overflow-hidden relative group flex-shrink-0">
              {currentTrack.artwork ? (
                <Artwork src={currentTrack.artwork} alt={currentTrack.title} />
              ) : (
                <div className="w-full h-full bg-gray-700 flex items-center justify-center">
                  <Visualizer width={72} height={36} color="#34d399" />
                </div>
              )}
            </div>
            <div className="overflow-hidden">
              <div className="text-white text-base font-semibold truncate">{currentTrack.title || currentTrack.filename}</div>
              <div className="text-gray-400 text-sm truncate">{currentTrack.artist || 'Unknown Artist'}</div>
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
            title="Shuffle"
          >
            <Shuffle className="w-4 h-4" />
          </button>
          <button onClick={prevTrack} className="text-gray-400 hover:text-white transition-colors">
            <SkipBack className="w-6 h-6" />
          </button>
          <button 
            onClick={togglePlay}
            className="w-10 h-10 bg-white rounded-full flex items-center justify-center hover:scale-105 transition-transform shadow-md"
            aria-label="Play/Pause"
          >
            {audioState.isPlaying ? (
              <Pause className="w-5 h-5 text-black fill-current" />
            ) : (
              <Play className="w-5 h-5 text-black fill-current ml-0.5" />
            )}
          </button>
          <button onClick={nextTrack} className="text-gray-400 hover:text-white transition-colors">
            <SkipForward className="w-6 h-6" />
          </button>
          <button 
            onClick={toggleLoop}
            className={clsx("text-gray-400 hover:text-white transition-colors", audioState.loopMode !== 'off' && "text-green-500")}
          >
            <Repeat className="w-4 h-4" />
            {audioState.loopMode === 'track' && <span className="text-[8px] absolute ml-3 -mt-2">1</span>}
          </button>
        </div>

        {/* Up-next preview */}
        <div className="flex items-center gap-2 mt-1">
          {upcoming.map((t, i) => (
            <div key={t.id || i} className="text-xs text-gray-300 bg-gray-800/40 px-2 py-1 rounded">
              {t.title || t.filename}
            </div>
          ))}
        </div>
        <div className="w-1/3 flex items-center justify-end gap-4">
          <div className="hidden md:block w-32 h-8">
             <Visualizer width={128} height={32} color="#10b981" />
          </div>
          <div className="flex items-center gap-2">
            <button onClick={() => toggleQueuePanel()} className="relative p-1 rounded hover:bg-gray-800">
              <List className="w-4 h-4 text-gray-400 hover:text-white" />
              {queueCount > 0 && (
                <span className="absolute -top-2 -right-3 bg-green-600 text-[10px] px-1 rounded-full">{queueCount}</span>
              )}
            </button>
          </div>
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
    </div>
  );
};
