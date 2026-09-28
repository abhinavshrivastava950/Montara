# The Timeline IR

The Timeline IR is Montara's single source of truth — a renderer-neutral JSON document. Agents
*build* it, the schema *validates* it, and every renderer *compiles* it. Its machine-readable
schema lives at [`../../schemas/timeline.schema.json`](../../schemas/timeline.schema.json); scene
plans validate against [`../../schemas/scene-plan.schema.json`](../../schemas/scene-plan.schema.json).

## Two shapes

- **ScenePlan** — the simple authoring shape: `{ width, height, fps, scenes[] }`, where each scene is
  `{ id, title, durationSec, background }`. Good for quick authoring and the `plan` command.
- **Timeline** — the full IR: `{ version, composition, tracks[] }`. A `composition` carries
  `width/height/fps/durationSec/background`; each `track` has a `type` (`video` | `audio` | `text`)
  and `clips`. Clips share `id/type/startSec/durationSec` and add type-specific fields (a solid
  color source, text + style, or an audio source), plus optional `transform`, `keyframes` and
  `transitionIn/Out`.

## The core operations (`@montara/core`, pure, no I/O)

- `scenePlanToTimeline(plan)` — compile the simple shape into the full IR.
- `timelineToScenePlan(timeline)` — recover the simple shape (round-trips).
- `validateTimeline(timeline)` — returns a list of structural issues (`[]` means valid).
- `timelineDuration(timeline)` / `totalDuration(plan)` — read the runtime.

A renderer only ever consumes a **validated** Timeline. If `validateTimeline` returns issues, fix
the IR before rendering — the pre-compose gate enforces exactly this.

A media clip can carry `generation`: `{ op, prompt, status, model?, extendSec? }` with `op` of
`generate`, `extend`, or `upscale`. `planInTimelineGeneration` writes `status: "planned"`. Renderers
keep playing `source` until something replaces the path and sets `status: "ready"`. `montara taste`
reads the same IR for junior assembly tells (even cuts, caption-on-one-plate, locked picture and
sound, a flat music bed, a static open, bare type, a vertical short with no early text).

## Depth and motion

`z` orders every clip in the composite **across tracks**, text included. A text clip has to sit on
a `text` track, but its `z` is what decides whether it renders in front of or behind a video layer
— that is how a title goes behind a matted subject.

`keyframes` is a map of property name to `{ atSec, value, easing }` points, in composition seconds.
The ffmpeg engine compiles `x`, `y`, text `opacity`, and the in-box camera (`zoom`, `panX`, `panY`).
The value holds before the first key and after the last. `scale` and `rotateDeg` keyframes
round-trip through the IR but render static on this engine, because the filters behind them take
no time expression. Ask `hasAnimation(clip)` (`@montara/render-ffmpeg`) before claiming a clip
moves — the slideshow-risk check counts keyframes as motion, so an unhonoured property would let a
still pass as a moving cut. `montara taste --apply` uses a `zoom` push on a still open because that
channel actually renders.
