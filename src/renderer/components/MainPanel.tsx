import { useState, useMemo } from 'react';
import { useAppStore } from '../store/useAppStore';
import { Clock, Music2, Search } from 'lucide-react';

export const MainPanel = () => {
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
      <div className="p-8 flex items-end gap-6 bg-gradient-to-b from-gray-800/50 to-transparent">
        <div className="w-48 h-48 bg-gray-800 shadow-2xl flex items-center justify-center overflow-hidden rounded-lg">
          {currentPlaylist.coverImage ? (
            <img src={`media://${currentPlaylist.path}/${currentPlaylist.coverImage}`} alt="Cover" className="w-full h-full object-cover" />
          ) : currentPlaylist.tracks[0]?.artwork ? (
            <img src={currentPlaylist.tracks[0].artwork} alt="Cover" className="w-full h-full object-cover" />
          ) : (
            <Music2 className="w-16 h-16 text-gray-600" />
          )}
        </div>
        <div className="flex-1">
          <h2 className="text-sm font-bold uppercase tracking-wider text-white mb-2">Playlist</h2>
          <h1 className="text-5xl font-bold text-white mb-4">{currentPlaylist.title}</h1>
          <p className="text-gray-400 text-sm mb-4">{currentPlaylist.description || `${currentPlaylist.tracks.length} tracks`}</p>
          
          {/* Search Bar */}
          <div className="relative max-w-md">
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
              <th className="pb-3 w-12">#</th>
              <th className="pb-3">Title</th>
              <th className="pb-3">Album</th>
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
                <td className="py-3 pl-2">{index + 1}</td>
                <td className="py-3">
                  <div className="font-medium text-white group-hover:text-white transition-colors">
                    {track.title || track.filename}
                  </div>
                  <div className="text-xs text-gray-500">{track.artist || 'Unknown Artist'}</div>
                </td>
                <td className="py-3">{track.album || '-'}</td>
                <td className="py-3">{track.duration ? formatTime(track.duration) : '--:--'}</td>
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
