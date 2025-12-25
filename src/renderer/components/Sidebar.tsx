import { useAppStore } from '../store/useAppStore';
import { Library, Folder, Settings } from 'lucide-react';
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
    <div className="w-72 bg-gray-950 flex flex-col border-r border-gray-800">
      <div className="p-6">
        <h1 className="text-2xl font-extrabold flex items-center gap-3">
          <Library className="w-7 h-7 text-green-500" />
          <span>Music Player</span>
        </h1>
      </div>
      
      <div className="flex-1 overflow-y-auto">
        <div className="px-4 py-3">
          <h2 className="text-xs font-semibold text-gray-500 uppercase tracking-wider px-2 mb-3">Playlists</h2>
          <ul className="space-y-2">
            {playlists.map(playlist => (
              <li key={playlist.id}>
                <button
                  onClick={() => { selectPlaylist(playlist.id); setTimeout(() => useAppStore.getState().openLibrary(), 0); }}
                  className={clsx(
                    "w-full text-left px-4 py-3 rounded-md text-base flex items-center gap-3 transition-colors",
                    currentPlaylist?.id === playlist.id 
                      ? "bg-gray-800 text-white" 
                      : "text-gray-400 hover:text-white hover:bg-gray-900"
                  )}
                >
                  <Folder className="w-5 h-5" />
                  <span className="truncate">{playlist.title}</span>
                </button>
              </li>
            ))}
          </ul>

          <div className="mt-6">
            <h2 className="text-xs font-semibold text-gray-500 uppercase tracking-wider px-2 mb-2">Preferences</h2>
            <button
              onClick={() => useAppStore.getState().openSettings()}
              className="w-full text-left px-4 py-3 rounded-md text-base flex items-center gap-3 text-gray-400 hover:text-white hover:bg-gray-900"
            >
              <Settings className="w-5 h-5" />
              <span>Settings</span>
            </button>
          </div>
        </div>
      </div>

      <div className="p-6 border-t border-gray-800">
        <button 
          onClick={handleSelectDirectory}
          className="text-sm text-gray-400 hover:text-white transition-colors"
        >
          Change Library Folder
        </button>
      </div>
    </div>
  );
};
