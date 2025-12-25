import { useState, useMemo } from 'react';
import { useAppStore } from '../store/useAppStore';
import { Clock, Music2, Search } from 'lucide-react';
import { SettingsPage } from './SettingsPage';
import { ErrorBoundary } from './ErrorBoundary';
import Artwork from './Artwork';
import AlbumPage from './AlbumPage';
import ArtistPage from './ArtistPage';

export const MainPanel = () => {
  const currentView = useAppStore(state => state.currentView);
  const currentPlaylist = useAppStore(state => state.currentPlaylist);
  const currentTrack = useAppStore(state => state.currentTrack);
  const playTrack = useAppStore(state => state.playTrack);
  const [searchQuery, setSearchQuery] = useState('');

  const filteredTracks = useMemo(() => {
    if (!currentPlaylist) return [];
    if (!searchQuery) return currentPlaylist.tracks;
    const lower = searchQuery.toLowerCase();
    return currentPlaylist.tracks.filter(t => 
      (t.title && t.title.toLowerCase().includes(lower)) ||
      (t.artist && t.artist.toLowerCase().includes(lower)) ||
      t.filename.toLowerCase().includes(lower)
    );
  }, [currentPlaylist, searchQuery]);

  if (currentView === 'settings') {
    // Wrap settings page in an error boundary to avoid white screens on render errors
    return (
      <ErrorBoundary>
        <SettingsPage />
      </ErrorBoundary>
    ) as any;
  }

  if (currentView === 'album') {
    const sel = useAppStore.getState().selectedAlbum;
    return sel ? (
      <ErrorBoundary>
        <AlbumPage albumName={sel.name} artist={sel.artist} />
      </ErrorBoundary>
    ) as any : null;
  }

  if (currentView === 'artist') {
    const sel = useAppStore.getState().selectedArtist;
    return sel ? (
      <ErrorBoundary>
        <ArtistPage artistName={sel} />
      </ErrorBoundary>
    ) as any : null;
  }

  if (!currentPlaylist) {
    return (
      <div className="flex-1 flex items-center justify-center text-gray-500">
        <div className="text-center">
          <Music2 className="w-16 h-16 mx-auto mb-4 opacity-20" />
          <p>Select a playlist to start listening</p>
        </div>
      </div>
    );
  }

  return (
    <div className="flex-1 overflow-y-auto bg-gradient-to-b from-gray-900 to-black">
      {/* Header */}
      <div className="p-10 flex items-end gap-8 bg-gradient-to-b from-gray-800/50 to-transparent">
        <div className="w-60 h-60 bg-gray-800 shadow-2xl flex items-center justify-center overflow-hidden rounded-lg">
          {currentPlaylist.coverImage ? (
            <img src={`media://${currentPlaylist.path}/${currentPlaylist.coverImage}`} alt="Cover" className="w-full h-full object-cover" />
          ) : currentPlaylist.tracks[0]?.artwork ? (
            <img src={currentPlaylist.tracks[0].artwork} alt="Cover" className="w-full h-full object-cover" />
          ) : (
            <Music2 className="w-20 h-20 text-gray-600" />
          )}
        </div>
        <div className="flex-1">
          <h2 className="text-sm font-semibold uppercase tracking-wider text-gray-300 mb-2">Playlist</h2>
          <h1 className="text-6xl font-extrabold text-white mb-3 leading-tight">{currentPlaylist.title}</h1>
          <p className="text-gray-400 text-base mb-4">{currentPlaylist.description || `${currentPlaylist.tracks.length} tracks`}</p>

          {/* Now Playing preview with animated hover states */}
          {currentTrack && (
            <div className="mt-3 flex items-center gap-6 transform transition-transform duration-300 hover:scale-105 group">
              <div className="w-28 h-28 bg-gray-800 rounded overflow-hidden flex-shrink-0 shadow-lg hover:shadow-2xl transition-shadow duration-300">
                {currentTrack.artwork ? (
                  <Artwork src={currentTrack.artwork} alt={currentTrack.title} />
                ) : (
                  <div className="w-full h-full bg-gray-700" />
                )}
              </div>
              <div>
                <div className="text-2xl font-bold text-white">{currentTrack.title || currentTrack.filename}</div>
                <div className="text-gray-300 mt-1">{currentTrack.artist || 'Unknown Artist'}{currentTrack.album ? ` • ${currentTrack.album}` : ''}</div>
                <div className="text-gray-400 text-sm mt-2">{currentTrack.duration ? formatTime(currentTrack.duration) : '--:--'}</div>
              </div>
            </div>
          )}

          {/* Search Bar */}
          <div className="relative max-w-md mt-6">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
            <input 
              type="text" 
              placeholder="Filter tracks..." 
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full bg-gray-800/50 border border-gray-700 rounded-full py-2 pl-10 pr-4 text-sm text-white focus:outline-none focus:border-green-500 transition-colors"
            />
          </div>
        </div>
      </div>

      {/* Track List */}
      <div className="px-8 pb-8">
        <table className="w-full text-left text-sm text-gray-400">
          <thead className="border-b border-gray-800 text-gray-500 uppercase text-xs">
            <tr>
              <th className="pb-3 w-14" />
              <th className="pb-3 w-12">#</th>
              <th className="pb-3">Title</th>
              <th className="pb-3 w-48">Album</th>
              <th className="pb-3 w-12"><Clock className="w-4 h-4" /></th>
            </tr>
          </thead>
          <tbody>
            {filteredTracks.map((track, index) => (
              <tr 
                key={track.id} 
                className={`group hover:bg-gray-800/50 transition-colors cursor-pointer ${currentTrack?.id === track.id ? 'text-green-500' : ''}`}
                onClick={() => playTrack(track, currentPlaylist)}
              >
                <td className="py-4 pl-2">
                  {track.artwork ? (
                    <div className="w-10 h-10 rounded-md overflow-hidden">
                      <Artwork src={track.artwork} alt={track.title} />
                    </div>
                  ) : (
                    <div className="w-10 h-10 bg-gray-700 rounded-md" />
                  )}
                </td>
                <td className="py-4">{index + 1}</td>
                <td className="py-4">
                  <div className="font-medium text-white group-hover:text-white transition-colors text-base">
                    {track.title || track.filename}
                  </div>
                  <div className="text-sm text-gray-400 flex items-center gap-2">
                  <button onClick={(e) => { e.stopPropagation(); if (track.artist) useAppStore.getState().openArtist(track.artist); }} className="hover:underline">{track.artist || 'Unknown Artist'}</button>
                  <button onClick={(e) => { e.stopPropagation(); (useAppStore.getState() as any).addToQueue(track); }} className="text-xs px-2 py-1 rounded bg-gray-800 hover:bg-gray-700">Add to Queue</button>
                </div>
                </td>
                <td className="py-4 text-gray-300">{track.album ? (
                  <button onClick={(e) => { e.stopPropagation(); useAppStore.getState().openAlbum(track.album!, track.artist); }} className="text-left hover:underline hover:text-white transition-colors">{track.album}</button>
                ) : '-'} </td>
                <td className="py-4">{track.duration ? formatTime(track.duration) : '--:--'}</td>
              </tr>
            ))}
          </tbody>
        </table>
        {filteredTracks.length === 0 && (
          <div className="text-center py-12 text-gray-500">
            No tracks found matching "{searchQuery}"
          </div>
        )}
      </div>
    </div>
  );
};

function formatTime(seconds: number) {
  const mins = Math.floor(seconds / 60);
  const secs = Math.floor(seconds % 60);
  return `${mins}:${secs.toString().padStart(2, '0')}`;
}
