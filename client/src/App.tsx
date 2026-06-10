import React, { useState, useEffect, useCallback } from "react";
import { io, Socket } from "socket.io-client";
import type { Player, RoomState } from "./types/game";

// Layout subcomponents
import LobbyForm from "./components/LobbyForm";
import GameSetting from "./components/GameSetting";
import ScoreBoard from "./components/Scoreboard";
import Canvas from "./components/Canvas";
import Chat from "./components/Chat";
import GamePhaseSequence from "./components/GamePhaseSequence";

import logo from "./assets/logo.gif";
import avatarSprite from "./assets/avatar-sprites.gif";

import "./App.css";
import Topbar from "./components/Topbar";
import { getRandomWordsFromAll } from "./utils/wordUtils";

const socket: Socket = io("http://localhost:3001");

function App() {
  const [username, setUsername] = useState("");
  const [roomId, setRoomId] = useState("");
  const [isJoined, setIsJoined] = useState(false);
  const [players, setPlayers] = useState<Player[]>([]);
  const [roomState, setRoomState] = useState<RoomState | null>(null);
  const [timer, setTimer] = useState(40);
  const [roomError, setRoomError] = useState("");
  const [wordOptions, setWordOptions] = useState<string[]>([]);
  const [showPhaseSequence, setShowPhaseSequence] = useState(false);

  const [selectedAvatar, setSelectedAvatar] = useState({
    body: 0,
    eyes: 0,
    mouth: 0,
  });
  const previousArtistRef = React.useRef<string | null>(null);

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

    socket.on("word_selection_confirmed", () => {
      setShowPhaseSequence(false);
    });

    return () => {
      socket.off("room_state_update");
      socket.off("timer_tick");
      socket.off("room_created");
      socket.off("word_selection_confirmed");
    };
  }, []);

  useEffect(() => {
    if (!roomState) {
      return;
    }

    if (!roomState.gameStarted) {
      previousArtistRef.current = null;
      setShowPhaseSequence(false);
      return;
    }

    const currentArtistId = roomState.currentArtist;

    // Trigger overlay setup when backend state switches into selecting phase
    if (roomState.phase === "selecting") {
      if (currentArtistId && currentArtistId !== previousArtistRef.current) {
        previousArtistRef.current = currentArtistId;
        // Generate options locally if this socket client is the designated artist
        if (currentArtistId === socket.id) {
          setWordOptions(getRandomWordsFromAll(3));
        } else {
          setWordOptions([]);
        }
        setShowPhaseSequence(true);
      }
    } else if (roomState.phase === "drawing") {
      setShowPhaseSequence(false);
    }
  }, [roomState]);

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

  const handleStartGame = useCallback(() => {
    socket.emit("start_game_request", { roomId });
  }, [roomId]);

  const handleWordSelected = useCallback(
    (selectedWord: string) => {
      socket.emit("word_selected", { roomId, word: selectedWord });
      setWordOptions([]);
    },
    [roomId],
  );

  const handlePhaseSequenceComplete = useCallback(() => {
    setShowPhaseSequence(false);
  }, []);

  const isHost = roomState?.hostId === socket.id;
  const isArtist = roomState?.currentArtist === socket.id;
  const currentRound = roomState?.currentRound || 1;
  const totalRounds = roomState?.totalRounds || 3;

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

  const currentPlayer = players.find((p) => p.id === roomState?.currentArtist);

  return (
    <div className="game-container">
      <div className={isJoined ? "header-left" : "header"}>
        <div className="logo-container">
          <img
            src={logo}
            alt="DrawDash Logo"
            className={isJoined ? "logo-small" : "logo"}
          />
        </div>

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
      </div>
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
      ) : roomState ? (
        <div className="game-layout-container">
          <Topbar roomState={roomState} timer={timer} />

          <div className="game-workspace-columns">
            <div>
              <ScoreBoard
                players={players}
                roomState={roomState}
                currentUserId={socket.id}
              />
            </div>

            <div className="middle-section">
              {showPhaseSequence && roomState && currentPlayer ? (
                <GamePhaseSequence
                  currentPlayer={currentPlayer}
                  currentRound={currentRound}
                  totalRounds={totalRounds}
                  wordOptions={wordOptions}
                  onWordSelected={handleWordSelected}
                  onSequenceComplete={handlePhaseSequenceComplete}
                  isArtist={isArtist}
                />
              ) : !roomState.gameStarted ? (
                <GameSetting
                  roomId={roomId}
                  roomState={roomState}
                  isHost={isHost}
                  onDurationChange={handleDurationChange}
                  onStartGame={handleStartGame}
                />
              ) : (
                <div
                  className={`canvas-wrapper ${!isArtist ? "canvas-disabled" : ""}`}
                >
                  {!isArtist && (
                    <div
                      className="canvas-locked-notice"
                      style={{
                        background: "#fff3cd",
                        color: "#856404",
                        padding: "0.5rem 1rem",
                        borderRadius: "6px",
                        border: "1px solid #ffeeba",
                        fontWeight: "bold",
                        marginBottom: "0.75rem",
                        fontSize: "0.9rem",
                        textAlign: "center",
                        width: "100%",
                        boxSizing: "border-box",
                      }}
                    >
                      🔒 Canvas Locked: You are guessing! Use chat panel to
                      input predictions.
                    </div>
                  )}
                  <Canvas socket={socket} roomId={roomId} isArtist={isArtist} />
                </div>
              )}
            </div>

            <div style={{ width: "280px", flexShrink: 0 }}>
              <Chat socket={socket} roomId={roomId} username={username} />
            </div>
          </div>
        </div>
      ) : null}
    </div>
  );
}

export default App;
