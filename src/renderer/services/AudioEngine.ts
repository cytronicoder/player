import { EQBand } from '../../shared/types';

export class AudioEngine {
  private context: AudioContext;
  private source: MediaElementAudioSourceNode | null = null;
  private gainNode: GainNode;
  private eqNodes: BiquadFilterNode[] = [];
  private analyser: AnalyserNode;
  private audio: HTMLAudioElement;

  private readonly EQ_FREQUENCIES = [32, 64, 125, 250, 500, 1000, 2000, 4000, 8000, 16000];

  constructor() {
    this.context = new (window.AudioContext || (window as any).webkitAudioContext)();
    this.audio = new Audio();
    this.audio.crossOrigin = 'anonymous';
    
    // Create nodes
    this.gainNode = this.context.createGain();
    this.analyser = this.context.createAnalyser();
    
    // Initialize EQ nodes
    this.eqNodes = this.EQ_FREQUENCIES.map(freq => {
      const node = this.context.createBiquadFilter();
      node.type = 'peaking';
      node.frequency.value = freq;
      node.Q.value = 1; // Quality factor
      node.gain.value = 0;
      return node;
    });

    // Connect pipeline: Source -> Gain -> EQ[0] -> ... -> EQ[n] -> Analyser -> Destination
    // Note: Source is connected when track loads
  }

  private connectGraph() {
    if (!this.source) return;

    try {
      this.source.disconnect();
    } catch (e) {}
    try { this.gainNode.disconnect(); } catch (e) {}
    this.eqNodes.forEach(node => { try { node.disconnect(); } catch (e) {} });
    try { this.analyser.disconnect(); } catch (e) {}

    let currentNode: AudioNode = this.source;
    
    // Connect to Gain
    currentNode.connect(this.gainNode);
    currentNode = this.gainNode;

    // Connect through EQ chain
    this.eqNodes.forEach(node => {
      currentNode.connect(node);
      currentNode = node;
    });

    // Connect to Analyser
    currentNode.connect(this.analyser);
    
    // Connect to Destination
    this.analyser.connect(this.context.destination);
  }

  async loadTrack(path: string) {
    // Handle local file paths by converting to media:// protocol
    // This avoids "Not allowed to load local resource" errors in Electron
    let src = path;

    // If caller passed a file:// URL, normalize it to an absolute path
    if (src.startsWith('file://')) {
      try {
        const urlObj = new URL(src);
        src = decodeURIComponent(urlObj.pathname);
        console.debug('[AudioEngine] normalized file:// to path:', src);
      } catch (err) {
        console.warn('[AudioEngine] failed to parse file:// URL, using raw value', src, err);
      }
    }

    if (!src.startsWith('http') && !src.startsWith('media://')) {
      src = `media://${src}`;
    }

    console.log('[AudioEngine] loading track:', path, ' -> src:', src);
    this.audio.src = src;
    this.audio.preload = 'auto';

    // create a runtime error handler on the audio element
    const onElemErr = (ev: any) => {
      console.error('[AudioEngine] audio element error event', ev);
    };
    this.audio.addEventListener('error', onElemErr);

    // Create source if not already created
    if (!this.source) {
      this.source = this.context.createMediaElementSource(this.audio);
      this.connectGraph();
    } else {
      // ensure graph is connected
      this.connectGraph();
    }

    // Wait for metadata to be loaded (duration)
    return await new Promise<number>((resolve, reject) => {
      const onLoaded = () => {
        this.audio.removeEventListener('loadedmetadata', onLoaded);
        this.audio.removeEventListener('error', onErr);
        this.audio.removeEventListener('error', onElemErr);
        console.log('[AudioEngine] loaded metadata, duration:', this.audio.duration);
        resolve(this.audio.duration || 0);
      };
      const onErr = (_e: any) => {
        this.audio.removeEventListener('error', onErr);
        this.audio.removeEventListener('error', onElemErr);
        console.error('[AudioEngine] error loading audio', _e);
        reject(new Error('Error loading audio'));
      };
      this.audio.addEventListener('loadedmetadata', onLoaded);
      this.audio.addEventListener('error', onErr);
      // ensure the browser begins loading
      try { this.audio.load(); } catch (e) { console.error('[AudioEngine] audio.load() threw', e); }
    });

    // Create source if not already created
    if (!this.source) {
      this.source = this.context.createMediaElementSource(this.audio);
      this.connectGraph();
    } else {
      // ensure graph is connected
      this.connectGraph();
    }

    // Wait for metadata to be loaded (duration)
    return await new Promise<number>((resolve, reject) => {
      const onLoaded = () => {
        this.audio.removeEventListener('loadedmetadata', onLoaded);
        resolve(this.audio.duration || 0);
      };
      const onErr = (_e: any) => {
        this.audio.removeEventListener('error', onErr);
        reject(new Error('Error loading audio'));
      };
      this.audio.addEventListener('loadedmetadata', onLoaded);
      this.audio.addEventListener('error', onErr);
      // ensure the browser begins loading
      try { this.audio.load(); } catch (e) {}
    });
  }
  async play() {
    if (this.context.state === 'suspended') {
      await this.context.resume();
      console.debug('[AudioEngine] resumed audio context');
    }
    console.log('[AudioEngine] play() called');
    return this.audio.play();
  }

  pause() {
    console.log('[AudioEngine] pause() called');
    this.audio.pause();
  }

  stop() {
    console.log('[AudioEngine] stop() called');
    this.audio.pause();
    this.audio.currentTime = 0;
  }

  seek(time: number) {
    console.debug('[AudioEngine] seek to', time);
    this.audio.currentTime = time;
  }

  setVolume(value: number) {
    console.debug('[AudioEngine] setVolume', value);
    // Value 0.0 to 1.0
    this.gainNode.gain.value = value;
  }

  setEQ(bands: EQBand[]) {
    console.debug('[AudioEngine] setEQ', bands);
    bands.forEach((band, index) => {
      if (this.eqNodes[index]) {
        this.eqNodes[index].gain.value = Math.max(-12, Math.min(12, band.gain));
      }
    });
  }

  getAnalyserNode() {
    return this.analyser;
  }

  // Event listeners
  onEnded(callback: () => void) {
    this.audio.onended = callback;
  }

  onTimeUpdate(callback: (time: number) => void) {
    this.audio.ontimeupdate = () => callback(this.audio.currentTime);
  }
}

export const audioEngine = new AudioEngine();
