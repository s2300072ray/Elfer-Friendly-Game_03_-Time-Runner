import { DifficultyConfig } from '../types';
import { MAX_SPEED, MIN_SPEED } from '../constants';

/**
 * Adaptive Difficulty Algorithm
 * Adjusts game speed based on recent player performance history.
 */
export const calculateNewSpeed = (
  currentSpeed: number,
  history: boolean[],
  config: DifficultyConfig
): number => {
  // We need at least 'historySize' (10) events to make a fair judgment.
  // However, for responsiveness, we can start adjusting after 5 events if needed,
  // but sticking to the prompt's N=10 strictly:
  if (history.length < config.historySize) {
    return currentSpeed;
  }

  // Calculate Accuracy
  const correctCount = history.filter((result) => result).length;
  const accuracy = correctCount / history.length;

  let newSpeed = currentSpeed;

  // Logic Conditions:
  // Accuracy >= 70%: Speed + 3%
  if (accuracy >= config.increaseThreshold) {
    newSpeed = currentSpeed * config.speedIncreaseFactor;
  }
  // Accuracy <= 50%: Speed - 4%
  else if (accuracy <= config.decreaseThreshold) {
    newSpeed = currentSpeed * config.speedDecreaseFactor;
  }
  // Accuracy 50% ~ 70%: Speed maintained (no change)

  // Clamp Speed
  return Math.min(Math.max(newSpeed, MIN_SPEED), MAX_SPEED);
};

export const updateHistory = (currentHistory: boolean[], wasCorrect: boolean, limit: number): boolean[] => {
  const newHistory = [...currentHistory, wasCorrect];
  if (newHistory.length > limit) {
    newHistory.shift(); // Keep window moving
  }
  return newHistory;
};