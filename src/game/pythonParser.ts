import { genBlockId } from './blockMeta';
import { CodeBlock, ConditionType } from './types';

export interface ParseResult {
  ok: boolean;
  mainBlocks: CodeBlock[];
  funcBlocks: CodeBlock[];
  error?: string;
  errorLine?: number;
}

const VALID_CONDITIONS: Record<string, ConditionType> = {
  'wall_ahead()': 'wall_ahead',
  'path_ahead()': 'path_ahead',
  'on_gem()': 'on_gem',
  'wall_right()': 'wall_right',
  'wall_left()': 'wall_left',
};

interface RawLine {
  lineNum: number;
  indent: number;
  text: string;
}

export function parsePythonCode(source: string): ParseResult {
  const rawLines: RawLine[] = [];
  const split = source.replace(/\r\n/g, '\n').split('\n');

  for (let i = 0; i < split.length; i++) {
    const raw = split[i];
    // Strip comments starting with #
    const noComment = raw.replace(/#.*$/, '');
    const trimmed = noComment.trim();
    if (!trimmed) continue;

    // Count leading spaces (tab = 4 spaces)
    const expanded = noComment.replace(/\t/g, '    ');
    const leadingMatch = expanded.match(/^(\s*)/);
    const indent = leadingMatch ? leadingMatch[1].length : 0;
    rawLines.push({
      lineNum: i + 1,
      indent,
      text: trimmed,
    });
  }

  if (rawLines.length === 0) {
    return {
      ok: false,
      mainBlocks: [],
      funcBlocks: [],
      error: '실행할 코드가 비어 있어요! 명령어를 한 줄 이상 써 보세요.',
      errorLine: 1,
    };
  }

  let idx = 0;
  const funcBlocks: CodeBlock[] = [];

  function parseBlockList(minIndent: number): {
    blocks: CodeBlock[];
    error?: string;
    errorLine?: number;
  } {
    const blocks: CodeBlock[] = [];

    while (idx < rawLines.length) {
      const cur = rawLines[idx];
      if (cur.indent < minIndent) {
        break;
      }
      if (cur.indent > minIndent) {
        return {
          blocks,
          error: `${cur.lineNum}번째 줄의 들여쓰기가 맞지 않아요. 앞의 빈칸을 확인해 보세요!`,
          errorLine: cur.lineNum,
        };
      }

      const t = cur.text;
      const lineNum = cur.lineNum;

      if (t === 'pass') {
        idx++;
        continue;
      }

      if (t === 'forward()') {
        blocks.push({ id: genBlockId('py'), type: 'forward', sourceLine: lineNum });
        idx++;
        continue;
      }
      if (t === 'turn_left()') {
        blocks.push({ id: genBlockId('py'), type: 'turn_left', sourceLine: lineNum });
        idx++;
        continue;
      }
      if (t === 'turn_right()') {
        blocks.push({ id: genBlockId('py'), type: 'turn_right', sourceLine: lineNum });
        idx++;
        continue;
      }
      if (t === 'collect()') {
        blocks.push({ id: genBlockId('py'), type: 'collect', sourceLine: lineNum });
        idx++;
        continue;
      }
      if (t === 'my_func()') {
        blocks.push({ id: genBlockId('py'), type: 'call_func', sourceLine: lineNum });
        idx++;
        continue;
      }
      if (t === 'unlock()') {
        blocks.push({ id: genBlockId('py'), type: 'unlock', sourceLine: lineNum });
        idx++;
        continue;
      }
      if (t === 'gems += 1') {
        blocks.push({ id: genBlockId('py'), type: 'count_gem', sourceLine: lineNum });
        idx++;
        continue;
      }

      const keySetMatch = t.match(/^key\s*=\s*(\d+)$/);
      if (keySetMatch) {
        blocks.push({
          id: genBlockId('py'),
          type: 'set_var',
          count: Math.max(0, Math.min(20, parseInt(keySetMatch[1], 10))),
          sourceLine: lineNum,
        });
        idx++;
        continue;
      }

      const keyAddMatch = t.match(/^key\s*\+=\s*(\d+)$/);
      if (keyAddMatch) {
        blocks.push({
          id: genBlockId('py'),
          type: 'add_var',
          count: Math.max(1, Math.min(20, parseInt(keyAddMatch[1], 10))),
          sourceLine: lineNum,
        });
        idx++;
        continue;
      }

      // def my_func():
      if (t === 'def my_func():') {
        if (minIndent !== 0) {
          return {
            blocks,
            error: `${lineNum}번째 줄: def my_func(): 는 맨 왼쪽에서 시작해야 해요.`,
            errorLine: lineNum,
          };
        }
        idx++;
        if (idx >= rawLines.length || rawLines[idx].indent <= cur.indent) {
          return {
            blocks,
            error: `${lineNum}번째 줄: 함수 안에 실행할 명령을 들여쓰기해서 넣어 주세요.`,
            errorLine: lineNum,
          };
        }
        const sub = parseBlockList(rawLines[idx].indent);
        if (sub.error) return sub;
        funcBlocks.push(...sub.blocks);
        continue;
      }

      // for i in range(N):
      const forMatch = t.match(/^for\s+\w+\s+in\s+range\(\s*(\d+|key|gems)\s*\)\s*:$/);
      if (forMatch) {
        idx++;
        if (idx >= rawLines.length || rawLines[idx].indent <= cur.indent) {
          return {
            blocks,
            error: `${lineNum}번째 줄: 반복문 다음 줄은 띄어쓰기 2~4칸을 넣어서 안쪽 명령을 써 주세요!`,
            errorLine: lineNum,
          };
        }
        const sub = parseBlockList(rawLines[idx].indent);
        if (sub.error) return sub;

        const arg = forMatch[1];
        if (arg === 'key' || arg === 'gems') {
          blocks.push({
            id: genBlockId('py'),
            type: 'repeat_var',
            varName: arg,
            body: sub.blocks,
            sourceLine: lineNum,
          });
        } else {
          const count = Math.max(1, Math.min(20, parseInt(arg, 10)));
          blocks.push({
            id: genBlockId('py'),
            type: 'repeat',
            count,
            body: sub.blocks,
            sourceLine: lineNum,
          });
        }
        continue;
      }

      // while not at_goal():
      if (/^while\s+not\s+at_goal\(\)\s*:$/.test(t)) {
        idx++;
        if (idx >= rawLines.length || rawLines[idx].indent <= cur.indent) {
          return {
            blocks,
            error: `${lineNum}번째 줄: while 다음 줄은 들여쓰기해서 반복할 명령을 넣어 주세요!`,
            errorLine: lineNum,
          };
        }
        const sub = parseBlockList(rawLines[idx].indent);
        if (sub.error) return sub;
        blocks.push({
          id: genBlockId('py'),
          type: 'repeat_until_goal',
          body: sub.blocks,
          sourceLine: lineNum,
        });
        continue;
      }

      // if cond():
      const ifMatch = t.match(/^if\s+([a-z_]+\(\))\s*:$/);
      if (ifMatch) {
        const cond = VALID_CONDITIONS[ifMatch[1]];
        if (!cond) {
          return {
            blocks,
            error: `${lineNum}번째 줄: '${ifMatch[1]}' 조건을 알 수 없어요. wall_ahead(), on_gem(), path_ahead() 등을 써 보세요.`,
            errorLine: lineNum,
          };
        }
        idx++;
        if (idx >= rawLines.length || rawLines[idx].indent <= cur.indent) {
          return {
            blocks,
            error: `${lineNum}번째 줄: if 다음 줄은 들여쓰기해서 실행할 명령을 넣어 주세요!`,
            errorLine: lineNum,
          };
        }
        const thenSub = parseBlockList(rawLines[idx].indent);
        if (thenSub.error) return thenSub;

        // Check for matching else:
        if (
          idx < rawLines.length &&
          rawLines[idx].indent === cur.indent &&
          /^else\s*:$/.test(rawLines[idx].text)
        ) {
          const elseLine = rawLines[idx].lineNum;
          idx++;
          if (idx >= rawLines.length || rawLines[idx].indent <= cur.indent) {
            return {
              blocks,
              error: `${elseLine}번째 줄: else 다음 줄은 들여쓰기해서 명령을 넣어 주세요!`,
              errorLine: elseLine,
            };
          }
          const elseSub = parseBlockList(rawLines[idx].indent);
          if (elseSub.error) return elseSub;
          blocks.push({
            id: genBlockId('py'),
            type: 'if_else',
            condition: cond,
            body: thenSub.blocks,
            elseBody: elseSub.blocks,
            sourceLine: lineNum,
          });
        } else {
          blocks.push({
            id: genBlockId('py'),
            type: 'if',
            condition: cond,
            body: thenSub.blocks,
            sourceLine: lineNum,
          });
        }
        continue;
      }

      // Helpful hint if missing () or :
      if (['forward', 'turn_left', 'turn_right', 'collect', 'my_func', 'unlock'].includes(t)) {
        return {
          blocks,
          error: `${lineNum}번째 줄: '${t}' 뒤에 괄호 ()를 붙여 주세요! 예: ${t}()`,
          errorLine: lineNum,
        };
      }
      if (/^(for |while |if |else)/.test(t) && !t.endsWith(':')) {
        return {
          blocks,
          error: `${lineNum}번째 줄: 문장 끝에 콜론(:)이 빠졌어요!`,
          errorLine: lineNum,
        };
      }

      return {
        blocks,
        error: `${lineNum}번째 줄: '${t}' 명령을 이해할 수 없어요. 오타가 있는지 확인해 주세요!`,
        errorLine: lineNum,
      };
    }

    return { blocks };
  }

  const parsed = parseBlockList(0);
  if (parsed.error) {
    return {
      ok: false,
      mainBlocks: [],
      funcBlocks: [],
      error: parsed.error,
      errorLine: parsed.errorLine,
    };
  }

  return {
    ok: true,
    mainBlocks: parsed.blocks,
    funcBlocks,
  };
}
