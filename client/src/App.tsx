import { useState, useEffect } from 'react';
import { io, Socket } from 'socket.io-client';
import Canvas from './components/Canvas';
import Chat from './components/Chat';
import './App.css';

const socket: Socket = io('http://localhost:3001');

interface Player {
  id: string;
  username: string;
  score: number;
}

interface RoomState {
  players: Player[];
  hostId: string | null;
  currentArtist: string | null;
  currentWord: string;
  timeLeft: number;
  roundDuration: number;
  gameStarted: boolean;
  correctGuessers: string[];
}

function App() {
  const [username, setUsername] = useState('');
  const [roomId, setRoomId] = useState('');
  const [isJoined, setIsJoined] = useState(false);
  const [players, setPlayers] = useState<Player[]>([]);
  const [roomState, setRoomState] = useState<RoomState | null>(null);
  const [timer, setTimer] = useState(40);

  useEffect(() => {
    socket.on('room_state_update', (updatedRoom: RoomState) => {
      setPlayers(updatedRoom.players);
      setRoomState(updatedRoom);
      setTimer(updatedRoom.timeLeft);
    });

    socket.on('timer_tick', (secondsLeft: number) => {
      setTimer(secondsLeft);
    });

    return () => {
      socket.off('room_state_update');
      socket.off('timer_tick');
    };
  }, []);

  const handleJoinRoom = (e: React.FormEvent) => {
    e.preventDefault();
    if (!username.trim() || !roomId.trim()) return;

    socket.emit('join_room', { roomId, username });
    setIsJoined(true);
  };

  const handleDurationChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    const value = Number(e.target.value);
    socket.emit('update_settings', { roomId, roundDuration: value });
  };

  const handleStartGame = () => {
    socket.emit('start_game_request', { roomId });
  };

  const isHost = roomState?.hostId === socket.id;
  const isArtist = roomState?.currentArtist === socket.id;

  return (
    <div className="game-container">
      <h1 className="title">✏️ Skribbl Clone</h1>
      <hr className="divider" />

      {!isJoined ? (
        /* PHASE 1 FORM SELECTION VIEW */
        <form onSubmit={handleJoinRoom} className="lobby-form">
          <div className="form-group">
            <label>Username:</label>
            <input type="text" value={username} onChange={(e) => setUsername(e.target.value)} required />
          </div>
          <div className="form-group">
            <label>Room ID:</label>
            <input type="text" value={roomId} onChange={(e) => setRoomId(e.target.value)} required />
          </div>
          <button type="submit" className="join-button">Join Lobby</button>
        </form>
      ) : roomState && !roomState.gameStarted ? (
        /* NEW: STAGING PRE-GAME LOBBY VIEW */
        <div className="pregame-lobby">
          <h2>Welcome to Room: <span style={{ color: '#007bff' }}>{roomId}</span></h2>
          <p style={{ color: '#747d8c' }}>Setup your configurations and wait for details matches.</p>
          
          <div className="settings-card">
            <h3>⚙️ Match Configurations</h3>
            <label style={{ display: 'block', marginBottom: '0.5rem', fontWeight: 'bold' }}>Round Timer Duration:</label>
            <select 
              value={roomState.roundDuration} 
              onChange={handleDurationChange} 
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
                onClick={handleStartGame} 
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
      ) : (
        /* PHASE 3 & 4: LIVE ACTIVE BOARD STATIONS */
        <div style={{ marginTop: '1rem' }}>
          <div className="game-header">
            <h3 className="room-display">Room: <span>{roomId}</span></h3>
            <div style={{ display: 'flex', gap: '1rem', alignItems: 'center' }}>
              <div style={{ background: '#ff4d4d', color: '#fff', padding: '0.5rem 1rem', borderRadius: '8px', fontWeight: 'bold' }}>
                ⏱️ {timer}s
              </div>
              <h3 className="word-banner">
                {isArtist 
                  ? `🖌️ WORD TO DRAW: ${roomState?.currentWord.toUpperCase()}` 
                  : `👀 GUESS THE WORD! (${roomState?.currentWord.length} letters)`}
              </h3>
            </div>
          </div>
          
          <div className="game-workspace">
            <div className="sidebar">
              <h4>Players:</h4>
              <ul className="player-list">
                {players.map((player) => {
                  const hasGuessedCorrectly = roomState?.correctGuessers.includes(player.id);
                  const isCurrentArtist = player.id === roomState?.currentArtist;

                  return (
                    <li key={player.id} className="player-card" style={{ 
                      borderLeft: hasGuessedCorrectly ? '5px solid #28a745' : isCurrentArtist ? '5px solid #ffc107' : '1px solid #dee2e6',
                      background: hasGuessedCorrectly ? '#e2f0d9' : '#fff'
                    }}>
                      <span className={`player-name ${player.id === socket.id ? 'bold' : ''}`}>
                        {isCurrentArtist ? '🖌️ ' : hasGuessedCorrectly ? '✅ ' : '🟢 '}
                        {player.username} {player.id === socket.id ? '(You)' : ''}
                      </span>
                      <span className="player-score">Score: {player.score}</span>
                    </li>
                  );
                })}
              </ul>
            </div>

            <div className={`canvas-wrapper ${!isArtist ? 'canvas-disabled' : ''}`}>
              {!isArtist && <div className="canvas-locked-notice">🔒 Canvas Locked: You are guessing!</div>}
              <Canvas socket={socket} roomId={roomId} isArtist={isArtist} />
            </div>

            <Chat socket={socket} roomId={roomId} username={username} />
          </div>
        </div>
      )}
    </div>
  );
}

export default App;