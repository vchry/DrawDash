import { useEffect, useState } from "react";
import type { Player } from "../types/game";
import avatarSprite from "../assets/avatar-sprites.gif";

interface PlayerTurningProps {
    player: Player;
    onComplete?: () => void;
    duration?: number; // duration in ms to show this component
}

const SPRITE_SIZE = 100;

const getSpritePosition = (col: number, row: number) => ({
    backgroundPosition: `${-col * SPRITE_SIZE}px ${-row * SPRITE_SIZE}px`,
});

export default function PlayerTurning({
    player,
    onComplete,
    duration = 2000,
}: PlayerTurningProps) {
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
        <div className={`player-turning ${isExiting ? "fade-out" : "fade-in"}`}>
            <div className="player-turning-content">
                <div className="player-avatar-large">
                    <div
                        className="layer body"
                        style={{
                            backgroundImage: `url(${avatarSprite})`,
                            ...getSpritePosition(player.body || 0, 0),
                        }}
                    />
                    <div
                        className="layer eyes"
                        style={{
                            backgroundImage: `url(${avatarSprite})`,
                            ...getSpritePosition(player.eyes || 0, 1),
                        }}
                    />
                    <div
                        className="layer mouth"
                        style={{
                            backgroundImage: `url(${avatarSprite})`,
                            ...getSpritePosition(player.mouth || 0, 2),
                        }}
                    />
                </div>
                <h2>{player.username}</h2>
                <p>is choosing a word...</p>
            </div>
        </div>
    );
}
