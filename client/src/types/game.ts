export interface Player {
  id: string;
  username: string;
  score: number;
  
  // Avatar customization configuration (0 to 9)
  body?: number;
  eyes?: number;
  mouth?: number;
}

export interface RoomState {
  players: Player[];
  hostId: string | null;
  currentArtist: string | null;
  currentWord: string;
  timeLeft: number;
  roundDuration: number;
  gameStarted: boolean;
  correctGuessers: string[];
}