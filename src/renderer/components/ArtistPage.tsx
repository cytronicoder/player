import React, { useEffect, useState } from 'react';
import { albumService } from '../services/AlbumService';
import { useAppStore } from '../store/useAppStore';
import { settingsService } from '../services/SettingsService';

export const ArtistPage: React.FC<{ artistName: string }> = ({ artistName }) => {
  const [artist, setArtist] = useState<any>(null);
  const openLibrary = useAppStore(s => s.openLibrary);

  useEffect(() => {
    let mounted = true;
    (async () => {
      const lib = settingsService.get().musicLibraryPath;
      const data = await albumService.getArtist(lib, artistName);
      if (mounted) setArtist(data);
    })();
    return () => { mounted = false; };
  }, [artistName]);

  if (!artist) return <div className="p-8 text-gray-400">Loading artist...</div>;

  return (
    <div className="p-8 animate-fade-in-up">
      <button className="mb-4 text-sm text-green-400 hover:underline" onClick={() => openLibrary()}>← Back</button>
      <h2 className="text-3xl font-bold text-white mb-2">{artist.name}</h2>
      <div className="text-gray-400 mb-4">{artist.albums?.length || 0} albums</div>

      <div className="space-y-3">
        {(artist.albums || []).map((a: string) => (
          <div key={a} className="py-2 px-3 rounded hover:bg-gray-800/40 transition-colors">{a}</div>
        ))}
      </div>
    </div>
  );
};

export default ArtistPage;
