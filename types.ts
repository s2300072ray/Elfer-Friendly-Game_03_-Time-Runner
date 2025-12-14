export enum ItemType {
  COLLECTIBLE = 'COLLECTIBLE', // Good item (e.g., Energy/Star)
  OBSTACLE = 'OBSTACLE',       // Bad item (e.g., Rock/Trash)
}

export enum GameStatus {
  IDLE = 'IDLE',
  PLAYING = 'PLAYING',
  PAUSED = 'PAUSED',
  GAME_OVER = 'GAME_OVER',
}

export enum Language {
  EN = 'EN',
  ZH = 'ZH'
}

export enum Difficulty {
  EASY = 'EASY',
  NORMAL = 'NORMAL',
  HARD = 'HARD'
}

export interface GameObject {
  id: string;
  x: number;
  y: number;
  type: ItemType;
  width: number;
  height: number;
  markedForDeletion: boolean;
  color: string;
}

export interface GameState {
  score: number;
  comboCount: number; // Consecutive correct actions
  multiplier: number; // 1.0, 1.1, 1.2 etc.
  speed: number; // Pixels per frame
  history: boolean[]; // Last N results (true = correct, false = incorrect)
  status: GameStatus;
  feedbackMessage: string | null;
}

export interface DifficultyConfig {
  historySize: number;
  increaseThreshold: number; // e.g., 0.7 (70%)
  decreaseThreshold: number; // e.g., 0.5 (50%)
  speedIncreaseFactor: number; // e.g., 1.03
  speedDecreaseFactor: number; // e.g., 0.96
}