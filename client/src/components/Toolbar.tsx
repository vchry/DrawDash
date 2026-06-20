import React from "react";

import fill from "../assets/fill.gif";
import erase from "../assets/erase.gif";
import undo from "../assets/undo.gif";
import brush from "../assets/logo-logo.gif";

interface ToolbarProps {
  isArtist: boolean;
  color: string;
  setColor: (color: string) => void;
  width: number;
  setWidth: React.Dispatch<React.SetStateAction<number>>;
  activeTool: "brush" | "fill";
  setActiveTool: (tool: "brush" | "fill") => void;
  onUndo: () => void;
  onClear: () => void;
}

const COLORS = [
  [
    "#ffffff",
    "#c1c1c1",
    "#ef130b",
    "#ff7100",
    "#ffe400",
    "#00cc00",
    "#00b2ff",
    "#231fd3",
    "#a300ba",
    "#d37caa",
    "#a0522d",
  ],
  [
    "#000000",
    "#4c4c4c",
    "#740b07",
    "#c23800",
    "#e8a200",
    "#005510",
    "#00569e",
    "#0e0865",
    "#550069",
    "#a75574",
    "#63300d",
  ],
];

export default function Toolbar({
  isArtist,
  color,
  setColor,
  width,
  setWidth,
  activeTool,
  setActiveTool,
  onUndo,
  onClear,
}: ToolbarProps) {
  const [hotkeys, setHotkeys] = React.useState(() => {
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

  React.useEffect(() => {
    const handleHotkeysChanged = (event: Event) => {
      const customEvent = event as CustomEvent;
      setHotkeys(customEvent.detail);
    };

    window.addEventListener(
      "hotkeys-changed",
      handleHotkeysChanged
    );

    return () => {
      window.removeEventListener(
        "hotkeys-changed",
        handleHotkeysChanged
      );
    };
  }, []);

  const toolBtnStyle = (isActive: boolean) => ({
    position: "relative" as const,
    width: "40px",
    height: "40px",
    background: isActive ? "#b499ff" : "#ffffff",
    border: "2px solid #a3a3a3",
    borderRadius: "4px",
    cursor: isArtist ? "pointer" : "not-allowed",
    display: "flex",
    justifyContent: "center",
    alignItems: "center",
    fontSize: "20px",
  });

  const shortcutBadgeStyle = {
    position: "absolute" as const,
    top: "1px",
    left: "1px",
    fontSize: "10px",
    fontWeight: "bold",
    color: "#333",
  };

  return (
    <div
      style={{
        display: "flex",
        width: "100%",
        marginTop: "8px",
        justifyContent: "space-between",
        alignItems: "center",
      }}
    >
      {/* Left: Colors */}
      <div style={{ display: "flex", gap: "8px" }}>
        {/* Current Color Preview with modern diagonal separation style */}
        <div
          style={{
            width: "40px",
            height: "40px",
            background: color,
            border: "2px solid #a3a3a3",
            borderRadius: "6px",
          }}
        />

        {/* Outer Roundy Borderless Color Grid Wrapper */}
        <div
          style={{
            display: "flex",
            flexDirection: "column",
            borderRadius: "6px",
            overflow: "hidden",
            border: "1px solid #555" // Clean minimal boundary framing line matching picture layout
          }}
        >
          {COLORS.map((row, rowIndex) => (
            <div
              key={rowIndex}
              style={{ display: "flex" }}
            >
              {row.map((c) => (
                <div
                  key={c}
                  onClick={() => isArtist && setColor(c)}
                  style={{
                    width: "20px",
                    height: "20px",
                    background: c,
                    cursor: isArtist ? "pointer" : "not-allowed",
                    border: "none" // Removed black separator borders perfectly matching preview graphic style layout
                  }}
                />
              ))}
            </div>
          ))}
        </div>
      </div>

      {/* Middle: Brush Sizes */}
      <div
        style={{
          width: "40px",
          height: "40px",
          background: "#fff",
          border: "2px solid #a3a3a3",
          borderRadius: "4px",
          display: "flex",
          justifyContent: "center",
          alignItems: "center",
          cursor: isArtist ? "pointer" : "not-allowed",
        }}
        onClick={() => isArtist && setWidth((w) => (w >= 20 ? 4 : w + 6))}
        title="Click to change size"
      >
        <div
          style={{
            width: `${width}px`,
            height: `${width}px`,
            background: "#000",
            borderRadius: "50%",
          }}
        />
      </div>

      {/* Right: Tools */}
      <div style={{ display: "flex", gap: "8px" }}>
        <button
          style={toolBtnStyle(activeTool === "brush")}
          onClick={() => isArtist && setActiveTool("brush")}
        >
          <span style={shortcutBadgeStyle}>B</span>
          <img src={brush} alt="Fill" className="tool-icon fill shadow" />
        </button>

        <button
          style={toolBtnStyle(activeTool === "fill")}
          onClick={() => isArtist && setActiveTool("fill")}
        >
          <span style={shortcutBadgeStyle}>{hotkeys.Fill}</span>
          <img src={fill} alt="Fill" className="tool-icon fill shadow" />
        </button>

        <button
          style={toolBtnStyle(false)}
          onClick={() => isArtist && onUndo()}
        >
          <img src={undo} alt="Undo" className="tool-icon Undo shadow" />
          <span style={shortcutBadgeStyle}>{hotkeys.Undo}</span>
        </button>

        <button
          style={toolBtnStyle(false)}
          onClick={() => isArtist && onClear()}
        >
          <img src={erase} alt="Undo" className="tool-icon clear shadow" />
          <span style={shortcutBadgeStyle}>{hotkeys.Clear}</span>
        </button>
      </div>
    </div>
  );
}