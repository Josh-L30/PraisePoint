# S04 acceptance map

Passing: 16 dedicated unit/component checks plus earlier-suite extensions for editor-only overlays and saved checkpoints; three production browser cases; all S01–S04 hosted rollback suites. Combined totals: 98 unit/component, 24 browser and eight live anonymous API checks; lint/typecheck/build passed. [Sprint evidence](../../../docs/sprints/S04.md).

Geometry: scale/letterbox mapping, finite dimensions, bounds, numeric-only rectangle validation, alignment. History: one-entry gestures, literal words, cancellation, saved edit identities, fresh duplicate IDs, content/order preservation and memory caps. Components: 1/Shift10 keyboard movement/resizing, ignored text-field shortcuts and numeric/native button alternatives. Browser: actual pointer capture, saved scaled geometry, undo/redo, layers/names, thumbnail drag, constrained desktop reflow, cancellation and visible overflow without truncation.

Database tests validate optional labels and compatibility; older authorization/revision/capacity regressions also pass. UI API fixtures are separate from hosted database authorization evidence. Real image insertion/placement remains S06; physical rehearsal remains S10.
