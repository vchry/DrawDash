import { useState, useEffect } from "react";

interface WordOptionsProps {
  wordOptions: string[];
  onWordSelected: (word: string) => void;
  artistName?: string;
  isArtist?: boolean;
}

export default function WordOptions({
  wordOptions,
  onWordSelected,
  artistName = "Artist",
  isArtist = false,
}: WordOptionsProps) {
  const [selectedWord, setSelectedWord] = useState<string | null>(null);
  const [isSubmitted, setIsSubmitted] = useState(false);
  const [isExiting, setIsExiting] = useState(false);
  const [remainingSeconds, setRemainingSeconds] = useState(5);

  // Helper function to handle wrapping up the component with an exit animation
  const triggerExitSequence = (word: string) => {
    setIsSubmitted(true);
    setIsExiting(true);
    
    // Give the slideToTop CSS keyframe 500ms to finish before updating sequence state
    setTimeout(() => {
      onWordSelected(word);
    }, 500);
  };

  const handleSelectWord = (word: string) => {
    if (!isSubmitted && isArtist) {
      setSelectedWord(word);
      triggerExitSequence(word);
    }
  };

  useEffect(() => {
    // If already submitted, or if this client is just a spectator, don't tick down a local auto-pick timer
    if (isSubmitted || !isArtist) {
      return;
    }

    if (remainingSeconds <= 0) {
      const chosenWord = selectedWord || wordOptions[Math.floor(Math.random() * wordOptions.length)];
      if (chosenWord) {
        triggerExitSequence(chosenWord);
      }
      return;
    }

    const timer = window.setTimeout(() => {
      setRemainingSeconds((seconds) => seconds - 1);
    }, 1000);

    return () => window.clearTimeout(timer);
  }, [remainingSeconds, selectedWord, isSubmitted, isArtist, wordOptions]);

  // Shared dynamic class generation for swipe-in and swipe-out transitions
  const animationClass = isExiting ? "slide-out" : "slide-in";

  if (!isArtist) {
    return (
      <div className={`word-options-waiting ${animationClass}`}>
        <div className="waiting-content">
          <p className="waiting-message">{artistName} is choosing a word!</p>
          {/* Note: In your screenshot, the avatar is here. If your custom layout logic 
              manages it below, you can add it back here seamlessly */}
        </div>
      </div>
    );
  }

  return (
    <div className={`sml-phase word-options ${animationClass}`}>
      <div className="word-options-content">
        <h2>Choose a word</h2>
        <div className="word-buttons-container">
          {wordOptions.map((word) => (
            <button
              key={word}
              className={`word-button ${selectedWord === word ? "selected" : ""}`}
              onClick={() => handleSelectWord(word)}
              disabled={isSubmitted}
            >
              {word}
            </button>
          ))}
        </div>
      </div>
    </div>
  );
}