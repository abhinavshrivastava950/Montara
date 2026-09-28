// @montara/core — generation that lives on a clip, not in a sidecar folder.
//
// The 2026 edit is: generate, extend, and upscale without leaving the timeline.
// This op records that intent on the media clip. It does not call a model. The
// current source keeps playing until something fills the path and marks it ready.

import { findClip } from "./edit";
import { isMediaClip, round3, type InTimelineGeneration, type Timeline } from "./types";

export interface GenerationPlan {
  op: InTimelineGeneration["op"];
  prompt: string;
  model?: string;
  /** Required for `extend`. Ignored otherwise. */
  extendSec?: number;
}

function withClip(timeline: Timeline, clipId: string, generation: InTimelineGeneration): Timeline {
  return {
    ...timeline,
    tracks: timeline.tracks.map((track) => ({
      ...track,
      clips: track.clips.map((clip) =>
        clip.id === clipId && isMediaClip(clip) ? { ...clip, generation } : clip,
      ),
    })),
  };
}

/**
 * Attach a planned generate / extend / upscale job to a media clip.
 * Returns the same timeline when the clip is missing, isn't footage, or the plan is incomplete.
 */
export function planInTimelineGeneration(timeline: Timeline, clipId: string, plan: GenerationPlan): Timeline {
  const found = findClip(timeline, clipId);
  if (!found || !isMediaClip(found.clip)) return timeline;

  const prompt = plan.prompt.trim();
  if (!prompt) return timeline;
  if (plan.op === "extend" && !(typeof plan.extendSec === "number" && plan.extendSec > 0)) return timeline;

  const generation: InTimelineGeneration = {
    op: plan.op,
    prompt,
    status: "planned",
    ...(plan.model?.trim() ? { model: plan.model.trim() } : {}),
    ...(plan.op === "extend" ? { extendSec: round3(plan.extendSec!) } : {}),
  };
  return withClip(timeline, clipId, generation);
}
