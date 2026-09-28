// @montara/quality — pre-compose validation gate (Quality governance §I).
// Blocks a render before it wastes time/money: invalid IR, missing renderer, a broken delivery
// promise (duration/aspect/scene-count/audio), or — opt-in — slideshow risk over a cap.

import type { Timeline } from "../../core/src/index";
import { validateTimeline } from "../../core/src/index";
import { DecisionTrail, clamp01 } from "./audit";
import { seniorTasteReview } from "./seniorTaste";
import { slideshowRisk, type SlideshowRisk } from "./slideshow";

export interface PreComposePromise {
  targetDurationSec?: number;
  /** allowed +/- on duration, default 0.6s */
  durationTolSec?: number;
  aspect?: { w: number; h: number };
  minScenes?: number;
  requireAudio?: boolean;
  /** opt-in hard block when slideshow score exceeds this (e.g. 0.85) */
  maxSlideshowRisk?: number;
}

export interface PreComposeGate {
  ok: boolean;
  blockers: string[];
  warnings: string[];
  slideshow: SlideshowRisk;
}

export function preComposeGate(
  timeline: Timeline,
  promise: PreComposePromise = {},
  opts: { rendererAvailable?: boolean; trail?: DecisionTrail } = {},
): PreComposeGate {
  const blockers: string[] = [];
  const warnings: string[] = [];
  const comp = timeline.composition;

  // 1. structural validity
  for (const issue of validateTimeline(timeline)) blockers.push(`invalid IR: ${issue}`);

  // 2. renderer present
  if (opts.rendererAvailable === false) blockers.push("no render adapter available");

  // 3. delivery promise
  if (promise.targetDurationSec != null) {
    const tol = promise.durationTolSec ?? 0.6;
    const diff = Math.abs(comp.durationSec - promise.targetDurationSec);
    if (diff > tol) {
      blockers.push(`duration ${comp.durationSec.toFixed(2)}s misses promised ${promise.targetDurationSec.toFixed(2)}s (±${tol}s)`);
    }
  }
  if (promise.aspect) {
    const want = promise.aspect.w / promise.aspect.h;
    const got = comp.width / comp.height;
    if (Math.abs(want - got) > 0.02) {
      blockers.push(`aspect ${comp.width}x${comp.height} misses promised ${promise.aspect.w}:${promise.aspect.h}`);
    }
  }
  if (promise.minScenes != null) {
    const scenes = timeline.tracks.find((t) => t.type === "video")?.clips.length ?? 0;
    if (scenes < promise.minScenes) blockers.push(`only ${scenes} scene(s), promised >= ${promise.minScenes}`);
  }
  if (promise.requireAudio) {
    const hasAudio = timeline.tracks.some((t) => t.type === "audio" && t.clips.length > 0);
    if (!hasAudio) blockers.push("audio promised but no audio track present");
  }

  // 4. slideshow risk — warn always; block only when the caller opts in with a cap
  const slideshow = slideshowRisk(timeline);
  if (promise.maxSlideshowRisk != null && slideshow.score > promise.maxSlideshowRisk) {
    blockers.push(`slideshow risk ${slideshow.score} over cap ${promise.maxSlideshowRisk}: ${slideshow.reasons.join("; ")}`);
  } else if (slideshow.level !== "low") {
    warnings.push(`slideshow risk ${slideshow.level} (${slideshow.score}): ${slideshow.reasons.join("; ")}`);
  }

  const taste = seniorTasteReview(timeline);
  if (taste.verdict === "junior") {
    const tells = taste.notes.filter((note) => note.scored).map((note) => note.detail);
    warnings.push(`senior taste junior (${taste.juniorScore}): ${tells.join("; ")}`);
  }

  const ok = blockers.length === 0;
  opts.trail?.record({
    kind: "pre-compose-gate",
    chosen: ok ? "PROCEED" : "BLOCK",
    confidence: ok ? clamp01(1 - slideshow.score) : 0.95,
    rationale: ok ? "all delivery promises met" : blockers.join("; "),
    alternatives: blockers.map((b) => ({ label: b })),
  });
  return { ok, blockers, warnings, slideshow };
}
