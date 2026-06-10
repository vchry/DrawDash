import React, { useRef, useState, useEffect, useCallback } from 'react';
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

// Recreating the 2-row color palette from the image
const COLORS = [
  ['#ffffff', '#c1c1c1', '#ef130b', '#ff7100', '#ffe400', '#00cc00', '#00b2ff', '#231fd3', '#a300ba', '#d37caa', '#a0522d'],
  ['#000000', '#4c4c4c', '#740b07', '#c23800', '#e8a200', '#005510', '#00569e', '#0e0865', '#550069', '#a75574', '#63300d']
];

export default function Canvas({ socket, roomId, isArtist }: CanvasProps) {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const prevPoint = useRef<{ x: number; y: number } | null>(null);
  
  // State
  const [isDrawing, setIsDrawing] = useState(false);
  const [color, setColor] = useState('#000000');
  const [width, setWidth] = useState(5);
  const [activeTool, setActiveTool] = useState<'brush' | 'fill'>('brush');
  
  // Undo History Stack
  const [history, setHistory] = useState<string[]>([]);

  // -------------------------
  // Sockets & Network
  // -------------------------
  useEffect(() => {
    socket.on('draw_received', (data: DrawLineData) => {
      drawLine(data.prevPoint, data.currentPoint, data.color, data.width);
    });

    socket.on('clear_canvas', () => {
      clearLocalCanvas();
    });
    
    socket.on('undo_received', (canvasState: string) => {
      restoreCanvasState(canvasState);
    });

    return () => {
      socket.off('draw_received');
      socket.off('clear_canvas');
      socket.off('undo_received');
    };
  }, [socket]);

  // -------------------------
  // Keyboard Shortcuts
  // -------------------------
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (!isArtist) return;
      const key = e.key.toLowerCase();
      
      if (key === 'b') setActiveTool('brush');
      if (key === 'f') setActiveTool('fill');
      if (key === 'u') handleUndo();
      if (key === 'c') requestClearCanvas();
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isArtist, history]); // Re-bind when history changes for Undo

  // -------------------------
  // Canvas Operations
  // -------------------------
  const saveHistory = () => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    setHistory((prev) => [...prev, canvas.toDataURL()]);
  };

  const handleUndo = () => {
    if (history.length === 0) {
      requestClearCanvas(); // If no history, just clear
      return;
    }
    
    const newHistory = [...history];
    const previousState = newHistory.pop();
    setHistory(newHistory);
    
    if (previousState) {
      restoreCanvasState(previousState);
      socket.emit('undo_request', { roomId, state: previousState });
    }
  };

  const restoreCanvasState = (dataUrl: string) => {
    const canvas = canvasRef.current;
    const ctx = canvas?.getContext('2d');
    if (!canvas || !ctx) return;

    const img = new Image();
    img.src = dataUrl;
    img.onload = () => {
      ctx.clearRect(0, 0, canvas.width, canvas.height);
      ctx.drawImage(img, 0, 0);
    };
  };

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
    const ctx = canvas?.getContext('2d');
    if (!canvas || !ctx) return;
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    setHistory([]);
  };

  const requestClearCanvas = () => {
    saveHistory();
    socket.emit('clear_canvas_request', { roomId });
    clearLocalCanvas();
  };

  // -------------------------
  // Mouse Events
  // -------------------------
  const handleMouseDown = (e: React.MouseEvent<HTMLCanvasElement>) => {
    if (!isArtist) return;
    const coords = getRelativeCoords(e);
    saveHistory(); // Save state before new stroke or fill

    if (activeTool === 'fill') {
      // NOTE: Insert Flood-Fill logic here for true bucket fill
      // For now, it paints the entire background as a placeholder
      const canvas = canvasRef.current;
      const ctx = canvas?.getContext('2d');
      if (ctx && canvas) {
        ctx.fillStyle = color;
        ctx.fillRect(0, 0, canvas.width, canvas.height);
      }
      return;
    }

    setIsDrawing(true);
    prevPoint.current = coords;
    drawLine(null, coords, color, width);
  };

  const handleMouseMove = (e: React.MouseEvent<HTMLCanvasElement>) => {
    if (!isDrawing || !isArtist || activeTool === 'fill') return;

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

  // -------------------------
  // Styles
  // -------------------------
  const toolBtnStyle = (isActive: boolean) => ({
    position: 'relative' as const,
    width: '40px',
    height: '40px',
    background: isActive ? '#b499ff' : '#ffffff',
    border: '2px solid #a3a3a3',
    borderRadius: '4px',
    cursor: isArtist ? 'pointer' : 'not-allowed',
    display: 'flex',
    justifyContent: 'center',
    alignItems: 'center',
    fontSize: '20px'
  });

  const shortcutBadgeStyle = {
    position: 'absolute' as const,
    top: '2px',
    left: '4px',
    fontSize: '10px',
    fontWeight: 'bold',
    color: '#333'
  };

  return (
    <div style={{ 
      display: 'flex', 
      flexDirection: 'column', 
      alignItems: 'center',
      background: '#24529a', // Blue background from image
      padding: '1rem',
      borderRadius: '8px',
      width: 'max-content'
    }}>
      
      {/* Canvas Area */}
      <canvas
        ref={canvasRef}
        width={800}
        height={500}
        onMouseDown={handleMouseDown}
        onMouseMove={handleMouseMove}
        onMouseUp={handleMouseUpOrLeave}
        onMouseLeave={handleMouseUpOrLeave}
        style={{ 
          background: '#fff', 
          cursor: isArtist 
            ? (activeTool === 'fill' ? 'url(bucket-cursor.png), crosshair' : 'crosshair') 
            : 'not-allowed',
          display: 'block'
        }}
      />

      {/* Bottom Toolbar */}
      <div style={{ 
        display: 'flex', 
        width: '100%', 
        marginTop: '8px', 
        justifyContent: 'space-between',
        alignItems: 'center'
      }}>
        
        {/* Left: Colors */}
        <div style={{ display: 'flex', gap: '8px' }}>
          {/* Current Color Preview */}
          <div style={{ 
            width: '40px', 
            height: '40px', 
            background: color, 
            border: '2px solid #a3a3a3',
            borderRadius: '4px'
          }} />

          {/* Color Grid */}
          <div style={{ display: 'flex', flexDirection: 'column' }}>
            {COLORS.map((row, rowIndex) => (
              <div key={rowIndex} style={{ display: 'flex' }}>
                {row.map((c) => (
                  <div
                    key={c}
                    onClick={() => isArtist && setColor(c)}
                    style={{
                      width: '20px',
                      height: '20px',
                      background: c,
                      cursor: isArtist ? 'pointer' : 'not-allowed',
                      borderRight: '1px solid #000',
                      borderBottom: '1px solid #000'
                    }}
                  />
                ))}
              </div>
            ))}
          </div>
        </div>

        {/* Middle: Brush Sizes */}
        <div style={{ 
            width: '40px', 
            height: '40px', 
            background: '#fff',
            border: '2px solid #a3a3a3',
            borderRadius: '4px',
            display: 'flex',
            justifyContent: 'center',
            alignItems: 'center',
            cursor: isArtist ? 'pointer' : 'not-allowed'
          }}
          onClick={() => isArtist && setWidth(w => w >= 20 ? 4 : w + 6)}
          title="Click to change size"
        >
          <div style={{ 
            width: `${width}px`, 
            height: `${width}px`, 
            background: '#000', 
            borderRadius: '50%' 
          }} />
        </div>

        {/* Right: Tools */}
        <div style={{ display: 'flex', gap: '8px' }}>
          <button style={toolBtnStyle(activeTool === 'brush')} onClick={() => isArtist && setActiveTool('brush')}>
            <span style={shortcutBadgeStyle}>B</span>
            🖌️
          </button>
          
          <button style={toolBtnStyle(activeTool === 'fill')} onClick={() => isArtist && setActiveTool('fill')}>
            <span style={shortcutBadgeStyle}>F</span>
            🪣
          </button>
          
          <button style={toolBtnStyle(false)} onClick={() => isArtist && handleUndo()}>
            <span style={shortcutBadgeStyle}>U</span>
            ↩️
          </button>
          
          <button style={toolBtnStyle(false)} onClick={() => isArtist && requestClearCanvas()}>
            <span style={shortcutBadgeStyle}>C</span>
            🗑️
          </button>
        </div>

      </div>
    </div>
  );
}