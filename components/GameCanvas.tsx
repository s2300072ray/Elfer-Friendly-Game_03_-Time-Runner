import React, { useEffect, useRef, useState, useCallback } from 'react';
import { GameStatus, GameObject, ItemType, Language, Difficulty } from '../types';
import { 
  GAME_WIDTH, 
  GAME_HEIGHT, 
  COLORS, 
  INTERACTION_ZONE_X, 
  INTERACTION_RADIUS, 
  SCORING, 
  DIFFICULTY_SETTINGS,
  TRANSLATIONS,
  DIFFICULTY_PRESETS
} from '../constants';
import { calculateNewSpeed, updateHistory } from '../services/difficultyService';
import { Play, RotateCcw, Trophy, Activity, Keyboard, Pause, Home, Settings } from 'lucide-react';

const GameCanvas: React.FC = () => {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const requestRef = useRef<number>(0);
  const lastTimeRef = useRef<number>(0);
  const spawnTimerRef = useRef<number>(0);

  // User Preferences State
  const [language, setLanguage] = useState<Language>(Language.ZH);
  const [difficulty, setDifficulty] = useState<Difficulty>(Difficulty.NORMAL);

  // Mutable Game State (Ref for performance in loop)
  const gameStateRef = useRef<{
    objects: GameObject[];
    speed: number;
    score: number;
    maxSpeed: number; // Track max speed for evaluation
    combo: number;
    history: boolean[];
    status: GameStatus;
    lastFeedback: { text: string; color: string; alpha: number; y: number } | null;
  }>({
    objects: [],
    speed: DIFFICULTY_PRESETS[Difficulty.NORMAL].initialSpeed,
    score: 0,
    maxSpeed: DIFFICULTY_PRESETS[Difficulty.NORMAL].initialSpeed,
    combo: 0,
    history: [],
    status: GameStatus.IDLE,
    lastFeedback: null,
  });

  // React State for UI updates (HUD)
  const [hudState, setHudState] = useState({
    score: 0,
    combo: 0,
    status: GameStatus.IDLE,
    speedFactor: 1
  });

  const t = TRANSLATIONS[language];

  // --- Core Logic: Object Spawning ---
  const spawnObject = () => {
    const isCollectible = Math.random() > 0.4;
    const obj: GameObject = {
      id: Math.random().toString(36).substr(2, 9),
      x: GAME_WIDTH + 50,
      y: GAME_HEIGHT - 100,
      type: isCollectible ? ItemType.COLLECTIBLE : ItemType.OBSTACLE,
      width: 50,
      height: 50,
      markedForDeletion: false,
      color: isCollectible ? COLORS.COLLECTIBLE : COLORS.OBSTACLE,
    };
    gameStateRef.current.objects.push(obj);
  };

  // --- Core Logic: Input Handling (Single Key) ---
  const handleInput = useCallback(() => {
    if (gameStateRef.current.status !== GameStatus.PLAYING) return;

    const playerX = INTERACTION_ZONE_X;
    const objects = gameStateRef.current.objects;

    const targetIndex = objects.findIndex(obj => 
      Math.abs(obj.x - playerX) <= INTERACTION_RADIUS
    );

    if (targetIndex !== -1) {
      const target = objects[targetIndex];
      
      if (target.type === ItemType.COLLECTIBLE) {
        handleScoring(true, ItemType.COLLECTIBLE);
        showFeedback("+10", COLORS.COLLECTIBLE);
        target.markedForDeletion = true;
      } else {
        handleScoring(false, ItemType.OBSTACLE);
        showFeedback(t.wrong, COLORS.OBSTACLE);
        target.markedForDeletion = true;
      }
    }
  }, [t]);

  // --- Core Logic: Scoring & Adaptive Difficulty ---
  const handleScoring = (isCorrect: boolean, type: ItemType) => {
    const state = gameStateRef.current;
    
    state.history = updateHistory(state.history, isCorrect, DIFFICULTY_SETTINGS.historySize);
    
    // Calculate new speed
    const newSpeed = calculateNewSpeed(state.speed, state.history, DIFFICULTY_SETTINGS);
    
    // Clamp speed based on difficulty preset
    const preset = DIFFICULTY_PRESETS[difficulty];
    state.speed = Math.min(newSpeed, preset.maxSpeed);
    
    // Track max speed
    if (state.speed > state.maxSpeed) state.maxSpeed = state.speed;

    if (isCorrect) {
      state.combo += 1;
      const bonusMultiplier = 1 + (Math.floor(state.combo / SCORING.COMBO_THRESHOLD) * SCORING.BONUS_PERCENT);
      const basePoints = type === ItemType.COLLECTIBLE ? SCORING.BASE_COLLECT : SCORING.BASE_IGNORE;
      state.score += Math.round(basePoints * bonusMultiplier);
    } else {
      state.combo = 0;
    }

    syncHud();
  };

  // --- Feedback Visuals ---
  const showFeedback = (text: string, color: string) => {
    gameStateRef.current.lastFeedback = {
      text,
      color,
      alpha: 1.0,
      y: GAME_HEIGHT / 2 - 50
    };
  };

  // --- Game Loop ---
  const update = (time: number) => {
    if (gameStateRef.current.status !== GameStatus.PLAYING) {
      lastTimeRef.current = time; // Keep time synced even when paused/idle
      requestRef.current = requestAnimationFrame(update);
      return;
    }

    const deltaTime = time - lastTimeRef.current;
    lastTimeRef.current = time;

    const state = gameStateRef.current;
    const preset = DIFFICULTY_PRESETS[difficulty];

    // 1. Spawning Logic
    const currentSpawnRate = preset.spawnRate / (state.speed / preset.initialSpeed);
    if (time - spawnTimerRef.current > currentSpawnRate) {
      spawnObject();
      spawnTimerRef.current = time;
    }

    // 2. Update Objects
    state.objects.forEach(obj => {
      obj.x -= state.speed;

      if (obj.x + obj.width < 0) {
        obj.markedForDeletion = true;
        if (obj.type === ItemType.OBSTACLE) {
          handleScoring(true, ItemType.OBSTACLE);
          showFeedback(t.goodAvoid, COLORS.PLAYER);
        } else {
          handleScoring(false, ItemType.COLLECTIBLE);
          showFeedback(t.missed, COLORS.OBSTACLE);
        }
      }
    });

    state.objects = state.objects.filter(obj => !obj.markedForDeletion);

    // 4. Update Feedback
    if (state.lastFeedback) {
      state.lastFeedback.alpha -= 0.02;
      state.lastFeedback.y -= 1;
      if (state.lastFeedback.alpha <= 0) state.lastFeedback = null;
    }

    render();
    
    // Sync UI mostly on events, but occasionally here for speed/combo updates
    if (Math.random() > 0.95) syncHud();

    requestRef.current = requestAnimationFrame(update);
  };

  const render = () => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    // Clear
    ctx.fillStyle = COLORS.BACKGROUND;
    ctx.fillRect(0, 0, GAME_WIDTH, GAME_HEIGHT);

    // Draw Floor
    ctx.fillStyle = '#334155';
    ctx.fillRect(0, GAME_HEIGHT - 50, GAME_WIDTH, 50);

    // Draw Interaction Zone
    ctx.strokeStyle = 'rgba(255, 255, 255, 0.1)';
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.arc(INTERACTION_ZONE_X, GAME_HEIGHT - 100 + 25, INTERACTION_RADIUS, 0, Math.PI * 2);
    ctx.stroke();

    // Draw Player
    ctx.fillStyle = COLORS.PLAYER;
    const px = INTERACTION_ZONE_X - 25;
    const py = GAME_HEIGHT - 100;
    ctx.fillRect(px, py, 50, 50);
    ctx.fillStyle = 'white';
    ctx.fillRect(px + 30, py + 10, 10, 10);

    // Draw Objects
    gameStateRef.current.objects.forEach(obj => {
      ctx.fillStyle = obj.color;
      if (obj.type === ItemType.COLLECTIBLE) {
        ctx.beginPath();
        ctx.arc(obj.x + 25, obj.y + 25, 25, 0, Math.PI * 2);
        ctx.fill();
        ctx.lineWidth = 4;
        ctx.strokeStyle = '#fff';
        ctx.stroke();
      } else {
        ctx.fillRect(obj.x, obj.y, obj.width, obj.height);
        ctx.strokeStyle = '#7F1D1D';
        ctx.lineWidth = 4;
        ctx.beginPath();
        ctx.moveTo(obj.x + 10, obj.y + 10);
        ctx.lineTo(obj.x + 40, obj.y + 40);
        ctx.moveTo(obj.x + 40, obj.y + 10);
        ctx.lineTo(obj.x + 10, obj.y + 40);
        ctx.stroke();
      }
    });

    // Draw Feedback
    const fb = gameStateRef.current.lastFeedback;
    if (fb) {
      ctx.fillStyle = fb.color;
      ctx.globalAlpha = fb.alpha;
      ctx.font = 'bold 40px sans-serif';
      ctx.textAlign = 'center';
      ctx.fillText(fb.text, INTERACTION_ZONE_X, fb.y);
      ctx.globalAlpha = 1.0;
    }
  };

  const syncHud = () => {
    setHudState({
      score: gameStateRef.current.score,
      combo: gameStateRef.current.combo,
      status: gameStateRef.current.status,
      speedFactor: gameStateRef.current.speed
    });
  };

  const startGame = () => {
    const preset = DIFFICULTY_PRESETS[difficulty];
    gameStateRef.current = {
      objects: [],
      speed: preset.initialSpeed,
      score: 0,
      maxSpeed: preset.initialSpeed,
      combo: 0,
      history: [],
      status: GameStatus.PLAYING,
      lastFeedback: null,
    };
    lastTimeRef.current = performance.now();
    spawnTimerRef.current = performance.now();
    setHudState({ score: 0, combo: 0, status: GameStatus.PLAYING, speedFactor: preset.initialSpeed });
    requestRef.current = requestAnimationFrame(update);
  };

  const togglePause = () => {
    if (gameStateRef.current.status === GameStatus.PLAYING) {
      gameStateRef.current.status = GameStatus.PAUSED;
    } else if (gameStateRef.current.status === GameStatus.PAUSED) {
      gameStateRef.current.status = GameStatus.PLAYING;
      lastTimeRef.current = performance.now(); // Prevent large delta time
    }
    syncHud();
  };

  const quitGame = () => {
    gameStateRef.current.status = GameStatus.IDLE;
    syncHud();
    // Re-render one frame to show clean state if needed, or rely on react UI overlay
  };

  const stopGame = () => {
    gameStateRef.current.status = GameStatus.GAME_OVER;
    syncHud();
  };

  const calculateBrainAge = () => {
    const { score, maxSpeed } = gameStateRef.current;
    const initialSpeed = DIFFICULTY_PRESETS[difficulty].initialSpeed;
    
    // Heuristic: Base 85 years old
    // -1 year for every 50 points
    // -2 years for every 1.0 speed increase over initial
    const scoreReduction = Math.floor(score / 50);
    const speedReduction = Math.floor((maxSpeed - initialSpeed) * 2);
    
    const calculatedAge = 85 - scoreReduction - speedReduction;
    return Math.max(20, Math.min(90, calculatedAge)); // Clamp between 20 and 90
  };

  // Keyboard Listeners
  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if (e.code === 'Space') {
        e.preventDefault();
        if (gameStateRef.current.status === GameStatus.PLAYING) {
          handleInput();
        } else if (gameStateRef.current.status === GameStatus.IDLE) {
          // Optional: Start game with Space from title if desired, currently button only to select difficulty
        }
      }
      if (e.code === 'KeyP' || e.code === 'Escape') {
         if (gameStateRef.current.status === GameStatus.PLAYING || gameStateRef.current.status === GameStatus.PAUSED) {
            togglePause();
         }
      }
    };
    window.addEventListener('keydown', handler);
    return () => window.removeEventListener('keydown', handler);
  }, [handleInput]);

  return (
    <div className="flex flex-col items-center justify-center min-h-screen bg-slate-950 p-4 font-sans select-none">
      
      {/* HUD (Only show when playing or paused) */}
      {(hudState.status === GameStatus.PLAYING || hudState.status === GameStatus.PAUSED) && (
        <div className="w-full max-w-[800px] flex justify-between items-center mb-4 bg-slate-800 p-4 rounded-xl border-4 border-slate-700 shadow-xl">
          <div className="flex flex-col">
             <span className="text-slate-400 text-sm font-bold uppercase tracking-wider">{t.score}</span>
             <span className="text-4xl font-black text-amber-400">{hudState.score}</span>
          </div>
          
          <div className={`flex flex-col items-center transition-opacity ${hudState.combo > 0 ? 'opacity-100' : 'opacity-30'}`}>
            <div className="flex items-center gap-2 text-emerald-400">
               <Trophy size={24} />
               <span className="text-2xl font-bold">{t.combo} x{Math.floor(hudState.combo / SCORING.COMBO_THRESHOLD) > 0 ? (1 + (Math.floor(hudState.combo / SCORING.COMBO_THRESHOLD) * SCORING.BONUS_PERCENT)).toFixed(1) : 1}</span>
            </div>
            <div className="flex gap-1 mt-1">
               {[...Array(5)].map((_, i) => (
                  <div key={i} className={`w-3 h-3 rounded-full ${i < (hudState.combo % 5) ? 'bg-emerald-400' : (hudState.combo >= 5 && i < 5 ? 'bg-emerald-400' : 'bg-slate-600')}`} />
               ))}
            </div>
          </div>

          <div className="flex items-center gap-6">
             <div className="flex flex-col items-end">
               <span className="text-slate-400 text-sm font-bold uppercase tracking-wider">{t.speed}</span>
               <div className="flex items-center gap-2">
                 <Activity size={20} className={hudState.speedFactor > DIFFICULTY_PRESETS[difficulty].initialSpeed ? 'text-red-400' : 'text-blue-400'} />
                 <span className="text-2xl font-bold text-white">{((hudState.speedFactor / DIFFICULTY_PRESETS[difficulty].initialSpeed) * 100).toFixed(0)}%</span>
               </div>
             </div>
             <button 
               onClick={togglePause}
               className="p-3 bg-slate-700 hover:bg-slate-600 rounded-lg border-2 border-slate-500 text-white"
             >
                <Pause size={24} fill="currentColor" />
             </button>
          </div>
        </div>
      )}

      {/* Game Container */}
      <div className="relative group">
        <canvas
          ref={canvasRef}
          width={GAME_WIDTH}
          height={GAME_HEIGHT}
          className="bg-slate-900 rounded-lg shadow-2xl cursor-pointer touch-manipulation border-4 border-slate-700 block"
          onClick={() => {
             if (gameStateRef.current.status === GameStatus.PLAYING) handleInput();
          }}
        />
        
        {/* === START SCREEN === */}
        {hudState.status === GameStatus.IDLE && (
          <div className="absolute inset-0 bg-slate-900/95 flex flex-col items-center justify-center rounded-lg p-8 z-10">
            <h1 className="text-6xl font-black text-white mb-2 tracking-tight">{t.startTitle}</h1>
            
            <div className="flex gap-4 mb-6">
               <button 
                  onClick={() => setLanguage(Language.EN)} 
                  className={`px-4 py-2 rounded-lg font-bold border-2 ${language === Language.EN ? 'bg-amber-400 text-black border-amber-400' : 'text-slate-400 border-slate-600'}`}
               >English</button>
               <button 
                  onClick={() => setLanguage(Language.ZH)} 
                  className={`px-4 py-2 rounded-lg font-bold border-2 ${language === Language.ZH ? 'bg-amber-400 text-black border-amber-400' : 'text-slate-400 border-slate-600'}`}
               >中文</button>
            </div>

            <div className="mb-8 w-full max-w-md">
               <p className="text-slate-400 text-center mb-2 uppercase font-bold text-sm">{t.selectDiff}</p>
               <div className="flex gap-4 justify-center">
                  {[Difficulty.EASY, Difficulty.NORMAL, Difficulty.HARD].map((d) => (
                    <button
                      key={d}
                      onClick={() => setDifficulty(d)}
                      className={`flex-1 py-4 rounded-xl border-2 font-bold text-lg transition-all ${difficulty === d ? 'bg-blue-500 border-blue-400 text-white scale-105 shadow-lg' : 'bg-slate-800 border-slate-700 text-slate-400 hover:bg-slate-700'}`}
                    >
                      {d === Difficulty.EASY ? t.diffEasy : d === Difficulty.NORMAL ? t.diffNormal : t.diffHard}
                    </button>
                  ))}
               </div>
            </div>

            <button 
              onClick={startGame}
              className="flex items-center gap-3 bg-amber-400 hover:bg-amber-500 text-slate-900 px-12 py-6 rounded-2xl font-black text-3xl transition-transform hover:scale-105 high-contrast-outline shadow-[0_0_30px_rgba(251,191,36,0.4)]"
            >
              <Play size={32} fill="currentColor" />
              {t.startBtn}
            </button>
            
            <div className="mt-8 flex gap-8 text-slate-400 font-bold text-lg">
               <div className="flex items-center gap-2">
                 <div className="w-5 h-5 rounded-full bg-amber-400 shadow-[0_0_10px_rgba(251,191,36,0.6)]"></div>
                 <span>{t.collect}</span>
               </div>
               <div className="flex items-center gap-2">
                 <div className="w-5 h-5 bg-red-500 shadow-[0_0_10px_rgba(239,68,68,0.6)]"></div>
                 <span>{t.avoid}</span>
               </div>
            </div>
            
            {/* End Game Button for Testing/Manual Stop */}
            <div className="absolute bottom-4 right-4">
                 <button onClick={stopGame} className="text-slate-700 hover:text-slate-500 text-xs p-2">Dev: Force Stop</button>
            </div>
          </div>
        )}

        {/* === PAUSE SCREEN === */}
        {hudState.status === GameStatus.PAUSED && (
          <div className="absolute inset-0 bg-slate-900/80 backdrop-blur-sm flex flex-col items-center justify-center rounded-lg z-20">
             <h2 className="text-4xl font-black text-white mb-8 tracking-widest">{t.pauseTitle}</h2>
             
             <div className="flex flex-col gap-4 min-w-[240px]">
               <button 
                  onClick={togglePause}
                  className="bg-emerald-500 hover:bg-emerald-600 text-white py-4 px-8 rounded-xl font-bold text-xl flex items-center justify-center gap-3 shadow-lg"
               >
                  <Play size={24} fill="currentColor" /> {t.resume}
               </button>
               
               <button 
                  onClick={startGame}
                  className="bg-slate-700 hover:bg-slate-600 text-white py-4 px-8 rounded-xl font-bold text-xl flex items-center justify-center gap-3 border-2 border-slate-600"
               >
                  <RotateCcw size={24} /> {t.restart}
               </button>

               <button 
                  onClick={quitGame}
                  className="bg-red-900/50 hover:bg-red-900/80 text-red-200 py-4 px-8 rounded-xl font-bold text-xl flex items-center justify-center gap-3 border-2 border-red-900"
               >
                  <Home size={24} /> {t.quit}
               </button>
             </div>
          </div>
        )}

        {/* === GAME OVER REPORT SCREEN === */}
        {hudState.status === GameStatus.GAME_OVER && (
          <div className="absolute inset-0 bg-slate-900/95 flex flex-col items-center justify-center rounded-lg z-30 p-6">
             <div className="bg-slate-800 p-8 rounded-2xl border-4 border-slate-600 shadow-2xl max-w-lg w-full text-center">
                <div className="flex items-center justify-center gap-3 text-slate-400 mb-2">
                   <Activity className="text-amber-400" />
                   <span className="font-bold tracking-widest uppercase">{t.reportTitle}</span>
                </div>
                
                <h2 className="text-4xl font-black text-white mb-6">{t.gameOver}</h2>
                
                <div className="grid grid-cols-2 gap-4 mb-6">
                   <div className="bg-slate-900 p-4 rounded-xl border border-slate-700">
                      <p className="text-slate-500 text-xs font-bold uppercase mb-1">{t.finalScore}</p>
                      <p className="text-3xl font-black text-amber-400">{hudState.score}</p>
                   </div>
                   <div className="bg-slate-900 p-4 rounded-xl border border-slate-700">
                      <p className="text-slate-500 text-xs font-bold uppercase mb-1">{t.speed}</p>
                      <p className="text-3xl font-black text-blue-400">{((gameStateRef.current.maxSpeed / DIFFICULTY_PRESETS[difficulty].initialSpeed) * 100).toFixed(0)}%</p>
                   </div>
                </div>

                <div className="bg-emerald-900/30 border-2 border-emerald-800 p-6 rounded-xl mb-8 relative overflow-hidden">
                   <div className="absolute -right-4 -top-4 text-emerald-800/20">
                      <Activity size={120} />
                   </div>
                   <p className="text-emerald-400 font-bold uppercase text-sm mb-2">{t.brainAge}</p>
                   <p className="text-6xl font-black text-white tracking-tighter shadow-black drop-shadow-lg">
                      {calculateBrainAge()} <span className="text-2xl font-bold text-emerald-500">{t.ageSuffix}</span>
                   </p>
                </div>
                
                <div className="flex gap-4">
                   <button 
                    onClick={quitGame}
                    className="flex-1 bg-slate-700 hover:bg-slate-600 text-white py-4 rounded-xl font-bold text-lg border-2 border-slate-600"
                  >
                    {t.quit}
                  </button>
                   <button 
                    onClick={startGame}
                    className="flex-1 bg-amber-400 hover:bg-amber-500 text-slate-900 py-4 rounded-xl font-bold text-lg flex items-center justify-center gap-2 shadow-lg"
                  >
                    <RotateCcw size={20} />
                    {t.playAgain}
                  </button>
                </div>
             </div>
          </div>
        )}

        {/* Input Hint */}
        {hudState.status === GameStatus.PLAYING && (
          <div className="absolute bottom-4 right-4 pointer-events-none opacity-50 bg-black/50 px-3 py-1 rounded text-sm font-mono flex items-center gap-2 text-white">
             <Keyboard size={16} /> SPACE / CLICK
          </div>
        )}
      </div>
      
      <div className="mt-6 text-slate-500 max-w-[600px] text-center text-sm">
        <p><strong>Senior Accessibility Mode:</strong> High contrast, single input, adaptive difficulty.</p>
      </div>
    </div>
  );
};

export default GameCanvas;