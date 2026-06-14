import { useEffect, useState } from "react";
import Avatar from "./Avatar";

interface Winner {
    id: string;
    username: string;
    score: number;
    body?: number;
    eyes?: number;
    mouth?: number;
}

interface GameOverWinnersProps {
    winners: Winner[];
    onClose?: () => void;
    duration?: number;
}

export default function GameOverWinners({ winners, onClose, duration = 4000 }: GameOverWinnersProps) {
    const [isExiting, setIsExiting] = useState(false);

    useEffect(() => {
        const timer = window.setTimeout(() => {
            setIsExiting(true);
            setTimeout(() => onClose?.(), 500);
        }, duration);

        return () => {
            window.clearTimeout(timer);
        };
    }, [duration, onClose]);

    return (
        <div className={`round-indicator ${isExiting ? "slide-out" : "slide-in"}`}>
            <div className="round-content game-over-card">
                <h2>Game Over</h2>
                <h3>Top Players</h3>

                <ol className="winners-list">
                    {(() => {
                        // compute ranks so tied scores share the same rank
                        const sorted = [...winners].sort((a, b) => (b.score || 0) - (a.score || 0));
                        const out: Array<Winner & { rank: number }> = [];
                        let prevScore: number | null = null;
                        let prevRank = 0;
                        for (let i = 0; i < sorted.length; i++) {
                            const w = sorted[i];
                            const score = w.score || 0;
                            const rank = i === 0 ? 1 : score === prevScore ? prevRank : i + 1;
                            out.push({ ...w, rank });
                            prevScore = score;
                            prevRank = rank;
                        }
                        return out.map((w, idx) => (
                            <li key={w.id} className={`winner winner-${idx + 1}`}>
                                <div className="winner-avatar">
                                    <Avatar body={w.body ?? 0} eyes={w.eyes ?? 0} mouth={w.mouth ?? 0} size={72} special={null} />
                                </div>
                                <div className="winner-info">
                                    <div className="winner-name">{w.username}</div>
                                    <div className="winner-score">{w.score} pts</div>
                                </div>
                                <div className="winner-rank">#{w.rank}</div>
                            </li>
                        ));
                    })()}
                </ol>
            </div>
        </div>
    );
}