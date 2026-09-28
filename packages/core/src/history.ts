// @montara/core — undo stack for a Timeline IR.
//
// Spoken edits ("undo", "redo") have to restore the exact timeline object that was
// on screen. This stack is pure: an empty undo or redo returns the same history.

import type { Timeline } from "./types";

export interface TimelineHistory {
  past: Timeline[];
  present: Timeline;
  future: Timeline[];
}

export function createHistory(timeline: Timeline): TimelineHistory {
  return { past: [], present: timeline, future: [] };
}

/** Push `present` onto the past. The same timeline reference is a no-op. */
export function commitEdit(history: TimelineHistory, next: Timeline): TimelineHistory {
  if (next === history.present) return history;
  return { past: [...history.past, history.present], present: next, future: [] };
}

export function undoEdit(history: TimelineHistory): TimelineHistory {
  const previous = history.past[history.past.length - 1];
  if (!previous) return history;
  return {
    past: history.past.slice(0, -1),
    present: previous,
    future: [history.present, ...history.future],
  };
}

export function redoEdit(history: TimelineHistory): TimelineHistory {
  const next = history.future[0];
  if (!next) return history;
  return {
    past: [...history.past, history.present],
    present: next,
    future: history.future.slice(1),
  };
}
