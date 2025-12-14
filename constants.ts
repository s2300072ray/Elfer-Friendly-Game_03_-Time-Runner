import { DifficultyConfig, Difficulty } from './types';

export const GAME_WIDTH = 800;
export const GAME_HEIGHT = 400;

// High Contrast Colors for Senior Accessibility
export const COLORS = {
  BACKGROUND: '#0F172A', // Slate 900
  PLAYER: '#38BDF8',     // Sky 400
  COLLECTIBLE: '#FCD34D', // Amber 300
  OBSTACLE: '#EF4444',    // Red 500
  TEXT: '#F8FAFC',        // Slate 50
  HUD_BG: '#1E293B',      // Slate 800
};

export const DIFFICULTY_SETTINGS: DifficultyConfig = {
  historySize: 10,
  increaseThreshold: 0.7, // 70%
  decreaseThreshold: 0.5, // 50%
  speedIncreaseFactor: 1.03, // +3%
  speedDecreaseFactor: 0.96, // -4%
};

export const DIFFICULTY_PRESETS = {
  [Difficulty.EASY]: { initialSpeed: 3, maxSpeed: 8, spawnRate: 1800 },
  [Difficulty.NORMAL]: { initialSpeed: 4, maxSpeed: 12, spawnRate: 1500 },
  [Difficulty.HARD]: { initialSpeed: 6, maxSpeed: 16, spawnRate: 1200 },
};

export const TRANSLATIONS = {
  EN: {
    startTitle: "TIME RUNNER",
    pressStart: "Press Space to Start",
    score: "Score",
    speed: "Speed",
    combo: "Combo",
    pause: "PAUSED",
    resume: "RESUME",
    restart: "RESTART",
    quit: "MAIN MENU",
    gameOver: "GAME OVER",
    finalScore: "Final Score",
    brainAge: "Brain Age",
    report: "Performance Report",
    playAgain: "PLAY AGAIN",
    selectLang: "Language",
    selectDiff: "Difficulty",
    diffEasy: "Relaxed",
    diffNormal: "Normal",
    diffHard: "Active",
    collect: "Collect Gold",
    avoid: "Avoid Red",
    ageSuffix: "years old",
    startBtn: "START GAME",
    goodAvoid: "Good Avoid!",
    wrong: "Wrong!",
    missed: "Missed!",
    pauseTitle: "PAUSED",
    reportTitle: "Result"
  },
  ZH: {
    startTitle: "時光跑者",
    pressStart: "按空白鍵開始",
    score: "分數",
    speed: "速度",
    combo: "連擊",
    pause: "暫停",
    resume: "繼續遊戲",
    restart: "重新開始",
    quit: "回到主選單",
    gameOver: "遊戲結束",
    finalScore: "最終分數",
    brainAge: "大腦反應年齡",
    report: "表現分析報告",
    playAgain: "再次挑戰",
    selectLang: "語言 (Language)",
    selectDiff: "難度選擇",
    diffEasy: "輕鬆",
    diffNormal: "普通",
    diffHard: "活躍",
    collect: "收集金幣",
    avoid: "避開障礙",
    ageSuffix: "歲",
    startBtn: "開始遊戲",
    goodAvoid: "漂亮閃避!",
    wrong: "小心!",
    missed: "錯過了!",
    pauseTitle: "遊戲暫停",
    reportTitle: "成績單"
  }
};

export const SCORING = {
  BASE_COLLECT: 10,
  BASE_IGNORE: 5,
  COMBO_THRESHOLD: 5,
  BONUS_PERCENT: 0.10, // 10%
};

export const INITIAL_SPEED = 4; // Default fallback
export const MIN_SPEED = 2;
export const MAX_SPEED = 20;
export const INTERACTION_ZONE_X = 150; // X position where player interacts
export const INTERACTION_RADIUS = 80; // Distance to allow interaction