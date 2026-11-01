# OpenCAD current implementation status

**Status:** active prototype. This document reflects the checked-in source
tree inspected on 2026-11-01; it is not a release qualification or a claim of
professional CAD parity.

## Geometry and modeling

The current geometry pipeline is based on custom TypeScript mesh generators,
Three.js, and `three-bvh-csg`. It is not backed by OpenCASCADE or another
full B-rep kernel.

| Capability | Current implementation evidence | Boundary |
|---|---|---|
| Primitive geometry | Box, cylinder, sphere, cone, torus, and hole mesh generators | Triangle mesh output |
| Sketch-based operations | Extrude and revolve profile generators; custom Newton-Raphson constraint solver | Constraint solver is custom; no SolveSpace kernel |
| Feature operations | Extrude, revolve, cut, sweep, loft, boolean union/subtract/intersect, shell, fillet, chamfer | Mesh/CSG implementation; not exact B-rep feature semantics |
| Repetition/transforms | Linear/circular patterns, mirror, assembly transforms | Validate complex topology and downstream operations |
| Import geometry | STL and OBJ importers | No STEP/IGES import |
| Export geometry | STL, OBJ, GLB, and 3MF exporters | No STEP/IGES export |
| Native project | Project serialization/deserialization | Native project format is application-specific |

## Application and persistence

- React 19, Vite, TypeScript, Three.js, React Three Fiber, and Zustand.
- IndexedDB-backed project persistence is present.
- PWA manifest/service-worker scaffolding exists; installability and offline
  behavior remain deployment/browser test items in the historical task list.
- Yjs CRDT and a `y-webrtc` provider are present with unit tests. This does
  not establish reliable collaboration across arbitrary NATs, networks, or
  production deployments.
- A plugin architecture is present in the source tree; extension compatibility
  and security boundaries need separate qualification.
- Cloudflare Pages configuration exists. The repository's current task list
  still records first deployment/live URL verification as incomplete; do not
  claim a production deployment from configuration alone.

## Commands

From the repository root:

```bash
npm install
npm run dev
npm run typecheck
npm run lint
npm run test
npm run build
npm run pages:dev
npm run pages:deploy
```

The package scripts do not define `npm run deploy`; use
`npm run pages:deploy`. Deployment requires Wrangler authentication and a
configured Cloudflare Pages project.

## Historical planning documents

`docs/PROGRESS.md`, `docs/TASKS.md`, and `docs/PLAN.md` were last updated
2026-03-30/29 and are retained as historical planning snapshots. Their
"90%" progress figure and unchecked deployment/OCCT tasks are not current
release metrics. This file and the source tree should be used for current
capability claims.

## Release-readiness work still required

1. Add browser E2E tests for primitive → sketch → feature → save/reload →
   import/export workflows.
2. Validate topology and numeric robustness for booleans, shell, fillet,
   chamfer, sweep, and loft on adversarial geometry.
3. Define the supported units, tolerances, coordinate conventions, and
   geometric precision contract.
4. Verify collaboration with two independent browsers and document signaling,
   STUN/TURN, persistence, and privacy boundaries.
5. Test PWA install/offline behavior on supported browsers.
6. Publish an explicit supported-format matrix and reject unsupported STEP/
   IGES files with clear errors.
7. Only consider a B-rep kernel integration after documenting the exact
   operations and formats that require it.

