# OpenCAD — AI Agent Guide

OpenCAD is an open-source, web-native parametric 3D CAD platform. Think OnShape or Fusion 360, but running entirely in the browser.

## Stack

- **React 19** + **TypeScript 5.9** + **Vite 8**
- **Three.js** via React Three Fiber (R3F) for 3D rendering
- **Zustand** for state management
- **Yjs** CRDT for real-time collaboration (y-webrtc, y-indexeddb)
- **opencascade.js** (OpenCASCADE WASM) for CAD kernel — runs in Web Worker
- **IndexedDB** (via `idb` library) for local persistence
- Deployment: **Cloudflare Pages** (static hosting, $0 budget)

## Architecture

**Client-only SPA. No server at runtime.** All computation happens in the browser.

```
Browser
├── React UI (components/)
│   ├── AppLayout — shell: menu bar, toolbar, panels, viewport
│   ├── CommandPalette — Ctrl+K command search
│   ├── DocumentDashboard — document management
│   ├── FeatureTree — feature tree panel
│   ├── PropertiesPanel — parameter editing
│   ├── Viewport — Three.js 3D view
│   └── SketchCanvas/SketchToolbar — 2D sketching overlay
├── Zustand Stores (stores/)
│   ├── cad-store — document, features, selection, tools
│   ├── view-store — display mode, grid, axes, shadows
│   ├── ui-store — panel visibility, command palette, theme
│   ├── collab-store — peer list, connection state
│   └── sketch-store — sketch elements, constraints, tools
├── CAD Core (cad/)
│   ├── kernel/ — mesh generators (box, cylinder, sphere, cone, torus), Web Worker
│   ├── features/ — feature registry, engine, dependency graph
│   ├── io/ — STL/OBJ/glTF import/export, IndexedDB persistence, .ocad project files
│   ├── analysis/ — measurement (distance, volume, surface area, bounds)
│   ├── sketcher/ — constraint solver, snap engine
│   └── collab/ — Yjs CRDT store, WebRTC sync
└── Hooks (hooks/)
    ├── useCADWorker — typed Web Worker communication
    └── useKeyboardShortcuts — command registry + key event handling
```

## Key Types

```typescript
// Feature node in the parametric feature tree
interface FeatureNode {
  id: string;              // nanoid-generated
  type: FeatureType;       // 'extrude' | 'sphere' | 'fillet' | etc.
  name: string;
  parameters: Record<string, unknown>;
  dependencies: string[];  // parent feature IDs
  children: string[];      // child feature IDs
  suppressed: boolean;
}

// Triangle mesh data (shared between kernel and exporters)
interface MeshData {
  vertices: Float32Array;  // [x,y,z, x,y,z, ...]
  normals: Float32Array;   // [nx,ny,nz, ...]
  indices: Uint32Array;    // [i0,i1,i2, ...]
}

// .ocad project file format
interface OpenCADProject {
  version: 1;
  name: string;
  created: number;
  modified: number;
  units: 'mm' | 'cm' | 'm' | 'in' | 'ft';
  features: FeatureNode[];
  sketches: SketchData[];
}
```

## FeatureType Values

`box`, `cylinder`, `sphere`, `cone`, `torus`, `extrude`, `revolve`, `extrude_sketch`, `revolve_sketch`, `cut`, `sweep`, `loft`, `shell`, `hole`, `fillet`, `chamfer`, `union`, `subtract`, `intersect`, `linear_pattern`, `circular_pattern`, `mirror`

## How to Add a New Feature Type

1. Add type to the `FeatureType` union in `src/types/cad.ts`
2. Call `registerFeature()` in `src/cad/features/feature-registry.ts` with parameter schema
3. Add mesh generation in `src/cad/kernel/mesh-generators.ts` (if geometric primitive)
4. Add handling in `src/cad/kernel/cad-worker.ts` message handler
5. Add `ToolType` in `src/types/cad.ts` if it needs a toolbar button
6. Write tests in `src/cad/features/feature-engine.test.ts`

## Conventions

- **Styling**: Inline CSS-in-JS (`style={{ ... }}`). Dark theme: `#0f172a` background, `#1e293b` panels, `#3b82f6` accent.
- **IDs**: `nanoid` for all generated IDs
- **Tests**: Vitest with `describe`/`it`/`expect`. Test files colocated: `foo.test.ts` next to `foo.ts`. `fake-indexeddb/auto` in test setup for IndexedDB tests. No jsdom globally (causes worker timeouts) — use `// @vitest-environment jsdom` per file if needed.
- **Stores**: Zustand with flat state + actions. Selector hooks for performance: `const tool = useActiveTool()`.
- **File I/O**: `.ocad` files are JSON (see `OpenCADProject` interface). Exporters return `ArrayBuffer` (STL, GLB) or `string` (OBJ).

## Commands

```bash
npm run dev          # Vite dev server
npm run build        # TypeScript check + Vite production build
npm test             # Vitest (all tests)
npm run test:coverage  # Vitest with coverage report
npm run pages:dev     # Wrangler Pages local dev
npm run pages:deploy  # Deploy to Cloudflare Pages
npm run mcp:dev      # Run MCP server locally
```

## Testing

- 378 tests across 24 test suites (root), all passing
- 20 tests in 2 MCP server suites, all passing
- Core modules target 80%+ coverage
- Mesh generators: pure math, no DOM needed
- Persistence: `fake-indexeddb/auto` for IndexedDB
- Keyboard shortcuts: mock KeyboardEvent objects (no jsdom)
- Collaboration: mock y-webrtc provider
- Client API: mocked stores and I/O modules
- MCP server: temp directory for file I/O tests

## Constraints

- No server-side code at runtime — everything runs in the browser
- No `any` types — use proper TypeScript types
- All CAD computation is client-side (Web Worker or main thread)
- $0 hosting budget — no serverless functions, no databases
- `opencascade.js` is large (~30MB WASM) — excluded from Vite optimization
