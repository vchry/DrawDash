import { useState, useEffect, useRef } from "react";
import { Socket } from "socket.io-client";

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
  const [inputValue, setInputValue] = useState("");
  const chatEndRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    socket.on("chat_message", (message: Message) => {
      setMessages((prev) => [...prev, message]);
    });

    return () => {
      socket.off("chat_message");
    };
  }, [socket]);

  useEffect(() => {
    chatEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  const handleSendMessage = (e: React.FormEvent) => {
    e.preventDefault();
    if (!inputValue.trim()) return;

    socket.emit("send_message", { roomId, text: inputValue, username });
    setInputValue("");
  };

  return (
    <div className="chat-container">
      {/* Scrollable Message History Area */}
      <div className="chat-history">
        {messages.map((msg, index) => {
          let classModifier = "";
          const isSystem = msg.sender === "System";

          // Assign distinct classes based on the visual layout requirements
          if (isSystem) {
            if (msg.isCorrect) {
              classModifier = " msg-correct";
            } else if (msg.text.includes("Round started!") || msg.text.includes("is choosing a word!")) {
              classModifier = " msg-started"; // Matches your new round start phase updates
            } else if (msg.text.includes("is drawing now")) {
              classModifier = " msg-drawing";
            } else if (msg.text.includes("joined the room")) {
              classModifier = " msg-joined";
            } else if (msg.text.includes("left the room")) {
              classModifier = " msg-left";
            } else if (msg.text.includes("room owner")) {
              classModifier = " msg-owner";
            } else if (msg.text.includes("won with a score")) {
              classModifier = " msg-winner";
            }
          }

          return (
            <div key={index} className={`chat-message-row${classModifier}`}>
              {/* System alerts in the screenshots don't show 'System: ', just raw text */}
              {!isSystem ? (
                <>
                  <span className="chat-sender-name">{msg.sender}: </span>
                  <span>{msg.text}</span>
                </>
              ) : (
                <span>{msg.text}</span>
              )}
            </div>
          );
        })}
        <div ref={chatEndRef} />
      </div>

      {/* Input Message Form */}
      <form onSubmit={handleSendMessage} className="chat-form">
        <input
          type="text"
          value={inputValue}
          onChange={(e) => setInputValue(e.target.value)}
          placeholder="Type your guess here..."
          className="chat-input"
        />
        <button type="submit" className="chat-submit-btn">
          Send
        </button>
      </form>
    </div>
  );
}
