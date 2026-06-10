import type { RoomState } from "../types/game";

import Clock from "../assets/clock.gif";
import Setting from "../assets/setting.gif";

interface TopBarProps {
  roomState: RoomState;
  timer: number;
}

export default function TopBar({ roomState, timer }: TopBarProps) {
  const currentRound = roomState.currentRound || 1;
  const totalRounds = roomState.totalRounds || 3; 

  // Determine current game status using backend phase states
  let statusText = "WAITING";
  if (roomState.gameStarted) {
    if (roomState.phase === "selecting") {
      statusText = "CHOOSING WORD...";
    } else if (roomState.phase === "drawing") {
      statusText = roomState.currentWord 
        ? `WORD: ${roomState.currentWord.toUpperCase()}` 
        : "DRAWING...";
    }
  }

  return (
    <div className="topbar">
      <div className="timer-round">
        <div className="timer">
          <img src={Clock} alt="Clock Icon" width={70} />
          <span className="time">{timer}</span>
        </div>
        <div className="round">
          <h3 style={{ margin: 0, fontSize: "18px" }}>
            Round {currentRound} of {totalRounds}
          </h3>
        </div>
      </div>

      <div className="word-area" style={{ fontWeight: "bold", fontSize: "20px" }}>
        {statusText}
      </div>

      <div className="setting-btn">
        <img src={Setting} alt="Setting Icon" width={50} />
      </div>
    </div>
  );
}