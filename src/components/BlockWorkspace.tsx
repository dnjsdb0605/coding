import React, { useMemo, useRef, useState } from 'react';
import {
  ArrowDown,
  ArrowUp,
  ChevronDown,
  ChevronUp,
  Lightbulb,
  Play,
  RotateCcw,
  StepForward,
  Trash2,
  X,
} from 'lucide-react';
import { soundFX } from '../game/audio';
import {
  BLOCK_DEFS,
  CONDITION_LABELS,
  VAR_LABELS,
  blocksToPython,
  countBlocks,
  createBlock,
} from '../game/blockMeta';
import {
  BlockType,
  CodeBlock,
  ConditionType,
  LevelData,
  VarName,
} from '../game/types';

export interface DropTarget {
  scope: 'main' | 'func';
  parentId: string | null;
  branch: 'body' | 'elseBody';
}

interface BlockWorkspaceProps {
  level: LevelData;
  mainBlocks: CodeBlock[];
  funcBlocks: CodeBlock[];
  pythonText: string;
  pythonError: string | null;
  activeBlockId: string | null;
  activeSourceLine: number | null;
  isRunning: boolean;
  speed: 'slow' | 'normal' | 'fast';
  dockState: 'collapsed' | 'normal' | 'expanded';
  onChangeDockState: (next: 'collapsed' | 'normal' | 'expanded') => void;
  onChangeMainBlocks: (blocks: CodeBlock[]) => void;
  onChangeFuncBlocks: (blocks: CodeBlock[]) => void;
  onChangePythonText: (text: string) => void;
  onRun: () => void;
  onStep: () => void;
  onReset: () => void;
  onClearCode: () => void;
  onChangeSpeed: (speed: 'slow' | 'normal' | 'fast') => void;
  onOpenHint: () => void;
}

// Tree mutation helpers
function insertIntoTree(
  list: CodeBlock[],
  parentId: string | null,
  branch: 'body' | 'elseBody',
  newBlock: CodeBlock
): CodeBlock[] {
  if (parentId === null) {
    return [...list, newBlock];
  }
  return list.map((b) => {
    if (b.id === parentId) {
      if (branch === 'elseBody') {
        return { ...b, elseBody: [...(b.elseBody ?? []), newBlock] };
      }
      return { ...b, body: [...(b.body ?? []), newBlock] };
    }
    return {
      ...b,
      body: b.body ? insertIntoTree(b.body, parentId, branch, newBlock) : undefined,
      elseBody: b.elseBody
        ? insertIntoTree(b.elseBody, parentId, branch, newBlock)
        : undefined,
    };
  });
}

function updateBlockInTree(
  list: CodeBlock[],
  id: string,
  patch: Partial<CodeBlock>
): CodeBlock[] {
  return list.map((b) => {
    if (b.id === id) {
      return { ...b, ...patch };
    }
    return {
      ...b,
      body: b.body ? updateBlockInTree(b.body, id, patch) : undefined,
      elseBody: b.elseBody ? updateBlockInTree(b.elseBody, id, patch) : undefined,
    };
  });
}

function deleteBlockInTree(list: CodeBlock[], id: string): CodeBlock[] {
  return list
    .filter((b) => b.id !== id)
    .map((b) => ({
      ...b,
      body: b.body ? deleteBlockInTree(b.body, id) : undefined,
      elseBody: b.elseBody ? deleteBlockInTree(b.elseBody, id) : undefined,
    }));
}

function moveBlockInTree(list: CodeBlock[], id: string, dir: -1 | 1): CodeBlock[] {
  const idx = list.findIndex((b) => b.id === id);
  if (idx !== -1) {
    const nextIdx = idx + dir;
    if (nextIdx < 0 || nextIdx >= list.length) return list;
    const copy = [...list];
    const [item] = copy.splice(idx, 1);
    copy.splice(nextIdx, 0, item);
    return copy;
  }
  return list.map((b) => ({
    ...b,
    body: b.body ? moveBlockInTree(b.body, id, dir) : undefined,
    elseBody: b.elseBody ? moveBlockInTree(b.elseBody, id, dir) : undefined,
  }));
}

function targetKey(t: DropTarget): string {
  return `${t.scope}:${t.parentId ?? 'root'}:${t.branch}`;
}

export function BlockWorkspace({
  level,
  mainBlocks,
  funcBlocks,
  pythonText,
  pythonError,
  activeBlockId,
  activeSourceLine,
  isRunning,
  speed,
  dockState,
  onChangeDockState,
  onChangeMainBlocks,
  onChangeFuncBlocks,
  onChangePythonText,
  onRun,
  onStep,
  onReset,
  onClearCode,
  onChangeSpeed,
  onOpenHint,
}: BlockWorkspaceProps) {
  const [activeTab, setActiveTab] = useState<'main' | 'func'>('main');
  const [selectedTarget, setSelectedTarget] = useState<DropTarget>({
    scope: 'main',
    parentId: null,
    branch: 'body',
  });
  const [draggingType, setDraggingType] = useState<BlockType | null>(null);
  const [dragPos, setDragPos] = useState<{ x: number; y: number } | null>(null);
  const [hoverDropKey, setHoverDropKey] = useState<string | null>(null);
  const pointerStartRef = useRef<{ x: number; y: number } | null>(null);
  const textareaRef = useRef<HTMLTextAreaElement | null>(null);

  const codingMode = level.codingMode ?? 'blocks';
  const defaultCond: ConditionType = level.availableConditions?.[0] ?? 'wall_ahead';
  const allowedConditions: ConditionType[] = level.availableConditions ?? [
    'wall_ahead',
    'path_ahead',
    'on_gem',
    'wall_right',
    'wall_left',
  ];

  const totalBlocks = useMemo(
    () => countBlocks(mainBlocks) + (level.allowFunction ? countBlocks(funcBlocks) : 0),
    [mainBlocks, funcBlocks, level.allowFunction]
  );

  const syncedPython = useMemo(
    () => blocksToPython(mainBlocks, level.allowFunction ? funcBlocks : []),
    [mainBlocks, funcBlocks, level.allowFunction]
  );

  const addBlockToTarget = (type: BlockType, target: DropTarget) => {
    const newBlock = createBlock(type, defaultCond);
    soundFX.snap();

    if (target.scope === 'func') {
      onChangeFuncBlocks(insertIntoTree(funcBlocks, target.parentId, target.branch, newBlock));
    } else {
      onChangeMainBlocks(insertIntoTree(mainBlocks, target.parentId, target.branch, newBlock));
    }

    // If user added a container block (repeat/if), auto-focus inside its body for super fast kid workflow
    const def = BLOCK_DEFS[type];
    if (def.hasBody) {
      setSelectedTarget({
        scope: target.scope,
        parentId: newBlock.id,
        branch: 'body',
      });
    }
  };

  // Pointer-based Touch + Mouse Drag from Palette
  const handlePalettePointerDown = (
    e: React.PointerEvent<HTMLButtonElement>,
    type: BlockType
  ) => {
    if (isRunning) return;
    e.currentTarget.setPointerCapture(e.pointerId);
    pointerStartRef.current = { x: e.clientX, y: e.clientY };
    setDraggingType(type);
    setDragPos({ x: e.clientX, y: e.clientY });
  };

  const handlePalettePointerMove = (e: React.PointerEvent<HTMLButtonElement>) => {
    if (!draggingType) return;
    setDragPos({ x: e.clientX, y: e.clientY });
    const el = document.elementFromPoint(e.clientX, e.clientY);
    const dropEl = el?.closest('[data-drop-key]') as HTMLElement | null;
    setHoverDropKey(dropEl?.dataset.dropKey ?? null);
  };

  const handlePalettePointerUp = (
    e: React.PointerEvent<HTMLButtonElement>,
    type: BlockType
  ) => {
    if (!draggingType) return;
    const start = pointerStartRef.current;
    const moved = start ? Math.hypot(e.clientX - start.x, e.clientY - start.y) : 0;

    if (moved < 10) {
      // Quick tap / click -> append to currently selected container
      const scope = level.allowFunction ? activeTab : 'main';
      const target: DropTarget =
        selectedTarget.scope === scope
          ? selectedTarget
          : { scope, parentId: null, branch: 'body' };
      addBlockToTarget(type, target);
    } else {
      // Dropped after drag
      const el = document.elementFromPoint(e.clientX, e.clientY);
      const dropEl = el?.closest('[data-drop-key]') as HTMLElement | null;
      const key = dropEl?.dataset.dropKey;
      if (key) {
        const [scopeRaw, parentRaw, branchRaw] = key.split(':');
        const scope = scopeRaw === 'func' ? 'func' : 'main';
        const parentId = parentRaw === 'root' ? null : parentRaw;
        const branch = branchRaw === 'elseBody' ? 'elseBody' : 'body';
        addBlockToTarget(type, { scope, parentId, branch });
      }
    }

    setDraggingType(null);
    setDragPos(null);
    setHoverDropKey(null);
    pointerStartRef.current = null;
  };

  const handleUpdate = (scope: 'main' | 'func', id: string, patch: Partial<CodeBlock>) => {
    soundFX.click();
    if (scope === 'func') {
      onChangeFuncBlocks(updateBlockInTree(funcBlocks, id, patch));
    } else {
      onChangeMainBlocks(updateBlockInTree(mainBlocks, id, patch));
    }
  };

  const handleDelete = (scope: 'main' | 'func', id: string) => {
    soundFX.delete();
    if (selectedTarget.parentId === id) {
      setSelectedTarget({ scope, parentId: null, branch: 'body' });
    }
    if (scope === 'func') {
      onChangeFuncBlocks(deleteBlockInTree(funcBlocks, id));
    } else {
      onChangeMainBlocks(deleteBlockInTree(mainBlocks, id));
    }
  };

  const handleMove = (scope: 'main' | 'func', id: string, dir: -1 | 1) => {
    soundFX.click();
    if (scope === 'func') {
      onChangeFuncBlocks(moveBlockInTree(funcBlocks, id, dir));
    } else {
      onChangeMainBlocks(moveBlockInTree(mainBlocks, id, dir));
    }
  };

  const insertPythonSnippet = (snippet: string) => {
    soundFX.snap();
    const ta = textareaRef.current;
    if (!ta) {
      onChangePythonText((pythonText ? `${pythonText}\n` : '') + snippet);
      return;
    }
    const start = ta.selectionStart ?? pythonText.length;
    const end = ta.selectionEnd ?? pythonText.length;
    const before = pythonText.slice(0, start);
    const after = pythonText.slice(end);
    const next = `${before}${snippet}${after}`;
    onChangePythonText(next);
    requestAnimationFrame(() => {
      ta.focus();
      const pos = start + snippet.length;
      ta.setSelectionRange(pos, pos);
    });
  };

  const renderBlockList = (
    list: CodeBlock[],
    scope: 'main' | 'func',
    parentId: string | null,
    branch: 'body' | 'elseBody',
    depth = 0
  ) => {
    const dk = `${scope}:${parentId ?? 'root'}:${branch}`;
    const isTargetSelected = targetKey(selectedTarget) === dk;
    const isHovered = hoverDropKey === dk;

    return (
      <div
        data-drop-key={dk}
        onClick={(e) => {
          e.stopPropagation();
          setSelectedTarget({ scope, parentId, branch });
        }}
        className={`rounded-xl p-2 space-y-1.5 transition-colors min-h-[48px] ${
          isHovered
            ? 'bg-sky-500/25 border-2 border-sky-400'
            : isTargetSelected
              ? 'bg-slate-800/75 border-2 border-emerald-400/80'
              : depth === 0
                ? 'bg-slate-950/60 border border-slate-800'
                : 'bg-slate-950/50 border border-slate-700/70'
        }`}
      >
        {list.length === 0 && (
          <div className="text-xs sm:text-sm text-slate-400 py-2 px-2 text-center">
            {isTargetSelected
              ? '여기에 블록을 끌어놓거나 왼쪽 블록을 눌러 추가하세요!'
              : '클릭해서 이 칸 선택 후 블록 추가'}
          </div>
        )}

        {list.map((b, idx) => {
          const def = BLOCK_DEFS[b.type];
          const isActive = activeBlockId === b.id;
          const labelOverride =
            b.type === 'call_func' && level.functionLabel
              ? `${level.functionLabel} 실행`
              : def.label;

          return (
            <div
              key={b.id}
              className={`rounded-xl border text-white transition-transform ${def.bgClass} ${
                isActive
                  ? 'ring-4 ring-yellow-300 border-yellow-200 scale-[1.01] shadow-lg'
                  : `${def.borderClass}/80`
              }`}
            >
              {/* Block header row */}
              <div className="flex flex-wrap items-center justify-between gap-2 px-3 py-2">
                <div className="flex flex-wrap items-center gap-2 font-bold text-sm sm:text-base">
                  <span>{def.emoji}</span>

                  {b.type === 'repeat' && (
                    <>
                      <select
                        disabled={isRunning}
                        value={b.count ?? 3}
                        onClick={(e) => e.stopPropagation()}
                        onChange={(e) =>
                          handleUpdate(scope, b.id, { count: Number(e.target.value) })
                        }
                        className="bg-slate-950/80 text-amber-200 font-extrabold rounded-lg px-2 py-1 border border-amber-300/60 text-sm cursor-pointer tabular-nums"
                      >
                        {Array.from({ length: 18 }, (_, i) => i + 2).map((n) => (
                          <option key={n} value={n}>
                            {n}
                          </option>
                        ))}
                      </select>
                      <span>번 반복하기</span>
                    </>
                  )}

                  {b.type === 'set_var' && (
                    <>
                      <span>열쇠 =</span>
                      <select
                        disabled={isRunning}
                        value={b.count ?? 3}
                        onClick={(e) => e.stopPropagation()}
                        onChange={(e) =>
                          handleUpdate(scope, b.id, { count: Number(e.target.value) })
                        }
                        className="bg-slate-950/80 text-yellow-200 font-extrabold rounded-lg px-2 py-1 border border-rose-300/60 text-sm cursor-pointer tabular-nums"
                      >
                        {Array.from({ length: 10 }, (_, i) => i + 1).map((n) => (
                          <option key={n} value={n}>
                            {n}
                          </option>
                        ))}
                      </select>
                    </>
                  )}

                  {b.type === 'add_var' && (
                    <>
                      <span>열쇠 +</span>
                      <select
                        disabled={isRunning}
                        value={b.count ?? 1}
                        onClick={(e) => e.stopPropagation()}
                        onChange={(e) =>
                          handleUpdate(scope, b.id, { count: Number(e.target.value) })
                        }
                        className="bg-slate-950/80 text-yellow-200 font-extrabold rounded-lg px-2 py-1 border border-pink-300/60 text-sm cursor-pointer tabular-nums"
                      >
                        {Array.from({ length: 9 }, (_, i) => i + 1).map((n) => (
                          <option key={n} value={n}>
                            {n}
                          </option>
                        ))}
                      </select>
                    </>
                  )}

                  {b.type === 'repeat_var' && (
                    <>
                      <select
                        disabled={isRunning}
                        value={b.varName ?? 'gems'}
                        onClick={(e) => e.stopPropagation()}
                        onChange={(e) =>
                          handleUpdate(scope, b.id, { varName: e.target.value as VarName })
                        }
                        className="bg-slate-950/80 text-amber-200 font-extrabold rounded-lg px-2 py-1 border border-amber-300/60 text-sm cursor-pointer"
                      >
                        <option value="gems">{VAR_LABELS.gems.ko}</option>
                        <option value="key">{VAR_LABELS.key.ko}</option>
                      </select>
                      <span>만큼 반복하기</span>
                    </>
                  )}

                  {(b.type === 'if' || b.type === 'if_else') && (
                    <>
                      <span>만약</span>
                      <select
                        disabled={isRunning}
                        value={b.condition ?? defaultCond}
                        onClick={(e) => e.stopPropagation()}
                        onChange={(e) =>
                          handleUpdate(scope, b.id, {
                            condition: e.target.value as ConditionType,
                          })
                        }
                        className="bg-slate-950/80 text-emerald-200 font-extrabold rounded-lg px-2 py-1 border border-emerald-300/60 text-sm cursor-pointer"
                      >
                        {allowedConditions.map((c) => (
                          <option key={c} value={c}>
                            {CONDITION_LABELS[c].ko}
                          </option>
                        ))}
                      </select>
                    </>
                  )}

                  {!['repeat', 'set_var', 'add_var', 'repeat_var', 'if', 'if_else'].includes(
                    b.type
                  ) && <span>{labelOverride}</span>}
                </div>

                {/* Reorder / Delete actions */}
                {!isRunning && (
                  <div className="flex items-center gap-1 shrink-0">
                    <button
                      type="button"
                      disabled={idx === 0}
                      onClick={(e) => {
                        e.stopPropagation();
                        handleMove(scope, b.id, -1);
                      }}
                      aria-label="위로 이동"
                      className="p-1.5 rounded-lg bg-slate-950/40 hover:bg-slate-950/70 disabled:opacity-30 cursor-pointer"
                    >
                      <ArrowUp className="w-3.5 h-3.5" />
                    </button>
                    <button
                      type="button"
                      disabled={idx === list.length - 1}
                      onClick={(e) => {
                        e.stopPropagation();
                        handleMove(scope, b.id, 1);
                      }}
                      aria-label="아래로 이동"
                      className="p-1.5 rounded-lg bg-slate-950/40 hover:bg-slate-950/70 disabled:opacity-30 cursor-pointer"
                    >
                      <ArrowDown className="w-3.5 h-3.5" />
                    </button>
                    <button
                      type="button"
                      onClick={(e) => {
                        e.stopPropagation();
                        handleDelete(scope, b.id);
                      }}
                      aria-label="블록 삭제"
                      className="p-1.5 rounded-lg bg-slate-950/40 hover:bg-rose-600 cursor-pointer"
                    >
                      <X className="w-3.5 h-3.5" />
                    </button>
                  </div>
                )}
              </div>

              {/* Nested Body */}
              {def.hasBody && (
                <div className="pl-4 pr-2 pb-2">
                  {renderBlockList(b.body ?? [], scope, b.id, 'body', depth + 1)}
                </div>
              )}

              {/* Nested Else Body */}
              {def.hasElse && (
                <div className="pl-4 pr-2 pb-2">
                  <div className="text-xs font-extrabold text-teal-100 mb-1 px-1">
                    아니면:
                  </div>
                  {renderBlockList(b.elseBody ?? [], scope, b.id, 'elseBody', depth + 1)}
                </div>
              )}
            </div>
          );
        })}
      </div>
    );
  };

  const dockHeightClass =
    dockState === 'collapsed'
      ? 'h-[56px]'
      : dockState === 'expanded'
        ? 'h-[56vh] min-h-[340px]'
        : 'h-[40vh] min-h-[260px] max-h-[360px]';

  return (
    <div
      className={`w-full shrink-0 bg-slate-900 border-t-2 border-slate-700 flex flex-col transition-all duration-150 ${dockHeightClass}`}
    >
      {/* Unified Control Action Bar */}
      <div className="shrink-0 flex flex-wrap items-center justify-between gap-2 px-3 sm:px-4 py-2 bg-slate-950 border-b border-slate-800">
        {/* Left: Execution Controls */}
        <div className="flex flex-wrap items-center gap-2">
          <button
            type="button"
            onClick={onRun}
            disabled={isRunning}
            className="flex items-center gap-1.5 px-4 py-2 rounded-xl bg-emerald-500 hover:bg-emerald-400 disabled:opacity-50 text-slate-950 font-extrabold text-sm sm:text-base cursor-pointer whitespace-nowrap"
          >
            <Play className="w-4 h-4 fill-slate-950" />
            실행
          </button>

          <button
            type="button"
            onClick={onStep}
            disabled={isRunning}
            className="flex items-center gap-1.5 px-3.5 py-2 rounded-xl bg-sky-500 hover:bg-sky-400 disabled:opacity-50 text-slate-950 font-extrabold text-sm cursor-pointer whitespace-nowrap"
            title="한 줄씩 실행하며 버그를 찾아요"
          >
            <StepForward className="w-4 h-4" />
            한 단계
          </button>

          <button
            type="button"
            onClick={onReset}
            className="flex items-center gap-1.5 px-3 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-100 font-bold text-sm cursor-pointer whitespace-nowrap"
          >
            <RotateCcw className="w-4 h-4" />
            처음부터
          </button>

          {/* Speed selector */}
          <div className="hidden sm:flex items-center bg-slate-900 border border-slate-700 rounded-xl p-0.5 text-xs font-bold">
            {(
              [
                ['slow', '🐢 느리게'],
                ['normal', '🚶 보통'],
                ['fast', '🚀 빠르게'],
              ] as const
            ).map(([val, label]) => (
              <button
                key={val}
                type="button"
                onClick={() => onChangeSpeed(val)}
                className={`px-2.5 py-1.5 rounded-lg transition-colors cursor-pointer whitespace-nowrap ${
                  speed === val
                    ? 'bg-sky-600 text-white'
                    : 'text-slate-400 hover:text-slate-200'
                }`}
              >
                {label}
              </button>
            ))}
          </div>
        </div>

        {/* Right: Block Count, Hint, Clear, Collapse */}
        <div className="flex items-center gap-2">
          {codingMode !== 'text' && (
            <div className="text-xs sm:text-sm font-bold text-slate-300 tabular-nums px-2">
              블록{' '}
              <span
                className={
                  totalBlocks > 0 && totalBlocks <= level.optimalBlocks
                    ? 'text-emerald-400'
                    : 'text-amber-300'
                }
              >
                {totalBlocks}
              </span>
              <span className="text-slate-500"> / 목표 {level.optimalBlocks}</span>
            </div>
          )}

          <button
            type="button"
            onClick={onOpenHint}
            className="flex items-center gap-1 px-3 py-2 rounded-xl bg-amber-500/20 hover:bg-amber-500/30 border border-amber-400/50 text-amber-200 font-bold text-sm cursor-pointer whitespace-nowrap"
          >
            <Lightbulb className="w-4 h-4 text-amber-300" />
            힌트
          </button>

          <button
            type="button"
            disabled={isRunning}
            onClick={onClearCode}
            aria-label="코드 지우기"
            className="p-2 rounded-xl bg-slate-800 hover:bg-rose-700 disabled:opacity-40 text-slate-200 cursor-pointer"
            title="코드 전체 비우기"
          >
            <Trash2 className="w-4 h-4" />
          </button>

          <button
            type="button"
            onClick={() =>
              onChangeDockState(
                dockState === 'collapsed'
                  ? 'normal'
                  : dockState === 'normal'
                    ? 'expanded'
                    : 'collapsed'
              )
            }
            className="flex items-center gap-1 px-2.5 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs font-bold cursor-pointer whitespace-nowrap"
          >
            {dockState === 'collapsed' ? (
              <>
                <ChevronUp className="w-4 h-4" /> 코드 열기
              </>
            ) : dockState === 'normal' ? (
              <>
                <ChevronUp className="w-4 h-4" /> 크게
              </>
            ) : (
              <>
                <ChevronDown className="w-4 h-4" /> 3D 크게
              </>
            )}
          </button>
        </div>
      </div>

      {/* Main Coding Area */}
      {dockState !== 'collapsed' && (
        <div className="flex-1 min-h-0 flex overflow-hidden">
          {codingMode === 'text' ? (
            /* Chapter 8 Stages 3-4: Direct Python Text Coding Editor */
            <div className="flex-1 flex flex-col md:flex-row min-h-0 overflow-hidden">
              {/* Quick-Insert Command Buttons */}
              <div className="md:w-64 shrink-0 bg-slate-950/70 border-b md:border-b-0 md:border-r border-slate-800 p-3 overflow-y-auto code-scroll">
                <div className="text-xs font-bold text-slate-400 mb-2">
                  눌러서 파이썬 명령어 넣기
                </div>
                <div className="flex flex-wrap md:flex-col gap-1.5">
                  {[
                    { code: 'forward()\n', desc: '앞으로 가기' },
                    { code: 'turn_left()\n', desc: '왼쪽 돌기' },
                    { code: 'turn_right()\n', desc: '오른쪽 돌기' },
                    { code: 'collect()\n', desc: '보석 줍기' },
                    { code: 'for i in range(3):\n    ', desc: '3번 반복' },
                    { code: 'while not at_goal():\n    ', desc: '깃발까지 반복' },
                    { code: 'if wall_ahead():\n    ', desc: '만약 앞에 벽' },
                    { code: 'if on_gem():\n    ', desc: '만약 보석 위' },
                    { code: 'else:\n    ', desc: '아니면' },
                    { code: '    ', desc: '들여쓰기 (4칸)' },
                  ].map((item) => (
                    <button
                      key={item.desc}
                      type="button"
                      disabled={isRunning}
                      onClick={() => insertPythonSnippet(item.code)}
                      className="text-left px-2.5 py-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 border border-slate-700 text-xs flex items-center justify-between gap-2 cursor-pointer"
                    >
                      <span className="font-code text-sky-300 font-bold truncate">
                        {item.code.trim() || '␣␣␣␣'}
                      </span>
                      <span className="text-slate-400 shrink-0">{item.desc}</span>
                    </button>
                  ))}
                </div>
              </div>

              {/* Text Editor with Line Numbers & Active Line Indicator */}
              <div className="flex-1 flex flex-col min-h-0 p-3 bg-slate-950/40">
                {pythonError && (
                  <div className="mb-2 px-3 py-2 rounded-xl bg-rose-950 border border-rose-500/70 text-rose-200 text-sm font-bold">
                    ⚠️ {pythonError}
                  </div>
                )}
                <div className="flex-1 min-h-0 flex rounded-xl border border-slate-700 bg-slate-950 overflow-hidden">
                  {/* Line number gutter */}
                  <div className="w-10 shrink-0 bg-slate-900 border-r border-slate-800 py-3 text-right pr-2 font-code text-sm select-none overflow-hidden">
                    {pythonText.split('\n').map((_, idx) => {
                      const ln = idx + 1;
                      const isLineActive = activeSourceLine === ln;
                      return (
                        <div
                          key={ln}
                          className={`leading-6 tabular-nums ${
                            isLineActive
                              ? 'bg-yellow-400 text-slate-950 font-extrabold px-1 rounded'
                              : 'text-slate-500'
                          }`}
                        >
                          {ln}
                        </div>
                      );
                    })}
                  </div>
                  <textarea
                    ref={textareaRef}
                    value={pythonText}
                    disabled={isRunning}
                    spellCheck={false}
                    onChange={(e) => onChangePythonText(e.target.value)}
                    onKeyDown={(e) => {
                      if (e.key === 'Tab') {
                        e.preventDefault();
                        insertPythonSnippet('    ');
                      }
                    }}
                    className="flex-1 bg-transparent text-sky-100 font-code text-sm sm:text-base leading-6 p-3 resize-none focus:outline-none code-scroll"
                    placeholder="여기에 파이썬 코드를 써 보세요! 예: forward()"
                  />
                </div>
              </div>
            </div>
          ) : (
            /* Block Coding Mode (and Dual Mode with live Python preview) */
            <>
              {/* Left: Palette */}
              <div className="w-44 sm:w-56 shrink-0 bg-slate-950/70 border-r border-slate-800 p-2.5 overflow-y-auto code-scroll">
                <div className="text-xs font-bold text-slate-400 mb-2 px-1">
                  명령 블록 (끌거나 눌러요)
                </div>
                <div className="space-y-2">
                  {level.availableBlocks.map((type) => {
                    const def = BLOCK_DEFS[type];
                    const displayLabel =
                      type === 'call_func' && level.functionLabel
                        ? `${level.functionLabel}`
                        : def.shortLabel;
                    return (
                      <button
                        key={type}
                        type="button"
                        disabled={isRunning}
                        onPointerDown={(e) => handlePalettePointerDown(e, type)}
                        onPointerMove={handlePalettePointerMove}
                        onPointerUp={(e) => handlePalettePointerUp(e, type)}
                        title={def.description}
                        style={{ touchAction: 'none' }}
                        className={`w-full flex items-center gap-2 px-3 py-2.5 rounded-xl border text-left text-sm sm:text-base font-extrabold text-white shadow-sm hover:brightness-110 active:scale-[0.98] disabled:opacity-50 transition-all cursor-grab active:cursor-grabbing ${def.bgClass} ${def.borderClass}/80`}
                      >
                        <span className="text-base shrink-0">{def.emoji}</span>
                        <span className="truncate">{displayLabel}</span>
                      </button>
                    );
                  })}
                </div>
              </div>

              {/* Center: Workspace */}
              <div className="flex-1 min-w-0 flex flex-col overflow-hidden">
                {/* Function Tab Switcher (Ch. 6) */}
                {level.allowFunction && (
                  <div className="shrink-0 flex items-center gap-2 px-3 pt-2 bg-slate-900">
                    <button
                      type="button"
                      onClick={() => {
                        setActiveTab('main');
                        setSelectedTarget({ scope: 'main', parentId: null, branch: 'body' });
                      }}
                      className={`px-4 py-1.5 rounded-t-xl text-sm font-extrabold border-t border-x cursor-pointer ${
                        activeTab === 'main'
                          ? 'bg-slate-950 text-emerald-300 border-slate-700'
                          : 'bg-slate-800/60 text-slate-400 border-transparent hover:text-slate-200'
                      }`}
                    >
                      📋 메인 코드 ({countBlocks(mainBlocks)})
                    </button>
                    <button
                      type="button"
                      onClick={() => {
                        setActiveTab('func');
                        setSelectedTarget({ scope: 'func', parentId: null, branch: 'body' });
                      }}
                      className={`px-4 py-1.5 rounded-t-xl text-sm font-extrabold border-t border-x cursor-pointer ${
                        activeTab === 'func'
                          ? 'bg-slate-950 text-purple-300 border-slate-700'
                          : 'bg-slate-800/60 text-slate-400 border-transparent hover:text-slate-200'
                      }`}
                    >
                      🧩 {level.functionLabel ?? '내 명령'} 만들기 ({countBlocks(funcBlocks)})
                    </button>
                  </div>
                )}

                <div className="flex-1 min-h-0 overflow-y-auto code-scroll p-3">
                  {level.allowFunction && activeTab === 'func'
                    ? renderBlockList(funcBlocks, 'func', null, 'body', 0)
                    : renderBlockList(mainBlocks, 'main', null, 'body', 0)}
                </div>
              </div>

              {/* Right: Live Python Preview in Dual Mode (Ch. 8 stages 1-2) */}
              {codingMode === 'dual' && (
                <div className="hidden md:flex w-72 lg:w-80 shrink-0 flex-col bg-slate-950 border-l border-slate-800 p-3 overflow-hidden">
                  <div className="text-xs font-extrabold text-sky-300 mb-2 flex items-center justify-between">
                    <span>🐍 실시간 파이썬(Python) 코드</span>
                    <span className="text-slate-500">자동 변환</span>
                  </div>
                  <div className="flex-1 overflow-y-auto code-scroll bg-slate-900/90 border border-slate-800 rounded-xl p-2.5 font-code text-xs sm:text-sm">
                    {syncedPython.code ? (
                      syncedPython.code.split('\n').map((line, i) => {
                        const ln = i + 1;
                        const isActive = activeSourceLine === ln;
                        return (
                          <div
                            key={ln}
                            className={`flex gap-2 px-1.5 py-0.5 rounded ${
                              isActive
                                ? 'bg-yellow-400/25 text-yellow-200 font-bold'
                                : 'text-sky-100'
                            }`}
                          >
                            <span className="w-5 text-right text-slate-500 select-none tabular-nums">
                              {ln}
                            </span>
                            <span className="whitespace-pre">{line}</span>
                          </div>
                        );
                      })
                    ) : (
                      <div className="text-slate-500 p-2">
                        # 왼쪽에서 블록을 추가하면
                        <br /># 파이썬 코드가 여기에 나타나요!
                      </div>
                    )}
                  </div>
                </div>
              )}
            </>
          )}
        </div>
      )}

      {/* Floating Drag Ghost for Touch & Mouse */}
      {draggingType && dragPos && (
        <div
          className={`fixed z-50 pointer-events-none px-4 py-2.5 rounded-xl border-2 text-white font-extrabold text-sm shadow-2xl ${BLOCK_DEFS[draggingType].bgClass} ${BLOCK_DEFS[draggingType].borderClass}`}
          style={{
            left: dragPos.x + 12,
            top: dragPos.y - 20,
          }}
        >
          {BLOCK_DEFS[draggingType].emoji} {BLOCK_DEFS[draggingType].shortLabel}
        </div>
      )}
    </div>
  );
}
