import { useEffect, useMemo, useState } from "react";
import Avatar from "./Avatar";

interface Winner {
  id: string;
  username: string;
  score: number;
  body?: number;
  eyes?: number;
  mouth?: number;
}

interface GameOverWinnersProps {
  winners: Winner[];
  onClose?: () => void;
  duration?: number;
}

export default function GameOverWinners({
  winners,
  onClose,
  duration = 4000,
}: GameOverWinnersProps) {
  const [isExiting, setIsExiting] = useState(false);

  useEffect(() => {
    const timer = window.setTimeout(() => {
      setIsExiting(true);
      setTimeout(() => onClose?.(), 500);
    }, duration);

    return () => window.clearTimeout(timer);
  }, [duration, onClose]);

  const podium = useMemo(() => {
    return [...winners]
      .sort((a, b) => (b.score || 0) - (a.score || 0))
      .slice(0, 3);
  }, [winners]);

  const first = podium[0];
  const second = podium[1];
  const third = podium[2];

  return (
    <div className={`xsml-phase round-indicator ${isExiting ? "slide-out" : "slide-in"}`}>
      <div className="game-over-card">
        {first && (
          <h2 className="podium-title">
            <span className="winner-highlight">{first.username}</span> is the
            winner!
          </h2>
        )}

        <div className="podium-container">
          {/* SECOND PLACE */}
          {second && (
            <div className="podium-player second-place">
              <div className="podium-avatar">
                <Avatar
                  body={second.body ?? 0}
                  eyes={second.eyes ?? 0}
                  mouth={second.mouth ?? 0}
                  size={120}
                  special={null}
                />
              </div>

              <div className="podium-block podium-silver">
                <div className="podium-rank">#2</div>

                <div className="podium-name">{second.username}</div>

                <div className="podium-score">{second.score} points</div>
              </div>
            </div>
          )}

          {/* FIRST PLACE */}
          {first && (
            <div className="podium-player first-place">
              <div className="winner-crown">👑</div>

              <div className="podium-avatar">
                <Avatar
                  body={first.body ?? 0}
                  eyes={first.eyes ?? 0}
                  mouth={first.mouth ?? 0}
                  size={150}
                  special={null}
                />
              </div>

              <div className="podium-block podium-gold">
                <div className="podium-rank">#1</div>

                <div className="podium-name">{first.username}</div>

                <div className="podium-score">{first.score} points</div>
              </div>
            </div>
          )}

          {/* THIRD PLACE */}
          {third && (
            <div className="podium-player third-place">
              <div className="podium-avatar">
                <Avatar
                  body={third.body ?? 0}
                  eyes={third.eyes ?? 0}
                  mouth={third.mouth ?? 0}
                  size={110}
                  special={null}
                />
              </div>

              <div className="podium-block podium-bronze">
                <div className="podium-rank">#3</div>

                <div className="podium-name">{third.username}</div>

                <div className="podium-score">{third.score} points</div>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
