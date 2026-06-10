import type { RoomState } from "../types/game";

import Clock from "../assets/clock.gif";
import Setting from "../assets/setting.gif";

interface TopBarProps {
  roomState: RoomState;
  timer: number;
}

export default function TopBar({ roomState, timer }: TopBarProps) {
  const currentRound = roomState.currentRound || 1;
  const totalRounds = roomState.totalRounds || 4; // Use state if dynamic, or fallback to 4
  const status = roomState.gameStarted
    ? roomState.currentArtist
      ? "DRAWING"
      : "CHOOSING"
    : "WAITING";

  return (
    <div className="topbar">
      <div className="timer-round">
        <div className="timer">
          <img src={Clock} alt="Player Gif" width={70} />
          <span className="time">{timer}</span>
        </div>
        <div className="round">
          <h3 style={{ margin: 0, fontSize: "18px" }}>
            Round {currentRound} of {totalRounds}
          </h3>
        </div>
      </div>

      <div className="word-area">{status}</div>

      <div className="setting-btn">
        <img src={Setting} alt="Player Gif" width={50} />
      </div>
    </div>
  );
}
