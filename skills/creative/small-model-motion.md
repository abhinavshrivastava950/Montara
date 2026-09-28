# Small-model motion

Use this when the film has to look like a one-prompt motion piece and the model in the loop is
small, local, or missing.

The craft does not live in the model. `montara direct "<idea>"` compiles it:

- four beats (hook, turn, proof, payoff) with uneven holds
- a push-in from frame 1 and a crossfade on every join except the last
- a mood palette (cinematic, technical, warm, kinetic) instead of a generic plate
- hook type in the first 1.2s, with a shadow, centered so a frame change can recenter it
- two music cues with a gap, and silence under the payoff
- a standalone GSAP document (`index.html`) whose scenes enter with `gsap.from`
- YouTube 16:9, Shorts 9:16, and square 1:1 from the same timings

## What the model is allowed to return

`montara direct --brain` asks only for this JSON:

```json
{"hook":"<=8 words","turn":"<=12 words","proof":"<=12 words","payoff":"<=8 words","mood":"cinematic|technical|warm|kinetic"}
```

`parseSmallModelSlots` keeps that object when all four lines and the mood are valid. Prose, a
missing field, or a bad mood is discarded and the idea is split into slots instead. The command
still writes a film.

`--mood` overrides the slot mood. Timing, layout, and motion are not in the prompt.

## Spoken edits

`montara direct --from <dir> --edit "<utterance>"` understands three changes:

- `undo` / `redo` restore the previous film, including the same timeline object in memory
- a mood word (`warmer`, `kinetic`, `technical`, `cinematic`) recompiles the same beats
- anything else is ignored, so a small model cannot rewrite the cut

The directory holds `motion-cut.json`, `index.html`, `timeline.json`, and `variants/` for Shorts
and square. `montara taste` on `timeline.json` should read `senior`.

An optional hero path on the proof beat (`compileMotionCut(..., { heroPath })`) keeps an `extend`
job on that clip. Renderers play the current source until the job is `ready`.
