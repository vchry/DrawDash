import { useState, useEffect, useRef } from 'react';
import { Socket } from 'socket.io-client';

interface ChatProps {
  socket: Socket;
  roomId: string;
  username: string;
}

interface Message {
  sender: string;
  text: string;
  isCorrect?: boolean;
}

export default function Chat({ socket, roomId, username }: ChatProps) {
  const [messages, setMessages] = useState<Message[]>([]);
  const [inputValue, setInputValue] = useState('');
  const chatEndRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    // Append incoming messages to our feed state
    socket.on('chat_message', (message: Message) => {
      setMessages((prev) => [...prev, message]);
    });

    return () => {
      socket.off('chat_message');
    };
  }, [socket]);

  // Autoscroll chat box down when new messages land
  useEffect(() => {
    chatEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  const handleSendMessage = (e: React.FormEvent) => {
    e.preventDefault();
    if (!inputValue.trim()) return;

    socket.emit('send_message', { roomId, text: inputValue, username });
    setInputValue('');
  };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', width: '280px', height: '465px', border: '2px solid #333', borderRadius: '8px', background: '#fff' }}>
      
      {/* Scrollable Message History Area */}
      <div style={{ flex: 1, padding: '0.75rem', overflowY: 'auto', display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
        {messages.map((msg, index) => {
          let bg = 'transparent';
          let color = '#333';
          let weight = 'normal';

          if (msg.sender === 'System') {
            weight = 'bold';
            color = msg.isCorrect ? '#28a745' : '#6c757d'; // Green for win, Grey for normal alerts
            if (msg.isCorrect) bg = '#e2f0d9';
          }

          return (
            <div key={index} style={{ background: bg, padding: '4px 8px', borderRadius: '4px', fontSize: '0.9rem' }}>
              <span style={{ fontWeight: 'bold', color: msg.sender === 'System' ? color : '#007bff' }}>
                {msg.sender}:{' '}
              </span>
              <span style={{ color, fontWeight: weight }}>{msg.text}</span>
            </div>
          );
        })}
        <div ref={chatEndRef} />
      </div>

      {/* Input Message Form */}
      <form onSubmit={handleSendMessage} style={{ display: 'flex', borderTop: '2px solid #333' }}>
        <input
          type="text"
          value={inputValue}
          onChange={(e) => setInputValue(e.target.value)}
          placeholder="Type your guess here..."
          style={{ flex: 1, padding: '0.75rem', border: 'none', outline: 'none', borderRadius: '0 0 0 6px' }}
        />
        <button type="submit" style={{ padding: '0.75rem 1rem', background: '#007bff', color: '#fff', border: 'none', cursor: 'pointer', fontWeight: 'bold', borderRadius: '0 0 6px 0' }}>
          Send
        </button>
      </form>
    </div>
  );
}