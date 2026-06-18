import type { Player, RoomState } from "../types/game";
import Avatar from "./Avatar";

interface ScoreboardProps {
  players: Player[];
  roomState: RoomState | null;
  currentUserId: string | undefined;
}

export default function Scoreboard({
  players,
  roomState,
  currentUserId,
}: ScoreboardProps) {
  const sortedPlayers = [...players].sort(
    (a, b) => (b.score || 0) - (a.score || 0),
  );

  return (
    <div className="sidebar">
      <ul className="player-list">
        {sortedPlayers.map((player, index) => {
          const hasGuessedCorrectly =
            roomState?.correctGuessers?.includes(player.id) ?? false;
          const isCurrentArtist = player.id === roomState?.currentArtist;
          const isCurrentPlayerHost = player.id === roomState?.hostId;

          return (
            <li
              key={player.id}
              className="player-card"
              style={{
                borderLeft: hasGuessedCorrectly
                  ? "5px solid #28a745"
                  : isCurrentArtist
                    ? "5px solid #ffc107"
                    : "1px solid #dee2e6",
                background: hasGuessedCorrectly ? "#e2f0d9" : "#fff",
              }}
            >
              <div className="player-rank">#{index + 1}</div>

              {/* Player Context Text fields */}
              <div
                className="player-info"
                style={{
                  display: "flex",
                  flexDirection: "column",
                  overflow: "hidden",
                }}
              >
                <span
                  className={`player-name ${player.id === currentUserId ? "bold" : ""} ${isCurrentPlayerHost ? "host-name" : ""}`}
                >
                  {/* {isCurrentArtist
                    ? "🖌️ "
                    : hasGuessedCorrectly
                      ? "✅ "
                      : "🟢 "} */}
                  {player.username} {player.id === currentUserId ? "(You)" : ""}
                </span>
                <span className="player-score">{player.score || 0} Points</span>
              </div>
              {/* Dynamic Sprite Avatar Component */}
              <div className="player-avatar-container">
                <Avatar
                  body={player.body ?? 0}
                  eyes={player.eyes ?? 0}
                  mouth={player.mouth ?? 0}
                  special={isCurrentPlayerHost ? 0 : null}
                  size={45}
                  className="shadow"
                />
              </div>
              {/* <span className={`player-name ${player.id === currentUserId ? 'bold' : ''}`}>
                {isCurrentArtist ? '🖌️ ' : hasGuessedCorrectly ? '✅ ' : '🟢 '}
                {player.username} {player.id === currentUserId ? '(You)' : ''}
              </span>
              <span className="player-score">Score: {player.score}</span> */}
            </li>
          );
        })}
      </ul>
    </div>
  );
}
