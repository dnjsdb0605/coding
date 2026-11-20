import { BlockType, CodeBlock, ConditionType, VarName } from './types';

export interface BlockDefinition {
  type: BlockType;
  label: string;
  shortLabel: string;
  emoji: string;
  category: 'move' | 'loop' | 'cond' | 'func' | 'var';
  bgClass: string;
  borderClass: string;
  hasBody?: boolean;
  hasElse?: boolean;
  hasCount?: boolean;
  defaultCount?: number;
  hasCondition?: boolean;
  hasVarName?: boolean;
  description: string;
}

export const BLOCK_DEFS: Record<BlockType, BlockDefinition> = {
  forward: {
    type: 'forward',
    label: '앞으로 가기',
    shortLabel: '앞으로',
    emoji: '⬆️',
    category: 'move',
    bgClass: 'bg-sky-600',
    borderClass: 'border-sky-400',
    description: '로봇이 바라보는 방향으로 한 칸 앞으로 이동해요.',
  },
  turn_left: {
    type: 'turn_left',
    label: '왼쪽으로 돌기',
    shortLabel: '왼쪽 돌기',
    emoji: '↩️',
    category: 'move',
    bgClass: 'bg-blue-600',
    borderClass: 'border-blue-400',
    description: '제자리에서 왼쪽으로 90도 돌아요.',
  },
  turn_right: {
    type: 'turn_right',
    label: '오른쪽으로 돌기',
    shortLabel: '오른쪽 돌기',
    emoji: '↪️',
    category: 'move',
    bgClass: 'bg-indigo-600',
    borderClass: 'border-indigo-400',
    description: '제자리에서 오른쪽으로 90도 돌아요.',
  },
  collect: {
    type: 'collect',
    label: '보석 줍기',
    shortLabel: '보석 줍기',
    emoji: '💎',
    category: 'move',
    bgClass: 'bg-cyan-600',
    borderClass: 'border-cyan-400',
    description: '현재 서 있는 칸의 보석을 주워요.',
  },
  repeat: {
    type: 'repeat',
    label: '번 반복하기',
    shortLabel: '반복하기',
    emoji: '🔁',
    category: 'loop',
    bgClass: 'bg-amber-600',
    borderClass: 'border-amber-400',
    hasBody: true,
    hasCount: true,
    defaultCount: 3,
    description: '안에 넣은 블록을 정한 횟수만큼 반복해요.',
  },
  repeat_until_goal: {
    type: 'repeat_until_goal',
    label: '깃발에 도착할 때까지 반복',
    shortLabel: '깃발까지 반복',
    emoji: '🏁',
    category: 'loop',
    bgClass: 'bg-orange-600',
    borderClass: 'border-orange-400',
    hasBody: true,
    description: '깃발 칸에 도착할 때까지 안의 명령을 계속 반복해요.',
  },
  if: {
    type: 'if',
    label: '만약',
    shortLabel: '만약 ~이면',
    emoji: '❓',
    category: 'cond',
    bgClass: 'bg-emerald-600',
    borderClass: 'border-emerald-400',
    hasBody: true,
    hasCondition: true,
    description: '조건이 맞을 때만 안의 명령을 실행해요.',
  },
  if_else: {
    type: 'if_else',
    label: '만약 / 아니면',
    shortLabel: '만약 / 아니면',
    emoji: '🔀',
    category: 'cond',
    bgClass: 'bg-teal-600',
    borderClass: 'border-teal-400',
    hasBody: true,
    hasElse: true,
    hasCondition: true,
    description: '조건이 맞으면 위쪽, 아니면 아래쪽 명령을 실행해요.',
  },
  call_func: {
    type: 'call_func',
    label: '내 명령 실행',
    shortLabel: '내 명령',
    emoji: '🧩',
    category: 'func',
    bgClass: 'bg-purple-600',
    borderClass: 'border-purple-400',
    description: '미리 만들어 둔 나만의 명령(함수)을 한 번에 실행해요.',
  },
  set_var: {
    type: 'set_var',
    label: '열쇠 값 정하기',
    shortLabel: '열쇠 = N',
    emoji: '🔑',
    category: 'var',
    bgClass: 'bg-rose-600',
    borderClass: 'border-rose-400',
    hasCount: true,
    defaultCount: 3,
    description: '열쇠 변수에 숫자를 저장해요.',
  },
  add_var: {
    type: 'add_var',
    label: '열쇠에 더하기',
    shortLabel: '열쇠 + N',
    emoji: '➕',
    category: 'var',
    bgClass: 'bg-pink-600',
    borderClass: 'border-pink-400',
    hasCount: true,
    defaultCount: 1,
    description: '현재 열쇠 숫자에 값을 더해요.',
  },
  count_gem: {
    type: 'count_gem',
    label: '보석수 + 1 기록',
    shortLabel: '보석수 + 1',
    emoji: '🔢',
    category: 'var',
    bgClass: 'bg-fuchsia-600',
    borderClass: 'border-fuchsia-400',
    description: '보석수 변수의 숫자를 1 늘려요.',
  },
  unlock: {
    type: 'unlock',
    label: '문 열기',
    shortLabel: '문 열기',
    emoji: '🔓',
    category: 'var',
    bgClass: 'bg-rose-700',
    borderClass: 'border-rose-400',
    description: '앞에 있는 잠긴 문을 열쇠 또는 보석수 값으로 열어요.',
  },
  repeat_var: {
    type: 'repeat_var',
    label: '값만큼 반복하기',
    shortLabel: '변수번 반복',
    emoji: '🔁',
    category: 'var',
    bgClass: 'bg-amber-700',
    borderClass: 'border-amber-400',
    hasBody: true,
    hasVarName: true,
    description: '변수(열쇠 또는 보석수)에 저장된 숫자만큼 반복해요.',
  },
};

export const CONDITION_LABELS: Record<ConditionType, { ko: string; py: string }> = {
  wall_ahead: { ko: '앞에 벽이 있으면', py: 'wall_ahead()' },
  path_ahead: { ko: '앞이 열려 있으면', py: 'path_ahead()' },
  on_gem: { ko: '보석 위에 있으면', py: 'on_gem()' },
  wall_right: { ko: '오른쪽에 벽이 있으면', py: 'wall_right()' },
  wall_left: { ko: '왼쪽에 벽이 있으면', py: 'wall_left()' },
};

export const VAR_LABELS: Record<VarName, { ko: string; py: string }> = {
  key: { ko: '열쇠', py: 'key' },
  gems: { ko: '보석수', py: 'gems' },
};

let idCounter = 1;
export function genBlockId(prefix = 'blk'): string {
  idCounter += 1;
  return `${prefix}_${idCounter}_${Math.random().toString(36).slice(2, 6)}`;
}

export function createBlock(
  type: BlockType,
  defaultCondition: ConditionType = 'wall_ahead'
): CodeBlock {
  const def = BLOCK_DEFS[type];
  const block: CodeBlock = {
    id: genBlockId(),
    type,
  };
  if (def.hasCount) {
    block.count = def.defaultCount ?? 2;
  }
  if (def.hasCondition) {
    block.condition = defaultCondition;
  }
  if (def.hasVarName) {
    block.varName = 'key';
  }
  if (def.hasBody) {
    block.body = [];
  }
  if (def.hasElse) {
    block.elseBody = [];
  }
  return block;
}

export function hydrateBlocks(
  raw: Omit<CodeBlock, 'id'>[] | undefined
): CodeBlock[] {
  if (!raw) return [];
  return raw.map((item) => ({
    ...item,
    id: genBlockId(),
    body: item.body ? hydrateBlocks(item.body) : undefined,
    elseBody: item.elseBody ? hydrateBlocks(item.elseBody) : undefined,
  }));
}

export function countBlocks(blocks: CodeBlock[]): number {
  let total = 0;
  for (const b of blocks) {
    total += 1;
    if (b.body) total += countBlocks(b.body);
    if (b.elseBody) total += countBlocks(b.elseBody);
  }
  return total;
}

export function blocksToPython(
  mainBlocks: CodeBlock[],
  funcBlocks: CodeBlock[] = []
): { code: string; blockLineMap: Record<string, number> } {
  const lines: string[] = [];
  const blockLineMap: Record<string, number> = {};

  const emit = (list: CodeBlock[], indent: number) => {
    const pad = '    '.repeat(indent);
    if (list.length === 0 && indent > 0) {
      lines.push(`${pad}pass`);
      return;
    }
    for (const b of list) {
      const lineNo = lines.length + 1;
      blockLineMap[b.id] = lineNo;
      switch (b.type) {
        case 'forward':
          lines.push(`${pad}forward()`);
          break;
        case 'turn_left':
          lines.push(`${pad}turn_left()`);
          break;
        case 'turn_right':
          lines.push(`${pad}turn_right()`);
          break;
        case 'collect':
          lines.push(`${pad}collect()`);
          break;
        case 'call_func':
          lines.push(`${pad}my_func()`);
          break;
        case 'set_var':
          lines.push(`${pad}key = ${b.count ?? 1}`);
          break;
        case 'add_var':
          lines.push(`${pad}key += ${b.count ?? 1}`);
          break;
        case 'count_gem':
          lines.push(`${pad}gems += 1`);
          break;
        case 'unlock':
          lines.push(`${pad}unlock()`);
          break;
        case 'repeat':
          lines.push(`${pad}for i in range(${b.count ?? 2}):`);
          emit(b.body ?? [], indent + 1);
          break;
        case 'repeat_var':
          lines.push(`${pad}for i in range(${b.varName ?? 'key'}):`);
          emit(b.body ?? [], indent + 1);
          break;
        case 'repeat_until_goal':
          lines.push(`${pad}while not at_goal():`);
          emit(b.body ?? [], indent + 1);
          break;
        case 'if': {
          const cond = CONDITION_LABELS[b.condition ?? 'wall_ahead'].py;
          lines.push(`${pad}if ${cond}:`);
          emit(b.body ?? [], indent + 1);
          break;
        }
        case 'if_else': {
          const cond = CONDITION_LABELS[b.condition ?? 'wall_ahead'].py;
          lines.push(`${pad}if ${cond}:`);
          emit(b.body ?? [], indent + 1);
          lines.push(`${pad}else:`);
          emit(b.elseBody ?? [], indent + 1);
          break;
        }
      }
    }
  };

  if (funcBlocks.length > 0) {
    lines.push('def my_func():');
    emit(funcBlocks, 1);
    lines.push('');
  }
  emit(mainBlocks, 0);

  return { code: lines.join('\n'), blockLineMap };
}
