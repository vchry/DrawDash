import { useEffect, useRef, useState } from "react";
import type { RoomState } from "../types/game";
import Clock from "../assets/clock.gif";
import Setting from "../assets/setting.gif";
import SettingsPanel from "./Settings";

interface TopBarProps {
  roomState: RoomState;
  timer: number;
  isArtist: boolean;
  hasGuessed: boolean;
}

// ---------------------------------------------------------------------------
// Hint logic – completely mirrors skribbl.io behavior
// ---------------------------------------------------------------------------
function buildHintThresholds(count: number): number[] {
  if (count <= 0) return [];

  if (count === 1) return [0.5];
  if (count === 2) return [0.375, 0.6875];
  if (count === 3) return [0.25, 0.5, 0.75];

  const start = 0.2;
  const end = 0.8;
  return Array.from(
    { length: count },
    (_, i) => start + (i / (count - 1)) * (end - start),
  );
}

function buildHintedChars(
  word: string,
  elapsedFraction: number,
  maxHints: number,
): (string | null)[] {
  const indices = word
    .split("")
    .map((ch, i) => (ch !== " " ? i : -1))
    .filter((i) => i !== -1);

  const letterCount = indices.length;

  let skribblMaxHints = 0;
  if (letterCount >= 8) {
    skribblMaxHints = 3;
  } else if (letterCount >= 5) {
    skribblMaxHints = 2;
  } else if (letterCount >= 3) {
    skribblMaxHints = 1;
  }

  const actualMax = Math.min(maxHints, skribblMaxHints);
  if (actualMax <= 0) return word.split("").map(() => null);

  const thresholds = buildHintThresholds(actualMax);
  const tier = thresholds.filter((t) => elapsedFraction >= t).length;

  if (tier === 0) return word.split("").map(() => null);

  const firstIndex = indices[0];
  const remainingIndices = indices.slice(1);

  const seed = word.split("").reduce((acc, ch) => acc + ch.charCodeAt(0), 0);

  const shuffledRemaining = [...remainingIndices].sort(
    (a, b) => ((a * seed * 2654435761) >>> 0) - ((b * seed * 2654435761) >>> 0),
  );

  const chosenIndices: number[] = [];
  if (tier >= 1 && firstIndex !== undefined) {
    chosenIndices.push(firstIndex);
  }
  if (tier > 1) {
    chosenIndices.push(...shuffledRemaining.slice(0, tier - 1));
  }

  const revealSet = new Set(chosenIndices);
  return word.split("").map((ch, i) => (revealSet.has(i) ? ch : null));
}

function WordCells({
  word,
  hintedChars,
  startIndex,
  showFull,
  isGuessedByMe,
}: {
  word: string;
  hintedChars: (string | null)[];
  startIndex: number;
  showFull: boolean;
  isGuessedByMe: boolean;
}) {
  return (
    <div className="word-cells-group">
      {word.split("").map((char, localIdx) => {
        const globalIdx = startIndex + localIdx;
        const hinted = hintedChars[globalIdx];

        const display = showFull ? char.toUpperCase() : hinted?.toUpperCase();

        const classes = [
          "letter-cell",
          display ? "letter-cell--revealed" : "",
          isGuessedByMe ? "letter-cell--guessed" : "",
        ]
          .filter(Boolean)
          .join(" ");

        return (
          <span key={localIdx} className={classes}>
            {display ?? ""}
          </span>
        );
      })}
    </div>
  );
}

export default function TopBar({
  roomState,
  timer,
  isArtist,
  hasGuessed,
}: TopBarProps) {
  const [settingsOpen, setSettingsOpen] = useState(false);

  const currentRound = roomState.currentRound ?? 0;
  const totalRounds = roomState.totalRounds || 3;
  const phase = roomState.phase ?? "";

  const fullWord =
    roomState.currentWord ||
    (roomState as any).revealedWord ||
    (roomState as any).word ||
    "" blockoutSymbol;

  const isRevealPhase =
    phase === "reveal" || phase === "roundEnd" || phase === "revealWord";
  const showFull = isArtist || hasGuessed || isRevealPhase;
  const isGuessedByMe = hasGuessed && !isArtist;

  const maxHints: number = (roomState as any).hints ?? 2;
  const [elapsedFraction, setElapsedFraction] = useState(0);

  const maxTimerRef = useRef<number | null>(null);
  const prevPhaseRef = useRef<string | null>(null);

  useEffect(() => {
    if (phase === "drawing" && prevPhaseRef.current !== "drawing") {
      maxTimerRef.current = timer;
      setElapsedFraction(0);
    } else if (phase !== "drawing") {
      maxTimerRef.current = null;
      setElapsedFraction(0);
    }
    prevPhaseRef.current = phase;
  }, [phase]);

  useEffect(() => {
    if (phase !== "drawing") return;
    const max = maxTimerRef.current;
    if (!max || max <= 0) return;

    const elapsed = (max - timer) / max;
    setElapsedFraction(Math.min(Math.max(elapsed, 0), 1));
  }, [timer, phase]);

  const hintedChars =
    showFull || !fullWord
      ? []
      : buildHintedChars(fullWord, elapsedFraction, maxHints);

  const renderWordArea = () => {
    if (!roomState.gameStarted) {
      return <div className="status-text">WAITING FOR PLAYERS...</div>;
    }

    if (phase === "selecting") {
      return <div className="status-text">CHOOSING WORD...</div>;
    }

    if (phase === "drawing" || isRevealPhase) {
      const label = isRevealPhase
        ? "THE WORD WAS:"
        : isGuessedByMe
          ? "WORD GUESSED!"
          : showFull
            ? "DRAW THIS"
            : "GUESS THIS";

      if (!fullWord) {
        return (
          <div className="skribble-word-container">
            <div
              className={`guess-title ${isGuessedByMe ? "guess-title--guessed" : ""}`}
            >
              {label}
            </div>
            <div className="word-blanks-row">
              <div className="word-cells-group">
                {Array.from({ length: 5 }).map((_, i) => (
                  <span key={i} className="letter-cell" />
                ))}
              </div>
            </div>
          </div>
        );
      }

      const wordsArray = fullWord.split(" ");
      // FIXED: Added strict string type mapping to parameter 'w'
      const wordLengthsString = wordsArray.map((w: string) => w.length).join("  ");

      const startIndices: number[] = [];
      let cursor = 0;
      for (const w of wordsArray) {
        startIndices.push(cursor);
        cursor += w.length + 1;
      }

      return (
        <div className="skribble-word-container">
          <div
            className={`guess-title ${isGuessedByMe ? "guess-title--guessed" : ""} ${isRevealPhase ? "guess-title--reveal" : ""}`}
          >
            {label}
          </div>
          <div className="word-blanks-row">
            {/* FIXED: Added strict string type to 'word' and number type to 'wi' */}
            {wordsArray.map((word: string, wi: number) => (
              <WordCells
                key={wi}
                word={word}
                hintedChars={hintedChars}
                startIndex={startIndices[wi]}
                showFull={showFull}
                isGuessedByMe={isGuessedByMe && !isRevealPhase}
              />
            ))}
          </div>
          {!showFull && (
            <div className="word-length-indicator">{wordLengthsString}</div>
          )}
        </div>
      );
    }

    return <div className="status-text">DRAWING...</div>;
  };

  return (
    <>
      {/* Settings modal — fixed overlay, renders above everything */}
      {settingsOpen && <SettingsPanel onClose={() => setSettingsOpen(false)} />}

      <div className="topbar">
        <div className="timer-round">
          {/* <div className="timer-round-container"> */}
            <div className="timer">
              <img src={Clock} alt="Clock Icon" width={70} className="shadow" />
              <span className="time">{timer}</span>
            </div>
            <div className="round">
              <h3 style={{ margin: 0, fontSize: "18px" }}>
                Round {currentRound} of {totalRounds}
              </h3>
            </div>
          {/* </div> */}
        </div>

        <div className="word-area">{renderWordArea()}</div>

        {/* Settings gif — click opens the SettingsPanel modal */}
        <div className="setting-btn">
          <img
            src={Setting}
            alt="Settings"
            width={50}
            className="shadow"
            onClick={() => setSettingsOpen(true)}
            style={{ cursor: "pointer" }}
          />
        </div>
      </div>
    </>
  );
}