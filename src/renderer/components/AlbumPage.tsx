import React, { useEffect, useState } from 'react';
import { albumService } from '../services/AlbumService';
import { useAppStore } from '../store/useAppStore';
import { settingsService } from '../services/SettingsService';
import Artwork from './Artwork';

export const AlbumPage: React.FC<{ albumName: string; artist?: string }> = ({ albumName, artist }) => {
  const [album, setAlbum] = useState<any>(null);
  const openLibrary = useAppStore(s => s.openLibrary);
  const playTrack = useAppStore(s => s.playTrack);

  useEffect(() => {
    let mounted = true;
    (async () => {
      const lib = settingsService.get().musicLibraryPath;
      const data = await albumService.getAlbum(lib, albumName, artist);
      if (mounted) setAlbum(data);
    })();
    return () => { mounted = false; };
  }, [albumName, artist]);

  if (!album) return <div className="p-8 text-gray-400">Loading album...</div>;

  return (
    <div className="p-8 animate-fade-in-up">
      <button className="mb-4 text-sm text-green-400 hover:underline" onClick={() => openLibrary()}>← Back</button>
      <div className="flex gap-6 items-center mb-6">
        <div className="w-48 h-48 rounded overflow-hidden shadow-lg">
          <Artwork src={album.artwork} alt={album.name} />
        </div>
        <div>
          <h2 className="text-3xl font-bold text-white">{album.name}</h2>
          <div className="text-gray-300 mt-1">{album.artist}</div>
          {album.year && <div className="text-gray-400 mt-2">Released: {album.year}</div>}
          <div className="text-gray-400 mt-2">{album.tracks.length} tracks</div>
        </div>
      </div>

      <div className="space-y-2">
        {album.tracks.map((t: any, i: number) => {
          const playlistObj = {
            id: `${album.name}::album`,
            title: album.name,
            description: album.artist,
            coverImage: album.artwork,
            createdAt: new Date().toISOString(),
            lastModified: new Date().toISOString(),
            sortMode: 'trackNumber',
            loopDefault: false,
            path: settingsService.get().musicLibraryPath,
            tracks: album.tracks.map((tt: any) => ({ id: tt.path, filename: tt.title || tt.path.split('/').pop(), path: tt.path, format: tt.path.split('.').pop() }))
          };
          const trackObj = { id: t.path, filename: t.title || t.path.split('/').pop(), path: t.path, format: t.path.split('.').pop() };
          return (
            <div key={t.path} className="flex items-center gap-4 py-2 px-3 rounded hover:bg-gray-800/40 transition-colors cursor-pointer" onClick={() => playTrack(trackObj as any, playlistObj as any)}>
              <div className="text-gray-400 w-8">{i+1}</div>
              <div className="flex-1 text-white">{t.title || t.path.split('/').pop()}</div>
              <div className="text-gray-400">{t.duration ? t.duration : ''}</div>
              <div>
                <button onClick={(e) => { e.stopPropagation(); (useAppStore.getState() as any).addToQueue(trackObj as any); }} className="ml-3 text-xs px-2 py-1 rounded bg-gray-800 hover:bg-gray-700">Add to Queue</button>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
};

export default AlbumPage;
