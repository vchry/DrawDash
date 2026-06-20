import playerJoin from "../assets/sounds/player_join.mp3";
import playerLeft from "../assets/sounds/player_left.mp3";
import correctGuess from "../assets/sounds/correct_guess.mp3";
import startDrawing from "../assets/sounds/start_drawing.mp3";
import timer from "../assets/sounds/timer.mp3";
import roundOver from "../assets/sounds/round_over.wav";

const SOUND_MAP: Record<string, string> = {
  player_join: playerJoin,
  player_left: playerLeft,
  correct_guess: correctGuess,
  start_drawing: startDrawing,
  timer: timer,
  round_over: roundOver,
};

const audioCache: Record<string, HTMLAudioElement> = {};
let muted = false;
let volume = 0.6;

export function setMuted(value: boolean) {
  muted = value;
}

export function setVolume(value: number) {
  volume = value;
  Object.values(audioCache).forEach((a) => (a.volume = volume));
}

export function playSound(name: string) {
  if (muted) return;
  const src = SOUND_MAP[name];
  if (!src) {
    console.warn(`SoundManager: unknown sound "${name}"`);
    return;
  }

  let base = audioCache[name];
  if (!base) {
    base = new Audio(src);
    base.volume = volume;
    audioCache[name] = base;
  }

  // Clone so overlapping triggers (e.g. two correct guesses in the same second)
  // don't cut each other off
  const instance = base.cloneNode(true) as HTMLAudioElement;
  instance.volume = base.volume;
  instance.play().catch((err) => {
    // Browsers block audio until a user gesture happens — joining/creating
    // a room counts, so this should be fine after that point
    console.warn("SoundManager: playback blocked", err);
  });
}