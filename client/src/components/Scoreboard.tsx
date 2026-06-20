import type { Player, RoomState } from "../types/game";
import Avatar from "./Avatar";
import drawingGif from "../assets/logo-logo.gif";

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

  const isGameStarted = !!roomState?.currentArtist;

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
              className={`player-card ${hasGuessedCorrectly ? "correct-guesser" : ""}`}
              style={{
                /* Removed borderLeft properties entirely */
                border: "1px solid #dee2e6", 
                /* Clean background switch: green if correct, otherwise white */
                background: hasGuessedCorrectly ? "#D4F8CB" : "#fff",
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
                  className={`player-name ${player.id === currentUserId ? "bold" : ""}`}
                >
                  {player.username} {player.id === currentUserId ? "(You)" : ""}
                </span>
                <span className="player-score">{player.score || 0} Points</span>
              </div>

              {/* Drawing Indicator & Avatar Container */}
              <div
                className="player-avatar-container"
                style={{ display: "flex", alignItems: "center", gap: "8px" }}
              >
                {isCurrentArtist && (
                  <img
                    src={drawingGif}
                    alt="Drawing indicator"
                    className="logo-logo"
                  />
                )}

                <Avatar
                  body={player.body ?? 0}
                  eyes={player.eyes ?? 0}
                  mouth={player.mouth ?? 0}
                  special={isCurrentPlayerHost && !isGameStarted ? 0 : null}
                  size={45}
                  className="shadow"
                />
              </div>
            </li>
          );
        })}
      </ul>
    </div>
  );
}