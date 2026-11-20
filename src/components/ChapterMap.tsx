import { ArrowLeft, BookOpen, CheckCircle2, GraduationCap, HelpCircle, Lock, Star, Volume2, VolumeX } from 'lucide-react';
import { ChapterData, LevelData, SavedProgress } from '../game/types';

interface ChapterMapProps {
  chapters: ChapterData[];
  levels: LevelData[];
  progress: SavedProgress;
  onSelectLevel: (level: LevelData) => void;
  onOpenConcept: (chapter: ChapterData) => void;
  onOpenQuiz: (chapter: ChapterData) => void;
  onBackTitle: () => void;
  onOpenTeacher: () => void;
  onToggleMute: () => void;
}

export function ChapterMap({
  chapters,
  levels,
  progress,
  onSelectLevel,
  onOpenConcept,
  onOpenQuiz,
  onBackTitle,
  onOpenTeacher,
  onToggleMute,
}: ChapterMapProps) {
  const unlockAll = progress.teacher.enabled && progress.teacher.unlockAll;
  const assigned =
    progress.teacher.enabled && progress.teacher.assignedChapters.length > 0
      ? progress.teacher.assignedChapters
      : null;

  const visibleChapters = assigned
    ? chapters.filter((c) => assigned.includes(c.id))
    : chapters;

  const isChapterCleared = (chapterId: number) => {
    const chLevels = levels.filter((l) => l.chapterId === chapterId);
    return chLevels.length > 0 && chLevels.every((l) => progress.levels[l.id]?.cleared);
  };

  const isChapterUnlocked = (chapterId: number) => {
    if (unlockAll) return true;
    if (assigned && assigned.includes(chapterId)) return true;
    if (chapterId === 1) return true;
    return isChapterCleared(chapterId - 1);
  };

  const isLevelUnlocked = (level: LevelData) => {
    if (unlockAll) return true;
    if (!isChapterUnlocked(level.chapterId)) return false;
    if (level.stageIndex === 1) return true;
    const prev = levels.find(
      (l) => l.chapterId === level.chapterId && l.stageIndex === level.stageIndex - 1
    );
    return prev ? Boolean(progress.levels[prev.id]?.cleared) : true;
  };

  const totalCleared = levels.filter((l) => progress.levels[l.id]?.cleared).length;
  const totalStars = levels.reduce((acc, l) => acc + (progress.levels[l.id]?.stars ?? 0), 0);
  const totalBadges = chapters.filter((c) => progress.quizzesPassed[c.id]).length;

  return (
    <div className="w-full h-full bg-slate-950 text-slate-100 flex flex-col overflow-hidden">
      {/* Top Header */}
      <header className="shrink-0 flex flex-wrap items-center justify-between gap-4 px-5 py-4 bg-slate-900 border-b border-slate-800">
        <div className="flex items-center gap-3">
          <button
            type="button"
            onClick={onBackTitle}
            className="flex items-center gap-1.5 px-3.5 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-sm font-bold cursor-pointer whitespace-nowrap"
          >
            <ArrowLeft className="w-4 h-4" />
            처음으로
          </button>
          <h1 className="font-display text-2xl sm:text-3xl text-white">탐험 지도</h1>
          {assigned && (
            <span className="text-sm font-bold text-amber-300">
              · 수업 지정 챕터 ({assigned.join(', ')}장)
            </span>
          )}
        </div>

        <div className="flex items-center gap-4 text-sm font-bold">
          <div className="hidden md:flex items-center gap-3 text-slate-300 tabular-nums">
            <span>
              단계 <strong className="text-emerald-400">{totalCleared}</strong>/{levels.length}
            </span>
            <span className="text-slate-600">·</span>
            <span>
              별 <strong className="text-amber-400">{totalStars}</strong>/{levels.length * 3}
            </span>
            <span className="text-slate-600">·</span>
            <span>
              배지 <strong className="text-sky-400">{totalBadges}</strong>/{chapters.length}
            </span>
          </div>

          <button
            type="button"
            onClick={onOpenTeacher}
            className="flex items-center gap-1.5 px-3.5 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 border border-slate-700 text-sm font-bold cursor-pointer whitespace-nowrap"
          >
            <GraduationCap className="w-4 h-4 text-amber-400" />
            교사 모드
          </button>

          <button
            type="button"
            onClick={onToggleMute}
            aria-label={progress.muted ? '소리 켜기' : '소리 끄기'}
            className="p-2 rounded-xl bg-slate-800 hover:bg-slate-700 border border-slate-700 cursor-pointer"
          >
            {progress.muted ? (
              <VolumeX className="w-5 h-5 text-rose-400" />
            ) : (
              <Volume2 className="w-5 h-5 text-emerald-400" />
            )}
          </button>
        </div>
      </header>

      {/* Scrollable Chapter Grid */}
      <main className="flex-1 overflow-y-auto code-scroll p-5 sm:p-7">
        <div className="max-w-6xl mx-auto grid grid-cols-1 lg:grid-cols-2 gap-6">
          {visibleChapters.map((ch) => {
            const unlocked = isChapterUnlocked(ch.id);
            const chLevels = levels.filter((l) => l.chapterId === ch.id);
            const clearedInCh = chLevels.filter((l) => progress.levels[l.id]?.cleared).length;
            const starsInCh = chLevels.reduce(
              (acc, l) => acc + (progress.levels[l.id]?.stars ?? 0),
              0
            );
            const quizPassed = Boolean(progress.quizzesPassed[ch.id]);
            const canTakeQuiz = unlockAll || clearedInCh === chLevels.length;

            return (
              <section
                key={ch.id}
                className={`rounded-2xl border p-5 transition-colors ${
                  unlocked
                    ? 'bg-slate-900 border-slate-700'
                    : 'bg-slate-900/50 border-slate-800 opacity-70'
                }`}
              >
                {/* Chapter Header */}
                <div className="flex items-start justify-between gap-3 mb-3">
                  <div className="flex items-center gap-3">
                    <div
                      className="w-12 h-12 rounded-2xl flex items-center justify-center text-2xl shrink-0"
                      style={{ backgroundColor: `${ch.accentColor}26`, border: `1px solid ${ch.accentColor}66` }}
                    >
                      {unlocked ? ch.badgeEmoji : '🔒'}
                    </div>
                    <div>
                      <div className="text-xs font-semibold text-slate-400">
                        {ch.themeName} · {clearedInCh}/{chLevels.length}단계 · ⭐ {starsInCh}/
                        {chLevels.length * 3}
                      </div>
                      <h2 className="font-display text-xl sm:text-2xl text-white">
                        {ch.title}
                      </h2>
                      <p className="text-sm text-slate-300">{ch.subtitle}</p>
                    </div>
                  </div>

                  {quizPassed && (
                    <div className="text-right shrink-0 text-xs font-bold text-amber-300">
                      <div className="text-lg">{ch.badgeEmoji}</div>
                      <div>{ch.badgeName}</div>
                    </div>
                  )}
                </div>

                {/* Action buttons: Concept + Quiz */}
                <div className="flex items-center gap-2 mb-4">
                  <button
                    type="button"
                    disabled={!unlocked}
                    onClick={() => onOpenConcept(ch)}
                    className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-sm font-bold bg-slate-800 hover:bg-slate-700 disabled:opacity-40 text-sky-300 cursor-pointer disabled:cursor-not-allowed whitespace-nowrap"
                  >
                    <BookOpen className="w-4 h-4" />
                    30초 개념 설명
                  </button>

                  <button
                    type="button"
                    disabled={!canTakeQuiz}
                    onClick={() => onOpenQuiz(ch)}
                    className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-sm font-bold cursor-pointer disabled:cursor-not-allowed whitespace-nowrap ${
                      quizPassed
                        ? 'bg-emerald-900/60 hover:bg-emerald-800/70 text-emerald-300 border border-emerald-700/60'
                        : canTakeQuiz
                          ? 'bg-amber-500 hover:bg-amber-400 text-slate-950'
                          : 'bg-slate-800/60 text-slate-500'
                    }`}
                  >
                    {quizPassed ? (
                      <CheckCircle2 className="w-4 h-4" />
                    ) : (
                      <HelpCircle className="w-4 h-4" />
                    )}
                    {quizPassed ? '챕터 퀴즈 완료' : '마무리 퀴즈 (3문제)'}
                  </button>
                </div>

                {/* Stage buttons */}
                <div className="grid grid-cols-5 gap-2.5">
                  {chLevels.map((lvl) => {
                    const lvlOpen = isLevelUnlocked(lvl);
                    const lp = progress.levels[lvl.id];
                    const stars = lp?.stars ?? 0;

                    return (
                      <button
                        key={lvl.id}
                        type="button"
                        disabled={!lvlOpen}
                        onClick={() => onSelectLevel(lvl)}
                        title={lvl.title}
                        className={`flex flex-col items-center justify-center py-2.5 px-1.5 rounded-xl border transition-all cursor-pointer disabled:cursor-not-allowed ${
                          lp?.cleared
                            ? 'bg-slate-800 hover:bg-slate-700 border-emerald-500/60 text-white'
                            : lvlOpen
                              ? 'bg-slate-800 hover:bg-slate-700 border-sky-400/70 text-white'
                              : 'bg-slate-950/60 border-slate-800 text-slate-600'
                        }`}
                      >
                        <span className="text-base font-extrabold tabular-nums">
                          {lvlOpen ? `${lvl.stageIndex}단계` : <Lock className="w-4 h-4 my-1" />}
                        </span>
                        <div className="flex items-center gap-0.5 mt-1">
                          {[1, 2, 3].map((s) => (
                            <Star
                              key={s}
                              className={`w-3.5 h-3.5 ${
                                s <= stars
                                  ? 'text-amber-400 fill-amber-400'
                                  : 'text-slate-700'
                              }`}
                            />
                          ))}
                        </div>
                      </button>
                    );
                  })}
                </div>
              </section>
            );
          })}
        </div>
      </main>
    </div>
  );
}
