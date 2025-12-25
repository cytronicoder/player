import React, { useEffect, useState } from 'react';
import { getThumb, setThumb, generateThumbnailFromDataUrl } from '../services/ThumbnailCache';

export const Artwork: React.FC<{ src?: string; alt?: string; className?: string }> = ({ src, alt, className }) => {
  const [thumb, setThumbState] = useState<string | null>(null);
  const [loaded, setLoaded] = useState(false);

  useEffect(() => {
    let mounted = true;
    if (!src) return;
    // Hash key: use a prefix of dataURL or src path as key
    const key = `thumb::${src.slice(0, 200)}`;
    (async () => {
      try {
        const cached = await getThumb(key);
        if (cached && mounted) {
          setThumbState(cached);
        } else if (src.startsWith('data:')) {
          // generate thumbnail and cache it
          const generated = await generateThumbnailFromDataUrl(src);
          await setThumb(key, generated);
          if (mounted) setThumbState(generated);
        } else if (src.startsWith('media://') || src.startsWith('file://')) {
          // remote file path: don't attempt to fetch image binary here (it may be slow), rely on cached art from metadata
          // nothing to do; the full-res img will load when inserted in DOM
        }
      } catch (e) {
        console.debug('[Artwork] thumb load/generate failed', e);
      }
    })();
    return () => { mounted = false; };
  }, [src]);

  // small UX polish: show skeleton until either thumb or full image loads
  const skeleton = !thumb && !src;

  // Progressive: show thumbnail quickly (low-res), then fade to full src
  return (
    <div className={`relative ${className || ''}`}>
      {skeleton && (
        <div className="w-full h-full bg-gray-700 animate-pulse" />
      )}
      {thumb && (
        <img src={thumb} alt={alt} className={`absolute inset-0 w-full h-full object-cover transition-opacity duration-300 ${loaded ? 'opacity-0' : 'opacity-100'}`} />
      )}
      {src && (
        <img src={src} alt={alt} className={`w-full h-full object-cover transition-opacity duration-300 ${loaded ? 'opacity-100' : 'opacity-0'}`} onLoad={() => setLoaded(true)} onError={() => setLoaded(true)} />
      )}
    </div>
  );
};

export default Artwork;
