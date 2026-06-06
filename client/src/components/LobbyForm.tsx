import React from 'react';

interface LobbyFormProps {
  username: string;
  setUsername: (val: string) => void;
  roomId: string;
  setRoomId: (val: string) => void;
  onJoin: (e: React.FormEvent) => void;
}

export default function LobbyForm({ 
  username, 
  setUsername, 
  roomId, 
  setRoomId, 
  onJoin 
}: LobbyFormProps) {
  return (
    <form onSubmit={onJoin} className="lobby-form">
      <div className="form-group">
        <label>Username:</label>
        <input 
          type="text" 
          value={username} 
          onChange={(e) => setUsername(e.target.value)} 
          required 
        />
      </div>
      <div className="form-group">
        <label>Room ID:</label>
        <input 
          type="text" 
          value={roomId} 
          onChange={(e) => setRoomId(e.target.value)} 
          required 
        />
      </div>
      <button type="submit" className="join-button">Join Lobby</button>
    </form>
  );
}