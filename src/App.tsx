import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import {
  AlertCircle,
  BookOpen,
  Camera,
  GraduationCap,
  Map,
  RotateCcw,
  Star,
  Volume2,
  VolumeX,
} from 'lucide-react';
import chaptersRaw from './data/chapters.json';
import levelsRaw from './data/levels.json';
import { BlockWorkspace } from './components/BlockWorkspace';
import { ChapterMap } from './components/ChapterMap';
import { ChapterQuizModal } from './components/ChapterQuizModal';
import { ConceptIntroModal } from './components/ConceptIntroModal';
import { HintModal } from './components/HintModal';
import { ResultModal } from './components/ResultModal';
import { TeacherModal } from './components/TeacherModal';
import { TitleScreen } from './components/TitleScreen';
import { Viewport3D } from './components/Viewport3D';
import { soundFX } from './game/audio';
import { blocksToPython, countBlocks, hydrateBlocks } from './game/blockMeta';
import { ExecutionResult, simulateProgram } from './game/engine';
import { parsePythonCode } from './game/pythonParser';
import {
  DEFAULT_PROGRESS,
  loadProgress,
  mergeLevelProgress,
  saveProgress,
} from './game/storage';
import {
  ChapterData,
  CodeBlock,
  LevelData,
  SavedProgress,
  TeacherConfig,
  TraceStep,
} from './game/types';

const CHAPTERS = chaptersRaw as ChapterData[];
const LEVELS = levelsRaw as LevelData[];

const SPEED_MS: Record<'slow' | 'normal' | 'fast', number> = {
  slow: 720,
  normal: 410,
  fast: 185,
};

export default function App() {
  const [screen, setScreen] = useState<'title' | 'map' | 'play'>('title');
  const [progress, setProgress] = useState<SavedProgress>(() => {
    const loaded = loadProgress();
    soundFX.setMuted(loaded.muted);
    return loaded;
  });

  const [currentLevel, setCurrentLevel] = useState<LevelData>(LEVELS[0]);
  const [mainBlocks, setMainBlocks] = useState<CodeBlock[]>([]);
  const [funcBlocks, setFuncBlocks] = useState<CodeBlock[]>([]);
  const [pythonText, setPythonText] = useState<string>('');
  const [pythonError, setPythonError] = useState<string | null>(null);

  // Playback / debug state
  const [isRunning, setIsRunning] = useState(false);
  const [activeStep, setActiveStep] = useState<TraceStep | null>(null);
  const [failMessage, setFailMessage] = useState<string | null>(null);
  const [resetSignal, setResetSignal] = useState(0);
  const [cameraResetSignal, setCameraResetSignal] = useState(0);
  const [dockState, setDockState] = useState<'collapsed' | 'normal' | 'expanded'>('normal');

  // Modals
  const [conceptChapter, setConceptChapter] = useState<ChapterData | null>(null);
  const [pendingLevelAfterConcept, setPendingLevelAfterConcept] = useState<LevelData | null>(null);
  const [quizChapter, setQuizChapter] = useState<ChapterData | null>(null);
  const [showHint, setShowHint] = useState(false);
  const [showTeacher, setShowTeacher] = useState(false);
  const [victoryInfo, setVictoryInfo] = useState<{
    usedBlocks: number;
    gotOptimal: boolean;
    gotBonus: boolean;
  } | null>(null);

  // Refs for timers & step-by-step trace
  const playTimerRef = useRef<number | null>(null);
  const traceRef = useRef<{
    result: ExecutionResult;
    usedBlocks: number;
    cursor: number;
  } | null>(null);

  const currentChapter = useMemo(
    () => CHAPTERS.find((c) => c.id === currentLevel.chapterId) ?? CHAPTERS[0],
    [currentLevel]
  );

  // Persist progress whenever it changes
  useEffect(() => {
    saveProgress(progress);
    soundFX.setMuted(progress.muted);
  }, [progress]);

  const stopPlayback = useCallback(() => {
    if (playTimerRef.current !== null) {
      window.clearTimeout(playTimerRef.current);
      playTimerRef.current = null;
    }
    setIsRunning(false);
  }, []);

  const resetStageExecution = useCallback(() => {
    stopPlayback();
    traceRef.current = null;
    setActiveStep(null);
    setFailMessage(null);
    setVictoryInfo(null);
    setPythonError(null);
    setResetSignal((n) => n + 1);
  }, [stopPlayback]);

  // Clean up timers on unmount
  useEffect(() => {
    return () => {
      if (playTimerRef.current !== null) {
        window.clearTimeout(playTimerRef.current);
      }
    };
  }, []);

  const openLevelDirectly = useCallback(
    (level: LevelData) => {
      stopPlayback();
      traceRef.current = null;
      setCurrentLevel(level);
      setMainBlocks(hydrateBlocks(level.starterBlocks));
      setFuncBlocks(hydrateBlocks(level.starterFuncBlocks));
      setPythonText(level.starterCode ?? '');
      setPythonError(null);
      setActiveStep(null);
      setFailMessage(null);
      setVictoryInfo(null);
      setShowHint(false);
      setDockState('normal');
      setResetSignal((n) => n + 1);
      setScreen('play');
    },
    [stopPlayback]
  );

  const handleSelectLevel = useCallback(
    (level: LevelData) => {
      soundFX.click();
      const ch = CHAPTERS.find((c) => c.id === level.chapterId)!;
      // Show 30-sec concept intro before first stage of a chapter if not yet seen
      if (level.stageIndex === 1 && !progress.introSeen[ch.id]) {
        setConceptChapter(ch);
        setPendingLevelAfterConcept(level);
        return;
      }
      openLevelDirectly(level);
    },
    [openLevelDirectly, progress.introSeen]
  );

  const handleStartFromTitle = useCallback(() => {
    soundFX.click();
    // Pick first uncleared level (or 1-1) respecting assigned chapters
    const assigned =
      progress.teacher.enabled && progress.teacher.assignedChapters.length > 0
        ? progress.teacher.assignedChapters
        : null;
    const pool = assigned ? LEVELS.filter((l) => assigned.includes(l.chapterId)) : LEVELS;
    const next = pool.find((l) => !progress.levels[l.id]?.cleared) ?? pool[0] ?? LEVELS[0];
    handleSelectLevel(next);
  }, [handleSelectLevel, progress.levels, progress.teacher]);

  const compileCurrentProgram = (): {
    result: ExecutionResult;
    usedBlocks: number;
  } | null => {
    setPythonError(null);

    if (currentLevel.codingMode === 'text') {
      const parsed = parsePythonCode(pythonText);
      if (!parsed.ok) {
        soundFX.bump();
        setPythonError(parsed.error ?? '코드 문법을 확인해 주세요!');
        return null;
      }
      const usedBlocks =
        countBlocks(parsed.mainBlocks) + countBlocks(parsed.funcBlocks);
      const result = simulateProgram(
        currentLevel,
        parsed.mainBlocks,
        parsed.funcBlocks
      );
      return { result, usedBlocks };
    }

    if (mainBlocks.length === 0) {
      soundFX.bump();
      setFailMessage('실행할 명령 블록이 아직 없어요! 왼쪽 블록을 끌어놓거나 눌러서 추가해 보세요.');
      return null;
    }

    const { blockLineMap } = blocksToPython(
      mainBlocks,
      currentLevel.allowFunction ? funcBlocks : []
    );
    const usedBlocks =
      countBlocks(mainBlocks) +
      (currentLevel.allowFunction ? countBlocks(funcBlocks) : 0);
    const result = simulateProgram(
      currentLevel,
      mainBlocks,
      currentLevel.allowFunction ? funcBlocks : [],
      blockLineMap
    );
    return { result, usedBlocks };
  };

  const triggerStepFeedback = useCallback(
    (step: TraceStep, result: ExecutionResult, usedBlocks: number) => {
      setActiveStep(step);

      if (step.action === 'move') {
        soundFX.step();
        if (step.justCollectedBonus) {
          soundFX.bonusGem();
        }
      } else if (step.action === 'turn_left' || step.action === 'turn_right') {
        soundFX.turn();
      } else if (step.action === 'collect') {
        if (step.justCollectedBonus) {
          soundFX.bonusGem();
        } else {
          soundFX.gem(step.collectedGems.length);
        }
      } else if (step.action === 'unlock') {
        soundFX.unlock();
      } else if (
        step.action === 'bump_wall' ||
        step.action === 'out_of_bounds' ||
        step.action === 'no_gem' ||
        step.action === 'door_locked' ||
        step.action === 'fail_end' ||
        step.action === 'infinite_loop'
      ) {
        soundFX.bump();
        setFailMessage(
          step.failReason ??
            result.failReason ??
            '목표에 도착하지 못했어요. 블록을 고쳐서 다시 도전해 보세요!'
        );
      } else if (step.action === 'win') {
        soundFX.win();
        const gotOptimal = usedBlocks <= currentLevel.optimalBlocks;
        const gotBonus =
          result.totalBonusCount === 0 ||
          result.collectedBonusCount >= result.totalBonusCount;

        setProgress((prev) => ({
          ...prev,
          levels: {
            ...prev.levels,
            [currentLevel.id]: mergeLevelProgress(
              prev.levels[currentLevel.id],
              usedBlocks,
              gotOptimal,
              gotBonus
            ),
          },
        }));

        window.setTimeout(() => {
          setVictoryInfo({ usedBlocks, gotOptimal, gotBonus });
        }, 720);
      }
    },
    [currentLevel]
  );

  const handleRun = () => {
    stopPlayback();
    setFailMessage(null);
    setVictoryInfo(null);
    setActiveStep(null);
    setResetSignal((n) => n + 1);

    const compiled = compileCurrentProgram();
    if (!compiled) return;

    const { result, usedBlocks } = compiled;
    traceRef.current = { result, usedBlocks, cursor: 0 };
    setIsRunning(true);

    const advance = (idx: number) => {
      if (idx >= result.steps.length) {
        setIsRunning(false);
        return;
      }
      const step = result.steps[idx];
      if (traceRef.current) {
        traceRef.current.cursor = idx + 1;
      }
      triggerStepFeedback(step, result, usedBlocks);

      if (step.status === 'won' || step.status === 'failed') {
        setIsRunning(false);
        return;
      }

      playTimerRef.current = window.setTimeout(() => {
        advance(idx + 1);
      }, SPEED_MS[progress.speed]);
    };

    // Short pause so robot visually snaps to start before running
    playTimerRef.current = window.setTimeout(() => advance(0), 120);
  };

  const handleStep = () => {
    if (isRunning) return;
    setFailMessage(null);
    setVictoryInfo(null);

    if (
      !traceRef.current ||
      traceRef.current.cursor >= traceRef.current.result.steps.length
    ) {
      setResetSignal((n) => n + 1);
      const compiled = compileCurrentProgram();
      if (!compiled) return;
      traceRef.current = { ...compiled, cursor: 0 };
    }

    const state = traceRef.current;
    const step = state.result.steps[state.cursor];
    if (!step) return;
    state.cursor += 1;
    triggerStepFeedback(step, state.result, state.usedBlocks);
  };

  const handleMainBlocksChange = (next: CodeBlock[]) => {
    setMainBlocks(next);
    if (traceRef.current) {
      resetStageExecution();
    }
  };

  const handleFuncBlocksChange = (next: CodeBlock[]) => {
    setFuncBlocks(next);
    if (traceRef.current) {
      resetStageExecution();
    }
  };

  const handlePythonTextChange = (next: string) => {
    setPythonText(next);
    setPythonError(null);
    if (traceRef.current) {
      resetStageExecution();
    }
  };

  const handleClearCode = () => {
    soundFX.delete();
    resetStageExecution();
    if (currentLevel.codingMode === 'text') {
      setPythonText(currentLevel.starterCode ?? '');
    } else if (currentLevel.starterBlocks) {
      setMainBlocks(hydrateBlocks(currentLevel.starterBlocks));
      setFuncBlocks(hydrateBlocks(currentLevel.starterFuncBlocks));
    } else {
      setMainBlocks([]);
      setFuncBlocks([]);
    }
  };

  const handleToggleMute = () => {
    setProgress((p) => ({ ...p, muted: !p.muted }));
  };

  const handleChangeSpeed = (speed: 'slow' | 'normal' | 'fast') => {
    soundFX.click();
    setProgress((p) => ({ ...p, speed }));
  };

  const handleUpdateTeacher = (teacher: TeacherConfig) => {
    soundFX.click();
    setProgress((p) => ({ ...p, teacher }));
  };

  const handleResetProgress = () => {
    soundFX.delete();
    setProgress({ ...DEFAULT_PROGRESS });
  };

  const nextLevelInChapter = useMemo(
    () =>
      LEVELS.find(
        (l) =>
          l.chapterId === currentLevel.chapterId &&
          l.stageIndex === currentLevel.stageIndex + 1
      ) ?? null,
    [currentLevel]
  );

  const collectedGemsNow = activeStep ? activeStep.collectedGems.length : 0;
  const collectedBonusNow = activeStep ? activeStep.collectedBonus.length : 0;
  const liveVars = activeStep ? activeStep.variables : { key: 0, gems: 0 };
  const currentLevelSavedStars = progress.levels[currentLevel.id]?.stars ?? 0;

  return (
    <div className="w-screen h-screen bg-slate-950 text-slate-100 overflow-hidden flex flex-col">
      {screen === 'title' && (
        <div className="relative w-full h-full">
          <Viewport3D
            level={LEVELS[0]}
            theme="forest"
            idleDemo
            activeStep={null}
            stepDurationSec={0.4}
            resetSignal={0}
            cameraResetSignal={0}
          />
          <TitleScreen
            progress={progress}
            totalLevels={LEVELS.length}
            onStart={handleStartFromTitle}
            onOpenMap={() => {
              soundFX.click();
              setScreen('map');
            }}
            onOpenTeacher={() => {
              soundFX.click();
              setShowTeacher(true);
            }}
            onToggleMute={handleToggleMute}
          />
        </div>
      )}

      {screen === 'map' && (
        <ChapterMap
          chapters={CHAPTERS}
          levels={LEVELS}
          progress={progress}
          onSelectLevel={handleSelectLevel}
          onOpenConcept={(ch) => {
            soundFX.click();
            setPendingLevelAfterConcept(null);
            setConceptChapter(ch);
          }}
          onOpenQuiz={(ch) => {
            soundFX.click();
            setQuizChapter(ch);
          }}
          onBackTitle={() => {
            soundFX.click();
            setScreen('title');
          }}
          onOpenTeacher={() => {
            soundFX.click();
            setShowTeacher(true);
          }}
          onToggleMute={handleToggleMute}
        />
      )}

      {screen === 'play' && (
        <div className="w-full h-full flex flex-col overflow-hidden">
          {/* Upper 3D Viewport Area (unobstructed center, no backdrop-filter over WebGL) */}
          <div className="relative flex-1 min-h-0">
            <Viewport3D
              level={currentLevel}
              theme={currentChapter.theme}
              activeStep={activeStep}
              stepDurationSec={SPEED_MS[progress.speed] / 1000}
              resetSignal={resetSignal}
              cameraResetSignal={cameraResetSignal}
            />

            {/* Top HUD Bar Overlay */}
            <div className="absolute top-3 left-3 right-3 z-10 pointer-events-none flex flex-wrap items-start justify-between gap-2">
              {/* Left: Map button + Mission Card */}
              <div className="pointer-events-auto flex items-start gap-2 max-w-[min(600px,78vw)]">
                <button
                  type="button"
                  onClick={() => {
                    soundFX.click();
                    stopPlayback();
                    setScreen('map');
                  }}
                  className="shrink-0 flex items-center gap-1.5 px-3 py-2.5 rounded-xl bg-slate-950/88 hover:bg-slate-800 border border-slate-700 text-sm font-bold text-white cursor-pointer whitespace-nowrap"
                >
                  <Map className="w-4 h-4 text-sky-400" />
                  지도
                </button>

                <div className="bg-slate-950/88 border border-slate-700/90 rounded-2xl px-4 py-2.5 shadow-lg">
                  <div className="flex flex-wrap items-center gap-x-2 gap-y-0.5 text-xs font-bold text-slate-300">
                    <span>
                      {currentChapter.badgeEmoji} {currentChapter.title}
                    </span>
                    <span className="text-slate-600">·</span>
                    <span className="text-sky-300">{currentLevel.stageIndex}단계</span>
                    <span className="text-slate-600">·</span>
                    <span className="inline-flex items-center gap-0.5">
                      {[1, 2, 3].map((s) => (
                        <Star
                          key={s}
                          className={`w-3.5 h-3.5 ${
                            s <= currentLevelSavedStars
                              ? 'text-amber-400 fill-amber-400'
                              : 'text-slate-700'
                          }`}
                        />
                      ))}
                    </span>
                  </div>
                  <h1 className="font-display text-lg sm:text-xl text-white leading-tight mt-0.5">
                    {currentLevel.title}
                  </h1>
                  <p className="text-xs sm:text-sm text-slate-200 mt-0.5">
                    {currentLevel.mission}
                  </p>
                </div>
              </div>

              {/* Right: Live Gem / Var Counter + Utility Buttons */}
              <div className="pointer-events-auto flex flex-col items-end gap-2">
                <div className="flex items-center gap-1.5">
                  <button
                    type="button"
                    onClick={() => {
                      soundFX.click();
                      setPendingLevelAfterConcept(null);
                      setConceptChapter(currentChapter);
                    }}
                    className="flex items-center gap-1 px-3 py-2 rounded-xl bg-slate-950/88 hover:bg-slate-800 border border-slate-700 text-xs sm:text-sm font-bold text-sky-300 cursor-pointer whitespace-nowrap"
                  >
                    <BookOpen className="w-4 h-4" />
                    개념
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      soundFX.click();
                      setCameraResetSignal((n) => n + 1);
                    }}
                    title="카메라 시점 초기화"
                    className="flex items-center gap-1 px-3 py-2 rounded-xl bg-slate-950/88 hover:bg-slate-800 border border-slate-700 text-xs sm:text-sm font-bold text-slate-200 cursor-pointer whitespace-nowrap"
                  >
                    <Camera className="w-4 h-4 text-emerald-400" />
                    시점
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      soundFX.click();
                      setShowTeacher(true);
                    }}
                    aria-label="교사 모드"
                    className="p-2 rounded-xl bg-slate-950/88 hover:bg-slate-800 border border-slate-700 text-amber-300 cursor-pointer"
                  >
                    <GraduationCap className="w-4 h-4" />
                  </button>
                  <button
                    type="button"
                    onClick={handleToggleMute}
                    aria-label={progress.muted ? '소리 켜기' : '소리 끄기'}
                    className="p-2 rounded-xl bg-slate-950/88 hover:bg-slate-800 border border-slate-700 cursor-pointer"
                  >
                    {progress.muted ? (
                      <VolumeX className="w-4 h-4 text-rose-400" />
                    ) : (
                      <Volume2 className="w-4 h-4 text-emerald-400" />
                    )}
                  </button>
                </div>

                {/* Live status strip (Gems, Bonus, Ch.7 Variables) */}
                <div className="flex items-center gap-3 px-3.5 py-1.5 rounded-xl bg-slate-950/88 border border-slate-700 text-xs sm:text-sm font-bold tabular-nums">
                  <span className="text-cyan-300">
                    💎 {collectedGemsNow}/{currentLevel.gems.length}
                  </span>
                  {currentLevel.bonusGems.length > 0 && (
                    <>
                      <span className="text-slate-600">·</span>
                      <span
                        className={
                          collectedBonusNow >= currentLevel.bonusGems.length
                            ? 'text-amber-300'
                            : 'text-slate-400'
                        }
                      >
                        🌟 {collectedBonusNow}/{currentLevel.bonusGems.length}
                      </span>
                    </>
                  )}
                  {currentLevel.chapterId === 7 && (
                    <>
                      <span className="text-slate-600">·</span>
                      <span className="text-rose-300">🔑 열쇠:{liveVars.key}</span>
                      <span className="text-fuchsia-300">🔢 보석수:{liveVars.gems}</span>
                    </>
                  )}
                </div>
              </div>
            </div>

            {/* Bottom-center live narration or friendly failure banner over 3D edge */}
            {failMessage ? (
              <div className="absolute bottom-3 left-1/2 -translate-x-1/2 z-10 w-[min(620px,94vw)] bg-rose-950/95 border-2 border-rose-400 rounded-2xl px-4 py-3 shadow-2xl flex flex-wrap items-center justify-between gap-3">
                <div className="flex items-start gap-2.5 flex-1 min-w-[200px]">
                  <AlertCircle className="w-5 h-5 text-rose-300 shrink-0 mt-0.5" />
                  <p className="text-sm sm:text-base font-bold text-rose-100 leading-snug">
                    {failMessage}
                  </p>
                </div>
                <button
                  type="button"
                  onClick={resetStageExecution}
                  className="flex items-center gap-1.5 px-3.5 py-2 rounded-xl bg-rose-500 hover:bg-rose-400 text-slate-950 font-extrabold text-sm cursor-pointer whitespace-nowrap"
                >
                  <RotateCcw className="w-4 h-4" />
                  다시 시도
                </button>
              </div>
            ) : (
              activeStep?.message && (
                <div className="absolute bottom-3 left-1/2 -translate-x-1/2 z-10 pointer-events-none bg-slate-950/90 border border-sky-400/70 rounded-xl px-4 py-2 text-sm sm:text-base font-extrabold text-sky-200 shadow-lg">
                  🤖 {activeStep.message}
                </div>
              )
            )}
          </div>

          {/* Bottom Interactive Coding Dock */}
          <BlockWorkspace
            level={currentLevel}
            mainBlocks={mainBlocks}
            funcBlocks={funcBlocks}
            pythonText={pythonText}
            pythonError={pythonError}
            activeBlockId={activeStep?.blockId ?? null}
            activeSourceLine={activeStep?.sourceLine ?? null}
            isRunning={isRunning}
            speed={progress.speed}
            dockState={dockState}
            onChangeDockState={setDockState}
            onChangeMainBlocks={handleMainBlocksChange}
            onChangeFuncBlocks={handleFuncBlocksChange}
            onChangePythonText={handlePythonTextChange}
            onRun={handleRun}
            onStep={handleStep}
            onReset={resetStageExecution}
            onClearCode={handleClearCode}
            onChangeSpeed={handleChangeSpeed}
            onOpenHint={() => {
              soundFX.click();
              setShowHint(true);
            }}
          />
        </div>
      )}

      {/* 30-Second Concept Intro Modal */}
      {conceptChapter && (
        <ConceptIntroModal
          chapter={conceptChapter}
          buttonLabel={pendingLevelAfterConcept ? '도전 시작하기' : '이해했어요!'}
          onStartChapter={() => {
            soundFX.click();
            const chId = conceptChapter.id;
            setProgress((p) => ({
              ...p,
              introSeen: { ...p.introSeen, [chId]: true },
            }));
            const pending = pendingLevelAfterConcept;
            setConceptChapter(null);
            setPendingLevelAfterConcept(null);
            if (pending) {
              openLevelDirectly(pending);
            }
          }}
          onClose={() => {
            setConceptChapter(null);
            setPendingLevelAfterConcept(null);
          }}
        />
      )}

      {/* Chapter Quiz Modal */}
      {quizChapter && (
        <ChapterQuizModal
          chapter={quizChapter}
          onPass={() => {
            const chId = quizChapter.id;
            setProgress((p) => ({
              ...p,
              quizzesPassed: { ...p.quizzesPassed, [chId]: true },
            }));
          }}
          onClose={() => {
            setQuizChapter(null);
            setScreen('map');
          }}
        />
      )}

      {/* 3-Tier Hint Modal */}
      {showHint && (
        <HintModal level={currentLevel} onClose={() => setShowHint(false)} />
      )}

      {/* 3-Star Victory Modal */}
      {victoryInfo && (
        <ResultModal
          level={currentLevel}
          chapter={currentChapter}
          usedBlocks={victoryInfo.usedBlocks}
          gotOptimal={victoryInfo.gotOptimal}
          gotBonus={victoryInfo.gotBonus}
          hasNextLevelInChapter={Boolean(nextLevelInChapter)}
          onNextStage={() => {
            soundFX.click();
            if (nextLevelInChapter) {
              openLevelDirectly(nextLevelInChapter);
            }
          }}
          onOpenQuiz={() => {
            soundFX.click();
            setVictoryInfo(null);
            setQuizChapter(currentChapter);
          }}
          onReplay={() => {
            soundFX.click();
            resetStageExecution();
          }}
          onBackMap={() => {
            soundFX.click();
            setVictoryInfo(null);
            setScreen('map');
          }}
        />
      )}

      {/* Teacher Mode & Student Results Modal */}
      {showTeacher && (
        <TeacherModal
          chapters={CHAPTERS}
          levels={LEVELS}
          progress={progress}
          onUpdateTeacher={handleUpdateTeacher}
          onResetProgress={handleResetProgress}
          onClose={() => setShowTeacher(false)}
        />
      )}
    </div>
  );
}
