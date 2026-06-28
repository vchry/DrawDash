import React, { useState } from "react";
import type { RoomState } from "../types/game";

import Players from "../assets/person.gif";
import Drawtime from "../assets/drawtime.gif";
import Hint from "../assets/hint.gif";
import Round from "../assets/round.gif";
import WordCount from "../assets/word count.gif";

interface PregameLobbyProps {
  roomId: string;
  roomState: RoomState;
  isHost: boolean;
  onSettingChange: (key: string, value: number) => void;
  onStartGame: () => void;
}

export default function PregameLobby({
  roomId,
  roomState,
  isHost,
  onSettingChange,
  onStartGame,
}: PregameLobbyProps) {
  const [copied, setCopied] = useState(false);

  const handleCopyRoomId = () => {
    navigator.clipboard.writeText(roomId);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <div className="setting-component">
      {/* Settings list */}
      <div className="settings-list">
        <div className="setting-row">
          <label>
            <img src={Players} alt="Player Gif" width={30} className="shadow" /> Players
          </label>
          <select 
            value={roomState.maxPlayers ?? 6} 
            disabled={!isHost}
            onChange={(e) => onSettingChange("maxPlayers", Number(e.target.value))}
          >
            <option value="2">2</option>
            <option value="3">3</option>
            <option value="4">4</option>
            <option value="5">5</option>
            <option value="6">6</option>
            <option value="7">7</option>
            <option value="8">8</option>
            <option value="9">9</option>
            <option value="10">10</option>
          </select>
        </div>

        <div className="setting-row">
          <label>
            <img src={Drawtime} alt="Drawtime Gif" width={30} className="shadow" /> Drawtime
          </label>
          <select
            value={roomState.roundDuration}
            disabled={!isHost}
            onChange={(e) =>
              onSettingChange("roundDuration", Number(e.target.value))
            }
          >
            {[15, 30, 45, 60, 75, 90, 105, 120, 135, 150, 165, 180, 195, 210, 225, 240].map(
              (v) => (
                <option key={v} value={v}>
                  {v}
                </option>
              )
            )}
          </select>
        </div>

        <div className="setting-row">
          <label>
            <img src={Round} alt="Round Gif" width={30} className="shadow" /> Rounds
          </label>
          <select
            value={roomState.totalRounds}
            disabled={!isHost}
            onChange={(e) =>
              onSettingChange("totalRounds", Number(e.target.value))
            }
          >
            {[2, 3, 4, 5, 6, 7, 8, 9, 10].map((v) => (
              <option key={v} value={v}>
                {v}
              </option>
            ))}
          </select>
        </div>

        <div className="setting-row">
          <label>
            <img src={WordCount} alt="Word Count Gif" width={30} className="shadow" /> Word Count
          </label>
          <select
            value={roomState.wordOptionsCount}
            disabled={!isHost}
            onChange={(e) =>
              onSettingChange("wordOptionsCount", Number(e.target.value))
            }
          >
            {[2, 3, 4, 5].map((v) => (
              <option key={v} value={v}>
                {v}
              </option>
            ))}
          </select>
        </div>

        <div className="setting-row">
          <label>
            <img src={Hint} alt="Hint Gif" width={30} className="shadow" /> Hints
          </label>
          <select
            value={(roomState as any).hints ?? 3}
            disabled={!isHost}
            onChange={(e) =>
              onSettingChange("hints", Number(e.target.value))
            }
          >
            <option value="0">0</option>
            <option value="1">1</option>
            <option value="2">2</option>
            <option value="3">3</option>
            <option value="4">4</option>
            <option value="5">5</option>
          </select>
        </div>
      </div>

      <div className="action-buttons">
        {isHost ? (
          <button className="start-btn" onClick={onStartGame}>
            Start!
          </button>
        ) : (
          <button className="start-btn disabled-btn" disabled>
            Waiting for Host...
          </button>
        )
      }

        <button
          className="invite-btn"
          onClick={handleCopyRoomId}
          style={{ fontWeight: "bold" }}
        >
          {copied ? "Copied!" : `Room ID: ${roomId}`}
        </button>
      </div>
    </div>
  );
}