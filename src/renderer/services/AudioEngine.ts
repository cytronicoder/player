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
    // In Electron, we might need to handle file protocol or stream
    // For now, assuming a file:// URL or blob URL is passed
    this.audio.src = path;
    this.audio.preload = 'auto';

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
      const onErr = (e: any) => {
        this.audio.removeEventListener('error', onErr);
        reject(new Error('Error loading audio'));
      };
      this.audio.addEventListener('loadedmetadata', onLoaded);
      this.audio.addEventListener('error', onErr);
      // ensure the browser begins loading
      try { this.audio.load(); } catch (e) {}
    });
  }
  play() {
    if (this.context.state === 'suspended') {
      this.context.resume();
    }
    return this.audio.play();
  }

  pause() {
    this.audio.pause();
  }

  stop() {
    this.audio.pause();
    this.audio.currentTime = 0;
  }

  seek(time: number) {
    this.audio.currentTime = time;
  }

  setVolume(value: number) {
    // Value 0.0 to 1.0
    this.gainNode.gain.value = value;
  }

  setEQ(bands: EQBand[]) {
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
