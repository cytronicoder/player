Manual Testing Guide — Player App

This document lists manual verification steps and small dev helpers for the new features:

1) Album / Artist pages
- Open the app and select a playlist that contains album info.
- From the track list, click an album name to open the Album page. Verify:
  - Album title, artist, release year (if present), artwork, and track list are shown.
  - Clicking a track in the Album page starts playing that track.
- From the track list, click the artist name to open the Artist page. Verify:
  - Artist name and album list are shown.

2) Animated transitions & hover states
- Hover over the Now Playing area: it should scale slightly and show a shadow.
- Open an Album or Artist page and observe the entrance animation (fade-up).

3) Preload behavior (next-track preloading)
- Note: Selecting a playlist should NOT start playback automatically. "Autoplay" controls automatic playing of the *next* track after the current one finishes, not the initial selection.
- Play a track, ensure Settings > Autoplay is OFF (so the next track is preloaded for manual play).
- While the current track plays, observe in Dev Tools console (or Settings > Developer Tools) that the next track is being preloaded.
- When playback ends, the next track should be selectable and start quickly when you press play.
- Use the Developer Tools button "Clear Audio Preloads" to cancel any in-flight preloads and verify behavior.

4) Album art caching & progressive thumbnails
- Artwork is shown as a quick low-res thumbnail and then transitions to full-res image.
- Use Settings > Developer Tools > "Thumb Count" to see how many thumbnails are cached.
- Use "Evict All Thumbs" to clear the thumbnail cache and verify that thumbnails are regenerated on the next load.

Developer helpers (only in development builds)
- `window.thumbCache.evict()` — evict thumbnails (Promise)
- `window.thumbCache.stats()` — get thumbnail stats (Promise<{count:number}>)
- `window.audioEngine.preload(path)` — preload a file path (Promise)
- `window.audioEngine.clear()` — clear all preloads

Notes / TODOs
- Consider adding automated tests (Vitest) for ThumbnailCache and AudioEngine preloads — omitted to keep the change small.
- Eviction currently uses a simple oldest-first policy with a default cap of 200 entries.

If anything behaves unexpectedly, paste renderer console logs and a short description and I will iterate quickly.