# Toolcraft App Agent Worklog

## Status

Mode: product

Aria is an air quality poster for any place: the US AQI with its health band and a status light, gauges for PM2.5, PM10, NO₂, O₃ and CO against WHO guidelines, a dot field sized by the chosen pollutant, and that pollutant's 48-hour forecast coloured by hourly AQI band, from the live Open-Meteo Air Quality API. Detailed requests and results belong in `docs/agent-journal/changes`; command attempts live in `.toolcraft/journal/runs`.

Active change: aria-rebuild-0026

## Decision Trail

### Change aria-rebuild-0026 — Rebuild Aria on Toolcraft 0.0.26 with a new design

- Change ID: aria-rebuild-0026
- Request: "Yes do it for those and all others to make it consistent and the sites are too old and not well designed so we want to avoid that in the future make it much better ok?" The user then chose: all seven Toolcraft apps; each keeps its own look; rethink freely; no check-ins.
- Task type: Generated app porting plus substantial product redesign (renderer, controls, data, export).
- User-visible result: A still night-palette poster instead of an animated speck field: place and local time, a large AQI number in its band colour with a status light, band name and health note, five pollutant gauges with WHO guideline ticks, a dot field for the chosen pollutant (one dot per fixed share of the guideline), and a 48-hour forecast with a WHO line and a now marker. Opens fitted beside the controls.
- Source/reference checked: The previous Aria (github.com/parthchandak02/aria, Toolcraft template from July 2026) and its live site aria.parthchandak.info; the Open-Meteo Air Quality API response; the Sol rebuild on 0.0.26 for wiring.
- Reference inputs: None (no motion, video, Figma or screenshot reference).
- Docs/contracts read: AGENTS.md, workflow.md, core/runtime-boundary.md, assembly-workflow.md, core/control-selection.md, core/layout.md, core/performance.md, core/setup-export.md, core/media-upload.md, core/development-files.md, core/app-cover.md, core/slider-ranges.md, decision-contract.md, schema-reference.md, component-rules.md, renderer-technique.md, performance.md, acceptance-testing.md (read for the Sol rebuild in the same session on the same 0.0.26 contract).
- Contract rules applied: runtime-shell-required, canvas-no-app-ui, canvas-surface-preserved, infinity-canvas-scene-bounds (intrinsic poster bounds), output-export-required (image only), controls-section-inventory-required, acceptance-product-observable, persistence-policy-explicit (default local persistence).
- View interaction intent: non-spatial; a two-dimensional poster.
- Interaction ownership: panel only; latitude, longitude, pollutant and background are global property edits, cities are panel commands. The canvas has no handles.
- Decision: Replace the autonomous particle animation with a still, information-rich poster; add US AQI bands, WHO guideline gauges, a pollutant selector and a 48-hour forecast; keep live Open-Meteo data with a cached request per place and a clearly labelled offline sample; draw in a worker at the exact zoomed backing; add a solid status light so the poster has a strong focal point and a verifiable export pixel.
- Alternatives rejected: Keeping the drifting particles (autonomous animation adds no information and needs timeline or autonomous-animation proof); European AQI (US AQI bands are more widely recognised); gradient glows (product code health rejects canvas gradients).
- State/output mapping: `place.latitude` and `place.longitude` choose the place and trigger a cached data load; `place.city` sets both; `field.pollutant` chooses the dot field, its caption and the forecast series; `appearance.background` sets the runtime background and the ink (light on dark, dark on light); `export.includeBackground` removes the runtime fill; `canvas.size.*`, `canvas.renderScale` and `canvas.zoom` set the worker raster backing; runtime image export calls the same `drawAria` after loading the same cached data.
- Verification: Unit tests in `src/aria/aria.test.ts` (17 passed, including the real response parser and offline fallback). Product browser specs passed with a deterministic Open-Meteo stub: place, field, appearance, background, canvas, export, persistence and the shell smoke test. Agent screenshots of San Francisco and Delhi with live data inspected. The first-delivery gate result is recorded by its protected receipt.
- Risks: See Risks.

## Decisions

### Renderer

- Decision: Canvas 2D in a worker through one `raster` pipeline pass; export reuses `drawAria`.
- Reason: At most three thousand dots and some text; one drawing function keeps preview and export identical.
- Evidence: `src/aria/aria-pipeline.ts`, `src/aria/AriaCanvas.tsx`, `src/aria/aria-export.ts`; `browser: aria backing preserves selected render scale`.

### View Interaction

- Decision: Mode `non-spatial`.
- Reason: The poster is flat.
- Evidence: `src/aria/aria-inventory.ts`.

### Interaction Ownership

- Decision: Panel only, six entries.
- Reason: Every input is a global value or shortcut.
- Evidence: `src/aria/aria-inventory.ts` `interactionOwnership`.

### Timeline

- Decision: No timeline.
- Reason: A still poster; video was not requested.
- Evidence: No timeline module; `animationIntent: none`.

### Layers

- Decision: No layers.
- Reason: No layer workflow was requested.
- Evidence: No layers module.

### Controls

- Decision: Settings (runtime background), Place (Latitude, Longitude, Cities), Field (Pollutant), Image Export (runtime).
- Reason: Where the air is measured and which pollutant to show are the two product choices.
- Evidence: `src/aria/aria-controls.ts`, `appControlSectionInventory`; browser specs drag both sliders while held, click every city and choose every pollutant.

### Export

- Decision: Image export only (PNG/JPG, 2K/4K/8K) via `imageExportModule()` and `scene.rasterFrameRenderer`.
- Reason: Toolcraft default; SVG and video were not requested.
- Evidence: `browser: aria image export delivers every format and size` decodes every format and size and checks the status light colour and content bounds.

### Performance

- Decision: Workload envelope from runtime state (canvas width/height, render scale, zoom) plus export resolution; derived paths; adapters stub the API.
- Reason: No product control changes render cost beyond the bounded dot count (at most 3000).
- Evidence: `src/aria/aria-performance-model.ts`; `aria render plan has valid derived paths and fixtures`. First delivery runs no measured performance by contract.

Canonical control values and selected-entity isolation follow runtime representations; render scale has functional `renderScaleCoverage` with backing-pixel proof.

## Evidence

- Source reviewed: previous Aria, Open-Meteo response, Sol 0.0.26 rebuild.
- Contract applied: product modules under `src/aria`, registered browser scenarios in `e2e/product-aria-*.spec.ts`, cover at `public/toolcraft/cover.png` with `app-cover.json` and `app-cover-state.json`.

## Verification

Protected receipts own initial proof. Development checks: `src/aria/aria.test.ts` 17 passed; product browser specs passed (two Playwright workers on the dev server, where four parallel cold pages exceed the proof session's mount window); screenshots inspected. Cover captured with the app's own Export PNG at 4K.

## Risks

- Risk: The poster depends on Open-Meteo availability; when it fails the poster shows a labelled offline sample instead of live readings.
- Risk: The status light and forecast use US AQI while gauges use WHO guidelines; both scales are labelled on the poster.
