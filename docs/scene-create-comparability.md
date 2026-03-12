# Scene Create Benchmark Comparability Note

## Summary

In the current GoPeak CLI-vs-MCP validation round, `scene_create` is **not** a fair head-to-head benchmark family yet.

The narrow CLI prototype can execute a headless scene-creation path in the selected benchmark setup, but the compact MCP `scene.create` path currently depends on the Godot editor/plugin bridge in that same setup. Because the two surfaces are not reaching a cleanly comparable runtime path, the benchmark result for this family must remain **non-comparable**.

## Current evidence

Validated benchmark artifacts show:
- CLI `scene_create` completed in the benchmark harness.
- MCP compact `scene.create` did not complete in the same headless setup.
- The benchmark classification therefore remains `non_comparable`.

This means the current validation round can support:
- a comparable result for `script_modify`,
- a comparable result for `validate_project`,
- but **not** a trustworthy CLI-vs-MCP claim for scene creation.

## Why this matters

Scene creation is one of the most intuitive workflows people will use when they judge whether CLI or MCP feels better. If we present it as a normal benchmark family before the execution paths are aligned, we risk comparing environment differences instead of interface costs.

## What must happen next

One of these strategies should be adopted before `scene_create` is used as headline benchmark evidence:

1. **Plugin-backed editor lane**
   - Run both surfaces in a reproducible editor/plugin-backed setup.
   - Treat editor availability as part of the benchmark contract.

2. **Shared non-editor path**
   - Route the compact MCP path through an explicitly shared, headless-capable execution seam when the benchmark is evaluating minimal scene creation.
   - Keep richer editor-coupled behavior outside the benchmarked path.

## Decision rule

Until one of those strategies is implemented and rerun:
- `scene_create` should stay marked **non-comparable**,
- docs/PRs should avoid calling it a CLI or MCP win,
- product conclusions should rely on the comparable families only.

## References

- `docs/gopeak-cli-vs-mcp-validation.md`
- `artifacts/worker1-shared-path-map.md`
- `artifacts/worker4-benchmark-report.json`
- `artifacts/worker4-evidence-normalized.json`
