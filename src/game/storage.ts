import { LevelProgress, SavedProgress } from './types';

const STORAGE_KEY = 'coding_explorer_3d_progress_v1';

export const DEFAULT_PROGRESS: SavedProgress = {
  levels: {},
  quizzesPassed: {},
  introSeen: {},
  muted: false,
  speed: 'normal',
  teacher: {
    enabled: false,
    unlockAll: false,
    assignedChapters: [],
  },
};

export function loadProgress(): SavedProgress {
  if (typeof window === 'undefined') return { ...DEFAULT_PROGRESS };
  try {
    const raw = window.localStorage.getItem(STORAGE_KEY);
    if (!raw) return { ...DEFAULT_PROGRESS };
    const parsed = JSON.parse(raw) as Partial<SavedProgress>;
    return {
      levels: parsed.levels ?? {},
      quizzesPassed: parsed.quizzesPassed ?? {},
      introSeen: parsed.introSeen ?? {},
      muted: Boolean(parsed.muted),
      speed: parsed.speed === 'slow' || parsed.speed === 'fast' ? parsed.speed : 'normal',
      teacher: {
        enabled: Boolean(parsed.teacher?.enabled),
        unlockAll: Boolean(parsed.teacher?.unlockAll),
        assignedChapters: Array.isArray(parsed.teacher?.assignedChapters)
          ? parsed.teacher!.assignedChapters
          : [],
      },
    };
  } catch {
    return { ...DEFAULT_PROGRESS };
  }
}

export function saveProgress(progress: SavedProgress): void {
  if (typeof window === 'undefined') return;
  try {
    window.localStorage.setItem(STORAGE_KEY, JSON.stringify(progress));
  } catch {
    // Ignore storage quota errors gracefully
  }
}

export function mergeLevelProgress(
  prev: LevelProgress | undefined,
  usedBlocks: number,
  gotOptimal: boolean,
  gotBonus: boolean
): LevelProgress {
  const mergedOptimal = (prev?.gotOptimal ?? false) || gotOptimal;
  const mergedBonus = (prev?.gotBonus ?? false) || gotBonus;
  const stars = 1 + (mergedOptimal ? 1 : 0) + (mergedBonus ? 1 : 0);
  const bestBlocks =
    prev?.bestBlocks !== null && prev?.bestBlocks !== undefined
      ? Math.min(prev.bestBlocks, usedBlocks)
      : usedBlocks;

  return {
    cleared: true,
    stars: Math.max(prev?.stars ?? 0, stars),
    bestBlocks,
    gotBonus: mergedBonus,
    gotOptimal: mergedOptimal,
  };
}
