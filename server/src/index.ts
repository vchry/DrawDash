import express from "express";
import { createServer } from "http";
import { Server } from "socket.io";
import cors from "cors";
import dotenv from "dotenv";

dotenv.config();

const app = express();

// Health check route for cron-job bots
app.get("/", (req, res) => {
  res.status(200).send("Draw Dash Server is awake!");
});

// FIX: Create the HTTP server using express
const server = createServer(app);

const CLIENT_URL = process.env.CLIENT_URL!;

app.use(
  cors({
    origin: CLIENT_URL,
    credentials: true,
  }),
);

// FIX: Now 'server' safely exists and can be passed here
const io = new Server(server, {
  cors: {
    origin: CLIENT_URL,
    methods: ["GET", "POST"],
    credentials: true,
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

// Global audio broadcasting helper
const emitSound = (roomId: string, sound: string) => {
  io.to(roomId).emit("play_sound", { sound });
};

// HELPER: Calculates and awards points to the artist (MAX 58)
const awardArtistPoints = (room: RoomState) => {
  if (!room.currentArtist || room.correctGuessers.length === 0) return;
  const totalGuessersNeeded = room.players.length - 1;
  if (totalGuessersNeeded <= 0) return;

  let totalGuesserPointsThisRound = 0;
  room.correctGuessers.forEach((id) => {
    const p = room.players.find((player) => player.id === id);
    if (p) {
      const before = room.scoresBeforeRound?.[p.id] ?? 0;
      totalGuesserPointsThisRound += p.score - before;
    }
  });

  const avgGuesserScore =
    totalGuesserPointsThisRound / room.correctGuessers.length;
  const speedRatio = avgGuesserScore / 325;
  const completionRatio = room.correctGuessers.length / totalGuessersNeeded;

  const finalArtistScore = Math.floor(58 * speedRatio * completionRatio);
  const artist = room.players.find((p) => p.id === room.currentArtist);
  if (artist) {
    artist.score += finalArtistScore;
  }
};

// Phase 1: Starts the 15-second selection window for the artist
const startTurn = (roomId: string) => {
  const room = activeRooms[roomId] as RoomState;
  if (!room || room.players.length === 0) return;

  const nextIndex = (room.artistIndex + 1) % room.players.length;
  const wrappedToNewCycle = nextIndex === 0;

  room.artistIndex = nextIndex;
  const nextArtist = room.players[room.artistIndex];
  if (!nextArtist) return;

  let nextRoundNumber = room.currentRound;
  if (wrappedToNewCycle) {
    nextRoundNumber += 1;
  }

  if (nextRoundNumber > room.totalRounds) {
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
    room.gameStarted = false;
    room.currentArtist = null;
    room.phase = "selecting";
    room.timeLeft = 0;
    room.currentRound = 0;
    room.artistIndex = -1;
    room.correctGuessers = [];

    if (activeRooms[`interval_${roomId}`])
      clearInterval(activeRooms[`interval_${roomId}`]);
    if (activeRooms[`selection_${roomId}`])
      clearInterval(activeRooms[`selection_${roomId}`]);
    io.to(roomId).emit("room_state_update", room);
    return;
  }

  if (wrappedToNewCycle) {
    room.currentRound = nextRoundNumber;
  }

  room.currentArtist = nextArtist.id;
  room.currentWord = "";
  room.phase = "selecting";
  room.timeLeft = 15;
  room.correctGuessers = [];

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
  room.scoresBeforeRound = Object.fromEntries(
    room.players.map((p) => [p.id, p.score]),
  );
  room.timeLeft = room.roundDuration;

  io.to(roomId).emit("room_state_update", room);
  io.to(roomId).emit("word_selection_confirmed", { word: chosenWord });
  emitSound(roomId, "start_drawing");

  const artistPlayer = room.players.find((p) => p.id === room.currentArtist);
  io.to(roomId).emit("chat_message", {
    sender: "System",
    text: `${artistPlayer?.username || "The artist"} is drawing now!`,
    type: "is-drawing",
  });

  activeRooms[`interval_${roomId}`] = setInterval(() => {
    const activeRoom = activeRooms[roomId] as RoomState;
    if (!activeRoom) {
      clearInterval(activeRooms[`interval_${roomId}`]);
      return;
    }

    activeRoom.timeLeft -= 1;
    io.to(roomId).emit("timer_tick", activeRoom.timeLeft);

    if (activeRoom.timeLeft === 10) {
      emitSound(roomId, "timer");
    }

    if (activeRoom.timeLeft <= 0) {
      clearInterval(activeRooms[`interval_${roomId}`]);

      awardArtistPoints(activeRoom);

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
      emitSound(roomId, "round_over");
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
        maxPlayers: 6,
        totalRounds: 3,
        wordOptionsCount: 3,
        maxHints: 2,
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
      emitSound(roomId, "player_join");
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
      emitSound(roomId, "player_join");
    },
  );

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
      if (room.players.length < 2) {
        socket.emit("chat_message", {
          sender: "System",
          text: "You need at least 2 players to start the game!",
          type: "system",
        });
        return;
      }

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
      const hasAlreadyGuessed = room.correctGuessers.includes(socket.id);

      // --- HANDLE ACTIVE DRAWING PHASE ---
      if (room.gameStarted && room.phase === "drawing") {
        // A. If the sender is part of the "Guesser Pool" (Artist OR Correct Guesser)
        if (isArtist || hasAlreadyGuessed) {
          room.players.forEach((p) => {
            const isTargetArtist = p.id === room.currentArtist;
            const isTargetGuesser = room.correctGuessers.includes(p.id);

            // Broadcast clean text on the exact same pool type path to only artists and correct guessers
            if (isTargetArtist || isTargetGuesser) {
              io.to(p.id).emit("chat_message", {
                sender: username,
                text: text, // Kept completely clean without formatting tags
                type: "guesser-pool-chat",
              });
            }
          });
          return;
        }

        // B. Player types the correct answer (First Time)
        if (cleanedGuess === secretWord) {
          room.correctGuessers.push(socket.id);
          const player = room.players.find((p) => p.id === socket.id);
          if (player) {
            const timeRatio = room.timeLeft / room.roundDuration;
            const earnedPoints = Math.floor(timeRatio * 275) + 50;
            player.score += earnedPoints;
          }

          // System message announcing the success goes to EVERYONE
          io.to(roomId).emit("chat_message", {
            sender: "System",
            text: `${username} guessed the word!`,
            type: "correct-guess",
          });
          emitSound(roomId, "correct_guess");
          io.to(roomId).emit("room_state_update", room);

          // Check if round should end early
          const totalGuessersNeeded = room.players.length - 1;
          if (
            room.correctGuessers.length >= totalGuessersNeeded &&
            totalGuessersNeeded > 0
          ) {
            if (activeRooms[`interval_${roomId}`])
              clearInterval(activeRooms[`interval_${roomId}`]);

            awardArtistPoints(room);
            io.to(roomId).emit("chat_message", {
              sender: "System",
              text: `The word was '${room.currentWord}'`,
              type: "word-reveal",
            });

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
            emitSound(roomId, "round_over");
            startTurn(roomId);
          }
          return;
        }

        // C. Normal player makes a wrong guess -> Visible to EVERYONE
        io.to(roomId).emit("chat_message", {
          sender: username,
          text: text,
          isCorrect: false,
        });
      } else {
        // --- LOBBY / INTERMISSION CHAT ---
        // Visible to everyone normally when a round is not active
        io.to(roomId).emit("chat_message", {
          sender: username,
          text: text,
          isCorrect: false,
        });
      }
    },
  );
  // socket.on(
  //   "send_message",
  //   ({
  //     roomId,
  //     text,
  //     username,
  //   }: {
  //     roomId: string;
  //     text: string;
  //     username: string;
  //   }) => {
  //     const room = activeRooms[roomId] as RoomState;
  //     if (!room) return;

  //     const cleanedGuess = text.trim().toLowerCase();
  //     const secretWord = room.currentWord.toLowerCase();
  //     const isArtist = room.currentArtist === socket.id;

  //     if (isArtist && room.phase === "drawing") {
  //       socket.emit("chat_message", {
  //         sender: username,
  //         text: `${username}: ${text}`,
  //         type: "artist-chat",
  //       });
  //       return;
  //     }

  //     const hasAlreadyGuessed = room.correctGuessers.includes(socket.id);

  //     if (
  //       room.gameStarted &&
  //       room.phase === "drawing" &&
  //       cleanedGuess === secretWord
  //     ) {
  //       if (hasAlreadyGuessed) return;

  //       room.correctGuessers.push(socket.id);
  //       const player = room.players.find((p) => p.id === socket.id);
  //       if (player) {
  //         const timeRatio = room.timeLeft / room.roundDuration;
  //         const earnedPoints = Math.floor(timeRatio * 275) + 50;
  //         player.score += earnedPoints;
  //       }

  //       io.to(roomId).emit("chat_message", {
  //         sender: "System",
  //         text: `${username} guess the word!`,
  //         type: "correct-guess",
  //       });
  //       emitSound(roomId, "correct_guess");
  //       io.to(roomId).emit("room_state_update", room);

  //       const totalGuessersNeeded = room.players.length - 1;
  //       if (
  //         room.correctGuessers.length >= totalGuessersNeeded &&
  //         totalGuessersNeeded > 0
  //       ) {
  //         if (activeRooms[`interval_${roomId}`]) {
  //           clearInterval(activeRooms[`interval_${roomId}`]);
  //         }

  //         awardArtistPoints(room);
  //         io.to(roomId).emit("chat_message", {
  //           sender: "System",
  //           text: `The word was '${room.currentWord}'`,
  //           type: "word-reveal",
  //         });
  //         const deltas = room.players.map((p) => {
  //           const before = room.scoresBeforeRound?.[p.id] ?? 0;
  //           return {
  //             id: p.id,
  //             username: p.username,
  //             score: p.score,
  //             delta: p.score - before,
  //             body: p.body,
  //             eyes: p.eyes,
  //             mouth: p.mouth,
  //           };
  //         });
  //         io.to(roomId).emit("round_end", {
  //           reason: "everyone_guessed",
  //           word: room.currentWord,
  //           players: deltas,
  //         });
  //         emitSound(roomId, "round_over");
  //         startTurn(roomId);
  //       }
  //     } else {
  //       io.to(roomId).emit("chat_message", {
  //         sender: username,
  //         text: text,
  //         isCorrect: false,
  //       });
  //     }
  //   },
  // );

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
        emitSound(roomId, "player_left");
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
      } else if (room.gameStarted && room.players.length === 1) {
        // Everyone else left mid-game -> last player wins by default
        if (activeRooms[`interval_${roomId}`])
          clearInterval(activeRooms[`interval_${roomId}`]);
        if (activeRooms[`selection_${roomId}`])
          clearInterval(activeRooms[`selection_${roomId}`]);

        const winner = room.players[0]!;

        io.to(roomId).emit("chat_message", {
          sender: "System",
          text: `Everyone else left! ${winner.username} wins by default!`,
          type: "left",
        });

        io.to(roomId).emit("game_over", {
          winners: [
            {
              id: winner.id,
              username: winner.username,
              score: winner.score,
              body: winner.body,
              eyes: winner.eyes,
              mouth: winner.mouth,
            },
          ],
        });

        room.gameStarted = false;
        room.currentArtist = null;
        room.phase = "selecting";
        room.timeLeft = 0;
        room.currentRound = 0;
        room.artistIndex = -1;
        room.correctGuessers = [];

        io.to(roomId).emit("room_state_update", room);
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
