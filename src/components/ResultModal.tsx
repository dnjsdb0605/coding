import { ArrowRight, CheckCircle2, HelpCircle, Map, RotateCcw, Star } from 'lucide-react';
import { ChapterData, LevelData } from '../game/types';

interface ResultModalProps {
  level: LevelData;
  chapter: ChapterData;
  usedBlocks: number;
  gotOptimal: boolean;
  gotBonus: boolean;
  hasNextLevelInChapter: boolean;
  onNextStage: () => void;
  onOpenQuiz: () => void;
  onReplay: () => void;
  onBackMap: () => void;
}

export function ResultModal({
  level,
  chapter,
  usedBlocks,
  gotOptimal,
  gotBonus,
  hasNextLevelInChapter,
  onNextStage,
  onOpenQuiz,
  onReplay,
  onBackMap,
}: ResultModalProps) {
  const earnedStars = 1 + (gotOptimal ? 1 : 0) + (gotBonus ? 1 : 0);

  return (
    <div className="fixed inset-0 z-50 bg-slate-950/85 flex items-center justify-center p-4">
      <div className="w-full max-w-md bg-slate-900 border-2 border-emerald-500/60 rounded-3xl shadow-2xl p-6 sm:p-7 text-center space-y-5">
        <div>
          <p className="text-sm font-bold text-emerald-300">
            {chapter.title} · {level.stageIndex}단계 클리어!
          </p>
          <h2 className="font-display text-3xl sm:text-4xl text-white mt-1">
            대단해요! 성공했어요!
          </h2>
        </div>

        {/* 3 Big Stars */}
        <div className="flex items-center justify-center gap-3 py-1">
          {[1, 2, 3].map((s) => (
            <Star
              key={s}
              className={`w-12 h-12 transition-transform ${
                s <= earnedStars
                  ? 'text-amber-400 fill-amber-400 scale-110'
                  : 'text-slate-700'
              }`}
            />
          ))}
        </div>

        {/* 3-Star Criteria Breakdown */}
        <div className="bg-slate-950 border border-slate-800 rounded-2xl p-4 space-y-2.5 text-left text-sm sm:text-base">
          <div className="flex items-center justify-between gap-2">
            <span className="flex items-center gap-2 text-emerald-300 font-bold">
              <CheckCircle2 className="w-5 h-5 shrink-0" />
              보석 모으고 깃발 도착
            </span>
            <span className="font-extrabold text-amber-300">⭐ 달성</span>
          </div>

          <div className="flex items-center justify-between gap-2">
            <span
              className={`flex items-center gap-2 font-bold ${
                gotOptimal ? 'text-emerald-300' : 'text-slate-400'
              }`}
            >
              <CheckCircle2 className="w-5 h-5 shrink-0" />
              최소 블록 ({usedBlocks} / 목표 {level.optimalBlocks})
            </span>
            <span
              className={`font-extrabold ${
                gotOptimal ? 'text-amber-300' : 'text-slate-500'
              }`}
            >
              {gotOptimal ? '⭐ 달성' : '아쉬워요'}
            </span>
          </div>

          <div className="flex items-center justify-between gap-2">
            <span
              className={`flex items-center gap-2 font-bold ${
                gotBonus ? 'text-emerald-300' : 'text-slate-400'
              }`}
            >
              <CheckCircle2 className="w-5 h-5 shrink-0" />
              황금 보너스 보석 획득
            </span>
            <span
              className={`font-extrabold ${
                gotBonus ? 'text-amber-300' : 'text-slate-500'
              }`}
            >
              {gotBonus ? '⭐ 달성' : '놓쳤어요'}
            </span>
          </div>
        </div>

        {/* Action Buttons */}
        <div className="space-y-2.5 pt-1">
          {hasNextLevelInChapter ? (
            <button
              type="button"
              onClick={onNextStage}
              className="w-full flex items-center justify-center gap-2 px-5 py-3.5 rounded-2xl bg-emerald-500 hover:bg-emerald-400 text-slate-950 font-extrabold text-lg cursor-pointer"
            >
              다음 단계로 가기
              <ArrowRight className="w-5 h-5" />
            </button>
          ) : (
            <button
              type="button"
              onClick={onOpenQuiz}
              className="w-full flex items-center justify-center gap-2 px-5 py-3.5 rounded-2xl bg-amber-400 hover:bg-amber-300 text-slate-950 font-extrabold text-lg cursor-pointer"
            >
              <HelpCircle className="w-5 h-5" />
              챕터 마무리 퀴즈 풀기 (3문제)
            </button>
          )}

          <div className="grid grid-cols-2 gap-2.5">
            <button
              type="button"
              onClick={onReplay}
              className="flex items-center justify-center gap-1.5 px-4 py-2.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-white font-bold text-sm cursor-pointer"
            >
              <RotateCcw className="w-4 h-4" />
              다시 도전
            </button>
            <button
              type="button"
              onClick={onBackMap}
              className="flex items-center justify-center gap-1.5 px-4 py-2.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-white font-bold text-sm cursor-pointer"
            >
              <Map className="w-4 h-4" />
              챕터 지도
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
