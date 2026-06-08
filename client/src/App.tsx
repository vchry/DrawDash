import React, { useState, useEffect } from "react";
import { io, Socket } from "socket.io-client";
import type { Player, RoomState } from "./types/game";

// Layout subcomponents
import LobbyForm from "./components/LobbyForm";
import PregameLobby from "./components/PregameLobby";
import GameHeader from "./components/GameHeader";
import Scoreboard from "./components/Scoreboard";
import Canvas from "./components/Canvas";
import Chat from "./components/Chat";

import logo from "./assets/logo.gif";
import avatarSprite from "./assets/avatar-sprites.gif";

import "./App.css";

const socket: Socket = io("http://localhost:3001");

function App() {
  const [username, setUsername] = useState("");
  const [roomId, setRoomId] = useState("");
  const [isJoined, setIsJoined] = useState(false);
  const [players, setPlayers] = useState<Player[]>([]);
  const [roomState, setRoomState] = useState<RoomState | null>(null);
  const [timer, setTimer] = useState(40);

  // State to hold server errors for the LobbyForm
  const [roomError, setRoomError] = useState("");

  const [selectedAvatar, setSelectedAvatar] = useState({
    body: 0,
    eyes: 0,
    mouth: 0,
  });

  const onPrevBody = () =>
    setSelectedAvatar((a) => ({ ...a, body: (a.body + 7) % 8 }));
  const onNextBody = () =>
    setSelectedAvatar((a) => ({ ...a, body: (a.body + 1) % 8 }));
  const onPrevEyes = () =>
    setSelectedAvatar((a) => ({ ...a, eyes: (a.eyes + 7) % 8 }));
  const onNextEyes = () =>
    setSelectedAvatar((a) => ({ ...a, eyes: (a.eyes + 1) % 8 }));
  const onPrevMouth = () =>
    setSelectedAvatar((a) => ({ ...a, mouth: (a.mouth + 7) % 8 }));
  const onNextMouth = () =>
    setSelectedAvatar((a) => ({ ...a, mouth: (a.mouth + 1) % 8 }));

  const onRandomize = () => {
    setSelectedAvatar({
      body: Math.floor(Math.random() * 8),
      eyes: Math.floor(Math.random() * 8),
      mouth: Math.floor(Math.random() * 8),
    });
  };

  useEffect(() => {
    socket.on("room_state_update", (updatedRoom: RoomState) => {
      setPlayers(updatedRoom.players);
      setRoomState(updatedRoom);
      setTimer(updatedRoom.timeLeft);
    });

    socket.on("timer_tick", (secondsLeft: number) => {
      setTimer(secondsLeft);
    });

    socket.on("room_created", (data: { roomId: string }) => {
      setRoomId(data.roomId);
    });

    return () => {
      socket.off("room_state_update");
      socket.off("timer_tick");
      socket.off("room_created");
    };
  }, []);

  const handleCreateRoom = () => {
    if (!username.trim()) return;

    socket.emit("create_room", { username, avatar: selectedAvatar });

    socket.once("room_created", (data: { roomId: string }) => {
      setRoomId(data.roomId);
      setIsJoined(true);
    });
  };

  const handleJoinRoom = (e: React.FormEvent) => {
    e.preventDefault();
    if (!username.trim() || !roomId.trim()) return;

    socket.emit("join_room", { roomId, username, avatar: selectedAvatar });

    socket.once("join_failed", (data: { reason?: string }) => {
      setRoomError(data?.reason || "Invalid Room ID");
      setTimeout(() => setRoomError(""), 3000);
    });

    socket.once("join_success", (data: { roomId: string }) => {
      setRoomId(data.roomId);
      setIsJoined(true);
    });
  };

  const handleDurationChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    const value = Number(e.target.value);
    socket.emit("update_settings", { roomId, roundDuration: value });
  };

  const handleStartGame = () => {
    socket.emit("start_game_request", { roomId });
  };

  const isHost = roomState?.hostId === socket.id;
  const isArtist = roomState?.currentArtist === socket.id;

  const SPRITE_SIZE = 100;

  const getSpritePosition = (col: number, row: number) => ({
    backgroundPosition: `${-col * SPRITE_SIZE}px ${-row * SPRITE_SIZE}px`,
  });

  function shuffle(array: number[]) {
    const arr = [...array];
    for (let i = arr.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [arr[i], arr[j]] = [arr[j], arr[i]];
    }
    return arr;
  }

  const [avatars] = useState(() => {
    const eyeIndexes = shuffle([0, 1, 2, 3, 4, 5, 6, 7]);
    const mouthIndexes = shuffle([0, 1, 2, 3, 4, 5, 6, 7]);
    const ownerIndex = Math.floor(Math.random() * 8);

    return Array.from({ length: 8 }, (_, i) => ({
      body: i,
      eyes: eyeIndexes[i],
      mouth: mouthIndexes[i],
      owner: i === ownerIndex ? 0 : null,
    }));
  });

  return (
    <div className="game-container">
      <div className="logo-container">
        <img src={logo} alt="DrawDash Logo" className="logo" />
      </div>

      {/* Conditionally render the 8 avatars ONLY when not joined in a room */}
      {!isJoined && (
        <div className="hero-avatar">
          {avatars.map((avatar, index) => (
            <div className="hero" key={index}>
              <div
                className="layer body"
                style={{
                  backgroundImage: `url(${avatarSprite})`,
                  ...getSpritePosition(avatar.body, 0),
                }}
              />
              <div
                className="layer eyes"
                style={{
                  backgroundImage: `url(${avatarSprite})`,
                  ...getSpritePosition(avatar.eyes, 1),
                }}
              />
              <div
                className="layer mouth"
                style={{
                  backgroundImage: `url(${avatarSprite})`,
                  ...getSpritePosition(avatar.mouth, 2),
                }}
              />
              {avatar.owner !== null && (
                <div
                  className="layer owner"
                  style={{
                    backgroundImage: `url(${avatarSprite})`,
                    ...getSpritePosition(avatar.owner, 3),
                  }}
                />
              )}
            </div>
          ))}
        </div>
      )}

      {!isJoined ? (
        <LobbyForm
          username={username}
          setUsername={setUsername}
          roomId={roomId}
          setRoomId={setRoomId}
          onJoinRoom={handleJoinRoom}
          selectedAvatar={selectedAvatar}
          onPrevBody={onPrevBody}
          onNextBody={onNextBody}
          onPrevEyes={onPrevEyes}
          onNextEyes={onNextEyes}
          onPrevMouth={onPrevMouth}
          onNextMouth={onNextMouth}
          onRandomize={onRandomize}
          onPlay={handleJoinRoom}
          onCreateRoom={handleCreateRoom}
          serverError={roomError}
        />
      ) : roomState && !roomState.gameStarted ? (
        <PregameLobby
          roomId={roomId}
          roomState={roomState}
          players={players}
          isHost={isHost}
          onDurationChange={handleDurationChange}
          onStartGame={handleStartGame}
        />
      ) : (
        <div style={{ marginTop: "1rem" }}>
          <GameHeader
            roomId={roomId}
            timer={timer}
            isArtist={isArtist}
            roomState={roomState}
          />

          <div className="game-workspace">
            <Scoreboard
              players={players}
              roomState={roomState}
              currentUserId={socket.id}
            />

            <div
              className={`canvas-wrapper ${!isArtist ? "canvas-disabled" : ""}`}
            >
              {!isArtist && (
                <div className="canvas-locked-notice">
                  🔒 Canvas Locked: You are guessing!
                </div>
              )}
              <Canvas socket={socket} roomId={roomId} isArtist={isArtist} />
            </div>

            <Chat socket={socket} roomId={roomId} username={username} />
          </div>
        </div>
      )}
    </div>
  );
}

export default App;
