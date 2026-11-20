export type Dir = 'N' | 'E' | 'S' | 'W';

export type ChapterTheme =
  | 'forest'
  | 'desert'
  | 'ruins'
  | 'ice'
  | 'volcano'
  | 'sky'
  | 'crystal'
  | 'space';

export type BlockType =
  | 'forward'
  | 'turn_left'
  | 'turn_right'
  | 'collect'
  | 'repeat'
  | 'repeat_until_goal'
  | 'if'
  | 'if_else'
  | 'call_func'
  | 'set_var'
  | 'add_var'
  | 'count_gem'
  | 'unlock'
  | 'repeat_var';

export type ConditionType =
  | 'wall_ahead'
  | 'path_ahead'
  | 'on_gem'
  | 'wall_right'
  | 'wall_left';

export type VarName = 'key' | 'gems';

export interface CodeBlock {
  id: string;
  type: BlockType;
  count?: number; // for 'repeat', 'set_var', 'add_var'
  condition?: ConditionType; // for 'if', 'if_else'
  varName?: VarName; // for 'repeat_var'
  body?: CodeBlock[]; // for 'repeat', 'repeat_until_goal', 'if', 'if_else', 'repeat_var'
  elseBody?: CodeBlock[]; // for 'if_else'
  sourceLine?: number; // 1-indexed Python line number for Ch. 8
}

export interface GridPos {
  x: number;
  y: number;
}

export interface DoorSpec extends GridPos {
  requiredKey?: number;
  requiredGems?: number;
}

export interface NumberPadSpec extends GridPos {
  label: string;
}

export interface LevelData {
  id: string; // e.g. "1-1"
  chapterId: number; // 1..8
  stageIndex: number; // 1..5
  title: string;
  mission: string;
  width: number;
  height: number;
  start: { x: number; y: number; dir: Dir };
  goal: GridPos;
  walls: GridPos[];
  gems: GridPos[];
  bonusGems: GridPos[];
  doors?: DoorSpec[];
  numberPads?: NumberPadSpec[];
  availableBlocks: BlockType[];
  availableConditions?: ConditionType[];
  optimalBlocks: number;
  allowFunction?: boolean;
  functionLabel?: string;
  codingMode?: 'blocks' | 'dual' | 'text';
  starterBlocks?: Omit<CodeBlock, 'id'>[];
  starterFuncBlocks?: Omit<CodeBlock, 'id'>[];
  starterCode?: string;
  hints: [string, string, string];
  // Verified reference solution (used for automated solvability testing)
  referenceSolution: {
    main: Omit<CodeBlock, 'id'>[];
    func?: Omit<CodeBlock, 'id'>[];
    python?: string;
  };
}

export interface QuizQuestion {
  question: string;
  codeSnippet?: string;
  options: string[];
  correctIndex: number;
  explanation: string;
}

export interface ChapterData {
  id: number;
  title: string;
  subtitle: string;
  conceptTitle: string;
  theme: ChapterTheme;
  themeName: string;
  badgeEmoji: string;
  badgeName: string;
  accentColor: string;
  conceptSummary: string;
  conceptBullets: string[];
  conceptExampleTitle: string;
  conceptExampleBlocks: string[];
  conceptDiagramType:
    | 'sequence'
    | 'loop'
    | 'debug'
    | 'condition'
    | 'while'
    | 'function'
    | 'variable'
    | 'python';
  quiz: QuizQuestion[];
}

export type TraceAction =
  | 'move'
  | 'turn_left'
  | 'turn_right'
  | 'collect'
  | 'unlock'
  | 'set_var'
  | 'add_var'
  | 'count_gem'
  | 'check_cond'
  | 'bump_wall'
  | 'out_of_bounds'
  | 'no_gem'
  | 'door_locked'
  | 'win'
  | 'fail_end'
  | 'infinite_loop';

export interface TraceStep {
  stepIndex: number;
  blockId: string;
  sourceLine?: number;
  action: TraceAction;
  fromX: number;
  fromY: number;
  fromDir: Dir;
  toX: number;
  toY: number;
  toDir: Dir;
  collectedGems: string[]; // "x,y"
  collectedBonus: string[]; // "x,y"
  openedDoors: string[]; // "x,y"
  variables: { key: number; gems: number };
  message?: string;
  status: 'running' | 'won' | 'failed';
  failReason?: string;
  justCollectedGem?: string;
  justCollectedBonus?: string;
  justOpenedDoor?: string;
}

export interface LevelProgress {
  cleared: boolean;
  stars: number; // 0..3
  bestBlocks: number | null;
  gotBonus: boolean;
  gotOptimal: boolean;
}

export interface TeacherConfig {
  enabled: boolean;
  unlockAll: boolean;
  assignedChapters: number[]; // empty = all chapters visible
}

export interface SavedProgress {
  levels: Record<string, LevelProgress>;
  quizzesPassed: Record<number, boolean>;
  introSeen: Record<number, boolean>;
  muted: boolean;
  speed: 'slow' | 'normal' | 'fast';
  teacher: TeacherConfig;
}

export type AppScreen = 'title' | 'map' | 'concept' | 'play' | 'quiz';
