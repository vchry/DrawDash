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

const ROUND_DURATION = 40; 
const WORD_BANK = ["apple", "banana", "guitar", "elephant", "computer", "spaceship", "pizza", "snowman", "castle", "bicycle"];

interface Player {
  id: string;
  username: string;
  score: number;
}

interface RoomState {
  players: Player[];
  currentArtist: string | null;
  currentWord: string;
  timeLeft: number;
  gameStarted: boolean;
  artistIndex: number;
  correctGuessers: string[]; // Tracks socket IDs of players who got it right this round
}

interface Rooms {
  [roomId: string]: RoomState;
  [roomId: `interval_${string}`]: any; 
}

const activeRooms: any = {};

const getRandomWord = (): string => {
  return WORD_BANK[Math.floor(Math.random() * WORD_BANK.length)]!;
};

// Core Game Loop Automation Function
const startTurn = (roomId: string) => {
  const room = activeRooms[roomId] as RoomState;
  if (!room || room.players.length === 0) return;

  // 1. Advance to the next player
  room.artistIndex = (room.artistIndex + 1) % room.players.length;
  const nextArtist = room.players[room.artistIndex];
  
  if (!nextArtist) return;

  room.currentArtist = nextArtist.id;
  room.currentWord = getRandomWord();
  room.timeLeft = ROUND_DURATION;
  room.gameStarted = true;
  room.correctGuessers = []; // Reset the correct guessers list for the new round

  // Clear any existing active intervals running on this room
  if (activeRooms[`interval_${roomId}`]) {
    clearInterval(activeRooms[`interval_${roomId}`]);
  }

  // 2. Alert players and clear old drawings
  io.to(roomId).emit("clear_canvas");
  io.to(roomId).emit("room_state_update", room);
  io.to(roomId).emit("chat_message", {
    sender: "System",
    text: `🔄 A new round has started! ${nextArtist.username} is drawing.`,
    isCorrect: false,
  });

  // 3. Start the countdown timer interval
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

  socket.on("join_room", ({ roomId, username }: { roomId: string; username: string }) => {
    socket.join(roomId);

    if (!activeRooms[roomId]) {
      activeRooms[roomId] = {
        players: [],
        currentArtist: null,
        currentWord: "",
        timeLeft: ROUND_DURATION,
        gameStarted: false,
        artistIndex: -1,
        correctGuessers: [], // Initializing array
      };
    }

    const room = activeRooms[roomId] as RoomState;

    if (!room.players.some((p) => p.id === socket.id)) {
      room.players.push({ id: socket.id, username, score: 0 });
    }

    console.log(`👤 ${username} joined room: ${roomId}`);
    io.to(roomId).emit("room_state_update", room);
    
    io.to(roomId).emit("chat_message", {
      sender: "System",
      text: `${username} has entered the room!`,
      isCorrect: false,
    });

    if (!room.gameStarted && room.players.length >= 2) {
      startTurn(roomId);
    }
  });

  socket.on("send_message", ({ roomId, text, username }: { roomId: string; text: string; username: string }) => {
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

    // Check if the user already guessed it right earlier this turn
    const hasAlreadyGuessed = room.correctGuessers.includes(socket.id);

    if (room.gameStarted && cleanedGuess === secretWord) {
      if (hasAlreadyGuessed) {
        socket.emit("chat_message", {
          sender: "System",
          text: "You've already guessed the word!",
          isCorrect: false,
        });
        return;
      }

      // Add player to the round's success list
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
      
      // --- ROUND SKIP CHECK ENGINE ---
      // Total guessers needed = Everyone inside the room minus 1 (the artist drawing)
      const totalGuessersNeeded = room.players.length - 1;

      if (room.correctGuessers.length >= totalGuessersNeeded && totalGuessersNeeded > 0) {
        // Clear the countdown running right now
        if (activeRooms[`interval_${roomId}`]) {
          clearInterval(activeRooms[`interval_${roomId}`]);
        }

        io.to(roomId).emit("chat_message", {
          sender: "System",
          text: "Everyone guessed the word! Moving to next round...",
          isCorrect: false,
        });

        // Fast-forward immediately to the next turn!
        startTurn(roomId);
      }
      
    } else {
      io.to(roomId).emit("chat_message", {
        sender: username,
        text: text,
        isCorrect: false,
      });
    }
  });

  socket.on("disconnect", () => {
    console.log(`❌ User disconnected: ${socket.id}`);

    for (const roomId in activeRooms) {
      if (roomId.startsWith("interval_")) continue;

      const room = activeRooms[roomId] as RoomState;
      if (!room) continue;

      room.players = room.players.filter((p) => p.id !== socket.id);
      room.correctGuessers = room.correctGuessers.filter((id) => id !== socket.id);
      
      io.to(roomId).emit("room_state_update", room);

      if (room.players.length === 0) {
        if (activeRooms[`interval_${roomId}`]) {
          clearInterval(activeRooms[`interval_${roomId}`]);
          delete activeRooms[`interval_${roomId}`];
        }
        delete activeRooms[roomId];
      } else if (room.currentArtist === socket.id) {
        io.to(roomId).emit("chat_message", {
          sender: "System",
          text: "The artist left the match. Shuffling round...",
          isCorrect: false,
        });
        startTurn(roomId);
      } else {
        // If someone who hadn't guessed yet leaves, it might trigger an immediate skip condition
        const totalGuessersNeeded = room.players.length - 1;
        if (room.correctGuessers.length >= totalGuessersNeeded && totalGuessersNeeded > 0) {
          if (activeRooms[`interval_${roomId}`]) {
            clearInterval(activeRooms[`interval_${roomId}`]);
          }
          startTurn(roomId);
        }
      }
    }
  });
});

server.listen(PORT, () => {
  console.log(`🚀 Server running on http://localhost:${PORT}`);
});