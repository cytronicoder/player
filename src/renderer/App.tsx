import React, { useEffect } from 'react';
import * as ReactDOMClient from 'react-dom/client';
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
    // Apply theme
    try {
      if (settings.theme === 'light') {
        document.documentElement.classList.add('theme-light');
        document.documentElement.classList.remove('theme-dark');
      } else {
        document.documentElement.classList.add('theme-dark');
        document.documentElement.classList.remove('theme-light');
      }
    } catch (e) {
      console.error('Failed to apply theme', e);
    }

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

  // Dev helpers
  useEffect(() => {
    if (process.env.NODE_ENV === 'development') {
      // @ts-ignore
      window.thumbCache = {
        evict: (max?: number) => import('./services/ThumbnailCache').then(m => m.evictOldThumbnails(max)),
        stats: () => import('./services/ThumbnailCache').then(m => m.getThumbStats())
      };
      // Expose audio preload controls
      // @ts-ignore
      window.audioEngine = {
        preload: (p: string) => import('./services/AudioEngine').then(m => m.audioEngine.preload(p)),
        clear: () => import('./services/AudioEngine').then(m => m.audioEngine.clearPreloads())
      };
    }
  }, []);

  // Mount queue panel into a portal-like element so it can overlay
  useEffect(() => {
    const root = document.getElementById('__queue_root');
    if (!root) return;
    const el = document.createElement('div');
    root.appendChild(el);
    let mounted = true;
    import('./components/QueuePanel').then(m => {
      if (!mounted) return;
      const reactRoot = ReactDOMClient.createRoot(el);
      reactRoot.render(React.createElement(m.QueuePanel));
    });
    return () => {
      mounted = false;
      try { root.removeChild(el); } catch (e) {}
    };
    // Re-run when the queue panel visibility changes to mount/unmount
  }, [useAppStore(state => state.showQueuePanel)]);

  return (
    <div className="flex h-screen bg-gray-900 text-white overflow-hidden font-sans">
      <Sidebar />
      <div className="flex-1 flex flex-col min-w-0">
        <MainPanel />
        <PlayerBar />
      </div>
      <Toast />
      {/* Queue panel */}
      {useAppStore.getState().showQueuePanel && <div id="__queue_root" />}
    </div>
  );
}

export default App;
