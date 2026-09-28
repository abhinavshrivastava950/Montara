# Montara — Operating Contract (read this first)

You are working in **Montara**: an open, local-first, TypeScript video production system. One
engine, one **Timeline IR**, one skills layer — drivable by Montara's own orchestrator **or** by
you (an external AI assistant) reading these files and running the `montara` CLI. This file is
the entry point for **both**. The full design is in [`PLAN.md`](./PLAN.md); the assistant-agnostic
rules are in [`AGENT_GUIDE.md`](./AGENT_GUIDE.md).

> If you are an external assistant (Claude Code, Cursor, Codex, a local model via Ollama/LM Studio):
> **read `skills/` for the task you're doing, then drive Montara by running the `montara` CLI.**
> There is **no MCP** — you read files and run commands, the Montara way.

---

## Prime directive

Turn the user's intent into a finished video by transforming the **Timeline IR**, then rendering
it — and **never present broken output.** Prefer the local, free path; degrade gracefully; verify
before you claim done.

## The one source of truth: the Timeline IR

A video is a JSON `Timeline` (`@montara/core`): a `composition` + `tracks` + `clips`
(with `transform`, `keyframes`, `transitions`). Every tool reads/writes this IR. Agents build it,
humans edit it, renderers compile it, pro editors import it. **Do not invent a parallel format.**

## Commands (this is your whole API surface)

```bash
montara doctor                 # check env: node, ffmpeg, local model, comfyui, disk  (run FIRST)
montara make "<idea>" [opts]   # full pipeline: plan→script→populate→render→QA→master → ./out
montara plan "<idea>"          # just produce the EditPlan (inspect before rendering)
montara render <ir.json>       # compile an IR to MP4 (pick --engine ffmpeg|revideo|three|...)
montara hear <audio>           # voice/music analysis (loudness, warmth, pace) → scores JSON
montara understand <video>     # frames + captions + transcript → understanding JSON
montara models [plan|list|hardware] # what vision models THIS machine can run; refuses to fetch the rest
montara matte <video>          # background removal, no green screen (RVM → YOLO+SAM 2 → chromakey)
montara replace-bg <video> <backdrop> # matte + composite in one step; --text puts a title BEHIND the subject
montara segment <video> --auto # promptable tracked masks via SAM 2 (--box | --point | --auto)
montara detect <video>         # YOLO detection for mask prompts and auto-framing
montara enhance <audio>        # noise reduction + voice enhancement (--master to land -14 LUFS)
montara cut <ir.json> <op>     # split/ripple/roll/slip/slide/jcut/lcut/crossfade on the IR
montara taste <ir.json>        # senior-taste score; --apply writes safe IR fixes
montara serve                  # local web GUI
montara export <ir.json> --to otio|fcpxml|edl   # bridge to Premiere/DaVinci/Final Cut
pnpm verify                    # contract tests (must be green)
pnpm validate                  # end-to-end flow tests (must be green)
```

## The pipeline (and which package owns each stage)

`research → plan → script → populate → enrich → render → QA → master`

| Stage | Package | Note |
|---|---|---|
| research | `research/` | live web + reference-video; optional |
| plan / script / populate | `ai/` (+ Montara's orchestrator) | idea → EditPlan → Timeline IR |
| enrich (audio) | `hear/` | data-driven voice selection; music QA |
| enrich (vision) | `understand/` | CLIP/BLIP/Whisper via transformers.js (no Python) |
| generate pixels | `runtimes/` + `providers/` | local ComfyUI/A1111 (offline) or cloud |
| render | `render-*` | **Remotion = default composition** (auto-fallback Revideo MIT); ffmpeg = assembly + universal fallback; motioncanvas/three/manim/blender |
| QA + master | `quality/` | slideshow-risk, self-review, −14 LUFS |

## The brain is pluggable (`llm/`)

Text reasoning routes to: **llama.cpp** (in-process GGUF), **Ollama** (:11434), **LM Studio**
(:1234), or **cloud** (BYOK). Default to local. When *you* (an external assistant) are driving,
*you* are the brain — call the CLI tools, don't call `llm/`.

## Generation is pluggable (`runtimes/` — the Pinokio layer)

Image/video models do **not** run on llama.cpp. `runtimes/` installs/launches **ComfyUI** (GPL)
and **A1111** (AGPL) as external local servers and talks to them over **localhost APIs** →
**offline** SD/SDXL/FLUX + WAN/Hunyuan/CogVideo/LTX. Cloud (FLUX/Runway/Veo) is the same
`providers` interface. Never block a run on local setup — fall back to cloud or to a designed
caption/typography scene.

## Render adapters

Each implements `RenderAdapter { render(ir, opts): Promise<mp4path> }`. **Remotion is the default
composition engine** (matches the source composer behavior); if a Remotion license isn't available it **auto-falls-back
to Revideo (MIT)** — both compile the same IR. **FFmpeg** does assembly/encode and is the universal
fallback. To add an adapter: create `packages/render-<name>`, implement the interface, register it,
and add a `verify` case that renders a tiny IR to a real MP4.

## Skills (`skills/`) — shared knowledge, read by BOTH orchestrators

Markdown, three layers (like Montara): `pipelines/` (per-pipeline stage directors),
`creative/` (craft techniques), `core/` (tool usage), `meta/` (reviewer, checkpoint protocol).
**Read the skill for your current stage before acting.** Montara's own orchestrator reads the
same files you do — keep knowledge here, not hardcoded.

## Hard rules

1. **Never hard-fail.** Every stage has a fallback. A run always produces *some* watchable MP4.
2. **Verify before "done."** Run `pnpm verify` (+ `pnpm validate` for flow changes). Don't claim
   success without a real file on disk. Red CI never merges.
3. **Local-first default.** No API keys should be required to make a video.
4. **Invoke, don't bundle.** ComfyUI/A1111/Blender/Manim/Remotion are external — never copy their
   source into this repo (license + size). Models carry their own licenses — check the card.
5. **AGPL hygiene.** Keep Montara notices and dependency/source attribution in `NOTICE` and `docs/ATTRIBUTION.md`; everything
   stays open. (Selling a *closed* product is the only forbidden thing — out of scope.)
6. **No secrets in the repo.** Keys via env/OS keychain only; never commit `.env`, never log keys.
7. **Package boundaries.** `core` has no I/O. Renderers depend on `core`, not on each other.

## Montara documentary evidence craft (bake into `skills/`, this is what makes factual videos *good*)

- **Voice is measurable** — profile reference narrators with `hear`, match acoustically (~4.4 onsets/s);
  don't pick "by vibe."
- **Music = a scene-mapped score**, not a flat bed — per-cue `[start,end,fadeIn,fadeOut,gain]`,
  **intentional silences** at big beats, **crossfade-loops** (never a hard `aloop` = audible crack).
- **Master −14 LUFS / −1 dBTP** — ONE gentle sidechain + ONE `loudnorm` (don't stack dynamics → pumping);
  force `-ar 48000`; lossless PCM intermediate.
- **Cold open moves from frame 1** (no static b-roll). **Maps must be factually honest.**
  **Text over footage in readable pills / strong shadow.**
- **QA the full playback, not just stills.** **Thumbnails: 3 *distinct* hooks** (bright, text ≠ title).
  **Shorts: verify cut points by transcription** (sentence boundary, never a guessed duration).

## Coding conventions

TypeScript strict; functional, small modules; pure ops in `core`; every new capability ships with
a `verify`/`validate` case (no test, not done). Match the surrounding code's style.

---

*New here? Run `montara doctor`, read `PLAN.md` §4–§5 and `AGENT_GUIDE.md`, then the `skills/` for
your stage. Build phase-by-phase (`PLAN.md` §11); never leave `verify`/`validate` red.*
