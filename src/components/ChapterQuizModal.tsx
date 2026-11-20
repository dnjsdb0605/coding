import { useState } from 'react';
import { Award, CheckCircle2, RotateCcw, X, XCircle } from 'lucide-react';
import { soundFX } from '../game/audio';
import { ChapterData } from '../game/types';

interface ChapterQuizModalProps {
  chapter: ChapterData;
  onPass: () => void;
  onClose: () => void;
}

export function ChapterQuizModal({ chapter, onPass, onClose }: ChapterQuizModalProps) {
  const [qIndex, setQIndex] = useState(0);
  const [selected, setSelected] = useState<number | null>(null);
  const [score, setScore] = useState(0);
  const [finished, setFinished] = useState(false);

  const q = chapter.quiz[qIndex];
  const isAnswered = selected !== null;
  const isCorrect = selected === q.correctIndex;

  const handleChoose = (optIdx: number) => {
    if (isAnswered) return;
    setSelected(optIdx);
    if (optIdx === q.correctIndex) {
      soundFX.quizCorrect();
      setScore((s) => s + 1);
    } else {
      soundFX.quizWrong();
    }
  };

  const handleNext = () => {
    if (qIndex + 1 < chapter.quiz.length) {
      setQIndex((i) => i + 1);
      setSelected(null);
    } else {
      setFinished(true);
      const passed = score >= 2;
      if (passed) {
        soundFX.win();
        onPass();
      }
    }
  };

  const handleRetry = () => {
    setQIndex(0);
    setSelected(null);
    setScore(0);
    setFinished(false);
  };

  return (
    <div className="fixed inset-0 z-50 bg-slate-950/90 flex items-center justify-center p-4">
      <div className="w-full max-w-xl bg-slate-900 border border-slate-700 rounded-3xl shadow-2xl overflow-hidden">
        <div className="px-6 py-4 bg-slate-950/70 border-b border-slate-800 flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <span className="text-2xl">{chapter.badgeEmoji}</span>
            <div>
              <p className="text-xs font-bold text-slate-400">{chapter.title}</p>
              <h2 className="font-display text-2xl text-white">마무리 퀴즈</h2>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            aria-label="닫기"
            className="p-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-200 cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {!finished ? (
          <div className="p-6 space-y-5">
            <div className="flex items-center justify-between text-sm font-bold text-slate-400 tabular-nums">
              <span>
                문제 {qIndex + 1} / {chapter.quiz.length}
              </span>
              <span className="text-emerald-400">맞힌 문제: {score}</span>
            </div>

            <h3 className="text-lg sm:text-xl font-bold text-white leading-snug">
              {q.question}
            </h3>

            {q.codeSnippet && (
              <pre className="p-4 rounded-xl bg-slate-950 border border-slate-800 font-code text-sm text-sky-300 overflow-x-auto">
                {q.codeSnippet}
              </pre>
            )}

            <div className="space-y-2.5">
              {q.options.map((opt, idx) => {
                let cls =
                  'bg-slate-800 hover:bg-slate-700 border-slate-700 text-slate-100';
                if (isAnswered) {
                  if (idx === q.correctIndex) {
                    cls = 'bg-emerald-900/70 border-emerald-400 text-emerald-100';
                  } else if (idx === selected) {
                    cls = 'bg-rose-900/70 border-rose-400 text-rose-100';
                  } else {
                    cls = 'bg-slate-900 border-slate-800 text-slate-500';
                  }
                }
                return (
                  <button
                    key={idx}
                    type="button"
                    disabled={isAnswered}
                    onClick={() => handleChoose(idx)}
                    className={`w-full text-left px-4 py-3.5 rounded-xl border text-base font-semibold transition-colors flex items-center justify-between gap-3 cursor-pointer disabled:cursor-default ${cls}`}
                  >
                    <span>
                      <strong className="mr-2 tabular-nums">{idx + 1}.</strong>
                      {opt}
                    </span>
                    {isAnswered && idx === q.correctIndex && (
                      <CheckCircle2 className="w-5 h-5 text-emerald-400 shrink-0" />
                    )}
                    {isAnswered && idx === selected && idx !== q.correctIndex && (
                      <XCircle className="w-5 h-5 text-rose-400 shrink-0" />
                    )}
                  </button>
                );
              })}
            </div>

            {isAnswered && (
              <div
                className={`p-4 rounded-xl border text-sm sm:text-base ${
                  isCorrect
                    ? 'bg-emerald-950/70 border-emerald-700 text-emerald-200'
                    : 'bg-rose-950/70 border-rose-700 text-rose-200'
                }`}
              >
                <p className="font-extrabold mb-1">
                  {isCorrect ? '🎉 정답이에요!' : '💡 아쉽지만 다시 배워 보아요!'}
                </p>
                <p>{q.explanation}</p>
              </div>
            )}

            {isAnswered && (
              <div className="flex justify-end">
                <button
                  type="button"
                  onClick={handleNext}
                  className="px-6 py-3 rounded-xl bg-sky-500 hover:bg-sky-400 text-slate-950 font-extrabold text-base cursor-pointer"
                >
                  {qIndex + 1 < chapter.quiz.length ? '다음 문제 →' : '결과 보기'}
                </button>
              </div>
            )}
          </div>
        ) : (
          <div className="p-7 text-center space-y-5">
            <div className="text-6xl">{score >= 2 ? chapter.badgeEmoji : '🤔'}</div>
            <h3 className="font-display text-3xl text-white">
              {score >= 2 ? '축하해요! 탐험 배지 획득!' : '조금만 더 힘내 볼까요?'}
            </h3>
            <p className="text-lg text-slate-200 tabular-nums">
              {chapter.quiz.length}문제 중 <strong className="text-amber-300">{score}문제</strong>를 맞혔어요!
            </p>
            {score >= 2 ? (
              <div className="inline-flex items-center gap-2 px-5 py-2.5 rounded-2xl bg-amber-500/20 border border-amber-400/50 text-amber-200 font-bold">
                <Award className="w-5 h-5 text-amber-400" />
                [{chapter.badgeName}] 배지를 모았어요!
              </div>
            ) : (
              <p className="text-sm text-slate-400">2문제 이상 맞히면 챕터 배지를 받을 수 있어요.</p>
            )}

            <div className="flex items-center justify-center gap-3 pt-2">
              <button
                type="button"
                onClick={handleRetry}
                className="flex items-center gap-1.5 px-5 py-3 rounded-xl bg-slate-800 hover:bg-slate-700 text-white font-bold cursor-pointer"
              >
                <RotateCcw className="w-4 h-4" />
                다시 풀기
              </button>
              <button
                type="button"
                onClick={onClose}
                className="px-6 py-3 rounded-xl bg-emerald-500 hover:bg-emerald-400 text-slate-950 font-extrabold cursor-pointer"
              >
                탐험 지도로 돌아가기
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
