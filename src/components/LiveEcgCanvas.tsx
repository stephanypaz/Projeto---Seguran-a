import React, { useEffect, useRef } from 'react';

interface LiveEcgCanvasProps {
  heartRate: number;
  isNormal?: boolean;
}

export const LiveEcgCanvas: React.FC<LiveEcgCanvasProps> = ({ heartRate, isNormal = true }) => {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    let animationFrameId: number;
    let x = 0;
    const width = canvas.width;
    const height = canvas.height;
    const midY = height / 2;

    // Grid drawing on clinical monitor dark backdrop
    const drawGrid = () => {
      ctx.fillStyle = '#061325';
      ctx.fillRect(0, 0, width, height);

      ctx.strokeStyle = 'rgba(2, 132, 199, 0.15)';
      ctx.lineWidth = 1;

      // Small grid
      for (let gx = 0; gx < width; gx += 10) {
        ctx.beginPath();
        ctx.moveTo(gx, 0);
        ctx.lineTo(gx, height);
        ctx.stroke();
      }
      for (let gy = 0; gy < height; gy += 10) {
        ctx.beginPath();
        ctx.moveTo(0, gy);
        ctx.lineTo(width, gy);
        ctx.stroke();
      }

      // Major grid
      ctx.strokeStyle = 'rgba(2, 132, 199, 0.3)';
      for (let gx = 0; gx < width; gx += 50) {
        ctx.beginPath();
        ctx.moveTo(gx, 0);
        ctx.lineTo(gx, height);
        ctx.stroke();
      }
      for (let gy = 0; gy < height; gy += 50) {
        ctx.beginPath();
        ctx.moveTo(0, gy);
        ctx.lineTo(width, gy);
        ctx.stroke();
      }
    };

    drawGrid();

    // ECG waveform buffer points
    const ecgBuffer: number[] = [];
    const speed = 2.2;
    let cyclePhase = 0;
    const cycleLength = Math.max(30, Math.floor(3600 / heartRate));

    const render = () => {
      // Clear scan bar ahead
      const scanBarWidth = 14;
      ctx.fillStyle = '#061325';
      ctx.fillRect(x, 0, scanBarWidth, height);
      
      // Faint grid redraw in scan zone
      ctx.strokeStyle = 'rgba(2, 132, 199, 0.15)';
      ctx.beginPath();
      ctx.moveTo(x, 0);
      ctx.lineTo(x, height);
      ctx.stroke();

      // Compute ECG wave voltage
      cyclePhase = (cyclePhase + 1) % cycleLength;
      const progress = cyclePhase / cycleLength;

      let yOffset = 0;
      if (progress > 0.1 && progress < 0.18) {
        // P Wave
        yOffset = Math.sin((progress - 0.1) / 0.08 * Math.PI) * -8;
      } else if (progress >= 0.22 && progress < 0.25) {
        // Q Wave (slight dip)
        yOffset = 6;
      } else if (progress >= 0.25 && progress < 0.30) {
        // R Wave (sharp spike up)
        yOffset = -38;
      } else if (progress >= 0.30 && progress < 0.34) {
        // S Wave (sharp spike down)
        yOffset = 14;
      } else if (progress >= 0.45 && progress < 0.60) {
        // T Wave (smooth recovery)
        yOffset = Math.sin((progress - 0.45) / 0.15 * Math.PI) * -12;
      }

      // Add mild physiological noise
      const noise = (Math.random() - 0.5) * 1.5;
      const currentY = midY + yOffset + noise;

      ecgBuffer.push(currentY);
      if (ecgBuffer.length > 2) {
        const prevY = ecgBuffer[ecgBuffer.length - 2];
        const prevX = x - speed;

        ctx.strokeStyle = isNormal ? '#10b981' : '#f59e0b';
        ctx.shadowColor = isNormal ? '#10b981' : '#f59e0b';
        ctx.shadowBlur = 4;
        ctx.lineWidth = 2.2;

        ctx.beginPath();
        ctx.moveTo(prevX < 0 ? width + prevX : prevX, prevY);
        ctx.lineTo(x, currentY);
        ctx.stroke();

        ctx.shadowBlur = 0; // reset
      }

      x += speed;
      if (x >= width) {
        x = 0;
      }

      animationFrameId = requestAnimationFrame(render);
    };

    animationFrameId = requestAnimationFrame(render);

    return () => {
      cancelAnimationFrame(animationFrameId);
    };
  }, [heartRate, isNormal]);

  return (
    <div className="hospital-card overflow-hidden p-3 bg-slate-900 border-slate-800 shadow-md">
      <div className="flex items-center justify-between px-2 py-1 text-xs font-mono text-emerald-400">
        <span className="flex items-center gap-2 font-bold">
          <span className="h-2.5 w-2.5 rounded-full bg-emerald-500 animate-ping" />
          DERIVAÇÃO DII • TELEMETRIA CARDÍACA EM TEMPO REAL
        </span>
        <span className="text-slate-300 font-semibold">25mm/s • 10mm/mV • <strong className="text-emerald-400">{heartRate} BPM</strong></span>
      </div>
      <canvas
        ref={canvasRef}
        width={560}
        height={100}
        className="w-full h-24 block rounded-xl mt-1.5"
      />
    </div>
  );
};
