import { CodeBlock, ConditionType, Dir, DoorSpec, LevelData, TraceStep } from './types';

export const DIR_DELTA: Record<Dir, { dx: number; dy: number }> = {
  N: { dx: 0, dy: -1 },
  E: { dx: 1, dy: 0 },
  S: { dx: 0, dy: 1 },
  W: { dx: -1, dy: 0 },
};

const LEFT_TURN: Record<Dir, Dir> = { N: 'W', W: 'S', S: 'E', E: 'N' };
const RIGHT_TURN: Record<Dir, Dir> = { N: 'E', E: 'S', S: 'W', W: 'N' };

export function posKey(x: number, y: number): string {
  return `${x},${y}`;
}

export interface ExecutionResult {
  steps: TraceStep[];
  won: boolean;
  failReason?: string;
  collectedGemsCount: number;
  totalGemsCount: number;
  collectedBonusCount: number;
  totalBonusCount: number;
  finalX: number;
  finalY: number;
  finalDir: Dir;
}

const MAX_STEPS = 220;

export function simulateProgram(
  level: LevelData,
  mainBlocks: CodeBlock[],
  funcBlocks: CodeBlock[] = [],
  blockLineMap: Record<string, number> = {}
): ExecutionResult {
  let x = level.start.x;
  let y = level.start.y;
  let dir: Dir = level.start.dir;

  const wallSet = new Set(level.walls.map((w) => posKey(w.x, w.y)));
  const gemSet = new Set(level.gems.map((g) => posKey(g.x, g.y)));
  const bonusSet = new Set(level.bonusGems.map((g) => posKey(g.x, g.y)));
  const doorMap = new Map<string, DoorSpec>();
  for (const d of level.doors ?? []) {
    doorMap.set(posKey(d.x, d.y), d);
  }

  const collectedGems = new Set<string>();
  const collectedBonus = new Set<string>();
  const openedDoors = new Set<string>();
  const variables = { key: 0, gems: 0 };

  const steps: TraceStep[] = [];
  let halted = false;
  let won = false;
  let failReason: string | undefined;

  // Check if starting on a bonus gem (rare, safe check)
  const startKey = posKey(x, y);
  if (bonusSet.has(startKey)) {
    collectedBonus.add(startKey);
  }

  const isInside = (tx: number, ty: number) =>
    tx >= 0 && tx < level.width && ty >= 0 && ty < level.height;

  const isBlocked = (tx: number, ty: number) => {
    if (!isInside(tx, ty)) return true;
    const k = posKey(tx, ty);
    if (wallSet.has(k)) return true;
    if (doorMap.has(k) && !openedDoors.has(k)) return true;
    return false;
  };

  const evalCondition = (cond: ConditionType): boolean => {
    switch (cond) {
      case 'wall_ahead': {
        const d = DIR_DELTA[dir];
        return isBlocked(x + d.dx, y + d.dy);
      }
      case 'path_ahead': {
        const d = DIR_DELTA[dir];
        return !isBlocked(x + d.dx, y + d.dy);
      }
      case 'on_gem': {
        const k = posKey(x, y);
        return gemSet.has(k) && !collectedGems.has(k);
      }
      case 'wall_right': {
        const rd = DIR_DELTA[RIGHT_TURN[dir]];
        return isBlocked(x + rd.dx, y + rd.dy);
      }
      case 'wall_left': {
        const ld = DIR_DELTA[LEFT_TURN[dir]];
        return isBlocked(x + ld.dx, y + ld.dy);
      }
    }
  };

  const pushStep = (
    block: CodeBlock,
    partial: Omit<
      TraceStep,
      | 'stepIndex'
      | 'blockId'
      | 'sourceLine'
      | 'collectedGems'
      | 'collectedBonus'
      | 'openedDoors'
      | 'variables'
    >
  ) => {
    steps.push({
      stepIndex: steps.length,
      blockId: block.id,
      sourceLine: block.sourceLine ?? blockLineMap[block.id],
      collectedGems: Array.from(collectedGems),
      collectedBonus: Array.from(collectedBonus),
      openedDoors: Array.from(openedDoors),
      variables: { ...variables },
      ...partial,
    });
  };

  const checkStepLimit = (block: CodeBlock): boolean => {
    if (steps.length >= MAX_STEPS) {
      halted = true;
      failReason =
        '로봇이 너무 오래 같은 동작을 반복하고 있어요! (무한 반복) 조건이나 방향을 다시 확인해 볼까요?';
      pushStep(block, {
        action: 'infinite_loop',
        fromX: x,
        fromY: y,
        fromDir: dir,
        toX: x,
        toY: y,
        toDir: dir,
        status: 'failed',
        failReason,
        message: '무한 반복 멈춤!',
      });
      return true;
    }
    return false;
  };

  const execList = (list: CodeBlock[], callDepth = 0) => {
    if (callDepth > 12) {
      halted = true;
      failReason = '함수가 자기 자신을 너무 많이 불렀어요!';
      return;
    }

    for (const block of list) {
      if (halted) return;
      if (checkStepLimit(block)) return;

      switch (block.type) {
        case 'forward': {
          const d = DIR_DELTA[dir];
          const nx = x + d.dx;
          const ny = y + d.dy;
          const nk = posKey(nx, ny);

          if (!isInside(nx, ny)) {
            halted = true;
            failReason = `(${x + 1}, ${y + 1}) 칸에서 맵 밖으로 떨어질 뻔했어요! 더 가기 전에 방향을 돌려 볼까요?`;
            pushStep(block, {
              action: 'out_of_bounds',
              fromX: x,
              fromY: y,
              fromDir: dir,
              toX: x,
              toY: y,
              toDir: dir,
              status: 'failed',
              failReason,
              message: '맵 끝이에요!',
            });
            return;
          }

          if (doorMap.has(nk) && !openedDoors.has(nk)) {
            const door = doorMap.get(nk)!;
            halted = true;
            const reqText =
              door.requiredKey !== undefined
                ? `열쇠 ${door.requiredKey}번`
                : `보석수 ${door.requiredGems}개`;
            failReason = `(${nx + 1}, ${ny + 1}) 칸에 잠긴 문이 막고 있어요! 먼저 ${reqText}에 맞춰 [문 열기] 블록을 실행해 보세요.`;
            pushStep(block, {
              action: 'door_locked',
              fromX: x,
              fromY: y,
              fromDir: dir,
              toX: x,
              toY: y,
              toDir: dir,
              status: 'failed',
              failReason,
              message: '문이 잠겨 있어요!',
            });
            return;
          }

          if (wallSet.has(nk)) {
            halted = true;
            failReason = `(${nx + 1}, ${ny + 1}) 칸에 장애물이 있어서 앞으로 갈 수 없어요! 옆으로 돌아가 볼까요?`;
            pushStep(block, {
              action: 'bump_wall',
              fromX: x,
              fromY: y,
              fromDir: dir,
              toX: x,
              toY: y,
              toDir: dir,
              status: 'failed',
              failReason,
              message: '앗! 벽에 부딪혔어요',
            });
            return;
          }

          const fromX = x;
          const fromY = y;
          x = nx;
          y = ny;
          let justCollectedBonus: string | undefined;
          if (bonusSet.has(nk) && !collectedBonus.has(nk)) {
            collectedBonus.add(nk);
            justCollectedBonus = nk;
          }
          pushStep(block, {
            action: 'move',
            fromX,
            fromY,
            fromDir: dir,
            toX: x,
            toY: y,
            toDir: dir,
            status: 'running',
            justCollectedBonus,
            message: justCollectedBonus ? '🌟 보너스 보석 획득!' : '앞으로 한 칸!',
          });
          break;
        }

        case 'turn_left': {
          const fromDir = dir;
          dir = LEFT_TURN[dir];
          pushStep(block, {
            action: 'turn_left',
            fromX: x,
            fromY: y,
            fromDir,
            toX: x,
            toY: y,
            toDir: dir,
            status: 'running',
            message: '왼쪽으로 돌기',
          });
          break;
        }

        case 'turn_right': {
          const fromDir = dir;
          dir = RIGHT_TURN[dir];
          pushStep(block, {
            action: 'turn_right',
            fromX: x,
            fromY: y,
            fromDir,
            toX: x,
            toY: y,
            toDir: dir,
            status: 'running',
            message: '오른쪽으로 돌기',
          });
          break;
        }

        case 'collect': {
          const k = posKey(x, y);
          if (gemSet.has(k) && !collectedGems.has(k)) {
            collectedGems.add(k);
            pushStep(block, {
              action: 'collect',
              fromX: x,
              fromY: y,
              fromDir: dir,
              toX: x,
              toY: y,
              toDir: dir,
              status: 'running',
              justCollectedGem: k,
              message: '💎 보석을 주웠어요!',
            });
          } else if (bonusSet.has(k) && !collectedBonus.has(k)) {
            collectedBonus.add(k);
            pushStep(block, {
              action: 'collect',
              fromX: x,
              fromY: y,
              fromDir: dir,
              toX: x,
              toY: y,
              toDir: dir,
              status: 'running',
              justCollectedBonus: k,
              message: '🌟 보너스 보석을 주웠어요!',
            });
          } else {
            // Gentle notice without hard-crashing if kid tried collect on empty tile?
            // Actually, failing on empty tile teaches precision, OR gentle feedback.
            // Let's check: in Ch. 1~3, calling collect where there's no gem is a common bug in debugging stages!
            // Wait: if it's harmless vs failing — wait, in Ch. 3 debugging, calling collect on empty tile might be fine if they didn't pick up the actual gem, OR failing explains why immediately. Let's make it show a gentle message and continue so kids don't get frustrated if they call collect inside a repeat loop unless they want `if on_gem():`!
            // WAIT: In Ch. 4 (`if on_gem():`), if `collect` didn't fail on empty tiles, kids could just put `collect` everywhere without `if on_gem()`.
            // Making `collect` warn/stop when there's NO gem on the tile teaches `if on_gem():` properly!
            halted = true;
            failReason = `(${x + 1}, ${y + 1}) 칸에는 주울 보석이 없어요! 보석이 있는 칸에서만 [보석 줍기]를 쓰거나, [만약 보석 위에 있으면] 블록을 사용해 보세요.`;
            pushStep(block, {
              action: 'no_gem',
              fromX: x,
              fromY: y,
              fromDir: dir,
              toX: x,
              toY: y,
              toDir: dir,
              status: 'failed',
              failReason,
              message: '여기에 보석이 없어요!',
            });
            return;
          }
          break;
        }

        case 'set_var': {
          variables.key = block.count ?? 0;
          pushStep(block, {
            action: 'set_var',
            fromX: x,
            fromY: y,
            fromDir: dir,
            toX: x,
            toY: y,
            toDir: dir,
            status: 'running',
            message: `🔑 열쇠 = ${variables.key}`,
          });
          break;
        }

        case 'add_var': {
          variables.key += block.count ?? 1;
          pushStep(block, {
            action: 'add_var',
            fromX: x,
            fromY: y,
            fromDir: dir,
            toX: x,
            toY: y,
            toDir: dir,
            status: 'running',
            message: `🔑 열쇠가 ${variables.key}이 되었어요!`,
          });
          break;
        }

        case 'count_gem': {
          variables.gems += 1;
          pushStep(block, {
            action: 'count_gem',
            fromX: x,
            fromY: y,
            fromDir: dir,
            toX: x,
            toY: y,
            toDir: dir,
            status: 'running',
            message: `🔢 보석수 = ${variables.gems}`,
          });
          break;
        }

        case 'unlock': {
          const d = DIR_DELTA[dir];
          const nx = x + d.dx;
          const ny = y + d.dy;
          const nk = posKey(nx, ny);
          const door = doorMap.get(nk);

          if (!door || openedDoors.has(nk)) {
            halted = true;
            failReason = `(${x + 1}, ${y + 1}) 칸 바로 앞에 잠긴 문이 없어요! 문 바로 앞에서 [문 열기]를 사용해 보세요.`;
            pushStep(block, {
              action: 'door_locked',
              fromX: x,
              fromY: y,
              fromDir: dir,
              toX: x,
              toY: y,
              toDir: dir,
              status: 'failed',
              failReason,
              message: '앞에 문이 없어요!',
            });
            return;
          }

          if (door.requiredKey !== undefined && variables.key !== door.requiredKey) {
            halted = true;
            failReason = `문 번호는 ${door.requiredKey}번인데, 지금 열쇠는 ${variables.key}번이에요! 열쇠 값을 ${door.requiredKey}에 맞춰 보세요.`;
            pushStep(block, {
              action: 'door_locked',
              fromX: x,
              fromY: y,
              fromDir: dir,
              toX: x,
              toY: y,
              toDir: dir,
              status: 'failed',
              failReason,
              message: `열쇠 번호가 달라요! (${variables.key} ≠ ${door.requiredKey})`,
            });
            return;
          }

          if (door.requiredGems !== undefined && variables.gems !== door.requiredGems) {
            halted = true;
            failReason = `이 문은 보석수가 ${door.requiredGems}일 때 열려요! 지금 보석수 변수는 ${variables.gems}이에요.`;
            pushStep(block, {
              action: 'door_locked',
              fromX: x,
              fromY: y,
              fromDir: dir,
              toX: x,
              toY: y,
              toDir: dir,
              status: 'failed',
              failReason,
              message: `보석수가 달라요! (${variables.gems} ≠ ${door.requiredGems})`,
            });
            return;
          }

          openedDoors.add(nk);
          pushStep(block, {
            action: 'unlock',
            fromX: x,
            fromY: y,
            fromDir: dir,
            toX: x,
            toY: y,
            toDir: dir,
            status: 'running',
            justOpenedDoor: nk,
            message: '🔓 철컥! 문이 열렸어요!',
          });
          break;
        }

        case 'repeat': {
          const times = Math.max(0, Math.min(20, block.count ?? 2));
          for (let i = 0; i < times; i++) {
            if (halted) return;
            execList(block.body ?? [], callDepth);
          }
          break;
        }

        case 'repeat_var': {
          const times = Math.max(
            0,
            Math.min(20, block.varName === 'gems' ? variables.gems : variables.key)
          );
          for (let i = 0; i < times; i++) {
            if (halted) return;
            execList(block.body ?? [], callDepth);
          }
          break;
        }

        case 'repeat_until_goal': {
          let guard = 0;
          while (!(x === level.goal.x && y === level.goal.y)) {
            if (halted) return;
            if (++guard > 120 || checkStepLimit(block)) {
              if (!halted) {
                halted = true;
                failReason =
                  '깃발에 도착하지 못하고 계속 반복하고 있어요! (무한 반복) 안에서 로봇이 깃발 쪽으로 가는지 확인해 보세요.';
                pushStep(block, {
                  action: 'infinite_loop',
                  fromX: x,
                  fromY: y,
                  fromDir: dir,
                  toX: x,
                  toY: y,
                  toDir: dir,
                  status: 'failed',
                  failReason,
                  message: '무한 반복 멈춤!',
                });
              }
              return;
            }
            const beforeLen = steps.length;
            execList(block.body ?? [], callDepth);
            if (steps.length === beforeLen && !halted) {
              halted = true;
              failReason = '[깃발까지 반복] 블록 안에 실행할 명령이 비어 있어요!';
              pushStep(block, {
                action: 'infinite_loop',
                fromX: x,
                fromY: y,
                fromDir: dir,
                toX: x,
                toY: y,
                toDir: dir,
                status: 'failed',
                failReason,
                message: '반복 안이 비어 있어요!',
              });
              return;
            }
          }
          break;
        }

        case 'if': {
          const cond = block.condition ?? 'wall_ahead';
          const result = evalCondition(cond);
          if (result) {
            execList(block.body ?? [], callDepth);
          }
          break;
        }

        case 'if_else': {
          const cond = block.condition ?? 'wall_ahead';
          const result = evalCondition(cond);
          if (result) {
            execList(block.body ?? [], callDepth);
          } else {
            execList(block.elseBody ?? [], callDepth);
          }
          break;
        }

        case 'call_func': {
          if (funcBlocks.length === 0) {
            halted = true;
            failReason =
              '나만의 명령(함수)이 아직 비어 있어요! [내 명령 만들기] 탭에서 먼저 명령을 채워 보세요.';
            pushStep(block, {
              action: 'fail_end',
              fromX: x,
              fromY: y,
              fromDir: dir,
              toX: x,
              toY: y,
              toDir: dir,
              status: 'failed',
              failReason,
              message: '함수가 비어 있어요!',
            });
            return;
          }
          execList(funcBlocks, callDepth + 1);
          break;
        }
      }
    }
  };

  execList(mainBlocks, 0);

  if (!halted) {
    const atGoal = x === level.goal.x && y === level.goal.y;
    const allGemsCollected = collectedGems.size === gemSet.size;
    const lastBlockId =
      steps.length > 0 ? steps[steps.length - 1].blockId : mainBlocks[0]?.id ?? '';
    const lastSourceLine =
      steps.length > 0 ? steps[steps.length - 1].sourceLine : undefined;

    if (atGoal && allGemsCollected) {
      won = true;
      steps.push({
        stepIndex: steps.length,
        blockId: lastBlockId,
        sourceLine: lastSourceLine,
        action: 'win',
        fromX: x,
        fromY: y,
        fromDir: dir,
        toX: x,
        toY: y,
        toDir: dir,
        collectedGems: Array.from(collectedGems),
        collectedBonus: Array.from(collectedBonus),
        openedDoors: Array.from(openedDoors),
        variables: { ...variables },
        status: 'won',
        message: '🎉 목표 달성! 깃발에 도착했어요!',
      });
    } else if (!atGoal && !allGemsCollected) {
      const remaining = gemSet.size - collectedGems.size;
      failReason = `(${x + 1}, ${y + 1}) 칸에서 명령이 끝났어요. 아직 보석 ${remaining}개가 남았고 깃발(${level.goal.x + 1}, ${level.goal.y + 1})에 도착하지 못했어요!`;
      steps.push({
        stepIndex: steps.length,
        blockId: lastBlockId,
        sourceLine: lastSourceLine,
        action: 'fail_end',
        fromX: x,
        fromY: y,
        fromDir: dir,
        toX: x,
        toY: y,
        toDir: dir,
        collectedGems: Array.from(collectedGems),
        collectedBonus: Array.from(collectedBonus),
        openedDoors: Array.from(openedDoors),
        variables: { ...variables },
        status: 'failed',
        failReason,
        message: '보석과 깃발이 남았어요!',
      });
    } else if (!allGemsCollected) {
      const remaining = gemSet.size - collectedGems.size;
      failReason = `깃발에는 도착했지만, 아직 파란 보석 ${remaining}개를 다 못 주웠어요! 보석을 모두 줍고 깃발로 가 보세요.`;
      steps.push({
        stepIndex: steps.length,
        blockId: lastBlockId,
        sourceLine: lastSourceLine,
        action: 'fail_end',
        fromX: x,
        fromY: y,
        fromDir: dir,
        toX: x,
        toY: y,
        toDir: dir,
        collectedGems: Array.from(collectedGems),
        collectedBonus: Array.from(collectedBonus),
        openedDoors: Array.from(openedDoors),
        variables: { ...variables },
        status: 'failed',
        failReason,
        message: '보석을 다 못 주웠어요!',
      });
    } else {
      failReason = `보석은 모두 모았지만 (${x + 1}, ${y + 1}) 칸에서 멈췄어요! 깃발(${level.goal.x + 1}, ${level.goal.y + 1})까지 조금만 더 가 볼까요?`;
      steps.push({
        stepIndex: steps.length,
        blockId: lastBlockId,
        sourceLine: lastSourceLine,
        action: 'fail_end',
        fromX: x,
        fromY: y,
        fromDir: dir,
        toX: x,
        toY: y,
        toDir: dir,
        collectedGems: Array.from(collectedGems),
        collectedBonus: Array.from(collectedBonus),
        openedDoors: Array.from(openedDoors),
        variables: { ...variables },
        status: 'failed',
        failReason,
        message: '깃발까지 조금만 더!',
      });
    }
  }

  return {
    steps,
    won,
    failReason,
    collectedGemsCount: collectedGems.size,
    totalGemsCount: gemSet.size,
    collectedBonusCount: collectedBonus.size,
    totalBonusCount: bonusSet.size,
    finalX: x,
    finalY: y,
    finalDir: dir,
  };
}
