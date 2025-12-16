import React from 'react';
import { useAppStore } from '../store/useAppStore';
import { Library, Folder } from 'lucide-react';
import { clsx } from 'clsx';

export const Sidebar = () => {
  const playlists = useAppStore(state => state.playlists);
  const currentPlaylist = useAppStore(state => state.currentPlaylist);
  const selectPlaylist = useAppStore(state => state.selectPlaylist);

  const setMusicLibraryPath = useAppStore(state => state.setMusicLibraryPath);

  const handleSelectDirectory = async () => {
    if (window.electronAPI) {
      const path = await window.electronAPI.selectDirectory();
      if (path) {
        // Persist and reload library
        await setMusicLibraryPath(path);
      }
    }
  };

  return (
    <div className="w-64 bg-gray-950 flex flex-col border-r border-gray-800">
      <div className="p-4">
        <h1 className="text-xl font-bold flex items-center gap-2">
          <Library className="w-6 h-6 text-green-500" />
          Music Player
        </h1>
      </div>
      
      <div className="flex-1 overflow-y-auto">
        <div className="px-2 py-2">
          <h2 className="text-xs font-semibold text-gray-500 uppercase tracking-wider px-2 mb-2">Playlists</h2>
          <ul className="space-y-1">
            {playlists.map(playlist => (
              <li key={playlist.id}>
                <button
                  onClick={() => selectPlaylist(playlist.id)}
                  className={clsx(
                    "w-full text-left px-3 py-2 rounded-md text-sm flex items-center gap-2 transition-colors",
                    currentPlaylist?.id === playlist.id 
                      ? "bg-gray-800 text-white" 
                      : "text-gray-400 hover:text-white hover:bg-gray-900"
                  )}
                >
                  <Folder className="w-4 h-4" />
                  <span className="truncate">{playlist.title}</span>
                </button>
              </li>
            ))}
          </ul>
        </div>
      </div>

      <div className="p-4 border-t border-gray-800">
        <button 
          onClick={handleSelectDirectory}
          className="text-xs text-gray-500 hover:text-white transition-colors"
        >
          Change Library Folder
        </button>
      </div>
    </div>
  );
};
