import { useState } from 'react';
import { BarChart3, Code2, Download, GraduationCap, RotateCcw, Settings, Star, X } from 'lucide-react';
import { ChapterData, LevelData, SavedProgress, TeacherConfig } from '../game/types';

interface TeacherModalProps {
  chapters: ChapterData[];
  levels: LevelData[];
  progress: SavedProgress;
  onUpdateTeacher: (config: TeacherConfig) => void;
  onResetProgress: () => void;
  onClose: () => void;
}

export function TeacherModal({
  chapters,
  levels,
  progress,
  onUpdateTeacher,
  onResetProgress,
  onClose,
}: TeacherModalProps) {
  const [tab, setTab] = useState<'controls' | 'report' | 'json'>('controls');
  const [confirmReset, setConfirmReset] = useState(false);

  const teacher = progress.teacher;

  const clearedLevels = levels.filter((l) => progress.levels[l.id]?.cleared);
  const totalStars = levels.reduce((acc, l) => acc + (progress.levels[l.id]?.stars ?? 0), 0);
  const totalBadges = chapters.filter((c) => progress.quizzesPassed[c.id]).length;
  const totalBlocksUsed = clearedLevels.reduce(
    (acc, l) => acc + (progress.levels[l.id]?.bestBlocks ?? 0),
    0
  );

  const toggleAssignedChapter = (chId: number) => {
    const exists = teacher.assignedChapters.includes(chId);
    const next = exists
      ? teacher.assignedChapters.filter((id) => id !== chId)
      : [...teacher.assignedChapters, chId].sort((a, b) => a - b);
    onUpdateTeacher({ ...teacher, enabled: true, assignedChapters: next });
  };

  const handleDownloadJson = () => {
    const blob = new Blob([JSON.stringify(levels, null, 2)], {
      type: 'application/json',
    });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'coding-explorer-levels.json';
    a.click();
    URL.revokeObjectURL(url);
  };

  return (
    <div className="fixed inset-0 z-50 bg-slate-950/90 flex items-center justify-center p-4">
      <div className="w-full max-w-4xl max-h-[88vh] bg-slate-900 border border-slate-700 rounded-3xl shadow-2xl flex flex-col overflow-hidden">
        {/* Header */}
        <div className="shrink-0 px-6 py-4 bg-slate-950 border-b border-slate-800 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <GraduationCap className="w-7 h-7 text-amber-400" />
            <div>
              <h2 className="font-display text-2xl text-white">교사 모드 · 학습 결과</h2>
              <p className="text-xs text-slate-400">
                수업용 챕터 지정, 전체 단계 열기, 학생 학습 기록 확인 및 JSON 단계 데이터 관리
              </p>
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

        {/* Tabs */}
        <div className="shrink-0 flex items-center gap-2 px-6 pt-3 bg-slate-950/60 border-b border-slate-800">
          {(
            [
              ['controls', '수업 설정', Settings],
              ['report', '학생 학습 결과', BarChart3],
              ['json', '단계 JSON 데이터', Code2],
            ] as const
          ).map(([id, label, Icon]) => (
            <button
              key={id}
              type="button"
              onClick={() => setTab(id)}
              className={`flex items-center gap-1.5 px-4 py-2.5 text-sm font-bold border-b-2 transition-colors cursor-pointer ${
                tab === id
                  ? 'border-amber-400 text-amber-300'
                  : 'border-transparent text-slate-400 hover:text-slate-200'
              }`}
            >
              <Icon className="w-4 h-4" />
              {label}
            </button>
          ))}
        </div>

        {/* Body */}
        <div className="flex-1 overflow-y-auto code-scroll p-6">
          {tab === 'controls' && (
            <div className="space-y-6">
              {/* Toggle Switches */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div className="p-4 rounded-2xl bg-slate-950 border border-slate-800 flex items-center justify-between gap-4">
                  <div>
                    <div className="font-bold text-white text-base">교사 모드 켜기</div>
                    <p className="text-xs text-slate-400 mt-0.5">
                      수업 설정(단계 열기·챕터 지정)을 적용합니다.
                    </p>
                  </div>
                  <button
                    type="button"
                    onClick={() =>
                      onUpdateTeacher({ ...teacher, enabled: !teacher.enabled })
                    }
                    className={`px-4 py-2 rounded-xl font-extrabold text-sm cursor-pointer transition-colors ${
                      teacher.enabled
                        ? 'bg-emerald-500 text-slate-950'
                        : 'bg-slate-800 text-slate-300'
                    }`}
                  >
                    {teacher.enabled ? '켜짐' : '꺼짐'}
                  </button>
                </div>

                <div className="p-4 rounded-2xl bg-slate-950 border border-slate-800 flex items-center justify-between gap-4">
                  <div>
                    <div className="font-bold text-white text-base">모든 단계 바로 열기</div>
                    <p className="text-xs text-slate-400 mt-0.5">
                      잠금 없이 8개 챕터 36단계와 퀴즈를 자유롭게 엽니다.
                    </p>
                  </div>
                  <button
                    type="button"
                    onClick={() =>
                      onUpdateTeacher({
                        ...teacher,
                        enabled: true,
                        unlockAll: !teacher.unlockAll,
                      })
                    }
                    className={`px-4 py-2 rounded-xl font-extrabold text-sm cursor-pointer transition-colors ${
                      teacher.enabled && teacher.unlockAll
                        ? 'bg-amber-400 text-slate-950'
                        : 'bg-slate-800 text-slate-300'
                    }`}
                  >
                    {teacher.enabled && teacher.unlockAll ? '열림' : '기본 잠금'}
                  </button>
                </div>
              </div>

              {/* Chapter Assignment */}
              <div className="p-5 rounded-2xl bg-slate-950 border border-slate-800">
                <div className="flex flex-wrap items-center justify-between gap-2 mb-3">
                  <div>
                    <h3 className="font-bold text-white text-base">수업용 챕터 지정</h3>
                    <p className="text-xs text-slate-400">
                      선택한 챕터만 탐험 지도에 표시합니다. (선택하지 않으면 전체 8개 챕터 표시)
                    </p>
                  </div>
                  {teacher.assignedChapters.length > 0 && (
                    <button
                      type="button"
                      onClick={() =>
                        onUpdateTeacher({ ...teacher, assignedChapters: [] })
                      }
                      className="text-xs font-bold text-sky-400 hover:underline cursor-pointer"
                    >
                      전체 표시로 초기화
                    </button>
                  )}
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
                  {chapters.map((ch) => {
                    const selected = teacher.assignedChapters.includes(ch.id);
                    return (
                      <button
                        key={ch.id}
                        type="button"
                        onClick={() => toggleAssignedChapter(ch.id)}
                        className={`flex items-center justify-between px-4 py-3 rounded-xl border text-left transition-colors cursor-pointer ${
                          selected
                            ? 'bg-amber-500/20 border-amber-400 text-amber-100'
                            : 'bg-slate-900 border-slate-800 text-slate-300 hover:border-slate-600'
                        }`}
                      >
                        <span className="font-bold text-sm">
                          {ch.badgeEmoji} {ch.title}
                        </span>
                        <span className="text-xs font-extrabold">
                          {selected ? '수업 선택됨' : '선택'}
                        </span>
                      </button>
                    );
                  })}
                </div>
              </div>

              {/* Reset Progress */}
              <div className="p-4 rounded-2xl bg-slate-950 border border-slate-800 flex flex-wrap items-center justify-between gap-3">
                <div>
                  <div className="font-bold text-rose-300 text-sm">학생 진행 기록 초기화</div>
                  <p className="text-xs text-slate-400">
                    이 브라우저(localStorage)에 저장된 별·배지·클리어 기록을 모두 비웁니다.
                  </p>
                </div>
                {!confirmReset ? (
                  <button
                    type="button"
                    onClick={() => setConfirmReset(true)}
                    className="flex items-center gap-1.5 px-3.5 py-2 rounded-xl bg-slate-800 hover:bg-rose-700 text-slate-200 text-xs font-bold cursor-pointer"
                  >
                    <RotateCcw className="w-3.5 h-3.5" />
                    기록 초기화
                  </button>
                ) : (
                  <div className="flex items-center gap-2">
                    <button
                      type="button"
                      onClick={() => {
                        onResetProgress();
                        setConfirmReset(false);
                      }}
                      className="px-3.5 py-2 rounded-xl bg-rose-600 hover:bg-rose-500 text-white text-xs font-extrabold cursor-pointer"
                    >
                      정말 초기화할까요?
                    </button>
                    <button
                      type="button"
                      onClick={() => setConfirmReset(false)}
                      className="px-3 py-2 rounded-xl bg-slate-800 text-slate-300 text-xs font-bold cursor-pointer"
                    >
                      취소
                    </button>
                  </div>
                )}
              </div>
            </div>
          )}

          {tab === 'report' && (
            <div className="space-y-5">
              {/* Summary Metrics */}
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                <div className="p-4 rounded-2xl bg-slate-950 border border-slate-800">
                  <div className="text-xs text-slate-400">푼 단계 수</div>
                  <div className="text-2xl font-extrabold text-emerald-400 tabular-nums mt-1">
                    {clearedLevels.length} / {levels.length}
                  </div>
                </div>
                <div className="p-4 rounded-2xl bg-slate-950 border border-slate-800">
                  <div className="text-xs text-slate-400">획득한 별</div>
                  <div className="text-2xl font-extrabold text-amber-400 tabular-nums mt-1">
                    {totalStars} / {levels.length * 3}
                  </div>
                </div>
                <div className="p-4 rounded-2xl bg-slate-950 border border-slate-800">
                  <div className="text-xs text-slate-400">획득 배지</div>
                  <div className="text-2xl font-extrabold text-sky-400 tabular-nums mt-1">
                    {totalBadges} / {chapters.length}
                  </div>
                </div>
                <div className="p-4 rounded-2xl bg-slate-950 border border-slate-800">
                  <div className="text-xs text-slate-400">누적 최소 블록 합계</div>
                  <div className="text-2xl font-extrabold text-purple-300 tabular-nums mt-1">
                    {totalBlocksUsed}개
                  </div>
                </div>
              </div>

              {/* Per-Stage Detail Table */}
              <div className="rounded-2xl border border-slate-800 overflow-hidden bg-slate-950">
                <table className="w-full text-left text-sm">
                  <thead className="bg-slate-900 text-slate-400 text-xs">
                    <tr>
                      <th className="py-2.5 px-4">단계</th>
                      <th className="py-2.5 px-4">제목</th>
                      <th className="py-2.5 px-4">상태</th>
                      <th className="py-2.5 px-4">별</th>
                      <th className="py-2.5 px-4 text-right">사용 블록 / 목표</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-800/80 tabular-nums">
                    {levels.map((lvl) => {
                      const lp = progress.levels[lvl.id];
                      return (
                        <tr key={lvl.id} className="hover:bg-slate-900/50">
                          <td className="py-2 px-4 font-bold text-slate-300">{lvl.id}</td>
                          <td className="py-2 px-4 text-slate-200">{lvl.title}</td>
                          <td className="py-2 px-4">
                            {lp?.cleared ? (
                              <span className="text-emerald-400 font-bold">완료</span>
                            ) : (
                              <span className="text-slate-500">미완료</span>
                            )}
                          </td>
                          <td className="py-2 px-4">
                            <div className="flex items-center gap-0.5">
                              {[1, 2, 3].map((s) => (
                                <Star
                                  key={s}
                                  className={`w-3.5 h-3.5 ${
                                    s <= (lp?.stars ?? 0)
                                      ? 'text-amber-400 fill-amber-400'
                                      : 'text-slate-700'
                                  }`}
                                />
                              ))}
                            </div>
                          </td>
                          <td className="py-2 px-4 text-right font-code text-xs">
                            {lp?.bestBlocks !== null && lp?.bestBlocks !== undefined ? (
                              <span
                                className={
                                  lp.bestBlocks <= lvl.optimalBlocks
                                    ? 'text-emerald-400 font-bold'
                                    : 'text-amber-300'
                                }
                              >
                                {lp.bestBlocks} / {lvl.optimalBlocks}
                              </span>
                            ) : (
                              <span className="text-slate-600">- / {lvl.optimalBlocks}</span>
                            )}
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            </div>
          )}

          {tab === 'json' && (
            <div className="space-y-4">
              <div className="flex flex-wrap items-center justify-between gap-3">
                <p className="text-sm text-slate-300">
                  모든 단계 데이터(맵 크기, 벽, 보석, 시작 위치, 사용 가능 블록, 목표 블록 수)는{' '}
                  <span className="font-code text-sky-300">src/data/levels.json</span>에 분리되어 있어 새 단계를 쉽게 추가할 수 있습니다.
                </p>
                <button
                  type="button"
                  onClick={handleDownloadJson}
                  className="flex items-center gap-1.5 px-4 py-2 rounded-xl bg-sky-500 hover:bg-sky-400 text-slate-950 font-extrabold text-sm cursor-pointer"
                >
                  <Download className="w-4 h-4" />
                  JSON 다운로드
                </button>
              </div>
              <pre className="p-4 rounded-2xl bg-slate-950 border border-slate-800 font-code text-xs text-sky-200 overflow-x-auto max-h-96 code-scroll">
                {JSON.stringify(levels.slice(0, 2), null, 2)}
                {'\n... (총 ' + levels.length + '개 단계)'}
              </pre>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
