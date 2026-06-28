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
import Toolbar from "./components/Toolbar";
import Footer from "./components/Footer";
import RoundResult from "./components/RoundResult";
import GameOverWinners from "./components/GameOverWinners";

import { playSound } from "./utils/SoundManager";
const socket: Socket = io(import.meta.env.VITE_SERVER_URL);

function App() {
  const [username, setUsername] = useState<string>(() => {
    return localStorage.getItem("dash_username") || "";
  });
  const [roomId, setRoomId] = useState("");
  const [isJoined, setIsJoined] = useState(false);
  const [players, setPlayers] = useState<Player[]>([]);
  const [roomState, setRoomState] = useState<RoomState | null>(null);
  const [timer, setTimer] = useState(40);
  const [roomError, setRoomError] = useState("");
  const [wordOptions, setWordOptions] = useState<string[]>([]);
  const [showPhaseSequence, setShowPhaseSequence] = useState(false);
  const [showRoundIndicator, setShowRoundIndicator] = useState(false);
  const [roundResult, setRoundResult] = useState<any | null>(null);
  const [gameOverWinners, setGameOverWinners] = useState<any[] | null>(null);
  const [pendingGameOverWinners, setPendingGameOverWinners] = useState<
    any[] | null
  >(null);
  const roundResultRef = React.useRef<any | null>(null);

  // Shared Toolbar / Canvas States
  const [color, setColor] = useState("#000000");
  const [width, setWidth] = useState(5);
  const [activeTool, setActiveTool] = useState<"brush" | "fill">("brush");

  const [selectedAvatar, setSelectedAvatar] = useState<{
    body: number;
    eyes: number;
    mouth: number;
  }>(() => {
    const cachedAvatar = localStorage.getItem("dash_avatar");
    return cachedAvatar
      ? JSON.parse(cachedAvatar)
      : { body: 0, eyes: 0, mouth: 0 };
  });
  const previousArtistRef = React.useRef<string | null>(null);
  const previousRoundRef = React.useRef<number>(0);

  // State to track which specific hero avatar is currently playing its pop animation
  const [animatingAvatarIndex, setAnimatingAvatarIndex] = useState<
    number | null
  >(null);

  // Custom events to trigger internal canvas methods from the toolbar
  const triggerUndo = () => {
    window.dispatchEvent(new CustomEvent("canvas-undo"));
  };

  const triggerClear = () => {
    window.dispatchEvent(new CustomEvent("canvas-clear"));
  };
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

    socket.on("round_end", (payload: any) => {
      setRoundResult(payload);
      roundResultRef.current = payload;
      setShowPhaseSequence(false);
      setShowRoundIndicator(false);
      setTimeout(() => {
        setRoundResult(null);
        roundResultRef.current = null;
      }, 4000);
    });

    socket.on("game_over", (payload: any) => {
      if (roundResultRef.current) {
        setPendingGameOverWinners(payload.winners || []);
      } else {
        setGameOverWinners(payload.winners || []);
      }
    });

    socket.on("play_sound", ({ sound }: { sound: string }) => {
      playSound(sound);
    });

    return () => {
      socket.off("room_state_update");
      socket.off("timer_tick");
      socket.off("room_created");
      socket.off("word_selection_confirmed");
      socket.off("round_end");
      socket.off("game_over");
      socket.off("play_sound");
    };
  }, []);

  useEffect(() => {
    if (!roomState) {
      return;
    }

    if (!roomState.gameStarted) {
      previousArtistRef.current = null;
      previousRoundRef.current = 0;
      setShowPhaseSequence(false);
      setShowRoundIndicator(false);
      return;
    }

    if (roundResult || roomState.phase === "drawing") {
      setShowPhaseSequence(false);
      return;
    }

    const currentArtistId = roomState.currentArtist;
    const currentRoundNumber = roomState.currentRound || 1;

    if (roomState.phase === "selecting") {
      if (currentArtistId && currentArtistId !== previousArtistRef.current) {
        const isNewRound = currentRoundNumber !== previousRoundRef.current;

        previousArtistRef.current = currentArtistId;
        previousRoundRef.current = currentRoundNumber;

        if (currentArtistId === socket.id) {
          const dynamicCount = roomState.wordOptionsCount || 3;
          setWordOptions(getRandomWordsFromAll(dynamicCount));
        } else {
          setWordOptions([]);
        }

        setShowRoundIndicator(isNewRound);
        setShowPhaseSequence(true);
      }
    }
  }, [roomState, roundResult]);

  useEffect(() => {
    if (roundResult !== null) return;
    if (!pendingGameOverWinners || pendingGameOverWinners.length === 0) return;

    setGameOverWinners(pendingGameOverWinners);
    setPendingGameOverWinners(null);
  }, [roundResult, pendingGameOverWinners]);

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

  const handleSettingChange = (key: string, value: number) => {
    socket.emit("update_settings", {
      roomId,
      settings: { [key]: value },
    });
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

  const handleRoundResultClose = useCallback(() => {
    setRoundResult(null);
    roundResultRef.current = null;
  }, []);

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

  // Set hook state up with setter to make feature elements mutable
  const [avatars, setAvatars] = useState(() => {
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

  // Handler to shuffle features on click & toggle animation
  const handleHeroClick = (clickedIndex: number) => {
    setAvatars((prevAvatars) =>
      prevAvatars.map((avatar, idx) => {
        if (idx !== clickedIndex) return avatar;
        return {
          ...avatar,
          eyes: Math.floor(Math.random() * 8),
          mouth: Math.floor(Math.random() * 8),
        };
      }),
    );

    // Fire zoom popup animation class
    setAnimatingAvatarIndex(clickedIndex);
    setTimeout(() => {
      setAnimatingAvatarIndex(null);
    }, 250);
  };

  useEffect(() => {
    localStorage.setItem("dash_username", username);
  }, [username]);

  useEffect(() => {
    localStorage.setItem("dash_avatar", JSON.stringify(selectedAvatar));
  }, [selectedAvatar]);

  const currentPlayer = players.find((p) => p.id === roomState?.currentArtist);
  const isRoundResultActive = !!roundResult;
  const isGameOverActive = gameOverWinners && gameOverWinners.length > 0;
  const isOverlayActive = isRoundResultActive || isGameOverActive;
  const canDraw = isArtist && !isOverlayActive;

  const toolbarVisible =
    isArtist &&
    roomState?.gameStarted &&
    roomState?.phase === "drawing" &&
    !isOverlayActive;

  return (
    <div className={isJoined ? "join-game-container" : "game-container"}>
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
              <div
                className={`hero ${animatingAvatarIndex === index ? "pop-animation" : ""}`}
                key={index}
                onClick={() => handleHeroClick(index)}
                style={{ cursor: "pointer" }}
              >
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
          <Topbar
            roomState={roomState}
            timer={timer}
            isArtist={isArtist}
            hasGuessed={roomState.correctGuessers?.includes(socket.id) ?? false}
          />
          <div className="game-workspace-columns">
            <div className="score-board">
              <ScoreBoard
                players={players}
                roomState={roomState}
                currentUserId={socket.id}
                toolbarVisible={toolbarVisible}
              />
            </div>

            <div
              className={`middle-section ${roomState.gameStarted && !showPhaseSequence ? "canvas-mode" : ""}`}
            >
              {isRoundResultActive ? (
                <RoundResult
                  reason={roundResult.reason}
                  word={roundResult.word}
                  players={roundResult.players}
                  onClose={handleRoundResultClose}
                />
              ) : isGameOverActive ? (
                <GameOverWinners
                  winners={gameOverWinners}
                  onClose={() => setGameOverWinners(null)}
                />
              ) : showPhaseSequence && roomState && currentPlayer ? (
                <GamePhaseSequence
                  currentPlayer={currentPlayer}
                  currentRound={currentRound}
                  totalRounds={totalRounds}
                  wordOptions={wordOptions}
                  onWordSelected={handleWordSelected}
                  onSequenceComplete={handlePhaseSequenceComplete}
                  isArtist={isArtist}
                  showRoundIndicator={showRoundIndicator}
                />
              ) : !roomState.gameStarted ? (
                <GameSetting
                  roomId={roomId}
                  roomState={roomState}
                  isHost={isHost}
                  onSettingChange={handleSettingChange}
                  onStartGame={handleStartGame}
                />
              ) : (
                <div
                  className={`canvas-wrapper ${!canDraw ? "canvas-disabled" : ""}`}
                >
                  <Canvas
                    socket={socket}
                    roomId={roomId}
                    isArtist={canDraw}
                    color={color}
                    width={width}
                    activeTool={activeTool}
                    setActiveTool={setActiveTool}
                  />
                  {canDraw && (
                    <Toolbar
                      isArtist={canDraw}
                      color={color}
                      setColor={setColor}
                      width={width}
                      setWidth={setWidth}
                      activeTool={activeTool}
                      setActiveTool={setActiveTool}
                      onUndo={triggerUndo}
                      onClear={triggerClear}
                    />
                  )}
                </div>
              )}
            </div>

            <div style={{ width: "280px", flexShrink: 0 }}>
              <Chat
                socket={socket}
                roomId={roomId}
                username={username}
                toolbarVisible={toolbarVisible}
              />
            </div>
          </div>
        </div>
      ) : null}
      {!isJoined && <Footer />}
    </div>
  );
}

export default App;
