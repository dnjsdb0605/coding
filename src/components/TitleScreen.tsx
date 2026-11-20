import { useEffect } from 'react';
import { BookOpen, GraduationCap, Map, Play, Volume2, VolumeX } from 'lucide-react';
import { SavedProgress } from '../game/types';

interface TitleScreenProps {
  progress: SavedProgress;
  totalLevels: number;
  onStart: () => void;
  onOpenMap: () => void;
  onOpenTeacher: () => void;
  onToggleMute: () => void;
}

export function TitleScreen({
  progress,
  totalLevels,
  onStart,
  onOpenMap,
  onOpenTeacher,
  onToggleMute,
}: TitleScreenProps) {
  const clearedCount = Object.values(progress.levels).filter((l) => l.cleared).length;
  const totalStars = Object.values(progress.levels).reduce((acc, l) => acc + l.stars, 0);
  const badgeCount = Object.values(progress.quizzesPassed).filter(Boolean).length;

  useEffect(() => {
    const onKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Enter' || e.key === ' ') {
        const tag = (e.target as HTMLElement)?.tagName;
        if (tag === 'BUTTON' || tag === 'INPUT' || tag === 'TEXTAREA') return;
        e.preventDefault();
        onStart();
      }
    };
    window.addEventListener('keydown', onKeyDown);
    return () => window.removeEventListener('keydown', onKeyDown);
  }, [onStart]);

  return (
    <div className="absolute inset-0 z-10 pointer-events-none flex flex-col justify-between p-5 sm:p-8">
      {/* Top minimal utility row */}
      <div className="flex items-center justify-between">
        <div className="pointer-events-auto flex items-center gap-3 text-sm font-semibold text-slate-200 bg-slate-950/80 border border-slate-700/70 rounded-xl px-4 py-2">
          <span>🤖 3D 블록·파이썬 코딩 학습</span>
          {clearedCount > 0 && (
            <>
              <span className="text-slate-500">·</span>
              <span className="tabular-nums text-emerald-300">
                클리어 {clearedCount}/{totalLevels}
              </span>
              <span className="text-slate-500">·</span>
              <span className="tabular-nums text-amber-300">⭐ {totalStars}</span>
              <span className="text-slate-500">·</span>
              <span className="tabular-nums text-sky-300">🏅 {badgeCount}/8</span>
            </>
          )}
        </div>

        <div className="pointer-events-auto flex items-center gap-2">
          <button
            type="button"
            onClick={onOpenTeacher}
            className="flex items-center gap-2 px-3.5 py-2 rounded-xl text-sm font-bold bg-slate-900/90 hover:bg-slate-800 text-slate-100 border border-slate-700 transition-colors cursor-pointer whitespace-nowrap"
          >
            <GraduationCap className="w-4 h-4 text-amber-400" />
            교사 모드
            {progress.teacher.enabled && <span className="text-amber-300">(켜짐)</span>}
          </button>
          <button
            type="button"
            onClick={onToggleMute}
            aria-label={progress.muted ? '소리 켜기' : '소리 끄기'}
            className="p-2.5 rounded-xl bg-slate-900/90 hover:bg-slate-800 text-slate-100 border border-slate-700 transition-colors cursor-pointer"
          >
            {progress.muted ? <VolumeX className="w-5 h-5 text-rose-400" /> : <Volume2 className="w-5 h-5 text-emerald-400" />}
          </button>
        </div>
      </div>

      {/* Left-aligned Title Lockup leaving center-right 3D robot diorama unobstructed */}
      <div className="my-auto max-w-lg pointer-events-auto bg-slate-950/82 border border-slate-700/80 rounded-3xl p-6 sm:p-8 shadow-2xl">
        {/* Bespoke inline SVG Logo Emblem */}
        <div className="flex items-center gap-3.5 mb-4">
          <svg
            width="56"
            height="56"
            viewBox="0 0 64 64"
            fill="none"
            xmlns="http://www.w3.org/2000/svg"
            aria-hidden="true"
            className="shrink-0"
          >
            <rect x="6" y="6" width="52" height="52" rx="16" fill="#0EA5E9" />
            <rect x="10" y="10" width="44" height="44" rx="12" fill="#0F172A" />
            <line x1="32" y1="12" x2="32" y2="20" stroke="#CBD5E1" strokeWidth="3" strokeLinecap="round" />
            <circle cx="32" cy="11" r="4" fill="#FDE047" />
            <rect x="17" y="21" width="30" height="22" rx="7" fill="#F8FAFC" />
            <rect x="21" y="26" width="22" height="12" rx="4" fill="#0F172A" />
            <circle cx="27" cy="32" r="3" fill="#38BDF8" />
            <circle cx="37" cy="32" r="3" fill="#38BDF8" />
            <path d="M24 47L32 53L40 47" stroke="#34D399" strokeWidth="3.5" strokeLinecap="round" strokeLinejoin="round" />
          </svg>
          <div>
            <p className="text-sm font-bold text-emerald-300 tracking-wide">
              초등 4~6학년 · 코딩 입문 3D 게임
            </p>
            <h1 className="font-display text-4xl sm:text-5xl text-white tracking-tight leading-tight">
              코딩 탐험대 3D
            </h1>
          </div>
        </div>

        <p className="text-base sm:text-lg text-slate-200 leading-relaxed mb-6">
          귀여운 로봇과 함께 숲·사막·얼음·우주 세계를 탐험하며
          <br />
          순차 실행부터 반복, 조건, 함수, 변수, 파이썬까지 차근차근 배워요!
        </p>

        <div className="flex flex-wrap items-center gap-3">
          <button
            type="button"
            onClick={onStart}
            className="flex-1 min-w-[200px] flex items-center justify-center gap-2.5 px-6 py-4 rounded-2xl bg-emerald-500 hover:bg-emerald-400 active:scale-[0.98] text-slate-950 font-extrabold text-xl shadow-lg transition-all cursor-pointer whitespace-nowrap"
          >
            <Play className="w-6 h-6 fill-slate-950" />
            {clearedCount > 0 ? '이어서 탐험하기' : '탐험 시작하기'}
          </button>

          <button
            type="button"
            onClick={onOpenMap}
            className="flex items-center justify-center gap-2 px-5 py-4 rounded-2xl bg-slate-800 hover:bg-slate-700 text-white font-bold text-lg border border-slate-600 transition-colors cursor-pointer whitespace-nowrap"
          >
            <Map className="w-5 h-5 text-sky-400" />
            챕터 지도
          </button>
        </div>

        <div className="mt-5 pt-4 border-t border-slate-800 flex items-center gap-2 text-sm text-slate-300">
          <BookOpen className="w-4 h-4 text-amber-400 shrink-0" />
          <span>8개 챕터 36단계 · 30초 개념 설명 · 챕터 퀴즈와 탐험 배지</span>
        </div>
      </div>

      {/* Bottom single flat control-hint line */}
      <div className="flex justify-center">
        <div className="bg-slate-950/78 border border-slate-800 rounded-xl px-4 py-2 text-xs sm:text-sm text-slate-300">
          마우스·손가락으로 3D 화면 회전 및 확대 · 블록 끌어놓기 또는 탭으로 코딩 · Enter 시작
        </div>
      </div>
    </div>
  );
}
