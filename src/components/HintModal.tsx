import { useState } from 'react';
import { Lightbulb, Lock, Unlock, X } from 'lucide-react';
import { soundFX } from '../game/audio';
import { LevelData } from '../game/types';

interface HintModalProps {
  level: LevelData;
  onClose: () => void;
}

const HINT_TIERS = [
  { tier: 1, title: '1단계 힌트 · 방향과 생각 열기', color: 'text-sky-300' },
  { tier: 2, title: '2단계 힌트 · 필요한 블록 종류', color: 'text-amber-300' },
  { tier: 3, title: '3단계 힌트 · 거의 정답!', color: 'text-emerald-300' },
];

export function HintModal({ level, onClose }: HintModalProps) {
  const [revealedCount, setRevealedCount] = useState(1);

  const revealNext = () => {
    soundFX.click();
    setRevealedCount((c) => Math.min(3, c + 1));
  };

  return (
    <div className="fixed inset-0 z-50 bg-slate-950/85 flex items-center justify-center p-4">
      <div className="w-full max-w-lg bg-slate-900 border border-amber-500/50 rounded-3xl shadow-2xl overflow-hidden">
        <div className="px-6 py-4 bg-slate-950 border-b border-slate-800 flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <Lightbulb className="w-6 h-6 text-amber-400" />
            <div>
              <p className="text-xs font-bold text-slate-400">
                {level.id} · {level.title}
              </p>
              <h2 className="font-display text-2xl text-white">도움말 힌트</h2>
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

        <div className="p-6 space-y-3.5">
          {HINT_TIERS.map((h, idx) => {
            const isOpen = idx < revealedCount;
            return (
              <div
                key={h.tier}
                className={`rounded-2xl border p-4 ${
                  isOpen
                    ? 'bg-slate-950 border-slate-700'
                    : 'bg-slate-950/50 border-slate-800/80'
                }`}
              >
                <div className="flex items-center justify-between mb-1.5">
                  <span className={`text-sm font-extrabold ${h.color}`}>{h.title}</span>
                  {isOpen ? (
                    <Unlock className="w-4 h-4 text-emerald-400" />
                  ) : (
                    <Lock className="w-4 h-4 text-slate-600" />
                  )}
                </div>
                {isOpen ? (
                  <p className="text-sm sm:text-base text-slate-100 whitespace-pre-wrap leading-relaxed">
                    {level.hints[idx]}
                  </p>
                ) : (
                  <p className="text-xs text-slate-500">
                    아직 잠겨 있어요. 더 자세한 힌트가 필요하면 아래 버튼을 눌러 열어 보세요!
                  </p>
                )}
              </div>
            );
          })}
        </div>

        <div className="px-6 py-4 bg-slate-950/60 border-t border-slate-800 flex items-center justify-between gap-3">
          {revealedCount < 3 ? (
            <button
              type="button"
              onClick={revealNext}
              className="px-4 py-2.5 rounded-xl bg-amber-500 hover:bg-amber-400 text-slate-950 font-extrabold text-sm cursor-pointer"
            >
              {revealedCount + 1}단계 힌트 더 보기
            </button>
          ) : (
            <span className="text-xs font-bold text-slate-400">
              모든 힌트를 다 열었어요! 화이팅!
            </span>
          )}
          <button
            type="button"
            onClick={onClose}
            className="px-5 py-2.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-white font-bold text-sm cursor-pointer"
          >
            돌아가기
          </button>
        </div>
      </div>
    </div>
  );
}
