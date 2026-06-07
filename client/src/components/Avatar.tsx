import React from "react";
import avatarSprite from "../assets/avatar-sprites.gif";

interface AvatarProps {
  body: number;      /* 0 to 9 */
  eyes: number;      /* 0 to 9 */
  mouth: number;     /* 0 to 9 */
  special?: number | null; /* 0 to 9 (e.g., 0 is the golden halo) */
  size?: number;     /* Custom display size in pixels (Default: 100) */
  className?: string;
  style?: React.CSSProperties;
}

export default function Avatar({
  body,
  eyes,
  mouth,
  special = null,
  size = 100, // Native size per asset box is 100px
  className = "",
  style = {},
}: AvatarProps) {
  
  // Grid Dimensions based on your sprite asset:
  const COLS = 10; 
  const ROWS = 4;

  const getSpriteStyle = (col: number, row: number): React.CSSProperties => {
    return {
      backgroundImage: `url(${avatarSprite})`,
      // Dynamically resize the sheet based on target frame width
      backgroundSize: `${size * COLS}px ${size * ROWS}px`, 
      backgroundPosition: `${-col * size}px ${-row * size}px`,
      width: `${size}px`,
      height: `${size}px`,
      position: "absolute",
      top: 0,
      left: 0,
      backgroundRepeat: "no-repeat",
    };
  };

  return (
    <div
      className={`avatar-wrapper ${className}`}
      style={{
        width: `${size}px`,
        height: `${size}px`,
        position: "relative",
        display: "inline-block",
        ...style,
      }}
    >
      {/* Layer 0: Body */}
      <div className="layer body" style={getSpriteStyle(body, 0)} />
      
      {/* Layer 1: Eyes */}
      <div className="layer eyes" style={getSpriteStyle(eyes, 1)} />
      
      {/* Layer 2: Mouth */}
      <div className="layer mouth" style={getSpriteStyle(mouth, 2)} />
      
      {/* Layer 3: Special (Halo / Crown row) */}
      {special !== null && special !== undefined && (
        <div className="layer special" style={getSpriteStyle(special, 3)} />
      )}
    </div>
  );
}