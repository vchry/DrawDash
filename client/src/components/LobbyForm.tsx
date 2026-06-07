import React from "react";
import diceGif from "../assets/dice.gif";
import arrowGif from "../assets/arrows.gif";

import Avatar from "./Avatar";

interface Avatar {
  body: number;
  eyes: number;
  mouth: number;
}

interface LobbyFormProps {
  username: string;
  setUsername: (value: string) => void;
  selectedAvatar: Avatar;
  renderAvatar: (avatar: Avatar) => React.ReactNode;
  onPrevBody: () => void;
  onNextBody: () => void;
  onPrevEyes: () => void;
  onNextEyes: () => void;
  onPrevMouth: () => void;
  onNextMouth: () => void;
  onRandomize: () => void;
  onPlay: (e: React.FormEvent) => void;
  onCreateRoom: () => void;
}

export default function LobbyForm({
  username,
  setUsername,
  selectedAvatar,
  renderAvatar,
  onPrevBody,
  onNextBody,
  onPrevEyes,
  onNextEyes,
  onPrevMouth,
  onNextMouth,
  onRandomize,
  onPlay,
  onCreateRoom,
}: LobbyFormProps) {
  // Bulletproof arrow styling
  const leftArrowStyle = {
    width: "40px",
    height: "40px",
    cursor: "pointer",
    backgroundImage: `url(${arrowGif})`,
    backgroundSize: "80px 40px",
    backgroundPosition: "0px 0px",
    backgroundRepeat: "no-repeat",
  };

  const rightArrowStyle = {
    ...leftArrowStyle,
    backgroundPosition: "-40px 0px",
  };

  return (
    <form className="lobby-card" onSubmit={onPlay}>
      <div className="top-row">
        <input
          type="text"
          placeholder="Enter your name"
          value={username}
          onChange={(e) => setUsername(e.target.value)}
          className="username-input"
        />
        <select className="language-select">
          <option>English</option>
        </select>
      </div>

      <div className="avatar-section">
        {/* LEFT ARROWS */}
        <div className="avatar-controls">
          <div style={leftArrowStyle} onClick={onPrevEyes} />
          <div style={leftArrowStyle} onClick={onPrevMouth} />
          <div style={leftArrowStyle} onClick={onPrevBody} />
        </div>

        {/* AVATAR PREVIEW */}
        <div className="avatar-preview">
          <Avatar
            body={selectedAvatar.body}
            eyes={selectedAvatar.eyes}
            mouth={selectedAvatar.mouth}
            size={120} // <-- Easily scale it up to 120px!
            style={{ filter: "drop-shadow(0px 4px 5px rgba(0,0,0,0.5))" }} // Add any CSS you want!
          />
        </div>
        {/* <div className="avatar-preview">
          <div className="preview-hero">
            {renderAvatar(selectedAvatar)}
          </div>
        </div> */}

        {/* RIGHT ARROWS */}
        <div className="avatar-controls">
          <div style={rightArrowStyle} onClick={onNextEyes} />
          <div style={rightArrowStyle} onClick={onNextMouth} />
          <div style={rightArrowStyle} onClick={onNextBody} />
        </div>

        {/* DICE BUTTON */}
        <img
          src={diceGif}
          alt="random"
          className="dice-btn"
          onClick={onRandomize}
        />
      </div>

      <button type="submit" className="play-btn">
        Play!
      </button>

      <button type="button" className="private-room-btn" onClick={onCreateRoom}>
        Create Private Room
      </button>
    </form>
  );
}
