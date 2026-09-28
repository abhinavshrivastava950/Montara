// @montara/ai — one sentence in, a senior motion cut out.
//
// A frontier model can author a film in one prompt because it already knows the
// craft. A smaller model does not. This compiler keeps the craft: varied holds,
// a push from frame 1, type in shadow, a mood palette, beat-mapped music with a
// silence, and a HyperFrames-style GSAP document. The model is allowed to fill
// four lines and a mood. If it returns anything else, the idea still becomes a film.

import {
  commitEdit,
  createHistory,
  planInTimelineGeneration,
  redoEdit,
  round3,
  undoEdit,
  type Clip,
  type Timeline,
  type TimelineHistory,
} from "../../core/src/index";

export type MotionMood = "cinematic" | "technical" | "warm" | "kinetic";
export type MotionRole = "hook" | "turn" | "proof" | "payoff";
export type MotionProfileId = "youtube" | "shorts" | "square";

export interface MotionSlots {
  hook: string;
  turn: string;
  proof: string;
  payoff: string;
  mood: MotionMood;
}

export interface MotionBeat {
  id: MotionRole;
  role: MotionRole;
  text: string;
  startSec: number;
  durationSec: number;
}

export interface MusicCuePlan {
  id: string;
  startSec: number;
  endSec: number;
  fadeInSec: number;
  fadeOutSec: number;
  gainDb: number;
}

export interface MotionSnapshot {
  slots: MotionSlots;
  timeline: Timeline;
  html: string;
  htmlByProfile: Record<MotionProfileId, string>;
  variants: Record<MotionProfileId, Timeline>;
  beats: MotionBeat[];
  musicCues: MusicCuePlan[];
}

export interface MotionCut {
  slots: MotionSlots;
  timeline: Timeline;
  html: string;
  htmlByProfile: Record<MotionProfileId, string>;
  variants: Record<MotionProfileId, Timeline>;
  beats: MotionBeat[];
  musicCues: MusicCuePlan[];
  /** Spoken undo. Stores the previous film, not a nested stack. */
  undoStack: MotionSnapshot[];
  redoStack: MotionSnapshot[];
  slotPrompt: string;
  history: TimelineHistory;
  /** True only when a model returned four lines and a real mood. */
  usedModel: boolean;
}

export interface MotionCompileOptions {
  targetSeconds?: number;
  width?: number;
  height?: number;
  fps?: number;
  /** Optional proof-beat plate. The extend job stays on that clip. */
  heroPath?: string;
  idea?: string;
  usedModel?: boolean;
}

interface Palette {
  bg: string;
  fg: string;
  accent: string;
  font: string;
  stack: string;
  beats: readonly [string, string, string, string];
}

const MOODS: readonly MotionMood[] = ["cinematic", "technical", "warm", "kinetic"];
const ROLES: readonly MotionRole[] = ["hook", "turn", "proof", "payoff"];
const PROFILES: readonly { id: MotionProfileId; width: number; height: number }[] = [
  { id: "youtube", width: 1920, height: 1080 },
  { id: "shorts", width: 1080, height: 1920 },
  { id: "square", width: 1080, height: 1080 },
];

/** Holds are uneven on purpose: four equal cuts trip the metronome tell (CV < 0.08). */
const BEAT_WEIGHTS = [1000, 1650, 820, 1380] as const;
const BEAT_WEIGHT_SUM = 4850;

const PALETTES: Record<MotionMood, Palette> = {
  cinematic: {
    bg: "07080c",
    fg: "f4f1ea",
    accent: "e8a87c",
    font: "Fraunces",
    stack: '"Fraunces", "Iowan Old Style", Palatino, serif',
    beats: ["07080c", "14110e", "1e1814", "2c211a"],
  },
  technical: {
    bg: "071018",
    fg: "e7f6f2",
    accent: "7dffe1",
    font: "IBM Plex Sans",
    stack: '"IBM Plex Sans", "Avenir Next", sans-serif',
    beats: ["071018", "0c1c28", "123044", "184058"],
  },
  warm: {
    bg: "1a120c",
    fg: "fff6ea",
    accent: "ffb085",
    font: "Source Serif 4",
    stack: '"Source Serif 4", "Iowan Old Style", serif',
    beats: ["1a120c", "2c1c12", "3e2818", "54341e"],
  },
  kinetic: {
    bg: "0a0a0a",
    fg: "f7f7f2",
    accent: "ff4d4d",
    font: "Anton",
    stack: '"Anton", "Arial Narrow", Impact, sans-serif',
    beats: ["0a0a0a", "160808", "240c0c", "3a1010"],
  },
};

const FALLBACK_LINES: Record<MotionRole, string> = {
  hook: "A film starts moving",
  turn: "The frame changes before the sentence does",
  proof: "Holds vary, type sits in shadow, the open pushes in",
  payoff: "One sentence, a finished cut",
};

function isMood(value: unknown): value is MotionMood {
  return typeof value === "string" && (MOODS as readonly string[]).includes(value);
}

function clampLine(text: string, max: number): string {
  const clean = text.replace(/\s+/g, " ").trim();
  if (clean.length <= max) return clean;
  const cut = clean.slice(0, max);
  const space = cut.lastIndexOf(" ");
  return (space > 12 ? cut.slice(0, space) : cut).trim();
}

function moodFromIdea(idea: string): MotionMood {
  const text = idea.toLowerCase();
  if (/\b(api|code|system|data|infra|model)\b/.test(text)) return "technical";
  if (/\b(home|family|story|warm|letter)\b/.test(text)) return "warm";
  if (/\b(launch|drop|now|kinetic|hype)\b/.test(text)) return "kinetic";
  return "cinematic";
}

function escapeHtml(value: string): string {
  return value
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

function mediaKind(path: string): "video" | "image" {
  return /\.(mp4|mov|webm|mkv)$/i.test(path) ? "video" : "image";
}

/** Four lines from the idea. An empty idea still produces a film. */
export function slotsFromIdea(idea: string, mood?: MotionMood): MotionSlots {
  const trimmed = idea.replace(/\s+/g, " ").trim();
  const parts = trimmed
    .split(/[.!?;]+|\s+and\s+|,\s*/i)
    .map((part) => part.trim())
    .filter(Boolean);
  const slots = {
    hook: clampLine(parts[0] || FALLBACK_LINES.hook, 42),
    turn: clampLine(parts[1] || FALLBACK_LINES.turn, 72),
    proof: clampLine(parts[2] || FALLBACK_LINES.proof, 72),
    payoff: clampLine(parts[3] || FALLBACK_LINES.payoff, 72),
    mood: mood && isMood(mood) ? mood : moodFromIdea(trimmed),
  };
  return slots;
}

/**
 * The only thing a smaller model is asked for. Timing, motion, and layout
 * stay in the compiler.
 */
export function smallModelSlotPrompt(idea: string): string {
  const subject = idea.replace(/\s+/g, " ").trim() || "a short film";
  return [
    "Fill four short lines and a mood. Return JSON only.",
    "Do not design the edit, the timing, the motion, or the layout.",
    "Montara compiles those.",
    `Idea: ${subject}`,
    '{"hook":"<=8 words","turn":"<=12 words","proof":"<=12 words","payoff":"<=8 words","mood":"cinematic|technical|warm|kinetic"}',
  ].join("\n");
}

/** Accept a slot object. Anything else, including prose, falls back to the idea. */
export function parseSmallModelSlots(raw: string, idea: string): { slots: MotionSlots; usedModel: boolean } {
  const match = raw.match(/\{[\s\S]*\}/);
  if (!match) return { slots: slotsFromIdea(idea), usedModel: false };
  try {
    const parsed = JSON.parse(match[0]) as Record<string, unknown>;
    const lines = ROLES.map((role) => parsed[role]);
    const valid = lines.every((line) => typeof line === "string" && line.trim().length > 0) && isMood(parsed.mood);
    if (!valid) return { slots: slotsFromIdea(idea), usedModel: false };
    return {
      usedModel: true,
      slots: {
        hook: clampLine(String(parsed.hook), 42),
        turn: clampLine(String(parsed.turn), 72),
        proof: clampLine(String(parsed.proof), 72),
        payoff: clampLine(String(parsed.payoff), 72),
        mood: parsed.mood as MotionMood,
      },
    };
  } catch {
    return { slots: slotsFromIdea(idea), usedModel: false };
  }
}

function layoutBeats(slots: MotionSlots, targetSeconds: number): { beats: MotionBeat[]; totalSec: number } {
  const requested = Number.isFinite(targetSeconds) ? targetSeconds : 12;
  const targetMs = Math.max(8000, Math.round(requested * 1000));
  const raw = BEAT_WEIGHTS.map((weight) => Math.round((targetMs * weight) / BEAT_WEIGHT_SUM));
  const head = (raw[0] ?? 0) + (raw[1] ?? 0) + (raw[2] ?? 0);
  raw[3] = Math.max(400, targetMs - head);
  const durations = raw.map((ms) => round3(ms / 1000));
  let cursor = 0;
  const beats: MotionBeat[] = ROLES.map((role, index) => {
    const durationSec = durations[index] ?? 1;
    const beat: MotionBeat = {
      id: role,
      role,
      text: slots[role],
      startSec: round3(cursor),
      durationSec,
    };
    cursor = round3(cursor + durationSec);
    return beat;
  });
  return { beats, totalSec: round3(cursor) };
}

function layoutMusic(beats: readonly MotionBeat[]): MusicCuePlan[] {
  const proof = beats[2];
  const payoff = beats[3];
  if (!proof || !payoff) return [];
  const cue2Start = round3(proof.startSec + 0.2);
  const cue1End = round3(cue2Start - 0.45);
  const cue2End = round3(Math.max(cue2Start + 0.8, payoff.startSec - 0.05));
  return [
    { id: "cue-open", startSec: 0.4, endSec: cue1End, fadeInSec: 0.3, fadeOutSec: 0.35, gainDb: -16 },
    { id: "cue-proof", startSec: cue2Start, endSec: cue2End, fadeInSec: 0.3, fadeOutSec: 0.35, gainDb: -18 },
  ];
}

function headlinePx(height: number): number {
  return Math.max(64, Math.round(height * 0.072));
}

function renderHtml(
  slots: MotionSlots,
  beats: readonly MotionBeat[],
  palette: Palette,
  width: number,
  height: number,
  durationSec: number,
): string {
  const titlePx = headlinePx(height);
  const scenes = beats.map((beat, index) => {
    const color = palette.beats[index] ?? palette.bg;
    const later = index === 0 ? "" : " scene-rest";
    return `    <section id="scene-${beat.role}" class="scene scene-${beat.role}${later}" style="background:#${color}">
      <div class="scene-content">
        <div class="kicker">${escapeHtml(beat.role)}</div>
        <div class="title">${escapeHtml(beat.text)}</div>
        <div class="bar"></div>
      </div>
    </section>`;
  }).join("\n");

  const tweens = beats.map((beat, index) => {
    const reveal = index === 0
      ? ""
      : `  tl.to("#scene-${beat.role}", { opacity: 1, duration: 0.35, ease: "power2.out" }, ${round3(beat.startSec + 0.12)});\n`;
    return `${reveal}  tl.from("#scene-${beat.role} .kicker", { y: 28, opacity: 0, duration: 0.55, ease: "power3.out" }, ${round3(beat.startSec + 0.16)});
  tl.from("#scene-${beat.role} .title", { x: -48, opacity: 0, duration: 0.6, ease: "expo.out" }, ${round3(beat.startSec + 0.28)});
  tl.from("#scene-${beat.role} .bar", { scaleX: 0, opacity: 0, duration: 0.45, ease: "power2.out" }, ${round3(beat.startSec + 0.4)});`;
  }).join("\n");

  return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="utf-8">
  <title>${escapeHtml(slots.hook)}</title>
  <script src="https://cdn.jsdelivr.net/npm/gsap@3.14.2/dist/gsap.min.js"></script>
  <style>
    html, body { margin: 0; background: #${palette.bg}; }
    [data-composition-id="montara-motion"] {
      position: relative;
      width: ${width}px;
      height: ${height}px;
      overflow: hidden;
      background: #${palette.bg};
    }
    .scene { position: absolute; inset: 0; overflow: hidden; }
    .scene-rest { opacity: 0; }
    .scene-content {
      display: flex;
      flex-direction: column;
      justify-content: flex-end;
      width: 100%;
      height: 100%;
      padding: 8%;
      box-sizing: border-box;
    }
    .kicker {
      font-family: ${palette.stack};
      font-size: 22px;
      letter-spacing: 0.22em;
      text-transform: uppercase;
      color: #${palette.accent};
      margin: 0 0 16px;
    }
    .title {
      font-family: ${palette.stack};
      font-size: ${titlePx}px;
      line-height: 0.95;
      color: #${palette.fg};
      margin: 0;
      max-width: 16ch;
    }
    .bar {
      width: 180px;
      height: 6px;
      margin-top: 28px;
      background: #${palette.accent};
      transform-origin: 0% 50%;
    }
  </style>
</head>
<body>
  <div id="montara-motion" data-composition-id="montara-motion" data-width="${width}" data-height="${height}" data-start="0" data-duration="${durationSec}">
${scenes}
  </div>
  <script>
    const tl = gsap.timeline({ paused: true });
${tweens}
    window.__timelines = window.__timelines || {};
    window.__timelines["montara-motion"] = tl;
  </script>
</body>
</html>
`;
}

function buildTimeline(
  slots: MotionSlots,
  beats: readonly MotionBeat[],
  musicCues: readonly MusicCuePlan[],
  palette: Palette,
  width: number,
  height: number,
  fps: number,
  totalSec: number,
  profileId: string,
  heroPath?: string,
): Timeline {
  const picture: Clip[] = beats.map((beat, index) => {
    const color = palette.beats[index] ?? palette.bg;
    const motion = beat.role === "hook"
      ? {
          keyframes: {
            zoom: [
              { atSec: beat.startSec, value: 1, easing: "ease-out" as const },
              { atSec: round3(beat.startSec + beat.durationSec), value: 1.08, easing: "ease-in-out" as const },
            ],
          },
        }
      : {};
    const out = index < beats.length - 1
      ? { transitionOut: { kind: "crossfade" as const, durationSec: 0.35 } }
      : {};
    if (beat.role === "proof" && heroPath) {
      return {
        id: "beat-proof",
        type: "video" as const,
        startSec: beat.startSec,
        durationSec: beat.durationSec,
        source: { kind: mediaKind(heroPath), path: heroPath },
        fit: "cover" as const,
        label: beat.role,
        ...out,
      };
    }
    return {
      id: `beat-${beat.role}`,
      type: "video" as const,
      startSec: beat.startSec,
      durationSec: beat.durationSec,
      source: { kind: "solid" as const, color },
      label: beat.role,
      ...motion,
      ...out,
    };
  });

  const typeSize = headlinePx(height);
  const typeClips: Clip[] = beats.map((beat) => ({
    id: `line-${beat.role}`,
    type: "text" as const,
    startSec: round3(beat.startSec + 0.12),
    durationSec: round3(Math.max(0.4, beat.durationSec - 0.12)),
    text: beat.text,
    transform: { x: width / 2, y: height / 2, scale: 1, rotateDeg: 0, opacity: 1 },
    style: {
      fontFamily: palette.font,
      fontSize: typeSize,
      color: palette.fg,
      align: "center" as const,
      maxWidthPct: 78,
      shadow: true,
    },
  }));

  const payoff = beats[3];
  const cueOpen = musicCues[0];
  const cueProof = musicCues[1];
  const silence: Clip[] = [];
  if (cueOpen && cueProof && cueProof.startSec - cueOpen.endSec > 0.05) {
    silence.push({
      id: "silence-gap",
      type: "audio",
      startSec: cueOpen.endSec,
      durationSec: round3(cueProof.startSec - cueOpen.endSec),
      source: { kind: "silence" },
      volume: 0,
    });
  }
  if (payoff) {
    silence.push({
      id: "silence-payoff",
      type: "audio",
      startSec: payoff.startSec,
      durationSec: payoff.durationSec,
      source: { kind: "silence" },
      volume: 0,
    });
  }

  const proof = beats[2];
  const extendSec = round3(Math.max(0.5, (proof?.durationSec ?? 1) * 0.35));
  const generationPlan = {
    clipId: "beat-proof",
    op: "extend" as const,
    prompt: `Extend the proof plate: ${slots.proof}`,
    extendSec,
  };

  let timeline: Timeline = {
    version: "1.1",
    composition: {
      width,
      height,
      fps,
      durationSec: totalSec,
      background: palette.bg,
    },
    tracks: [
      { id: "picture", type: "video", clips: picture },
      { id: "type", type: "text", clips: typeClips },
      { id: "score", type: "audio", clips: silence },
    ],
    metadata: {
      source: "small-model-motion",
      mood: slots.mood,
      outputProfile: profileId,
      beats,
      musicCues,
      generationPlan,
    },
  };

  if (heroPath) {
    timeline = planInTimelineGeneration(timeline, "beat-proof", {
      op: "extend",
      prompt: generationPlan.prompt,
      extendSec,
    });
  }
  return timeline;
}

function normalizeSlots(input: MotionSlots): MotionSlots {
  return {
    hook: clampLine(input.hook, 42) || FALLBACK_LINES.hook,
    turn: clampLine(input.turn, 72) || FALLBACK_LINES.turn,
    proof: clampLine(input.proof, 72) || FALLBACK_LINES.proof,
    payoff: clampLine(input.payoff, 72) || FALLBACK_LINES.payoff,
    mood: isMood(input.mood) ? input.mood : "cinematic",
  };
}

/** Compile slots into a senior Timeline IR, three deliverable frames, and a GSAP document. */
export function compileMotionCut(input: MotionSlots, opts: MotionCompileOptions = {}): MotionCut {
  const slots = normalizeSlots(input);
  const palette = PALETTES[slots.mood];
  const fps = opts.fps && opts.fps > 0 ? opts.fps : 30;
  const { beats, totalSec } = layoutBeats(slots, opts.targetSeconds ?? 12);
  const musicCues = layoutMusic(beats);
  const variants = {} as Record<MotionProfileId, Timeline>;
  const htmlByProfile = {} as Record<MotionProfileId, string>;

  for (const profile of PROFILES) {
    variants[profile.id] = buildTimeline(
      slots, beats, musicCues, palette, profile.width, profile.height, fps, totalSec, profile.id, opts.heroPath,
    );
    htmlByProfile[profile.id] = renderHtml(slots, beats, palette, profile.width, profile.height, totalSec);
  }

  const masterW = opts.width ?? 1920;
  const masterH = opts.height ?? 1080;
  const masterIsYoutube = masterW === 1920 && masterH === 1080;
  const timeline = masterIsYoutube
    ? variants.youtube
    : buildTimeline(slots, beats, musicCues, palette, masterW, masterH, fps, totalSec, "master", opts.heroPath);
  const html = masterIsYoutube
    ? htmlByProfile.youtube
    : renderHtml(slots, beats, palette, masterW, masterH, totalSec);

  return {
    slots,
    timeline,
    html,
    htmlByProfile,
    variants,
    beats,
    musicCues,
    undoStack: [],
    redoStack: [],
    slotPrompt: smallModelSlotPrompt(opts.idea ?? `${slots.hook}. ${slots.turn}. ${slots.proof}. ${slots.payoff}`),
    history: createHistory(timeline),
    usedModel: opts.usedModel === true,
  };
}

function snapshotOf(cut: MotionCut): MotionSnapshot {
  return {
    slots: cut.slots,
    timeline: cut.timeline,
    html: cut.html,
    htmlByProfile: cut.htmlByProfile,
    variants: cut.variants,
    beats: cut.beats,
    musicCues: cut.musicCues,
  };
}

function moodFromUtterance(utterance: string): MotionMood | undefined {
  if (/\b(kinetic|punch)\b/.test(utterance)) return "kinetic";
  if (/\b(technical|code)\b/.test(utterance)) return "technical";
  if (/\bwarm/.test(utterance)) return "warm";
  if (/\b(cinematic|moody)\b/.test(utterance)) return "cinematic";
  return undefined;
}

/**
 * Spoken edits that a small model must not time: undo, redo, or a mood swap
 * that recompiles the same beats. Anything else leaves the cut untouched.
 */
export function applySpokenEdit(cut: MotionCut, utterance: string): MotionCut {
  const text = utterance.trim().toLowerCase();
  if (/^undo\b/.test(text)) {
    const previous = cut.undoStack[cut.undoStack.length - 1];
    if (!previous) return cut;
    return {
      ...cut,
      ...previous,
      undoStack: cut.undoStack.slice(0, -1),
      redoStack: [...cut.redoStack, snapshotOf(cut)],
      history: undoEdit(cut.history),
    };
  }
  if (/^redo\b/.test(text)) {
    const next = cut.redoStack[cut.redoStack.length - 1];
    if (!next) return cut;
    return {
      ...cut,
      ...next,
      undoStack: [...cut.undoStack, snapshotOf(cut)],
      redoStack: cut.redoStack.slice(0, -1),
      history: redoEdit(cut.history),
    };
  }

  const mood = moodFromUtterance(text);
  if (!mood || mood === cut.slots.mood) return cut;
  const compiled = compileMotionCut(
    { ...cut.slots, mood },
    {
      targetSeconds: cut.timeline.composition.durationSec,
      width: cut.timeline.composition.width,
      height: cut.timeline.composition.height,
      fps: cut.timeline.composition.fps,
      usedModel: cut.usedModel,
    },
  );
  return {
    ...compiled,
    slotPrompt: cut.slotPrompt,
    usedModel: cut.usedModel,
    undoStack: [...cut.undoStack, snapshotOf(cut)],
    redoStack: [],
    history: commitEdit(cut.history, compiled.timeline),
  };
}
