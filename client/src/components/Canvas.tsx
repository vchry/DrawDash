import React, { useRef, useState, useEffect } from "react";
import { Socket } from "socket.io-client";

interface CanvasProps {
  socket: Socket;
  roomId: string;
  isArtist: boolean;
  color: string;
  width: number;
  setWidth: (width: number) => void;
  activeTool: "brush" | "fill";
  setActiveTool: (tool: "brush" | "fill") => void;
}

interface DrawLineData {
  prevPoint: { x: number; y: number } | null;
  currentPoint: { x: number; y: number };
  color: string;
  width: number;
}

interface FillData {
  x: number;
  y: number;
  color: string;
}

export default function Canvas({
  socket,
  roomId,
  isArtist,
  color,
  width,
  setWidth,
  activeTool,
  setActiveTool,
}: CanvasProps) {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const prevPoint = useRef<{ x: number; y: number } | null>(null);

  const [isDrawing, setIsDrawing] = useState(false);
  const [history, setHistory] = useState<string[]>([]);
  const [hotkeys, setHotkeys] = useState(() => {
    const saved = localStorage.getItem("hotkeys");

    if (saved) {
      return JSON.parse(saved);
    }

    return {
      Brush: "B",
      Fill: "F",
      Undo: "U",
      Clear: "C",
      Swap: "S",
    };
  });

  useEffect(() => {
    const handleHotkeysChanged = (event: Event) => {
      const customEvent = event as CustomEvent;

      setHotkeys(customEvent.detail);
    };

    window.addEventListener("hotkeys-changed", handleHotkeysChanged);

    return () => {
      window.removeEventListener("hotkeys-changed", handleHotkeysChanged);
    };
  }, []);

  // -------------------------
  // Sockets, Hotkeys & Toolbar Listeners
  // -------------------------

  useEffect(() => {
    console.log("Loaded hotkeys:", hotkeys);
  }, [hotkeys]);

  useEffect(() => {
    socket.on("draw_received", (data: DrawLineData) => {
      drawLine(data.prevPoint, data.currentPoint, data.color, data.width);
    });

    socket.on("fill_received", (data: FillData) => {
      if (canvasRef.current) {
        runFloodFill(canvasRef.current, data.x, data.y, data.color);
      }
    });

    socket.on("clear_canvas", () => {
      clearLocalCanvas();
    });

    socket.on("undo_received", (canvasState: string) => {
      restoreCanvasState(canvasState);
    });

    window.addEventListener("canvas-undo", handleUndo);
    window.addEventListener("canvas-clear", requestClearCanvas);

    return () => {
      socket.off("draw_received");
      socket.off("fill_received");
      socket.off("clear_canvas");
      socket.off("undo_received");
      window.removeEventListener("canvas-undo", handleUndo);
      window.removeEventListener("canvas-clear", requestClearCanvas);
    };
  }, [socket, history]);

  // Handle hotkeys
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      console.log("Canvas key:", e.key);
      console.log("Current hotkeys:", hotkeys);
      if (!isArtist) return;
      const key = e.key.toLowerCase();

      if (key === hotkeys.Brush.toLowerCase()) {
        setActiveTool("brush");
      }

      if (key === hotkeys.Fill.toLowerCase()) {
        setActiveTool("fill");
      }

      if (key === hotkeys.Undo.toLowerCase()) {
        handleUndo();
      }

      if (key === hotkeys.Clear.toLowerCase()) {
        requestClearCanvas();
      }
    };

    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [isArtist, history, setActiveTool, hotkeys]);

  // Handle scrolling to change brush size
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const handleWheel = (e: WheelEvent) => {
      if (!isArtist) return;
      e.preventDefault();

      const step = 1;
      const minSize = 1;
      const maxSize = 50;

      const nextWidth = e.deltaY < 0 ? width + step : width - step;
      setWidth(Math.max(minSize, Math.min(maxSize, nextWidth)));
    };

    canvas.addEventListener("wheel", handleWheel, { passive: false });
    return () => canvas.removeEventListener("wheel", handleWheel);
  }, [isArtist, width, setWidth]);

  // -------------------------
  // Canvas Operations & Algorithms
  // -------------------------
  const saveHistory = () => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    setHistory((prev) => [...prev, canvas.toDataURL()]);
  };

  const handleUndo = () => {
    if (history.length === 0) {
      requestClearCanvas();
      return;
    }

    const newHistory = [...history];
    const previousState = newHistory.pop();
    setHistory(newHistory);

    if (previousState) {
      restoreCanvasState(previousState);
      socket.emit("undo_request", { roomId, state: previousState });
    }
  };

  const restoreCanvasState = (dataUrl: string) => {
    const canvas = canvasRef.current;
    const ctx = canvas?.getContext("2d");
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
    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    ctx.beginPath();
    ctx.strokeStyle = lineColor;
    ctx.lineWidth = lineWidth;
    ctx.lineCap = "round";
    ctx.lineJoin = "round";

    if (start) {
      ctx.moveTo(start.x, start.y);
    } else {
      ctx.moveTo(end.x, end.y);
    }
    ctx.lineTo(end.x, end.y);
    ctx.stroke();
  };

  // Upgraded Flood Fill with Tolerance & Alpha blending Support
  const runFloodFill = (
    canvas: HTMLCanvasElement,
    startX: number,
    startY: number,
    fillColorStr: string
  ) => {
    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    const width = canvas.width;
    const height = canvas.height;

    // Parse target fill color
    const fillCanvas = document.createElement("canvas");
    fillCanvas.width = 1;
    fillCanvas.height = 1;
    const fillCtx = fillCanvas.getContext("2d");
    if (!fillCtx) return;
    fillCtx.fillStyle = fillColorStr;
    fillCtx.fillRect(0, 0, 1, 1);
    const fillRgba = fillCtx.getImageData(0, 0, 1, 1).data;

    const imageData = ctx.getImageData(0, 0, width, height);
    const data = imageData.data;

    const startPos = (startY * width + startX) * 4;
    const startR = data[startPos]!;
    const startG = data[startPos + 1]!;
    const startB = data[startPos + 2]!;
    const startA = data[startPos + 3]!;

    // Tolerance level (0-255). 45-60 is the sweet spot for anti-aliasing artifacts
    const tolerance = 55;

    // Helper function to check if color is within our tolerance threshold
    const matchColor = (pos: number) => {
      const r = data[pos]!;
      const g = data[pos + 1]!;
      const b = data[pos + 2]!;
      const a = data[pos + 3]!;

      if (r === fillRgba[0] && g === fillRgba[1] && b === fillRgba[2] && a === fillRgba[3]) {
        return false;
      }

      return (
        Math.abs(r - startR) <= tolerance &&
        Math.abs(g - startG) <= tolerance &&
        Math.abs(b - startB) <= tolerance &&
        Math.abs(a - startA) <= tolerance
      );
    };

    if (
      Math.abs(startR - fillRgba[0]) <= tolerance &&
      Math.abs(startG - fillRgba[1]) <= tolerance &&
      Math.abs(startB - fillRgba[2]) <= tolerance &&
      Math.abs(startA - fillRgba[3]) <= tolerance
    ) {
      return;
    }

    const queue: [number, number][] = [[startX, startY]];
    const visited = new Uint8Array(width * height);
    let head = 0;

    while (head < queue.length) {
      const [cx, cy] = queue[head++]!;
      const idx = cy * width + cx;

      if (visited[idx]) continue;
      visited[idx] = 1;

      const pos = idx * 4;
      if (matchColor(pos)) {
        data[pos] = fillRgba[0]!;
        data[pos + 1] = fillRgba[1]!;
        data[pos + 2] = fillRgba[2]!;
        data[pos + 3] = fillRgba[3]!;

        if (cx > 0) queue.push([cx - 1, cy]);
        if (cx < width - 1) queue.push([cx + 1, cy]);
        if (cy > 0) queue.push([cx, cy - 1]);
        if (cy < height - 1) queue.push([cx, cy + 1]);
      }
    }

    ctx.putImageData(imageData, 0, 0);
  };

  const clearLocalCanvas = () => {
    const canvas = canvasRef.current;
    const ctx = canvas?.getContext("2d");
    if (!canvas || !ctx) return;
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    setHistory([]);
  };

  const requestClearCanvas = () => {
    saveHistory();
    socket.emit("clear_canvas_request", { roomId });
    clearLocalCanvas();
  };

  // -------------------------
  // Pointer Events (Uniform Touch & Mouse)
  // -------------------------
  const handlePointerDown = (e: React.PointerEvent<HTMLCanvasElement>) => {
    if (!isArtist) return;
    
    // Prevents mobile view scrolling/bouncing gestures while drawing
    if (e.pointerType === "touch") {
      (e.target as HTMLElement).setPointerCapture(e.pointerId);
    }

    const coords = getRelativeCoords(e);
    saveHistory();

    if (activeTool === "fill" && canvasRef.current) {
      const x = Math.floor(coords.x);
      const y = Math.floor(coords.y);

      runFloodFill(canvasRef.current, x, y, color);

      socket.emit("fill", {
        roomId,
        x,
        y,
        color,
      });

      // Automatically go back to brush
      setActiveTool("brush");
      return;
    }

    setIsDrawing(true);
    prevPoint.current = coords;
    drawLine(null, coords, color, width);

    socket.emit("draw", {
      roomId,
      data: { prevPoint: null, currentPoint: coords, color, width },
    });
  };

  const handlePointerMove = (e: React.PointerEvent<HTMLCanvasElement>) => {
    if (!isArtist || activeTool === "fill") return;

    // buttons === 1 ensures pointer/mouse/finger is actively held down down
    if (e.buttons !== 1) {
      if (isDrawing) {
        setIsDrawing(false);
        prevPoint.current = null;
      }
      return;
    }

    const currentPoint = getRelativeCoords(e);

    if (!isDrawing || !prevPoint.current) {
      setIsDrawing(true);
      prevPoint.current = currentPoint;
      drawLine(null, currentPoint, color, width);
      return;
    }

    const drawData: DrawLineData = {
      prevPoint: prevPoint.current,
      currentPoint,
      color,
      width,
    };

    drawLine(
      drawData.prevPoint,
      drawData.currentPoint,
      drawData.color,
      drawData.width
    );
    socket.emit("draw", { roomId, data: drawData });
    prevPoint.current = currentPoint;
  };

  const handlePointerUpOrLeave = (e: React.PointerEvent<HTMLCanvasElement>) => {
    if (e.pointerType === "touch") {
      (e.target as HTMLElement).releasePointerCapture(e.pointerId);
    }
    setIsDrawing(false);
    prevPoint.current = null;
  };

  // Maps physical viewport dimensions back to internal 800x580 canvas logic spaces
  const getRelativeCoords = (e: React.PointerEvent<HTMLCanvasElement>) => {
    const canvas = canvasRef.current;
    if (!canvas) return { x: 0, y: 0 };
    
    const rect = canvas.getBoundingClientRect();
    
    const scaleX = canvas.width / rect.width;
    const scaleY = canvas.height / rect.height;

    return {
      x: (e.clientX - rect.left) * scaleX,
      y: (e.clientY - rect.top) * scaleY,
    };
  };

  return (
    <canvas
      ref={canvasRef}
      width={800}
      height={580}
      onPointerDown={handlePointerDown}
      onPointerMove={handlePointerMove}
      onPointerUp={handlePointerUpOrLeave}
      onPointerLeave={handlePointerUpOrLeave}
      style={{
        background: "#fff",
        margin: "0 auto",
        padding: 0,
        borderRadius: "3px",
        // CSS allows resizing down to 100vw while keeping aspect proportions perfectly uniform
        width: "100vw",
        maxWidth: "800px",
        height: "auto",
        aspectRatio: "800 / 580",
        touchAction: "none", // Critical: prevents phone pull-to-refresh or panning while drawing
        cursor: isArtist
          ? activeTool === "fill"
            ? "url(bucket-cursor.png), crosshair"
            : "crosshair"
          : "not-allowed",
        display: "block",
        boxSizing: "border-box",
      }}
    />
  );
}