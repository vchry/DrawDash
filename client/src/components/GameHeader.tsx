import type { RoomState } from '../types/game';

interface GameHeaderProps {
  roomId: string;
  timer: number;
  isArtist: boolean;
  roomState: RoomState | null;
}

export default function GameHeader({ roomId, timer, isArtist, roomState }: GameHeaderProps) {
  return (
    <div className="game-header">
      <h3 className="room-display">Room: <span>{roomId}</span></h3>
      <div style={{ display: 'flex', gap: '1rem', alignItems: 'center' }}>
        <div style={{ background: '#ff4d4d', color: '#fff', padding: '0.5rem 1rem', borderRadius: '8px', fontWeight: 'bold' }}>
          ⏱️ {timer}s
        </div>
        <h3 className="word-banner">
          {isArtist 
            ? `🖌️ WORD TO DRAW: ${roomState?.currentWord.toUpperCase()}` 
            : `👀 GUESS THE WORD! (${roomState?.currentWord.length || 0} letters)`}
        </h3>
      </div>
    </div>
  );
}