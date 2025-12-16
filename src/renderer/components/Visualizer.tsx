import React, { useEffect, useRef } from 'react';
import { audioEngine } from '../services/AudioEngine';

interface VisualizerProps {
  width?: number;
  height?: number;
  color?: string;
}

export const Visualizer: React.FC<VisualizerProps> = ({ 
  width = 300, 
  height = 50, 
  color = '#10b981' // emerald-500
}) => {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const animationRef = useRef<number>();

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const analyser = audioEngine.getAnalyserNode();
    analyser.fftSize = 256;
    const bufferLength = analyser.frequencyBinCount;
    const dataArray = new Uint8Array(bufferLength);

    const draw = () => {
      animationRef.current = requestAnimationFrame(draw);

      analyser.getByteFrequencyData(dataArray);

      ctx.clearRect(0, 0, canvas.width, canvas.height);

      const barWidth = (canvas.width / bufferLength) * 2.5;
      let barHeight;
      let x = 0;

      for (let i = 0; i < bufferLength; i++) {
        barHeight = (dataArray[i] / 255) * canvas.height;

        ctx.fillStyle = color;
        // Draw rounded bars
        ctx.fillRect(x, canvas.height - barHeight, barWidth, barHeight);

        x += barWidth + 1;
      }
    };

    draw();

    return () => {
      if (animationRef.current) {
        cancelAnimationFrame(animationRef.current);
      }
    };
  }, [color]);

  return (
    <canvas 
      ref={canvasRef} 
      width={width} 
      height={height} 
      className="opacity-80"
    />
  );
};
