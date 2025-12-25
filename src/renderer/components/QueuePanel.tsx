import React from 'react';
import { useAppStore } from '../store/useAppStore';
import { X } from 'lucide-react';
import type { Track } from '../../shared/types';

export const QueuePanel: React.FC = () => {
  const userQueue = useAppStore(s => s.userQueue);
  const removeFromQueue = useAppStore(s => s.removeFromQueue);
  const moveQueueItem = useAppStore(s => s.moveQueueItem);
  const clearQueue = useAppStore(s => s.clearQueue);
  const playQueueItem = useAppStore(s => s.playQueueItem);
  const toggleQueuePanel = useAppStore(s => s.toggleQueuePanel);

  const [dragOverIndex, setDragOverIndex] = React.useState<number | null>(null);

  const handleDragStart = (e: React.DragEvent, idx: number) => {
    e.dataTransfer.setData('text/plain', String(idx));
    e.dataTransfer.effectAllowed = 'move';
  };
  const handleDragOver = (e: React.DragEvent, idx: number) => {
    e.preventDefault();
    setDragOverIndex(idx);
  };
  const handleDrop = (e: React.DragEvent, idx: number) => {
    e.preventDefault();
    const raw = e.dataTransfer.getData('text/plain');
    const from = Number(raw);
    if (!Number.isFinite(from)) return;
    setDragOverIndex(null);
    if (from === idx) return;
    moveQueueItem(from, idx);
  };

  return (
    <div className="fixed right-0 top-0 h-full w-96 bg-gray-900 border-l border-gray-800 shadow-xl p-4 animate-slide-in z-40">
      <div className="flex items-center justify-between mb-4">
        <h3 className="text-lg font-bold">Up Next</h3>
        <div className="flex items-center gap-2">
          <button onClick={() => clearQueue()} className="text-sm text-gray-400 hover:text-white">Clear</button>
          <button onClick={() => toggleQueuePanel()} className="p-2 rounded hover:bg-gray-800"><X className="w-4 h-4" /></button>
        </div>
      </div>

      <div className="space-y-2 overflow-y-auto max-h-[calc(100%-96px)]">
        {userQueue.length === 0 && (
          <div className="text-gray-500">No items in queue. Use "Add to Queue" on tracks.</div>
        )}
        {userQueue.map((t: Track, i: number) => (
          <div
            key={t.id}
            draggable
            onDragStart={(e) => handleDragStart(e, i)}
            onDragOver={(e) => handleDragOver(e, i)}
            onDrop={(e) => handleDrop(e, i)}
            className={`flex items-center justify-between p-2 rounded transition-colors ${dragOverIndex === i ? 'bg-gray-800/60' : 'hover:bg-gray-800/40'}`}>
            <div className="flex-1">
              <div className="text-sm text-white truncate">{t.title || t.filename}</div>
              <div className="text-xs text-gray-400 truncate">{t.artist || ''}</div>
            </div>
            <div className="flex items-center gap-2 ml-3">
              <button onClick={() => moveQueueItem(i, Math.max(0, i - 1))} className="text-gray-400 hover:text-white">▲</button>
              <button onClick={() => moveQueueItem(i, Math.min(userQueue.length - 1, i + 1))} className="text-gray-400 hover:text-white">▼</button>
              <button onClick={() => playQueueItem(t.id)} className="text-gray-400 hover:text-white">Play</button>
              <button onClick={() => removeFromQueue(t.id)} className="text-red-500 hover:text-red-400">Remove</button>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
};

export default QueuePanel;
