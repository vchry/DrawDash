import { useState, useCallback } from "react";
import type { Player } from "../types/game";
import RoundIndicator from "./RoundIndicator";
import PlayerTurning from "./PlayerTurning";
import WordOptions from "./WordOptions";

interface GamePhaseSequenceProps {
    currentPlayer: Player | undefined;
    currentRound: number;
    totalRounds: number;
    wordOptions: string[];
    onWordSelected: (word: string) => void;
    onSequenceComplete?: () => void;
    isArtist?: boolean;
    showRoundIndicator: boolean;
}

type SequencePhase = "round" | "player" | "word-options" | "complete";

export default function GamePhaseSequence({
    currentPlayer,
    currentRound,
    totalRounds,
    wordOptions,
    onWordSelected,
    onSequenceComplete,
    isArtist = false,
    showRoundIndicator,
}: GamePhaseSequenceProps) {
    const [currentPhase, setCurrentPhase] = useState<SequencePhase>(
        showRoundIndicator
            ? "round"
            : (isArtist ? "word-options" : "player")
    );

    const handleRoundComplete = useCallback(() => {
        if (isArtist) {
            setCurrentPhase("word-options");
        } else {
            setCurrentPhase("player");
        }
    }, [isArtist]);

    const handlePlayerComplete = useCallback(() => {
        setCurrentPhase("word-options");
    }, []);

    const handleWordSelected = useCallback((word: string) => {
        onWordSelected(word);
        setCurrentPhase("complete");
        setTimeout(() => {
            onSequenceComplete?.();
        }, 1000);
    }, [onWordSelected, onSequenceComplete]);

    if (!currentPlayer) {
        return null;
    }

    return (
        <div className="game-phase-sequence">
            {currentPhase === "round" && (
                <RoundIndicator
                    currentRound={currentRound}
                    totalRounds={totalRounds}
                    onComplete={handleRoundComplete}
                />
            )}
            {currentPhase === "player" && (
                <PlayerTurning
                    player={currentPlayer}
                    onComplete={isArtist ? handlePlayerComplete : undefined}
                />
            )}
            {currentPhase === "word-options" && (
                <WordOptions
                    wordOptions={wordOptions}
                    onWordSelected={handleWordSelected}
                    artistName={currentPlayer?.username}
                    isArtist={isArtist}
                />
            )}
        </div>
    );
}
