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
  type?:
    | "guesser-pool-chat" // Unified path type replacing individual channels
    | "is-drawing"
    | "joined"
    | "left"
    | "word-reveal"
    | "correct-guess"
    | "winner"
    | "system";
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

          // Dynamically map message types to CSS classes
          if (msg.type) {
            classModifier = ` msg-${msg.type}`;
          }

          return (
            <div key={index} className={`chat-message-row${classModifier}`}>
              {/* System messages render cleanly as full standalone block alerts */}
              {isSystem ? (
                <span>{msg.text}</span>
              ) : (
                /* Normal chat view and Guesser Pool chats now use the exact same standard format */
                <>
                  <span className="chat-sender-name">{msg.sender}: </span>
                  <span>{msg.text}</span>
                </>
              )}
            </div>
          );
          // return (
          //   <div key={index} className={`chat-message-row${classModifier}`}>
          //     {!isSystem && msg.type !== "artist-chat" ? (
          //       <>
          //         <span className="chat-sender-name">{msg.sender}: </span>
          //         <span>{msg.text}</span>
          //       </>
          //     ) : (
          //       /* System and private artist messages render cleanly as single block texts */
          //       <span>{msg.text}</span>
          //     )}
          //   </div>
          // );
        })}
        <div ref={chatEndRef} />
      </div>

      {/* Input Message Form */}
      <form onSubmit={handleSendMessage} className="chat-form">
        <div className="chat-input-wrapper">
          <input
            type="text"
            value={inputValue}
            onChange={(e) => setInputValue(e.target.value)}
            placeholder="Type your guess here..."
            className="chat-input"
            maxLength={100}
          />

          <span className="chat-char-count">{inputValue.length}</span>
        </div>

        <button type="submit" className="chat-submit-btn">
          Send
        </button>
      </form>
    </div>
  );
}
