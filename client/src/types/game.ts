export interface Player {
  id: string;
  username: string;
  score: number;
  hasGuessed: boolean; // Added to fix src/temp.tsx error

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

  wordChoices: string[];
  waitingForWordSelection: boolean;
  currentRound?: number;
  totalRounds?: number;
  showPhaseSequence?: boolean;

  // Added to fix src/App.tsx, src/temp.tsx, and src/components/Topbar.tsx errors
  phase: 'waiting' | 'choosing' | 'drawing' | 'end' | string; 
  
  // Added to fix src/App.tsx and src/components/GameSetting.tsx errors
  wordOptionsCount: number; 
  maxPlayers: number;       
}