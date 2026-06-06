import type { Player, RoomState } from '../types/game';

interface ScoreboardProps {
  players: Player[];
  roomState: RoomState | null;
  currentUserId: string | undefined;
}

export default function Scoreboard({ players, roomState, currentUserId }: ScoreboardProps) {
  return (
    <div className="sidebar">
      <h4>Players:</h4>
      <ul className="player-list">
        {players.map((player) => {
          const hasGuessedCorrectly = roomState?.correctGuessers.includes(player.id);
          const isCurrentArtist = player.id === roomState?.currentArtist;

          return (
            <li 
              key={player.id} 
              className="player-card" 
              style={{ 
                borderLeft: hasGuessedCorrectly ? '5px solid #28a745' : isCurrentArtist ? '5px solid #ffc107' : '1px solid #dee2e6',
                background: hasGuessedCorrectly ? '#e2f0d9' : '#fff'
              }}
            >
              <span className={`player-name ${player.id === currentUserId ? 'bold' : ''}`}>
                {isCurrentArtist ? '🖌️ ' : hasGuessedCorrectly ? '✅ ' : '🟢 '}
                {player.username} {player.id === currentUserId ? '(You)' : ''}
              </span>
              <span className="player-score">Score: {player.score}</span>
            </li>
          );
        })}
      </ul>
    </div>
  );
}