import express from "express";
import http from "http";
import { Server } from "socket.io";
import cors from "cors";

const app = express();
app.use(cors());

const server = http.createServer(app);
const io = new Server(server, {
  cors: {
    origin: "http://localhost:5173",
    methods: ["GET", "POST"],
  },
});

const PORT = process.env.PORT || 3001;

const WORD_BANK = [
  "apple",
  "banana",
  "guitar",
  "elephant",
  "computer",
  "spaceship",
  "pizza",
  "snowman",
  "castle",
  "bicycle",
];

interface Player {
  id: string;
  username: string;
  score: number;
  body: number;
  eyes: number;
  mouth: number;
}

interface RoomState {
  players: Player[];
  hostId: string | null;
  currentArtist: string | null;
  currentWord: string;
  timeLeft: number;
  roundDuration: number;
  maxPlayers: number;
  totalRounds: number;
  wordOptionsCount: number;
  maxHints: number;
  gameStarted: boolean;
  artistIndex: number;
  currentRound: number;
  correctGuessers: string[];
  scoresBeforeRound?: Record<string, number>;
  phase: "selecting" | "drawing";
}

const activeRooms: any = {};

const getRandomWord = (): string => {
  return WORD_BANK[Math.floor(Math.random() * WORD_BANK.length)]!;
};

const generateRoomId = (): string => {
  const chars = "ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789";
  let roomId = "";
  for (let i = 0; i < 6; i++) {
    roomId += chars.charAt(Math.floor(Math.random() * chars.length));
  }
  return roomId;
};

// Phase 1: Starts the 15-second selection window for the artist
const startTurn = (roomId: string) => {
  const room = activeRooms[roomId] as RoomState;
  if (!room || room.players.length === 0) return;

  const nextIndex = (room.artistIndex + 1) % room.players.length;
  const wrappedToNewCycle = nextIndex === 0;

  // Advance artist index
  room.artistIndex = nextIndex;
  const nextArtist = room.players[room.artistIndex];
  if (!nextArtist) return;

  // Track the provisional next round number
  let nextRoundNumber = room.currentRound;
  if (wrappedToNewCycle) {
    nextRoundNumber += 1;
  }

  // CRITICAL FIX: If the NEXT round exceeds total rounds, end game BEFORE updating currentRound state
  if (nextRoundNumber > room.totalRounds) {
    // Compute top winners
    const top = [...room.players]
      .sort((a, b) => (b.score || 0) - (a.score || 0))
      .slice(0, 3)
      .map((p) => ({
        id: p.id,
        username: p.username,
        score: p.score,
        body: p.body,
        eyes: p.eyes,
        mouth: p.mouth,
      }));

    io.to(roomId).emit("game_over", { winners: top });

    // RESET GAME STATE COMPLETELY FOR REPLAYABILITY
    room.gameStarted = false;
    room.currentArtist = null;
    room.phase = "selecting";
    room.timeLeft = 0;
    room.currentRound = 0; // Reset to 0 so topbar looks pristine on next start
    room.artistIndex = -1; // Reset index cycle
    room.correctGuessers = [];

    // Clear any running timers
    if (activeRooms[`interval_${roomId}`])
      clearInterval(activeRooms[`interval_${roomId}`]);
    if (activeRooms[`selection_${roomId}`])
      clearInterval(activeRooms[`selection_${roomId}`]);

    io.to(roomId).emit("room_state_update", room);
    return;
  }

  // If we haven't exceeded total rounds, safely apply the incremented round
  if (wrappedToNewCycle) {
    room.currentRound = nextRoundNumber;
  }

  room.currentArtist = nextArtist.id;
  room.currentWord = "";
  room.phase = "selecting";
  room.timeLeft = 15;
  room.correctGuessers = [];

  // Clear any existing loops
  if (activeRooms[`interval_${roomId}`])
    clearInterval(activeRooms[`interval_${roomId}`]);
  if (activeRooms[`selection_${roomId}`])
    clearInterval(activeRooms[`selection_${roomId}`]);

  io.to(roomId).emit("clear_canvas");
  io.to(roomId).emit("room_state_update", room);

  io.to(roomId).emit("chat_message", {
    sender: "System",
    text: `${nextArtist.username} is choosing a word!`,
    type: "system",
  });

  // Handle the 15-second selection countdown
  activeRooms[`selection_${roomId}`] = setInterval(() => {
    const activeRoom = activeRooms[roomId] as RoomState;
    if (!activeRoom) {
      clearInterval(activeRooms[`selection_${roomId}`]);
      return;
    }

    activeRoom.timeLeft -= 1;
    io.to(roomId).emit("timer_tick", activeRoom.timeLeft);

    if (activeRoom.timeLeft <= 0) {
      clearInterval(activeRooms[`selection_${roomId}`]);

      const fallbackWord = getRandomWord();
      startDrawingRound(roomId, fallbackWord);
    }
  }, 1000);
};

// Phase 2: Starts the actual game round when a word is selected or auto-picked
const startDrawingRound = (roomId: string, chosenWord: string) => {
  const room = activeRooms[roomId] as RoomState;
  if (!room) return;

  if (activeRooms[`selection_${roomId}`]) {
    clearInterval(activeRooms[`selection_${roomId}`]);
  }

  room.phase = "drawing";
  room.currentWord = chosenWord;
  // snapshot scores at the start of the round so we can compute deltas later
  room.scoresBeforeRound = Object.fromEntries(
    room.players.map((p) => [p.id, p.score]),
  );
  room.timeLeft = room.roundDuration; // Reset timer to the custom gameplay duration (e.g., 90s)

  io.to(roomId).emit("room_state_update", room);

  // Alert clients that choice is locked and drawing begins
  io.to(roomId).emit("word_selection_confirmed", { word: chosenWord });

  const artistPlayer = room.players.find((p) => p.id === room.currentArtist);
  io.to(roomId).emit("chat_message", {
    sender: "System",
    text: `${artistPlayer?.username || "The artist"} is drawing now!`,
    type: "is-drawing",
  });

  // Handle main round drawing countdown
  activeRooms[`interval_${roomId}`] = setInterval(() => {
    const activeRoom = activeRooms[roomId] as RoomState;
    if (!activeRoom) {
      clearInterval(activeRooms[`interval_${roomId}`]);
      return;
    }

    activeRoom.timeLeft -= 1;
    io.to(roomId).emit("timer_tick", activeRoom.timeLeft);

    if (activeRoom.timeLeft <= 0) {
      clearInterval(activeRooms[`interval_${roomId}`]);

      // Compute per-player score deltas since round start
      const deltas = activeRoom.players.map((p) => {
        const before = activeRoom.scoresBeforeRound?.[p.id] ?? 0;
        return {
          id: p.id,
          username: p.username,
          score: p.score,
          delta: p.score - before,
          body: p.body,
          eyes: p.eyes,
          mouth: p.mouth,
        };
      });

      io.to(roomId).emit("chat_message", {
        sender: "System",
        text: `The word was '${activeRoom.currentWord}'`,
        type: "word-reveal",
      });

      io.to(roomId).emit("round_end", {
        reason: "time_up",
        word: activeRoom.currentWord,
        players: deltas,
      });

      startTurn(roomId);
    }
  }, 1000);
};

io.on("connection", (socket) => {
  console.log(`⚡ User connected: ${socket.id}`);

  socket.on("draw", ({ roomId, data }: { roomId: string; data: any }) => {
    socket.to(roomId).emit("draw_received", data);
  });

  socket.on(
    "fill",
    ({
      roomId,
      x,
      y,
      color,
    }: {
      roomId: string;
      x: number;
      y: number;
      color: string;
    }) => {
      socket.to(roomId).emit("fill_received", { x, y, color });
    },
  );

  socket.on("clear_canvas_request", ({ roomId }: { roomId: string }) => {
    const room = activeRooms[roomId];
    if (room && room.currentArtist === socket.id) {
      io.to(roomId).emit("clear_canvas");
    }
  });

  socket.on(
    "create_room",
    ({
      username,
      avatar,
    }: {
      username: string;
      avatar?: { body: number; eyes: number; mouth: number };
    }) => {
      const roomId = generateRoomId();
      socket.join(roomId);

      activeRooms[roomId] = {
        players: [],
        hostId: socket.id,
        currentArtist: null,
        currentWord: "",
        timeLeft: 15,
        roundDuration: 90,
        maxPlayers: 6, // Default matching frontend
        totalRounds: 3, // Default matching frontend
        wordOptionsCount: 3, // Default matching frontend
        maxHints: 2, // Default matching frontend
        gameStarted: false,
        artistIndex: -1,
        currentRound: 0,
        phase: "selecting",
        correctGuessers: [],
      };

      const room = activeRooms[roomId] as RoomState;

      room.players.push({
        id: socket.id,
        username,
        score: 0,
        body: avatar?.body ?? 0,
        eyes: avatar?.eyes ?? 0,
        mouth: avatar?.mouth ?? 0,
      });

      console.log(`🏗️  Room created: ${roomId} by ${username}`);
      socket.emit("room_created", { roomId });
      io.to(roomId).emit("room_state_update", room);

      io.to(roomId).emit("chat_message", {
        sender: "System",
        text: `${username} created the room!`,
        isCorrect: false,
      });
    },
  );

  socket.on(
    "join_room",
    ({
      roomId,
      username,
      avatar,
    }: {
      roomId: string;
      username: string;
      avatar?: { body: number; eyes: number; mouth: number };
    }) => {
      const room = activeRooms[roomId] as RoomState | undefined;

      if (!room) {
        socket.emit("join_failed", { reason: "Invalid Room ID" });
        return;
      }

      // CRITICAL FIX: Block new connections if maximum player limit is met
      if (
        room.players.length >= room.maxPlayers &&
        !room.players.some((p) => p.id === socket.id)
      ) {
        socket.emit("join_failed", { reason: "Room is full!" });
        return;
      }

      socket.join(roomId);

      if (!room.players.some((p) => p.id === socket.id)) {
        room.players.push({
          id: socket.id,
          username,
          score: 0,
          body: avatar?.body ?? 0,
          eyes: avatar?.eyes ?? 0,
          mouth: avatar?.mouth ?? 0,
        });
      }

      console.log(`👤 ${username} joined room: ${roomId}`);
      socket.emit("join_success", { roomId });
      io.to(roomId).emit("room_state_update", room);

      io.to(roomId).emit("chat_message", {
        sender: "System",
        text: `${username} join the room!`,
        type: "joined",
      });
    },
  );

  // CRITICAL FIX: Accepts partial settings changes from lobby view configurations
  socket.on(
    "update_settings",
    ({
      roomId,
      settings,
    }: {
      roomId: string;
      settings?: Partial<RoomState>;
    }) => {
      const room = activeRooms[roomId] as RoomState;
      if (room && room.hostId === socket.id && !room.gameStarted) {
        // CRITICAL FIX: Fallback to an empty object if settings is missing/undefined
        const safeSettings = settings || {};

        if (safeSettings.roundDuration !== undefined)
          room.roundDuration = safeSettings.roundDuration;
        if (safeSettings.maxPlayers !== undefined)
          room.maxPlayers = safeSettings.maxPlayers;
        if (safeSettings.totalRounds !== undefined)
          room.totalRounds = safeSettings.totalRounds;
        if (safeSettings.wordOptionsCount !== undefined)
          room.wordOptionsCount = safeSettings.wordOptionsCount;
        if (safeSettings.maxHints !== undefined)
          room.maxHints = safeSettings.maxHints;

        io.to(roomId).emit("room_state_update", room);
      }
    },
  );

  socket.on("start_game_request", ({ roomId }: { roomId: string }) => {
    const room = activeRooms[roomId] as RoomState;
    if (room && room.hostId === socket.id && !room.gameStarted) {
      // Reset player scores back to 0 for the new match match
      room.players.forEach((p) => (p.score = 0));

      room.currentRound = 0;
      room.artistIndex = -1;
      room.gameStarted = true;

      startTurn(roomId);
    }
  });

  socket.on(
    "word_selected",
    ({ roomId, word }: { roomId: string; word: string }) => {
      const room = activeRooms[roomId] as RoomState;
      // Accept incoming selections exclusively during the selection phase
      if (
        room &&
        room.currentArtist === socket.id &&
        room.gameStarted &&
        room.phase === "selecting"
      ) {
        startDrawingRound(roomId, word);
      }
    },
  );

  socket.on(
    "send_message",
    ({
      roomId,
      text,
      username,
    }: {
      roomId: string;
      text: string;
      username: string;
    }) => {
      const room = activeRooms[roomId] as RoomState;
      if (!room) return;

      const cleanedGuess = text.trim().toLowerCase();
      const secretWord = room.currentWord.toLowerCase();
      const isArtist = room.currentArtist === socket.id;

      // Artist text input handling during drawing round
      if (isArtist && room.phase === "drawing") {
        socket.emit("chat_message", {
          sender: username,
          text: `${username}: ${text}`,
          type: "artist-chat",
        });
        return;
      }

      const hasAlreadyGuessed = room.correctGuessers.includes(socket.id);

      // Only evaluate valid answers during the active drawing phase
      if (
        room.gameStarted &&
        room.phase === "drawing" &&
        cleanedGuess === secretWord
      ) {
        if (hasAlreadyGuessed) return;

        room.correctGuessers.push(socket.id);
        const player = room.players.find((p) => p.id === socket.id);
        if (player) {
          player.score += Math.max(20, room.timeLeft * 2);
        }

        // 1. Send the light green "guessed the word!" message first
        io.to(roomId).emit("chat_message", {
          sender: "System",
          text: `${username} guess the word!`,
          type: "correct-guess",
        });

        io.to(roomId).emit("room_state_update", room);

        // Check if all players (excluding the artist) have guessed correctly
        const totalGuessersNeeded = room.players.length - 1;
        if (
          room.correctGuessers.length >= totalGuessersNeeded &&
          totalGuessersNeeded > 0
        ) {
          // Stop the active round countdown timer
          if (activeRooms[`interval_${roomId}`]) {
            clearInterval(activeRooms[`interval_${roomId}`]);
          }

          // 2. Broadcast the green word reveal alert to everyone right before starting the next turn
          io.to(roomId).emit("chat_message", {
            sender: "System",
            text: `The word was '${room.currentWord}'`,
            type: "word-reveal",
          });

          // Compute per-player score deltas since round start
          const deltas = room.players.map((p) => {
            const before = room.scoresBeforeRound?.[p.id] ?? 0;
            return {
              id: p.id,
              username: p.username,
              score: p.score,
              delta: p.score - before,
              body: p.body,
              eyes: p.eyes,
              mouth: p.mouth,
            };
          });

          io.to(roomId).emit("round_end", {
            reason: "everyone_guessed",
            word: room.currentWord,
            players: deltas,
          });

          // Proceed to choose the next round/artist
          startTurn(roomId);
        }
      } else {
        io.to(roomId).emit("chat_message", {
          sender: username,
          text: text,
          isCorrect: false,
        });
      }
    },
  );

  socket.on("disconnect", () => {
    console.log(`❌ User disconnected: ${socket.id}`);

    for (const roomId in activeRooms) {
      if (roomId.startsWith("interval_") || roomId.startsWith("selection_"))
        continue;

      const room = activeRooms[roomId] as RoomState;
      if (!room) continue;

      const leavingPlayer = room.players.find((p) => p.id === socket.id);

      if (leavingPlayer) {
        io.to(roomId).emit("chat_message", {
          sender: "System",
          text: `${leavingPlayer.username} left the room!`,
          type: "left",
        });
      }
      room.players = room.players.filter((p) => p.id !== socket.id);
      room.correctGuessers = room.correctGuessers.filter(
        (id) => id !== socket.id,
      );

      if (room.hostId === socket.id && room.players.length > 0) {
        room.hostId = room.players[0]!.id;

        io.to(roomId).emit("chat_message", {
          sender: "System",
          text: `${room.players[0]!.username} is now the room owner!`,
          isCorrect: false,
        });
      }

      io.to(roomId).emit("room_state_update", room);

      if (room.players.length === 0) {
        if (activeRooms[`interval_${roomId}`])
          clearInterval(activeRooms[`interval_${roomId}`]);
        if (activeRooms[`selection_${roomId}`])
          clearInterval(activeRooms[`selection_${roomId}`]);
        delete activeRooms[`interval_${roomId}`];
        delete activeRooms[`selection_${roomId}`];
        delete activeRooms[roomId];
      } else if (room.gameStarted && room.currentArtist === socket.id) {
        io.to(roomId).emit("chat_message", {
          sender: "System",
          text: `${leavingPlayer?.username || "The artist"} left the room!`,
          type: "left",
        });
        startTurn(roomId);
      }
    }
  });
});

server.listen(PORT, () => {
  console.log("🚀 Server running on http://localhost:" + PORT);
});
