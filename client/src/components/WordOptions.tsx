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
    const [remainingSeconds, setRemainingSeconds] = useState(5);

    const handleSelectWord = (word: string) => {
        if (!isSubmitted && isArtist) {
            setSelectedWord(word);
            setIsSubmitted(true);
            onWordSelected(word);
        }
    };

    useEffect(() => {
        if (isSubmitted || !isArtist) {
            return;
        }

        if (remainingSeconds <= 0) {
            const chosenWord = selectedWord || wordOptions[Math.floor(Math.random() * wordOptions.length)];
            if (chosenWord) {
                setIsSubmitted(true);
                onWordSelected(chosenWord);
            }
            return;
        }

        const timer = window.setTimeout(() => {
            setRemainingSeconds((seconds) => seconds - 1);
        }, 1000);

        return () => window.clearTimeout(timer);
    }, [remainingSeconds, selectedWord, isSubmitted, isArtist, wordOptions, onWordSelected]);

    if (!isArtist) {
        return (
            <div className="word-options-waiting">
                <div className="waiting-content">
                    <h2>⏳ Waiting for Word Selection</h2>
                    <p className="waiting-message">{artistName} is choosing a word...</p>
                    <div className="waiting-timer">{remainingSeconds} second{remainingSeconds === 1 ? "" : "s"} remaining</div>
                </div>
            </div>
        );
    }

    return (
        <div className={`word-options ${isSubmitted ? "fade-out" : "fade-in"}`}>
            <div className="word-options-content">
                <h2>Choose a Word</h2>
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
                <div className="choice-timer">
                    {selectedWord
                        ? `Selected: ${selectedWord}`
                        : `Choose a word or it will be selected automatically in ${remainingSeconds} second${remainingSeconds === 1 ? "" : "s"}`}
                </div>
            </div>
        </div>
    );
}
