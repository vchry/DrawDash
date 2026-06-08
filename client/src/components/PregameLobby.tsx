import React, { useState } from "react";
import type { Player, RoomState } from "../types/game";
import Avatar from "./Avatar"; // Adjust the import path as necessary

import Players from "../assets/person.gif";
import Drawtime from "../assets/drawtime.gif";
import Hint from "../assets/hint.gif";
import Round from "../assets/round.gif";
import WordCount from "../assets/word count.gif";

interface PregameLobbyProps {
  roomId: string;
  roomState: RoomState;
  players: Player[];
  isHost: boolean;
  onDurationChange: (e: React.ChangeEvent<HTMLSelectElement>) => void;
  onStartGame: () => void;
}

export default function PregameLobby({
  roomId,
  roomState,
  players,
  isHost,
  onDurationChange,
  onStartGame,
}: PregameLobbyProps) {
  const [copied, setCopied] = useState(false);

  const handleCopyRoomId = () => {
    navigator.clipboard.writeText(roomId);
    setCopied(true);
    // Reset the "Copied!" visual text back to the Room ID after 2 seconds
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <div className="lobby-wrapper">
      {/* LEFT COLUMN: Players */}
      <div className="players-column">
        {players.map((p, index) => {
          const isCurrentPlayerHost = p.id === roomState.hostId;

          return (
            <div key={p.id} className="player-card">
              <div className="player-rank">#{index + 1}</div>
              <div className="player-info">
                <span
                  className={`player-name ${isCurrentPlayerHost ? "host-name" : ""}`}
                >
                  {p.username} {isCurrentPlayerHost && "(You)"}
                </span>
                <span className="player-points">0 points</span>
              </div>
              
              {/* Dynamic Sprite Avatar Container */}
              <div className="player-avatar-container">
                <Avatar
                  body={p.body ?? 0}   // Defaults to 0 if not provided in player object
                  eyes={p.eyes ?? 0}   // Defaults to 0 if not provided in player object
                  mouth={p.mouth ?? 0} // Defaults to 0 if not provided in player object
                  special={isCurrentPlayerHost ? 0 : null} // Gives row 4, col 0 asset to the host
                  size={60}            // Resized down slightly to cleanly fit inside a player card list
                />
              </div>
            </div>
          );
        })}
      </div>

      {/* MIDDLE COLUMN: Settings */}
      <div className="settings-column">
        <div className="settings-list">
          <div className="setting-row">
            <label>
              <img src={Players} alt="Player Gif" width={30} /> Players
            </label>
            <select disabled={!isHost} defaultValue="6">
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
              <img src={Drawtime} alt="Player Gif" width={30} /> Drawtime
            </label>
            <select
              value={roomState.roundDuration}
              onChange={onDurationChange}
              disabled={!isHost}
            >
              <option value="15">15</option>
              <option value="30">30</option>
              <option value="45">45</option>
              <option value="60">60</option>
              <option value="75">75</option>
              <option value="90">90</option>
              <option value="105">105</option>
              <option value="120">120</option>
              <option value="135">135</option>
              <option value="150">150</option>
              <option value="165">165</option>
              <option value="180">180</option>
              <option value="195">195</option>
              <option value="210">210</option>
              <option value="225">225</option>
              <option value="240">240</option>
            </select>
          </div>
          <div className="setting-row">
            <label>
              <img src={Round} alt="Player Gif" width={30} /> Rounds
            </label>
            <select disabled={!isHost} defaultValue="3">
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
              <img src={WordCount} alt="Player Gif" width={30} /> Word Count
            </label>
            <select disabled={!isHost} defaultValue="3">
              <option value="2">2</option>
              <option value="3">3</option>
              <option value="4">4</option>
              <option value="5">5</option>
            </select>
          </div>
          <div className="setting-row">
            <label>
              <img src={Hint} alt="Player Gif" width={30} /> Hints
            </label>
            <select disabled={!isHost} defaultValue="2">
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
          )}
          
          {/* UPDATED: Displays the dynamic Room ID text or clipboard verification state */}
          <button
            className="invite-btn"
            onClick={handleCopyRoomId}
            style={{ fontWeight: "bold" }}
          >
            {copied ? "📋 Copied!" : `Room ID: ${roomId}`}
          </button>
        </div>
      </div>

      {/* RIGHT COLUMN: Chat */}
      <div className="chat-column">
        <div className="chat-messages">
          <p className="system-message">
            {players.find((p) => p.id === roomState.hostId)?.username ||
              "Someone"}{" "}
            is now the room owner!
          </p>
        </div>
        <div className="chat-input-wrapper">
          <input type="text" placeholder="Type your guess here..." disabled />
        </div>
      </div>
    </div>
  );
}