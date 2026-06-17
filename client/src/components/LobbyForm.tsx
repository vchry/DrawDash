import React, { useState, useEffect } from "react";
import diceGif from "../assets/dice.gif";
import arrow from "../assets/arrow.gif";
import Avatar from "./Avatar";

interface AvatarData {
  body: number;
  eyes: number;
  mouth: number;
}

interface LobbyFormProps {
  username: string;
  setUsername: (value: string) => void;
  roomId: string;
  setRoomId: (value: string) => void;
  selectedAvatar: AvatarData;
  onPrevBody: () => void;
  onNextBody: () => void;
  onPrevEyes: () => void;
  onNextEyes: () => void;
  onPrevMouth: () => void;
  onNextMouth: () => void;
  onRandomize: () => void;
  onPlay: (e: React.FormEvent) => void;
  onCreateRoom: () => void;
  onJoinRoom: (e: React.FormEvent) => void;
  serverError?: string;
}

export default function LobbyForm({
  username,
  setUsername,
  roomId,
  setRoomId,
  onJoinRoom,
  selectedAvatar,
  onPrevBody,
  onNextBody,
  onPrevEyes,
  onNextEyes,
  onPrevMouth,
  onNextMouth,
  onRandomize,
  onPlay,
  onCreateRoom,
  serverError,
}: LobbyFormProps) {
  const [error, setError] = useState("");

  const triggerError = (msg: string) => {
    setError(msg);
    setTimeout(() => setError(""), 3000);
  };

  useEffect(() => {
    if (serverError) {
      triggerError(serverError);
    }
  }, [serverError]);

  const handleCreateRoom = () => {
    if (!username.trim()) {
      triggerError("Please enter your name!");
      return;
    }
    onCreateRoom();
  };

  const handleJoinRoom = (e: React.FormEvent) => {
    e.preventDefault();
    if (!username.trim()) {
      triggerError("Please enter your name!");
      return;
    }
    if (!roomId.trim()) {
      triggerError("Please enter a Room ID!");
      return;
    }
    onJoinRoom(e);
  };

  return (
    <>
      <div className="toast-container">
        {error && <div className="toast-error">{error}</div>}
      </div>

      <form className="lobby-card" onSubmit={onPlay}>
        <div className="top-row">
          <input
            type="text"
            placeholder="Enter your name"
            value={username}
            onChange={(e) => setUsername(e.target.value)}
            className="username-input"
          />
        </div>

        <div className="avatar-section">
          <div className="avatar-controls">
            <img
              src={arrow}
              alt="arrow"
              onClick={onPrevEyes}
              className="arrow arrowright"
            />
            <img
              src={arrow}
              alt="arrow"
              onClick={onPrevMouth}
              className="arrow arrowright"
            />
            <img
              src={arrow}
              alt="arrow"
              onClick={onPrevBody}
              className="arrow arrowright"
            />
          </div>

          <div className="avatar-preview">
            {/* Component renders without a master wrapper layout to prevent total sizing zoom */}
            <Avatar
              body={selectedAvatar.body}
              eyes={selectedAvatar.eyes}
              mouth={selectedAvatar.mouth}
              size={120}
            />
          </div>

          <div className="avatar-controls">
            <img
              src={arrow}
              alt="arrow"
              onClick={onNextEyes}
              className="arrow arrowleft"
            />
            <img
              src={arrow}
              alt="arrow"
              onClick={onNextMouth}
              className="arrow arrowleft"
            />
            <img
              src={arrow}
              alt="arrow"
              onClick={onNextBody}
              className="arrow arrowleft"
            />
          </div>

          <div className="dice-container">
            <img
              src={diceGif}
              alt="random"
              className="dice-btn"
              onClick={onRandomize}
            />
            <span className="dice-text">Randomize your Avatar!</span>
          </div>
        </div>

        <button
          type="button"
          className="private-room-btn"
          onClick={handleCreateRoom}
        >
          Create Room
        </button>

        <input
          type="text"
          placeholder="Enter Room ID"
          value={roomId}
          onChange={(e) => setRoomId(e.target.value)}
          className="username-input roomid-input"
        />
        <button
          type="button"
          className="join-room-btn"
          onClick={handleJoinRoom}
        >
          Join Room
        </button>
      </form>
    </>
  );
}