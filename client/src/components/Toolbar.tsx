import React, { useState, useEffect } from "react";
// import "./Toolbar.css";

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
    "#ffffff", "#c1c1c1", "#ef130b", "#ff7100", "#ffe400", 
    "#00cc00", "#00b2ff", "#231fd3", "#a300ba", "#d37caa", "#a0522d"
  ],
  [
    "#000000", "#4c4c4c", "#740b07", "#c23800", "#e8a200", 
    "#005510", "#00569e", "#0e0865", "#550069", "#a75574", "#63300d"
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
  const [showColorPicker, setShowColorPicker] = useState(false);
  const [hotkeys, setHotkeys] = useState(() => {
    const saved = localStorage.getItem("hotkeys");
    return saved
      ? JSON.parse(saved)
      : { Brush: "B", Fill: "F", Undo: "U", Clear: "C", Swap: "S" };
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

  const cursorStyle = isArtist ? "pointer" : "not-allowed";

  return (
    <div className="responsive-toolbar">
      {/* Left Component: Color Selection Grids */}
      <div className="color-section-wrapper">
        <div
          className="current-color-preview"
          style={{ background: color }}
          onClick={() => setShowColorPicker((prev) => !prev)}
          title="Tap to change color"
        />

        <div className={`color-grid-container ${showColorPicker ? "open" : ""}`}>
          {COLORS.map((row, rowIndex) => (
            <div key={rowIndex} style={{ display: "flex" }}>
              {row.map((c) => (
                <div
                  key={c}
                  className="color-swatch"
                  onClick={() => {
                    if (!isArtist) return;
                    setColor(c);
                    setShowColorPicker(false);
                  }}
                  style={{
                    background: c,
                    cursor: cursorStyle,
                  }}
                />
              ))}
            </div>
          ))}
        </div>
      </div>

      {/* Middle Component: Variable Brush Circumference Preview toggle */}
      <div
        className="size-picker-btn"
        style={{ cursor: cursorStyle }}
        onClick={() => isArtist && setWidth((w) => (w >= 20 ? 4 : w + 6))}
        title="Click to change size"
      >
        <div
          style={{
            width: `${Math.min(width, 24)}px`,
            height: `${Math.min(width, 24)}px`,
            background: "#000",
            borderRadius: "50%",
          }}
        />
      </div>

      {/* Right Component: Functional Canvas Tool Elements */}
      <div className="tools-group">
        <button
          className="tool-btn"
          style={{
            background: activeTool === "brush" ? "#b499ff" : "#ffffff",
            cursor: cursorStyle,
          }}
          onClick={() => isArtist && setActiveTool("brush")}
        >
          <span className="tool-badge">B</span>
          <img src={brush} alt="Brush" className="tool-icon shadow" />
        </button>

        <button
          className="tool-btn"
          style={{
            background: activeTool === "fill" ? "#b499ff" : "#ffffff",
            cursor: cursorStyle,
          }}
          onClick={() => isArtist && setActiveTool("fill")}
        >
          <span className="tool-badge">{hotkeys.Fill}</span>
          <img src={fill} alt="Fill" className="tool-icon shadow" />
        </button>

        <button
          className="tool-btn"
          style={{ background: "#ffffff", cursor: cursorStyle }}
          onClick={() => isArtist && onUndo()}
        >
          <span className="tool-badge">{hotkeys.Undo}</span>
          <img src={undo} alt="Undo" className="tool-icon shadow" />
        </button>

        <button
          className="tool-btn"
          style={{ background: "#ffffff", cursor: cursorStyle }}
          onClick={() => isArtist && onClear()}
        >
          <span className="tool-badge">{hotkeys.Clear}</span>
          <img src={erase} alt="Clear" className="tool-icon shadow" />
        </button>
      </div>
    </div>
  );
}