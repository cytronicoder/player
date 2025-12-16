import React, { useEffect } from 'react';
import { Sidebar } from './components/Sidebar';
import { MainPanel } from './components/MainPanel';
import { PlayerBar } from './components/PlayerBar';
import { useAppStore } from './store/useAppStore';
import { settingsService } from './services/SettingsService';
import { Toast } from './components/Toast';

function App() {
  const loadLibrary = useAppStore(state => state.loadLibrary);
  const settings = useAppStore(state => state.settings);

  useEffect(() => {
    // If a path is already set, load it
    if (settings.musicLibraryPath) {
      loadLibrary();
      return;
    }

    // Try to auto-detect a common music folder
    let cancelled = false;
    (async () => {
      if (window.electronAPI && !settings.musicLibraryPath) {
        const candidate = await window.electronAPI.findDefaultMusicFolder();
        if (candidate && !cancelled) {
          const setMusicLibraryPath = useAppStore.getState().setMusicLibraryPath;
          if (setMusicLibraryPath) {
            await setMusicLibraryPath(candidate);
            useAppStore.getState().showToast(`Auto-detected music folder: ${candidate}`, 'success');
          } else {
            // Fallback: persist using settings service and trigger load
            settingsService.save({ musicLibraryPath: candidate });
            loadLibrary();
          }
        }
      }
    })();

    return () => { cancelled = true };
  }, [loadLibrary, settings.musicLibraryPath]);

  return (
    <div className="flex h-screen bg-gray-900 text-white overflow-hidden font-sans">
      <Sidebar />
      <div className="flex-1 flex flex-col min-w-0">
        <MainPanel />
        <PlayerBar />
      </div>
      <Toast />
    </div>
  );
}

export default App;
