import { useEffect, useState } from "react";
import type { Player } from "../types/game";
import Avatar from "./Avatar";

interface PlayerTurningProps {
  player: Player;
  onComplete?: () => void;
  duration?: number; // duration in ms to show this component before sliding out
}

export default function PlayerTurning({
  player,
  onComplete,
  duration = 2000,
}: PlayerTurningProps) {
  const [isExiting, setIsExiting] = useState(false);

  useEffect(() => {
    // 1. Wait for the viewing duration, then set the exit state
    const displayTimer = setTimeout(() => {
      setIsExiting(true);
    }, duration);

    return () => clearTimeout(displayTimer);
  }, [duration]);

  useEffect(() => {
    // 2. Only fire onComplete once the 500ms slide-out animation finishes
    if (!isExiting) return;

    const exitTimer = setTimeout(() => {
      onComplete?.();
    }, 500); // Matches the 0.5s CSS animation duration

    return () => clearTimeout(exitTimer);
  }, [isExiting, onComplete]);

  return (
    <div className={`player-turning ${isExiting ? "slide-out" : "slide-in"}`}>
      <div className="player-turning-content">
        <h2>{player.username} is choosing a word!</h2>
        <div className="player-avatar-large">
          <Avatar
            body={player.body ?? 0}
            eyes={player.eyes ?? 0}
            mouth={player.mouth ?? 0}
            special={null}
            size={150}
            className="avatar"
          />
        </div>
      </div>
    </div>
  );
}