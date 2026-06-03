import { useRef, useState, useEffect } from 'react';
import { Socket } from 'socket.io-client';

interface CanvasProps {
  socket: Socket;
  roomId: string;
  isArtist: boolean;
}

interface DrawLineData {
  prevPoint: { x: number; y: number } | null;
  currentPoint: { x: number; y: number };
  color: string;
  width: number;
}

export default function Canvas({ socket, roomId, isArtist }: CanvasProps) {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const [isDrawing, setIsDrawing] = useState(false);
  const [color, setColor] = useState('#000000');
  const [width, setWidth] = useState(5);
  const prevPoint = useRef<{ x: number; y: number } | null>(null);

  useEffect(() => {
    // Sync incoming brush coordinates
    socket.on('draw_received', (data: DrawLineData) => {
      drawLine(data.prevPoint, data.currentPoint, data.color, data.width);
    });

    // Wipe board clean execution signal
    socket.on('clear_canvas', () => {
      clearLocalCanvas();
    });

    return () => {
      socket.off('draw_received');
      socket.off('clear_canvas');
    };
  }, [socket]);

  const drawLine = (
    start: { x: number; y: number } | null,
    end: { x: number; y: number },
    lineColor: string,
    lineWidth: number
  ) => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    ctx.beginPath();
    ctx.strokeStyle = lineColor;
    ctx.lineWidth = lineWidth;
    ctx.lineCap = 'round';
    ctx.lineJoin = 'round';

    if (start) {
      ctx.moveTo(start.x, start.y);
    } else {
      ctx.moveTo(end.x, end.y);
    }
    ctx.lineTo(end.x, end.y);
    ctx.stroke();
  };

  const clearLocalCanvas = () => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;
    ctx.clearRect(0, 0, canvas.width, canvas.height);
  };

  const requestClearCanvas = () => {
    socket.emit('clear_canvas_request', { roomId });
  };

  const handleMouseDown = (e: React.MouseEvent<HTMLCanvasElement>) => {
    if (!isArtist) return; // Prevent guessers from firing events
    setIsDrawing(true);
    const coords = getRelativeCoords(e);
    prevPoint.current = coords;
    drawLine(null, coords, color, width);
  };

  const handleMouseMove = (e: React.MouseEvent<HTMLCanvasElement>) => {
    if (!isDrawing || !isArtist) return;

    const currentPoint = getRelativeCoords(e);
    const drawData: DrawLineData = {
      prevPoint: prevPoint.current,
      currentPoint,
      color,
      width,
    };

    drawLine(drawData.prevPoint, drawData.currentPoint, drawData.color, drawData.width);
    socket.emit('draw', { roomId, data: drawData });
    prevPoint.current = currentPoint;
  };

  const handleMouseUpOrLeave = () => {
    setIsDrawing(false);
    prevPoint.current = null;
  };

  const getRelativeCoords = (e: React.MouseEvent<HTMLCanvasElement>) => {
    const canvas = canvasRef.current;
    if (!canvas) return { x: 0, y: 0 };
    const rect = canvas.getBoundingClientRect();
    return {
      x: e.clientX - rect.left,
      y: e.clientY - rect.top,
    };
  };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem', alignItems: 'center' }}>
      
      {/* Tool Toolbar Block Panel */}
      <div style={{ display: 'flex', gap: '1rem', background: '#f0f0f0', padding: '0.5rem 1rem', borderRadius: '8px', width: '100%', justifyContent: 'space-between', alignItems: 'center' }}>
        <div style={{ display: 'flex', gap: '1rem', alignItems: 'center' }}>
          <input type="color" value={color} onChange={(e) => setColor(e.target.value)} disabled={!isArtist} />
          <input 
            type="range" 
            min="2" 
            max="20" 
            value={width} 
            onChange={(e) => setWidth(Number(e.target.value))} 
            disabled={!isArtist}
          />
          <span style={{ fontSize: '0.9rem' }}>Size: {width}px</span>
        </div>
        
        {isArtist && (
          <button onClick={requestClearCanvas} style={{ padding: '4px 12px', background: '#dc3545', color: '#fff', border: 'none', borderRadius: '4px', cursor: 'pointer', fontWeight: 'bold' }}>
            🗑️ Clear Board
          </button>
        )}
      </div>

      <canvas
        ref={canvasRef}
        width={500}
        height={380}
        onMouseDown={handleMouseDown}
        onMouseMove={handleMouseMove}
        onMouseUp={handleMouseUpOrLeave}
        onMouseLeave={handleMouseUpOrLeave}
        style={{ border: '2px solid #333', borderRadius: '8px', background: '#fff', cursor: isArtist ? 'crosshair' : 'not-allowed' }}
      />
    </div>
  );
}