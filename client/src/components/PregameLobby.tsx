import React from 'react';
import type { Player, RoomState } from '../types/game';

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
  return (
    <div className="pregame-lobby">
      <h2>Welcome to Room: <span style={{ color: '#007bff' }}>{roomId}</span></h2>
      <p style={{ color: '#747d8c' }}>Setup your configurations and wait for matches.</p>
      
      <div className="settings-card">
        <h3>⚙️ Match Configurations</h3>
        <label style={{ display: 'block', marginBottom: '0.5rem', fontWeight: 'bold' }}>Round Timer Duration:</label>
        <select 
          value={roomState.roundDuration} 
          onChange={onDurationChange} 
          disabled={!isHost}
          style={{ width: '100%', padding: '0.6rem', fontSize: '1rem', borderRadius: '4px', border: '1px solid #ccc' }}
        >
          <option value="20">20 Seconds (Fast pace)</option>
          <option value="40">40 Seconds (Normal default)</option>
          <option value="60">60 Seconds (Relaxed drawing)</option>
          <option value="90">90 Seconds (Long turns)</option>
        </select>
      </div>

      <div style={{ margin: '1.5rem 0', textAlign: 'left' }}>
        <h3>👥 Players Connected ({players.length}):</h3>
        <ul style={{ background: '#f1f2f6', padding: '1rem', borderRadius: '6px', listStyleType: 'none', margin: 0, display: 'flex', flexWrap: 'wrap', gap: '0.5rem' }}>
          {players.map((p) => (
            <li key={p.id} style={{ background: 'white', padding: '0.5rem 1rem', borderRadius: '20px', border: '1px solid #ced4da', display: 'flex', alignItems: 'center' }}>
              <span>🟢 {p.username}</span>
              {p.id === roomState.hostId && <span className="host-badge">👑 HOST</span>}
            </li>
          ))}
        </ul>
      </div>

      <div style={{ marginTop: '2rem' }}>
        {isHost ? (
          <button 
            onClick={onStartGame} 
            className="start-btn"
            disabled={players.length < 2}
          >
            {players.length < 2 ? '⚠️ Need at least 2 Players' : '🚀 Start Match Now'}
          </button>
        ) : (
          <div style={{ background: '#ffeaa7', padding: '1rem', borderRadius: '6px', fontWeight: 'bold', color: '#d63031' }}>
            ⏳ Waiting for the Host to start the game...
          </div>
        )}
      </div>
    </div>
  );
}