import { useEffect, useState } from "react";
import Avatar from "./Avatar";

interface PlayerDelta {
  id: string;
  username: string;
  score: number;
  delta: number;
  body?: number;
  eyes?: number;
  mouth?: number;
}

interface RoundResultProps {
  reason: "everyone_guessed" | "time_up";
  word: string;
  players: PlayerDelta[];
  onClose?: () => void;
  duration?: number;
}

export default function RoundResult({
  reason,
  word,
  players,
  onClose,
  duration = 2000,
}: RoundResultProps) {
  const [isExiting, setIsExiting] = useState(false);

  useEffect(() => {
    const timer = setTimeout(() => setIsExiting(true), duration);
    const finish = setTimeout(() => onClose?.(), duration + 500);
    return () => {
      clearTimeout(timer);
      clearTimeout(finish);
    };
  }, [duration, onClose]);

  return (
    <div className={`round-indicator ${isExiting ? "slide-out" : "slide-in"}`}>
      <div className="round-content round-result-card">
        <h2>The word was "{word}"</h2>
        <h3>
          {reason === "everyone_guessed"
            ? "Everyone guessed the word!"
            : "Time is up!"}
        </h3>

        <ul className="round-result-players">
          {players.map((p) => (
            <li key={p.id} className="round-result-player">
              <div className="player-meta">
                <div className="player-avatar-small">
                  <Avatar
                    body={p.body ?? 0}
                    eyes={p.eyes ?? 0}
                    mouth={p.mouth ?? 0}
                    size={48}
                    special={null}
                  />
                </div>
                <div className="player-info">
                  <div className="player-name">{p.username}</div>
                  <div className="player-score">{p.score} pts</div>
                </div>
              </div>
              <div
                className={`player-delta ${p.delta > 0 ? "positive" : p.delta < 0 ? "negative" : "neutral"}`}
              >
                {p.delta > 0 ? `+${p.delta}` : p.delta}
              </div>
            </li>
          ))}
        </ul>
      </div>
    </div>
  );
}
