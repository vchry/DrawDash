import { useEffect, useState } from "react";

interface RoundIndicatorProps {
  currentRound: number;
  totalRounds: number;
  onComplete?: () => void;
  duration?: number; // duration in ms to show this component
}

export default function RoundIndicator({
  currentRound,
  totalRounds,
  onComplete,
  duration = 2000,
}: RoundIndicatorProps) {
  const [isExiting, setIsExiting] = useState(false);

  useEffect(() => {
    const timer = setTimeout(() => {
      setIsExiting(true);
      setTimeout(() => {
        onComplete?.();
      }, 500); // fade out duration
    }, duration);

    return () => clearTimeout(timer);
  }, [duration, onComplete]);

  return (
    <div className={`round-indicator ${isExiting ? "slide-out" : "slide-in"}`}>
      <div className="round-content">
        <h1>Round {currentRound}</h1>
      </div>
    </div>
  );
}
