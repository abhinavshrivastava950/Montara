// @montara/quality — senior-taste review of a Timeline IR.
//
// Auto-editors in 2026 still ship the junior pass: even cuts, a caption track,
// one plate, picture and sound locked together. A senior edit varies the holds,
// moves from frame 1, puts text in a readable treatment, splits picture from
// sound, and maps the score instead of laying one bed under the whole film.
//
// This is a deterministic read of the IR. It never blocks a render. Safe fixes
// are the ones the renderers already honor: a push-in on the open, and a shadow
// on type that sits on footage.

import { findClip, isMediaClip, round3, type Clip, type Timeline } from "../../core/src/index";

export type TasteVerdict = "senior" | "mixed" | "junior";

export type TasteFixKind = "cold-open-push" | "text-shadow";

export interface TasteFix {
  kind: TasteFixKind;
  clipId: string;
}

export interface TasteNote {
  id: string;
  /** Scored notes move the verdict. Advisory notes are context for the next edit. */
  scored: boolean;
  detail: string;
  fixes: TasteFix[];
}

export interface SeniorTasteReport {
  /** 0..1. Higher means the cut still reads as a junior assembly. */
  juniorScore: number;
  verdict: TasteVerdict;
  notes: TasteNote[];
}

const WEIGHTS: Record<string, number> = {
  "cold-open-static": 0.18,
  "metronome-cuts": 0.18,
  "caption-sandwich": 0.24,
  "bare-text": 0.14,
  "locked-split": 0.14,
  "flat-bed": 0.12,
  "missing-hook": 0.12,
};

function clipsOf(timeline: Timeline, type: Clip["type"]): Clip[] {
  return timeline.tracks.filter((track) => track.type === type).flatMap((track) => track.clips);
}

function hasMotion(clip: Clip): boolean {
  const frames = clip.keyframes && Object.values(clip.keyframes).some((channel) => channel.length > 0);
  const into = clip.transitionIn && clip.transitionIn.kind !== "cut" && clip.transitionIn.durationSec > 0;
  const out = clip.transitionOut && clip.transitionOut.kind !== "cut" && clip.transitionOut.durationSec > 0;
  return Boolean(frames || into || out);
}

function variation(values: number[]): number {
  if (values.length < 2) return 1;
  const mean = values.reduce((sum, value) => sum + value, 0) / values.length;
  if (mean <= 0) return 1;
  const variance = values.reduce((sum, value) => sum + (value - mean) ** 2, 0) / values.length;
  return Math.sqrt(variance) / mean;
}

function overlaps(a: Clip, b: Clip): boolean {
  return a.startSec < b.startSec + b.durationSec - 0.04 && b.startSec < a.startSec + a.durationSec - 0.04;
}

function verdictFor(score: number): TasteVerdict {
  if (score >= 0.55) return "junior";
  if (score >= 0.28) return "mixed";
  return "senior";
}

function replaceClip(timeline: Timeline, clipId: string, next: Clip): Timeline {
  return {
    ...timeline,
    tracks: timeline.tracks.map((track) => ({
      ...track,
      clips: track.clips.map((clip) => (clip.id === clipId ? next : clip)),
    })),
  };
}

/** Read the timeline the way a senior editor would, and name the junior tells. */
export function seniorTasteReview(timeline: Timeline): SeniorTasteReport {
  const notes: TasteNote[] = [];
  const duration = timeline.composition.durationSec;
  const video = clipsOf(timeline, "video").slice().sort((a, b) => a.startSec - b.startSec);
  const text = clipsOf(timeline, "text");
  const audio = clipsOf(timeline, "audio").filter((clip) => clip.type === "audio" && clip.source.kind === "file");
  const media = video.filter(isMediaClip);

  const opener = video.find((clip) => clip.startSec < 0.2);
  if (opener && opener.durationSec >= 1.2 && !hasMotion(opener)) {
    const fixes: TasteFix[] = isMediaClip(opener) ? [{ kind: "cold-open-push", clipId: opener.id }] : [];
    notes.push({
      id: "cold-open-static",
      scored: true,
      detail: `cold open ${opener.id} holds still from frame 1`,
      fixes,
    });
  }

  if (video.length >= 4 && variation(video.map((clip) => clip.durationSec)) < 0.08) {
    notes.push({
      id: "metronome-cuts",
      scored: true,
      detail: `${video.length} picture cuts are the same length; vary the holds`,
      fixes: [],
    });
  }

  const onePlate = media.length > 0
    && media.length === video.length
    && new Set(media.map((clip) => clip.source.path)).size === 1
    && video.every((clip) => !hasMotion(clip));
  if (text.length > 0 && onePlate) {
    notes.push({
      id: "caption-sandwich",
      scored: true,
      detail: "the edit is captions on one repeating plate",
      fixes: [],
    });
  }

  const bare = text.filter((clip) => {
    if (clip.type !== "text" || clip.style?.shadow === true) return false;
    return media.some((plate) => overlaps(clip, plate));
  });
  if (bare.length > 0) {
    notes.push({
      id: "bare-text",
      scored: true,
      detail: `${bare.length} text clip(s) sit on footage without a shadow`,
      fixes: bare.map((clip) => ({ kind: "text-shadow", clipId: clip.id })),
    });
  }

  if (video.length >= 2 && audio.length >= 2) {
    const locked = audio.filter((clip) => video.some((shot) => Math.abs(shot.startSec - clip.startSec) <= 0.08));
    if (locked.length / audio.length >= 0.75) {
      notes.push({
        id: "locked-split",
        scored: true,
        detail: "picture and sound change together; a J-cut or L-cut should lead one of the joins",
        fixes: [],
      });
    }
  }

  if (audio.length === 1) {
    const bed = audio[0]!;
    const covers = duration > 0 && bed.durationSec / duration >= 0.85;
    const shaped = Boolean(bed.keyframes && Object.values(bed.keyframes).some((channel) => channel.length > 0));
    if (covers && !shaped) {
      notes.push({
        id: "flat-bed",
        scored: true,
        detail: `${bed.id} runs under the whole film; map cues and leave a silence at the beat`,
        fixes: [],
      });
    }
  }

  const verticalShort = timeline.composition.height > timeline.composition.width && duration <= 90;
  const hook = text.some((clip) => clip.type === "text" && clip.startSec < 1.2 && clip.text.trim().length > 0);
  if (verticalShort && !hook) {
    notes.push({
      id: "missing-hook",
      scored: true,
      detail: "a vertical short has no text in the first 1.2s",
      fixes: [],
    });
  }

  const planned = media.filter((clip) => clip.generation);
  if (planned.length > 0) {
    const ops = [...new Set(planned.map((clip) => clip.generation!.op))].join(", ");
    notes.push({
      id: "in-timeline-generation",
      scored: false,
      detail: `${planned.length} clip(s) keep ${ops} on the timeline`,
      fixes: [],
    });
  } else {
    const held = media.find((clip) => clip.durationSec >= 8 && !hasMotion(clip));
    if (held && !onePlate) {
      notes.push({
        id: "held-plate",
        scored: false,
        detail: `${held.id} is a held plate; extend or upscale it on the clip instead of a sidecar render`,
        fixes: [],
      });
    }
  }

  const juniorScore = Math.round(
    Math.min(1, notes.reduce((sum, note) => sum + (note.scored ? (WEIGHTS[note.id] ?? 0) : 0), 0)) * 1000,
  ) / 1000;

  return { juniorScore, verdict: verdictFor(juniorScore), notes };
}

function applyFix(timeline: Timeline, fix: TasteFix): Timeline {
  const found = findClip(timeline, fix.clipId);
  if (!found) return timeline;

  if (fix.kind === "cold-open-push") {
    const clip = found.clip;
    if (!isMediaClip(clip) || clip.keyframes?.zoom?.length) return timeline;
    const end = round3(clip.startSec + clip.durationSec);
    return replaceClip(timeline, clip.id, {
      ...clip,
      keyframes: {
        ...clip.keyframes,
        zoom: [
          { atSec: clip.startSec, value: 1, easing: "ease-out" },
          { atSec: end, value: 1.08, easing: "ease-in-out" },
        ],
      },
    });
  }

  if (fix.kind === "text-shadow" && found.clip.type === "text") {
    if (found.clip.style?.shadow === true) return timeline;
    return replaceClip(timeline, found.clip.id, {
      ...found.clip,
      style: { ...found.clip.style, shadow: true },
    });
  }

  return timeline;
}

/** Apply the safe fixes named by a review. Picture/sound splits stay manual. */
export function applySeniorTasteFixes(
  timeline: Timeline,
  report: SeniorTasteReport = seniorTasteReview(timeline),
): { timeline: Timeline; applied: TasteFix[] } {
  const applied: TasteFix[] = [];
  let next = timeline;
  for (const note of report.notes) {
    for (const fix of note.fixes) {
      const updated = applyFix(next, fix);
      if (updated !== next) {
        next = updated;
        applied.push(fix);
      }
    }
  }
  return { timeline: next, applied };
}
