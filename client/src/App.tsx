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
  currentArtist: string | null;
  currentWord: string;
  timeLeft: number;
  gameStarted: boolean;
  correctGuessers: string[]; // Match server updates cleanly
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

  const isArtist = roomState?.currentArtist === socket.id;

  return (
    <div className="game-container">
      <h1 className="title">✏️ Skribbl Clone</h1>
      <hr className="divider" />

      {!isJoined ? (
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
      ) : (
        <div style={{ marginTop: '1rem' }}>
          
          {/* Header Bar Area */}
          <div className="game-header">
            <h3 className="room-display">Room: <span>{roomId}</span></h3>
            
            {roomState?.gameStarted && (
              <div style={{ display: 'flex', gap: '1rem', alignItems: 'center' }}>
                <div style={{ background: '#ff4d4d', color: '#fff', padding: '0.5rem 1rem', borderRadius: '8px', fontWeight: 'bold' }}>
                  ⏱️ {timer}s
                </div>
                <h3 className="word-banner">
                  {isArtist 
                    ? `🖌️ WORD TO DRAW: ${roomState.currentWord.toUpperCase()}` 
                    : `👀 GUESS THE WORD! (${roomState.currentWord.length} letters)`}
                </h3>
              </div>
            )}

            {!roomState?.gameStarted && (
              <h3 className="word-banner" style={{ background: '#ffeaa7', color: '#d63031' }}>
                ⏳ Waiting for more players to join...
              </h3>
            )}
          </div>
          
          {/* Layout Grid Workspace */}
          <div className="game-workspace">
            
            {/* Column 1: Score Roster */}
            <div className="sidebar">
              <h4>Players:</h4>
              <ul className="player-list">
                {players.map((player) => {
                  // Determine if this specific player has guessed correctly
                  const hasGuessedCorrectly = roomState?.correctGuessers.includes(player.id);
                  const isCurrentArtist = player.id === roomState?.currentArtist;

                  return (
                    <li 
                      key={player.id} 
                      className="player-card" 
                      style={{ 
                        borderLeft: hasGuessedCorrectly ? '5px solid #28a745' : isCurrentArtist ? '5px solid #ffc107' : '1px solid #dee2e6',
                        background: hasGuessedCorrectly ? '#e2f0d9' : '#fff'
                      }}
                    >
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

            {/* Column 2: Drawing Space Area */}
            <div className={`canvas-wrapper ${!isArtist ? 'canvas-disabled' : ''}`}>
              {!isArtist && (
                <div className="canvas-locked-notice">🔒 Canvas Locked: You are guessing!</div>
              )}
              <Canvas socket={socket} roomId={roomId} isArtist={isArtist} />
            </div>

            {/* Column 3: Chat Box Feed */}
            <Chat socket={socket} roomId={roomId} username={username} />

          </div>
        </div>
      )}
    </div>
  );
}

export default App;