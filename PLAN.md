# Montara — Master Build Plan

> **Last updated:** 2026-07-01  
> **Authority:** This file is the single build contract for Montara. For runtime truth see
> [docs/ARCHITECTURE.md](./docs/ARCHITECTURE.md). For parity tick-list see
> [docs/MONTARA-PARITY.md](./docs/MONTARA-PARITY.md) (must stay in sync with this plan).

---

## North star

**Montara must become the strongest local-first video production system in its class** — not by
copying louder marketing, but by shipping a **strictly better system**:

1. A complete engine surface: pipelines, tools, providers, governance, and composition paths.
2. **Plus Montara-only moat:** editable Timeline IR, CLI/SDK, pro-editor bridges, local-first
   orchestration, runtime honesty, content-aware reels, Playwright auth capture, documentary
   evidence craft, and eventually WARCUT/web GUIs on the same IR.

**Win condition:** A new user (or agent) can run `montara doctor` → `montara make "…"` → get a
real MP4 + Timeline IR + optional EDL/OTIO/FCPXML, with zero API keys, honest runtime reporting,
and quality gates that block broken delivery — **without** needing a separate reference stack.

---

## Status legend

| Symbol | Meaning |
|--------|---------|
| ☑ | **Done** — shipped, documented, and covered by a green gate or explicit acceptance test |
| ◐ | **Partial** — exists but not production-default, missing tests, or honest caveats apply |
| ☐ | **Not done** — not shipped or not validated |
| 🎯 | **Current focus** — active sprint priority |

**Gate commands (must pass before claiming a phase done):**

```bash
pnpm typecheck
pnpm verify      # contract tests (~310+ assertions; see scripts/verify.ts)
pnpm validate    # end-to-end flows (~92 assertions; real MP4 on disk)
python -m pytest tests
```

CI: [.github/workflows/ci.yml](./.github/workflows/ci.yml) runs all of the above on every push.

---

## Snapshot — as of 2026-06-29

| Area | Status | Notes |
|------|--------|-------|
| **Timeline IR** (`@montara/core`) | ☑ | Canonical JSON format; validate + render paths green |
| **FFmpeg render** (`@montara/render-ffmpeg`) | ☑ | Universal native renderer + fallback floor |
| **Python engine** (`tools/`, `lib/`) | ☑ | 116 tools (115 parity + `playwright_recorder`), 18 lib modules at repo root |
| **Engine bridge** (`engine_bridge.py`, `@montara/engine`) | ☑ | Stdlib JSON bridge; AST verify; composition ↔ IR mapping |
| **CLI** (`packages/cli`) | ◐ | doctor, make, plan, render, export, import, capture, compose, corpus, reel, budget, resume, hear, understand, engines — not every Python tool wired |
| **Editor export** (EDL, OTIO, FCPXML) | ☑ | `@montara/bridge`; verify tests green |
| **Editor import** (round-trip) | ☑ | `montara import` EDL/OTIO/FCPXML → Timeline IR; verify round-trip green |
| **CI** | ☑ | typecheck + verify + validate + pytest (+ optional native-render smoke) |
| **Docs honesty** | ☑ | README, AGENT_GUIDE, ARCHITECTURE, PROVIDER-AUDIT, SKILL-ROADMAP, MONTARA-PARITY synced |
| **Agent contract** | ☑ | AGENT_GUIDE includes onboarding, runtime honesty, pipeline/stage/tool/checkpoint protocols |
| **PROMPT_GALLERY** | ☑ | Expanded beyond baseline gallery coverage |
| **Playwright capture** | ◐ | Tool + selector + Layer 2 skills + pytest + `montara capture`; runtime-gated on `playwright` npm |
| **9-engine registry** | ☑ | Honest `maturity` labels (working / adapter / runtime-gated / planned) |
| **Remotion native** | ☑ | Native smoke + Timeline IR route validate-gated; `REMOTION_ENABLED=1` makes `montara make/render` prefer native when composer deps are installed |
| **HyperFrames native** | ◐ | Strict kinetic smoke renders through `hyperframes_compose`; broader pipeline parity pending |
| **Revideo / Motion Canvas native** | ◐ | License-aware Revideo fallback selector and runtime-gated adapter packages/probes exist; installed-runtime MP4 validate proof pending |
| **Three.js / Manim native** | ◐ | Adapters exist; often FFmpeg fallback proofs |
| **Blender native** | ◐ | Real headless adapter; proof clip exists |
| **Spline** | ☐ | Planned registry entry only |
| **Local LLM orchestrator** | ◐ | `@montara/llm` catalogue + Ollama probe; not full `montara make` brain |
| **CLIP/BLIP vision default** | ◐ | FFmpeg/signalstats remains default; optional Transformers.js CLIP path is shipped behind `MONTARA_VISION_MODELS=1` / `--vision require`; BLIP/cached-weight validate pending |
| **Cloud live executors** | ◐ | TS executor + sanitized fixtures for all cloud providers; Google/Runway/OpenAI/BFL request shapes checked against current docs; dry-run/live-key smoke harness; real-key confirmations pending |
| **LICENSE / NOTICE** | ☑ | Root AGPL-3.0 LICENSE + NOTICE + docs/ATTRIBUTION.md |
| **Web GUI** | ☐ | `packages/web` scaffold only |
| **WARCUT desktop** | ☐ | Not started |
| **`runtimes` manager** | ◐ | ComfyUI/A1111/Piper/Faster Whisper/Transformers.js health, safe install/launch dry-runs, env writers, scripts, and model/cache inventory shipped; web GUI integration pending |
| **Public demo gallery** | ☑ | README + `docs/DEMOS.md` + curated `assets/` proofs |

### Production Readiness Score (Today)

| Criterion | Reference baseline | Montara | Leader |
|-----------|-------------|---------|--------|
| CI / gates | lint + pytest | typecheck + verify + validate + pytest | **Montara** |
| Runtime honesty | implicit | explicit ARCHITECTURE + AGENT_GUIDE tables | **Montara** |
| Timeline IR + editor export | none | EDL/OTIO/FCPXML | **Montara** |
| CLI | none | `montara` commands | **Montara** |
| Playwright auth capture | none | `playwright_recorder` | **Montara** |
| Documentary evidence craft | brand-specific | generalized skill | **Montara** |
| README / demos / community | strong | runnable local README gallery + checked-in public assets | **Tie** |
| AGENT_GUIDE depth | ~481 lines | ~484 lines + Montara-specific protocols | **Montara** |
| HyperFrames / Remotion default path | battle-tested | adapter + fallback | **Reference baseline** |
| one-command setup | yes | `montara doctor` + setup scripts | **Montara** |
| Public proof videos | many documented | checked-in local proof clips + validate outputs | **Tie** |

**Current production posture:** Montara now has the stronger verified local proof surface; deeper
native composition polish remains the next quality frontier.

---

## 1. Definition (unchanged intent)

Montara turns an idea, notes, URL, script, or source footage into a finished video. One
**Timeline IR** is the source of truth. Agents build it; humans edit it (future GUIs); pro
editors import it; every renderer compiles it.

**Drive surfaces:** your AI assistant (reads `AGENT_GUIDE.md` + `skills/`) **or**
`montara` CLI **or** (future) web/WARCUT GUI — same skills, same IR, same gates.

**WARCUT** = premium desktop GUI on top of Montara (not a separate engine).

---

## 2. Non-negotiables

1. **Python engine at repo root** — `tools/`, `lib/`, `skills/`, `pipeline_defs/`. There is no
   `python/` subfolder; `engine_bridge.py` is the boundary. TypeScript owns IR, CLI, adapters, gates.
2. **Local-first** — zero API keys must still yield a watchable MP4 (Piper, FFmpeg, free stock, caption cards).
3. **IR-centric** — no parallel final video format; ScenePlan and edit decisions resolve to Timeline IR.
4. **Dual orchestration, one knowledge** — assistant and `montara make` read the same `skills/`.
5. **Never hard-fail** — degrade with logged decision; always prefer a working MP4 over a crash.
6. **Test-gated** — red `verify` or `validate` = phase not done.
7. **Runtime honesty** — never claim native Remotion/HyperFrames/CLIP because a package name exists.
8. **Open + attributed** — AGPL-3.0; see [NOTICE](./NOTICE) and [docs/ATTRIBUTION.md](./docs/ATTRIBUTION.md).

---

## 3. Montara moat

Complete these to **win everywhere**, not just tie:

| # | Moat capability | Status | Baseline has it? |
|---|-----------------|--------|---------------------|
| M1 | **Editable Timeline IR** as canonical format | ☑ design + core | No |
| M2 | **Pro-editor export** (EDL, OTIO, FCPXML) on every render | ☑ | No |
| M3 | **Pro-editor import** (round-trip edit in Premiere/DaVinci/FCP) | ☑ | No |
| M4 | **`montara` CLI** as first-class entry (not agent-only) | ◐ | No |
| M5 | **Local LLM orchestrator** (`montara make` via Ollama/LM Studio) | ◐ | No (planned upstream) |
| M6 | **`runtimes` manager** (one-click ComfyUI/A1111/Piper/Whisper) | ◐ | ComfyUI/A1111/Piper/Faster Whisper/Transformers.js dry-run manager + model inventory shipped; GUI integration pending |
| M7 | **Web GUI** (`montara serve`) | ☐ | No |
| M8 | **WARCUT desktop GUI** on same IR | ☐ | No |
| M9 | **Runtime honesty layer** (maturity labels, ARCHITECTURE truth) | ☑ | No |
| M10 | **Playwright auth browser capture** (`storageState` workflow) | ◐ | No |
| M11 | **Content-aware reel planner** (topic overlays, not template hooks) | ◐ | No |
| M12 | **Documentary evidence craft** (generalized, source-backed) | ☑ skill | Partial |
| M13 | **Voice/hear intelligence** (LUFS, pace, Resemblyzer, scene-mapped music) | ◐ | Partial |
| M14 | **Dual orchestration** (assistant + Montara orchestrator, same skills) | ◐ | Agent-only |
| M15 | **Stronger CI** (verify + validate + typecheck + pytest) | ☑ | Weaker CI |

**Moat completion bar:** M1–M3 ☑, M9 ☑, M12 ☑, M15 ☑ — **5/15 done**. Remaining moat work is Stages 3–5 below.

---

## 4. Architecture (current)

```text
user / agent / CLI
  → skills/ + AGENT_GUIDE.md
  → understand / hear / research / quality (TS + Python tools)
  → Timeline IR (@montara/core)
  → render adapter (ffmpeg default; remotion/hyperframes/… runtime-gated)
  → MP4 + self-review
  → export: EDL / OTIO / FCPXML (@montara/bridge)

Python engine (tools/, lib/) ←engine_bridge.py→ @montara/engine
```

Full matrix: [docs/ARCHITECTURE.md](./docs/ARCHITECTURE.md).

---

## 5. Master roadmap — stages at a glance

| Stage | Name | Goal | Completion |
|-------|------|------|------------|
| **0** | Foundation & honesty | Runnable repo, gates, honest docs, CI | **100%** |
| **1** | Engine parity | Same pipelines, tools, governance, offline path | **100% exit-complete** |
| **2** | Native composition | Remotion + HyperFrames as real defaults, not FFmpeg solids | **~45%** |
| **3** | Moat core | IR import, local LLM, CLI completeness, capture, craft gates | **~40%** |
| **4** | Public trust and experience | README demos, agent guide depth, live providers, vision | **~40%** |
| **5** | Product surface | runtimes, web GUI, WARCUT, public launch | **~5%** |

---

## 6. STAGE 0 — Foundation & honesty 🎯 (wrap remaining ~15%)

### 0.1 Documentation & agent contract

| ID | Task | Status | Acceptance |
|----|------|--------|------------|
| 0.1.1 | Honest README with status table | ☑ | [README.md](./README.md) |
| 0.1.2 | AGENT_GUIDE with Timeline IR first + runtime honesty | ☑ | [AGENT_GUIDE.md](./AGENT_GUIDE.md) |
| 0.1.3 | Add onboarding section → `skills/meta/onboarding.md` | ☑ | AGENT_GUIDE links it for vague first messages |
| 0.1.4 | Expand AGENT_GUIDE to production depth | ☑ | Pipeline inventory, tool protocols, checkpoint detail |
| 0.1.5 | ARCHITECTURE.md runtime truth | ☑ | [docs/ARCHITECTURE.md](./docs/ARCHITECTURE.md) |
| 0.1.6 | PROVIDER-AUDIT.md | ☑ | [docs/PROVIDER-AUDIT.md](./docs/PROVIDER-AUDIT.md) |
| 0.1.7 | SKILL-ROADMAP.md | ☑ | [docs/SKILL-ROADMAP.md](./docs/SKILL-ROADMAP.md) |
| 0.1.8 | PROMPT_GALLERY.md | ☑ | Expanded to broad production coverage |
| 0.1.9 | Sync MONTARA-PARITY.md with this PLAN | ☑ | Same ☑/◐/☐; correct verify/validate/pytest counts |
| 0.1.10 | Update CAPABILITY-SNAPSHOT date + Playwright row | ☑ | Reflects 2026-06-29 state |
| 0.1.11 | Remove all stale `python/` path references | ☑ | Architecture and bridge docs updated |

### 0.2 Legal & repo hygiene

| ID | Task | Status | Acceptance |
|----|------|--------|------------|
| 0.2.1 | `LICENSE` (AGPL-3.0 full text) | ☑ | Root file |
| 0.2.2 | `NOTICE` (upstream + Montara attribution) | ☑ | Root file |
| 0.2.3 | `docs/ATTRIBUTION.md` dependency list | ☑ | Major deps and runtime/license notes |
| 0.2.4 | `.gitignore` — `out/`, `.python-packages/`, `node_modules/`, auth state | ☑ | Runtime artifacts/auth state ignored; source docs tracked |
| 0.2.5 | `montara doctor --fix` guided setup | ☑ | FFmpeg, Node, Piper, optional Playwright/Remotion hints |

### 0.3 CI & gates

| ID | Task | Status | Acceptance |
|----|------|--------|------------|
| 0.3.1 | GitHub Actions: typecheck + verify + validate + pytest | ☑ | [.github/workflows/ci.yml](./.github/workflows/ci.yml) |
| 0.3.2 | Native render smoke job (continue-on-error) | ☑ | `pnpm montara -- engines` |
| 0.3.3 | Document gate counts in README | ☑ | Latest local typecheck/verify/validate/pytest snapshot |
| 0.3.4 | Pre-commit or PR template referencing gates | ☑ | `.github/pull_request_template.md` |

**Stage 0 exit criteria:** complete after `0x26` when gates are green.

---

## 7. STAGE 1 — Engine parity (exit-complete)

Goal: **Every core engine capability** available through Montara (Python tools and/or TS
boundary) with offline fallbacks. Track detail in [docs/MONTARA-PARITY.md](./docs/MONTARA-PARITY.md).

### 1A — Python engine & bridge

| ID | Task | Status | Acceptance |
|----|------|--------|------------|
| 1A.0 | Engine at repo root (not `python/`) | ☑ | tools 116, lib 18 |
| 1A.1 | `engine_bridge.py` info + verify | ☑ | AST parse lib+tools |
| 1A.2 | Timeline bridge (composition ↔ IR) | ☑ | `@montara/engine` tests green |
| 1A.3 | CLI invokes bridge deliberately | ☑ | `montara` engine subcommands + `montara stage1-audit` |
| 1A.4 | Wire high-value Python tools from CLI | ☑ | `montara compose`; `montara corpus sources|seed-fixture|build|search|stats|get` |
| 1A.5 | Contract tests (pytest) parity with upstream | ☑ | 34 test files |
| 1A.6 | `playwright_recorder` in registry | ☑ | Auto-discovered via pkgutil |
| 1A.7 | `playwright_recorder` pytest (mock or smoke) | ☑ | `tests/capture/test_playwright_recorder.py` |
| 1A.8 | Update `tools/capture/__init__.py` docstring | ☑ | Mentions FFmpeg, Cap, Playwright, selector |

### 1B — Pipelines (12 + Montara extras)

| ID | Pipeline | Status | Notes |
|----|----------|--------|-------|
| 1B.01 | animated-explainer | ☑ | manifest + stage skills |
| 1B.02 | animation | ☑ | |
| 1B.03 | avatar-spokesperson | ☑ | |
| 1B.04 | cinematic | ☑ | |
| 1B.05 | clip-factory | ☑ | |
| 1B.06 | documentary-montage | ☑ | Offline fixture corpus -> `clip_search` -> `video_compose` MP4 validate-gated |
| 1B.07 | hybrid | ☑ | |
| 1B.08 | localization-dub | ☑ | |
| 1B.09 | podcast-repurpose | ☑ | |
| 1B.10 | screen-demo | ☑ | Offline capture artifact -> `montara capture pick-latest` -> `video_compose` MP4 validate-gated |
| 1B.11 | talking-head | ☑ | |
| 1B.12 | character-animation | ☑ | |
| 1B.13 | framework-smoke | ☑ | test harness |
| 1B.14 | kinetic-typography | ☑ | promoted to `pipeline_defs/` with HyperFrames-aware stage directors |

**1B pipeline validate gap is now closed.** Keep future pipeline work focused on deeper native runtime quality and source-specific treatment, not basic MP4 proof.

### 1C — Providers & tools (parity categories; parity gate closed)

| Category | Status | Remaining work |
|----------|--------|----------------|
| **C** Video providers (14 cloud + local + stock) | ◐ | Google Veo + Runway request shapes refreshed against official docs; every cloud video tool (kling/grok/minimax/heygen/higgsfield/veo/runway) now exposes an offline-testable `build_request()` with pytest parity; live executor audit per PROVIDER-AUDIT still pending |
| **D** Image providers (10) | ◐ | TS + Python; OpenAI/BFL/Google/Grok/Recraft image tools expose `build_request()` with pytest parity; Google Interactions API request shapes fixture/request-builder gated |
| **E** Audio/TTS/music | ◐ | Piper local path; mixer/enhance via FFmpeg; ElevenLabs/Google/OpenAI/Doubao TTS + Suno/ElevenLabs music tools expose `build_request()` with pytest parity |
| **F** Post/enhancement | ◐ | Model enhancers runtime-gated |
| **G** Analysis/understanding | ◐ | Reference analysis ☑ in verify; optional Transformers.js CLIP frame classification path + `montara understand` CLI proof; BLIP/cached-weight validate pending |
| **H** Intelligence (research, corpus, scoring) | ◐ | TS ports exist; Python corpus has CLI build/search/status surface |
| **I** Governance (pre-compose, self-review, budget) | ◐ | quality package; `montara budget` CLI ☑ |
| **J** Styles (3) + output profiles (6) | ☑ | verify green |
| **K** Agent layer (skills, schemas, checkpoints) | ◐ | skills ☑; `montara resume` checkpoint CLI ☑ |

### 1D — Composition engines (honest registry)

| Engine | Status | Next task |
|--------|--------|-----------|
| FFmpeg | ☑ working | Keep as universal floor |
| Remotion | ☑ native Timeline route | `REMOTION_ENABLED=1` routes Timeline IR through native Remotion; FFmpeg remains visible fallback |
| Revideo | ◐ runtime-gated | Native adapter/probe exists; installed-runtime MP4 validate proof is Stage 2 |
| Motion Canvas | ◐ runtime-gated | Native adapter/probe exists; installed-runtime MP4 validate proof is Stage 2 |
| HyperFrames | ◐ native smoke | Strict kinetic smoke via `hyperframes_compose`; `montara compose` can call `video_compose` artifacts |
| three.js | ◐ | Native headless proof, not fallback only |
| Manim | ◐ | Native when `manim` installed |
| Blender | ◐ | Proof exists; document in README |
| Playwright | ◐ capture | CLI: `montara capture --url`; auth via `montara capture login` |
| Spline | ☐ planned | Defer until contract clear |

**Stage 1 exit criteria:** closed by `montara stage1-audit` (4/4 sections, 21/21 checks) plus the existing `verify`/`validate` MP4 proofs. Remaining native-render and live-key maturity items are handed off to Stages 2-4 instead of blocking Stage 1.

---

## 8. STAGE 2 — Native composition quality

Montara must make Remotion, HyperFrames, and future native renderers feel like first-class
composition paths instead of decorative fallback demos.

| ID | Task | Status | Acceptance |
|----|------|--------|------------|
| 2.1 | **Native Remotion render** in validate | ☑ | Real spring/caption MP4, not FFmpeg solids |
| 2.2 | Remotion as default when `REMOTION_ENABLED` + composer installed | ☑ | Timeline IR -> Remotion props -> native `Explainer` render; `montara make/render` use it when enabled |
| 2.3 | **HyperFrames compose** E2E through Python `hyperframes_compose` | ☑ | validate case: kinetic typography MP4 |
| 2.4 | `make setup` equivalent: `montara doctor --fix` + HyperFrames cache-warm | ☑ | `doctor --fix` surfaces `npx --yes hyperframes doctor` and cache-warm command; validate smoke covers it |
| 2.5 | Revideo MIT fallback auto-switch | ☑ | `selectCompositionEngine` + `montara recommend --open-license-only` choose open-licensed fallback deterministically |
| 2.6 | Motion Canvas native package | ◐ | `@montara/render-motioncanvas` package + kinetic-typography picker default exist; installed-runtime MP4 proof still pending |
| 2.7 | Documentary montage: CLIP corpus + real footage stitch | ☑ | `validate` now builds a 60s provenance-aware open-stock corpus proof, selects non-reused rows with `clip_search.select_slots`, writes asset/selection artifacts, and composes a real MP4 |
| 2.8 | Character animation: HyperFrames SVG rig → final MP4 | ☑ | validate helper renders `out/validate-character-animation/final.mp4` when HyperFrames is available, otherwise reports runtime blocker honestly |

**Stage 2 exit criteria:** 2.1 + 2.3 + 2.4 + 2.5 + 2.7 + 2.8 green in `validate` or report runtime blockers honestly; README embeds native-composition demo videos. Motion Canvas remains an installed-runtime proof item, not a false native claim.

---

## 9. STAGE 3 — Moat core (unique advantages)

| ID | Task | Status | Acceptance |
|----|------|--------|------------|
| 3.1 | Auto-export EDL+OTIO+FCPXML on every `montara render` | ☑ | `montara render <ir.json> [out.mp4]` writes MP4 plus `.edl`, `.otio`, `.fcpxml` beside it by default; opt out with `--no-editor-exports` |
| 3.2 | **Editor import** `montara import <fcpxml\|otio\|edl>` → Timeline IR | ☑ | Round-trip test green (verify) |
| 3.3 | **Local LLM** drives `montara make` (Ollama/LM Studio) | ☑ | `montara make --brain` uses Ollama/LM Studio/llama.cpp when reachable and deterministically falls back to the local planner; validate renders MP4 with no cloud key |
| 3.4 | `montara budget` (estimate/reserve/reconcile) | ☑ | Wraps `tools/cost_tracker.py`; pytest contract green |
| 3.5 | `montara analyze <url\|file>` reference-video CLI | ☑ | Local files run frame/audio reference analysis; URLs emit an honest research/materialization preflight until captured/downloaded |
| 3.6 | `montara capture` (Playwright + desktop selector) | ☑ | Wraps screen_capture_selector + playwright_recorder |
| 3.7 | Documentary evidence craft **gates** in quality package | ☑ | `documentaryEvidenceGate` blocks unsourced claims and unsupported precise maps; warns on static cold opens, missing score cues, and unverified transcript cuts |
| 3.8 | Reel factory with transcript-verified Shorts cuts | ☑ | `suggestTranscriptShortCuts` + `verifyShortCutsAgainstTranscript` enforce sentence-boundary cuts; reel CLI keeps editable IR/artifact output |
| 3.9 | `montara resume <project>` from checkpoint JSON | ☑ | `lib/checkpoint.py` wired; reports completed + next stage |
| 3.10 | Project workspace convention enforced | ☑ | `montara project init <name>` creates gitignored `projects/<name>/` artifacts/assets/auth/renders/hyperframes layout with manifest |
| 3.11 | SpeechBrain optional backend in `@montara/hear` | ◐ | Optional status probe reports SpeechBrain/Resemblyzer/pyannote availability without hard-failing |
| 3.12 | Real CLIP/BLIP in `@montara/understand` | ◐ | Optional local Transformers.js CLIP classification path + `montara understand --vision`; keep signalstats default until cached-weight and BLIP/caption validation land |
| 3.13 | Senior-taste gate + in-timeline generation slot | ☑ | `montara taste` scores junior assembly tells and applies safe fixes; `planInTimelineGeneration` parks generate/extend/upscale on the media clip |
| 3.14 | Small-model motion compiler | ☑ | `montara direct` turns four slots into a senior Timeline IR, a GSAP document, and 16:9 / 9:16 / 1:1 variants; invalid model output falls back to the idea; spoken undo restores the same timeline |

**Stage 3 exit criteria:** 3.1-3.10 and 3.13-3.14 ☑, 3.11-3.12 ◐; moat items M3, M4, M5, M10, M11, M12 → ☑ or ◐ with validate.

---

## 10. STAGE 4 — Public trust and experience

| ID | Task | Status | Acceptance |
|----|------|--------|------------|
| 4.1 | README with deep demos, costs, and embedded videos | ☑ | Local demo gallery, commands, outputs, costs, runtime truth |
| 4.2 | Public demo gallery (`assets/` + docs/DEMOS.md) | ☑ | Each demo records prompt, pipeline, tools, runtime, cost, artifact |
| 4.3 | AGENT_GUIDE parity + onboarding | ☑ | 0.1.3 + 0.1.4 |
| 4.4 | PROMPT_GALLERY full coverage | ☑ | 0.1.8 |
| 4.5 | Live BYOK provider executors + sanitized fixture tests | ◐ | TS executor + all-cloud sanitized fixtures + dry-run/live smoke harness + `providers live-audit` readiness ledger; Python OpenAI/BFL request builders; real-key confirmations pending |
| 4.6 | `skills/core/native-render-validation.md` | ☑ | Native-vs-fallback proof and MP4 QA guidance added |
| 4.7 | `skills/core/provider-audit.md` | ☑ | Official-doc checks, redacted fixtures, dry-run/live BYOK smoke protocol |
| 4.8 | YouTube/community launch plan | ☑ | `docs/LAUNCH-PLAN.md` maps proof videos, commands, artifacts, caveats, and launch checklist |
| 4.9 | Compare report automation (`montara status` vs upstream) | ☑ | CLI emits JSON/human local capability + upstream comparison report |

**Stage 4 exit criteria:** New user reproduces 5 gallery demos from Montara docs alone; agent-only workflow matches the quality bar.

---

## 11. STAGE 5 — Product surface (long-term moat)

| ID | Task | Status | Acceptance |
|----|------|--------|------------|
| 5.1 | `packages/runtimes` — ComfyUI/A1111/Piper/Whisper/Transformers.js install/health | ☑ | Health/status, install/launch dry-runs, opt-in `--execute`, env writers, script generation, and model/cache inventory shipped |
| 5.2 | `packages/sdk` public API | ☐ | Same as CLI capabilities |
| 5.3 | `packages/web` — `montara serve` timeline editor | ☐ | Edits IR, triggers render |
| 5.4 | WARCUT desktop GUI on IR | ☐ | Separate repo or monorepo package |
| 5.5 | Spline bridge | ☐ | After 2.x composition stable |
| 5.6 | Python-free core (phased module replacement) | ☐ | Only with parity tests per module |

**Stage 5 exit criteria:** M6, M7, M8 ☑; Montara usable without any external coding assistant.

---

## 12. Preserved TypeScript ports (do not discard)

| Commit era | Area | Role today |
|------------|------|------------|
| P0–P3 (`0x0d`–`0x10`) | tool contract, config, quality, corpus | Adapter seams + fidelity tests around Python engine |

Replace Python only when: parity tests pass, gates green, boundary improves.

---

## 13. Pipeline flow (all stages)

```text
research → plan → script → assets → edit → Timeline IR → render → QA → master → export
```

Quality hooks (from documentary evidence craft + reviewer):

- Pre-compose: slideshow-risk, delivery promise, runtime approval
- Post-render: ffprobe, 4-position frames, audio silence/clip, LUFS
- Master: one pass ~−14 LUFS / −1 dBTP for social delivery

---

## 14. Runnability guarantee

A phase is **not done** unless:

1. `pnpm typecheck` — green  
2. `pnpm verify` — green (all contract assertions)  
3. `pnpm validate` — green (real MP4 artifacts under `out/` or project workspace)  
4. `python -m pytest tests` — green when Python changed  
5. New capability has ☑ in this PLAN and MONTARA-PARITY  
6. Docs updated if user-facing behavior changed  

---

## 15. Licensing (Stage 0 blocker for public publish)

- ☑ `LICENSE` — full AGPL-3.0  
- ☑ `NOTICE` — Montara notices and source/dependency attribution
- ☑ `docs/ATTRIBUTION.md`  

See [docs/ATTRIBUTION.md](./docs/ATTRIBUTION.md).

---

## 16. Risks (unchanged, honest)

- Native render paths are the main quality gap to keep closing.
- Cloud APIs drift — PROVIDER-AUDIT must stay current.
- Runtime automation stays opt-in and external; no model weights are bundled, and dry-runs remain the default.
- Stars/community are not guaranteed; **runnable demos + honesty** are controllable.

---

## 17. Immediate next tasks (ordered — start here)

When you say "continue the plan," work **top to bottom**:

| Priority | ID | Task | Est. |
|----------|-----|------|------|
| ✅ | 0.1.9 | Sync `docs/MONTARA-PARITY.md` with this PLAN (☑/◐/☐, counts) | done |
| ✅ | 0.2.1–0.2.2 | Add `LICENSE` + `NOTICE` | done |
| ✅ | 0.1.3 | AGENT_GUIDE onboarding section | done |
| ✅ | 1A.7 | pytest for `playwright_recorder` | done |
| ✅ | 3.6 | `montara capture` CLI wrapping Playwright tool | done |
| ✅ | 2.1 | Native Remotion validate case | done |
| ✅ | 2.3 | HyperFrames E2E validate case | done |
| ✅ | 1B.14 | Promote kinetic-typography to `pipeline_defs/` | done |
| ✅ | 1A.4 | CLI wire `video_compose` + `corpus_builder` | done |
| ✅ | 4.1 | README demo gallery | done |
| ✅ | 4.2 | Public demo gallery (`assets/` + docs/DEMOS.md) | done |
| ✅ | 4.5A | TS provider executor + first-wave sanitized fixtures | done |
| ✅ | 4.5B.1 | Python OpenAI/BFL image request-shape audit | done |
| ✅ | 4.5B.2 | Remaining provider fixtures + live-key smoke harness | done |
| ✅ | 4.6 | `skills/core/native-render-validation.md` | done |
| ✅ | 4.7 | `skills/core/provider-audit.md` | done |
| ✅ | 4.8 | YouTube/community launch plan | done |
| ✅ | 4.9 | Compare report automation (`montara status` vs upstream) | done |
| ✅ | 5.1A | `packages/runtimes` ComfyUI/A1111 health + install guidance | done |
| ✅ | 5.1B | Managed install/launch automation for ComfyUI/A1111 | done |
| ✅ | 5.1C | Add Piper, Faster Whisper, Transformers.js runtime plans + model/cache inventory | done |
| ✅ | 1B.06 | `documentary-montage` offline stock-footage MP4 validate path | done |
| ✅ | 1B.10 | `screen-demo` offline MP4 validate path using capture artifacts | done |
| ✅ | 2.2 | Remotion default Timeline routing instead of smoke-only proof | done |
| ✅ | 2.7 | 60s documentary open-stock corpus montage beyond fixture proof | done |
| ✅ | 3.1 | Auto-export EDL/OTIO/FCPXML beside renders | done |
| ✅ | 1G.1 | Optional Transformers.js CLIP path + `montara understand --vision` CLI proof | done |
| ✅ | 1C.1 | Official-doc provider request-shape refresh for Google, Runway, OpenAI, and BFL | done |
| ✅ | 1C-K.1 | Offline-testable `build_request()` + pytest across all cloud video/image/TTS/music Python tools | done |
| ✅ | 1C-K | Stage 1 residual partials audit + next highest-risk closure | done via `montara stage1-audit` |
| 🎯 2 | 2.6 | Motion Canvas installed-runtime MP4 proof | Runtime-gated native proof |
| ✅ | 3.3/3.5/3.7/3.8/3.10 | Local brain fallback, URL analysis preflight, evidence gates, transcript Shorts gates, project workspace CLI | done |
| 🎯 3 | 3.11-3.12 | Remaining runtime-gated Stage 3 moat partials | Optional speaker/vision runtime hardening |
| ✅ | 4.5C | Provider live-readiness ledger across cloud providers without secrets | done |
| 🎯 4 | 4.5D | Real live-key provider smoke confirmations where keys are available | External BYOK follow-up |
| 🎯 5 | 5.2 | Public SDK after Stage 1-4 gaps are reduced | Stage 5 follow-up |

---

## 18. Related documents

| Document | Purpose |
|----------|---------|
| [README.md](./README.md) | User-facing quick start + honest status |
| [AGENT_GUIDE.md](./AGENT_GUIDE.md) | Agent operating contract |
| [PROMPT_GALLERY.md](./docs/PROMPT_GALLERY.md) | Copy-paste production prompts |
| [docs/ARCHITECTURE.md](./docs/ARCHITECTURE.md) | Runtime truth matrix |
| [docs/MONTARA-PARITY.md](./docs/MONTARA-PARITY.md) | Parity checklist (sync with §7) |
| [docs/PROVIDER-AUDIT.md](./docs/PROVIDER-AUDIT.md) | BYOK live executor notes |
| [docs/SKILL-ROADMAP.md](./docs/SKILL-ROADMAP.md) | Layer 2/3 skill absorption plan |
| [docs/CAPABILITY-SNAPSHOT.md](./docs/CAPABILITY-SNAPSHOT.md) | Point-in-time capability photo |
| [PROJECT_CONTEXT.md](./docs/PROJECT_CONTEXT.md) | Architecture conventions |

---

## 19. How to use this plan for "detailed analysis"

When asked for a gap analysis:

1. Read **§5 Master roadmap** for stage completion %.  
2. Read **§6–§11** for item-level ☑/◐/☐.  
3. Run gates locally; compare counts to §Snapshot.  
4. Compare **§ Production Readiness Score** to the current local proof surface.
5. Report **§17 Immediate next tasks** as the backlog head.  

No analysis is complete without running `pnpm verify` and `pnpm validate` on the
machine under test.

---

*Montara wins when Stages 0–2 harden the engine, Stage 3 ships the moat, and Stages 4–5 make it the default choice for local-first, IR-native, editor-bridge video production.*
