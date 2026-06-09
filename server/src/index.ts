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

// Updated Player interface to include sprite sheet configurations
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
  hostId: string | null; // Socket ID of the room creator
  currentArtist: string | null;
  currentWord: string;
  timeLeft: number;
  roundDuration: number; // Customizable turn limit
  gameStarted: boolean; // Gatekeeper flag
  artistIndex: number;
  correctGuessers: string[];
}

interface Rooms {
  [roomId: string]: RoomState;
  [roomId: `interval_${string}`]: any;
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

// Core Game Loop Switcher
const startTurn = (roomId: string) => {
  const room = activeRooms[roomId] as RoomState;
  if (!room || room.players.length === 0) return;

  room.artistIndex = (room.artistIndex + 1) % room.players.length;
  const nextArtist = room.players[room.artistIndex];

  if (!nextArtist) return;

  room.currentArtist = nextArtist.id;
  room.currentWord = getRandomWord();
  room.timeLeft = room.roundDuration; // Use the custom set configuration time

  if (activeRooms[`interval_${roomId}`]) {
    clearInterval(activeRooms[`interval_${roomId}`]);
  }

  io.to(roomId).emit("clear_canvas");
  io.to(roomId).emit("room_state_update", room);
  io.to(roomId).emit("chat_message", {
    sender: "System",
    text: `🔄 Round started! ${nextArtist.username} is drawing.`,
    isCorrect: false,
  });

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

      io.to(roomId).emit("chat_message", {
        sender: "System",
        text: `⏰ Time's up! The word was: "${activeRoom.currentWord.toUpperCase()}"`,
        isCorrect: false,
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

  socket.on("clear_canvas_request", ({ roomId }: { roomId: string }) => {
    const room = activeRooms[roomId];
    if (room && room.currentArtist === socket.id) {
      io.to(roomId).emit("clear_canvas");
    }
  });

  // Updated handler: Expects avatar values from the form creator
  socket.on("create_room", ({ username, avatar }: { username: string; avatar?: { body: number; eyes: number; mouth: number } }) => {
    const roomId = generateRoomId();
    socket.join(roomId);

    activeRooms[roomId] = {
      players: [],
      hostId: socket.id,
      currentArtist: null,
      currentWord: "",
      timeLeft: 90,
      roundDuration: 90,
      gameStarted: false,
      artistIndex: -1,
      correctGuessers: [],
    };

    const room = activeRooms[roomId] as RoomState;

    // Save the player object including structural default fallbacks
    room.players.push({
      id: socket.id,
      username,
      score: 0,
      body: avatar?.body ?? 0,
      eyes: avatar?.eyes ?? 0,
      mouth: avatar?.mouth ?? 0
    });

    console.log(`🏗️  Room created: ${roomId} by ${username}`);
    socket.emit("room_created", { roomId });
    io.to(roomId).emit("room_state_update", room);

    io.to(roomId).emit("chat_message", {
      sender: "System",
      text: `${username} created the room!`,
      isCorrect: false,
    });
  });

  // Updated handler: Expects avatar data payload from the arriving client
  socket.on(
    "join_room",
    ({ roomId, username, avatar }: { roomId: string; username: string; avatar?: { body: number; eyes: number; mouth: number } }) => {
      const room = activeRooms[roomId] as RoomState | undefined;

      // If room doesn't exist, notify the client instead of creating one
      if (!room) {
        socket.emit("join_failed", { reason: "Invalid Room ID" });
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
          mouth: avatar?.mouth ?? 0
        });
      }

      console.log(`👤 ${username} joined room: ${roomId}`);

      // Acknowledge successful join to the joining socket
      socket.emit("join_success", { roomId });

      io.to(roomId).emit("room_state_update", room);

      io.to(roomId).emit("chat_message", {
        sender: "System",
        text: `${username} has entered the room!`,
        isCorrect: false,
      });
    },
  );

  // Event: Host changes game configuration duration parameters mid-lobby
  socket.on(
    "update_settings",
    ({ roomId, roundDuration }: { roomId: string; roundDuration: number }) => {
      const room = activeRooms[roomId] as RoomState;
      if (room && room.hostId === socket.id && !room.gameStarted) {
        room.roundDuration = roundDuration;
        room.timeLeft = roundDuration;
        io.to(roomId).emit("room_state_update", room);
      }
    },
  );

  // Event: Host fires explicit manual start signal trigger button
  socket.on("start_game_request", ({ roomId }: { roomId: string }) => {
    const room = activeRooms[roomId] as RoomState;
    if (room && room.hostId === socket.id && !room.gameStarted) {
      room.gameStarted = true;
      startTurn(roomId);
    }
  });

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

      if (isArtist && cleanedGuess === secretWord) {
        socket.emit("chat_message", {
          sender: "System",
          text: "You cannot guess your own secret word!",
          isCorrect: false,
        });
        return;
      }

      const hasAlreadyGuessed = room.correctGuessers.includes(socket.id);

      if (room.gameStarted && cleanedGuess === secretWord) {
        if (hasAlreadyGuessed) return;

        room.correctGuessers.push(socket.id);
        const playerIndex = room.players.findIndex((p) => p.id === socket.id);
        if (playerIndex !== -1) {
          room.players[playerIndex].score += Math.max(20, room.timeLeft * 2);
        }

        io.to(roomId).emit("chat_message", {
          sender: "System",
          text: `${username} guessed the secret word! 🎉`,
          isCorrect: true,
        });

        io.to(roomId).emit("room_state_update", room);

        const totalGuessersNeeded = room.players.length - 1;
        if (
          room.correctGuessers.length >= totalGuessersNeeded &&
          totalGuessersNeeded > 0
        ) {
          if (activeRooms[`interval_${roomId}`]) {
            clearInterval(activeRooms[`interval_${roomId}`]);
          }
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
      if (roomId.startsWith("interval_")) continue;

      const room = activeRooms[roomId] as RoomState;
      if (!room) continue;

      room.players = room.players.filter((p) => p.id !== socket.id);
      room.correctGuessers = room.correctGuessers.filter(
        (id) => id !== socket.id,
      );

      // If the host leaves, pass the host crown responsibilities to the next player
      if (room.hostId === socket.id && room.players.length > 0) {
        room.hostId = room.players[0]!.id;
      }

      io.to(roomId).emit("room_state_update", room);

      if (room.players.length === 0) {
        if (activeRooms[`interval_${roomId}`]) {
          clearInterval(activeRooms[`interval_${roomId}`]);
          delete activeRooms[`interval_${roomId}`];
        }
        delete activeRooms[roomId];
      } else if (room.gameStarted && room.currentArtist === socket.id) {
        io.to(roomId).emit("chat_message", {
          sender: "System",
          text: "The artist left the match. Shuffling round...",
          isCorrect: false,
        });
        startTurn(roomId);
      }
    }
  });
});

server.listen(PORT, () => {
  console.log("🚀 Server running on http://localhost:" + PORT);
});