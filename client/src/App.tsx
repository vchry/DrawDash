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

import logo from "./assets/logo.gif"

import "./App.css";

const socket: Socket = io("http://localhost:3001");

function App() {
  const [username, setUsername] = useState("");
  const [roomId, setRoomId] = useState("");
  const [isJoined, setIsJoined] = useState(false);
  const [players, setPlayers] = useState<Player[]>([]);
  const [roomState, setRoomState] = useState<RoomState | null>(null);
  const [timer, setTimer] = useState(40);

  useEffect(() => {
    socket.on("room_state_update", (updatedRoom: RoomState) => {
      setPlayers(updatedRoom.players);
      setRoomState(updatedRoom);
      setTimer(updatedRoom.timeLeft);
    });

    socket.on("timer_tick", (secondsLeft: number) => {
      setTimer(secondsLeft);
    });

    return () => {
      socket.off("room_state_update");
      socket.off("timer_tick");
    };
  }, []);

  const handleJoinRoom = (e: React.FormEvent) => {
    e.preventDefault();
    if (!username.trim() || !roomId.trim()) return;

    socket.emit("join_room", { roomId, username });
    setIsJoined(true);
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

  return (
    <div className="game-container">
      <div className="logo-container">
        <img src={logo} alt="DrawDash Logo" className="logo" />
      </div>
      {/* <h1 className="title">✏️ Skribbl Clone</h1> */}
      <hr className="divider" />

      {!isJoined ? (
        <LobbyForm
          username={username}
          setUsername={setUsername}
          roomId={roomId}
          setRoomId={setRoomId}
          onJoin={handleJoinRoom}
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
