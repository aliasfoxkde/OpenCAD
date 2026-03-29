# OpenCAD - Comprehensive Development Plan

**Version**: 1.0.0
**Last Updated**: 2026-03-29
**Status**: APPROVED

---

## Pre-Planning Research

### Research Questions

1. **What problem are we solving?**
   Professional 3D CAD software (OnShape, Fusion360, SolidWorks) costs $500-$7,000+/year, locks users into proprietary ecosystems, and provides limited collaboration. There is no open-source, web-native, professional-grade parametric CAD platform with real-time collaboration.

2. **Who are we solving it for?**
   Makers, hobbyists, indie engineers, open-source hardware developers, students, small engineering teams, and anyone who needs professional 3D CAD without the cost or vendor lock-in.

3. **What similar solutions exist?**
   - **OnShape**: Cloud-native, collaborative, but proprietary and expensive
   - **Fusion360**: Broad capabilities (CAD/CAM/CAE), but proprietary, desktop-heavy
   - **FreeCAD**: Open-source, but desktop-only, outdated UI, no collaboration
   - **OpenSCAD**: Script-based, no visual modeling
   - **SolveSpace**: Lightweight parametric, desktop-only
   - **CascadeStudio**: Browser-based, but script-only, abandoned
   - **JSCAD**: Script-based CSG in browser
   - **Zoo/KittyCAD**: API-first, commercial

4. **What makes our solution unique?**
   - Open-source (MIT license)
   - Web-native, not web-ported
   - Real-time collaboration via CRDTs (Yjs)
   - Local-first architecture (works offline, no server required)
   - $0 deployment on Cloudflare Pages
   - Professional parametric modeling via OpenCASCADE WASM
   - PWA for native-like experience
   - Extensible plugin architecture

### Research Findings

**Geometry Engine**: OpenCASCADE (via opencascade.js) is the only production-grade open-source BRep kernel available for the web. It provides boolean operations, fillets, chamfers, sweeps, lofts, and STEP/IGES import/export. Performance is 1.5-3x slower than native but sufficient for small-to-medium models.

**Rendering**: Three.js via React Three Fiber (R3F) is the standard for 3D rendering in React. WebGPU support is maturing (Chrome stable, Firefox/Safari in progress). Three.js handles only visualization -- all CAD math runs in opencascade.js.

**Collaboration**: Yjs is the leading CRDT library for JavaScript. It supports structured data (Y.Map, Y.Array), text editing, and has a mature ecosystem (y-websocket, y-webrtc, y-indexeddb). Perfect for CAD feature trees and offline-first operation.

**Constraint Solving**: SolveSpace's constraint solver is proven, lightweight, and handles all standard 2D geometric constraints. Can be compiled to WASM. Alternative: custom Newton-Raphson solver in TypeScript.

**Cloudflare Pages Free Tier**: Unlimited bandwidth, 500 builds/month, 10ms CPU time per function invocation. This means all CAD computation MUST run client-side (WASM in Web Workers). No Durable Objects ($0 budget).

### Technology Options

| Option | Pros | Cons | Verdict |
|--------|------|------|---------|
| **Vite + React + TypeScript** | Fast dev, huge ecosystem, CSR-first | Larger bundle than Svelte | CHOSEN |
| **Three.js + R3F** | Mature, WebGPU support, React integration | Not a CAD kernel | CHOSEN (rendering only) |
| **opencascade.js** | Full BRep kernel, STEP/IGES, WASM | 15-30MB WASM binary, manual memory mgmt | CHOSEN |
| **Yjs (CRDT)** | Lightweight, offline-first, structured data | Less mature than Automerge for JSON | CHOSEN |
| **Zustand** | Minimal, fast, TypeScript-first | Smaller ecosystem than Redux | CHOSEN |
| **Vitest** | Fast, Vite-native, good coverage | Newer than Jest | CHOSEN |
| **Cloudflare Pages** | $0, unlimited bandwidth, global CDN | 10ms CPU limit, no persistent storage | CHOSEN |
| **WebGPU** | Compute shaders, better perf | Not universal yet | Future target |
| **Svelte + SvelteKit** | Smaller bundle, simpler | Smaller ecosystem, less 3D support | Not chosen |
| **Babylon.js** | More features than Three.js | Heavier, less React integration | Not chosen |

---

## Architecture Overview

### System Architecture

```
+------------------------------------------------------------------+
|                     CLIENT (Browser / PWA)                        |
|                                                                   |
|  +-------------------+  +-------------------+  +----------------+ |
|  |  React UI Layer   |  |  Zustand Stores   |  |  Yjs CRDT     | |
|  |  - Toolbar        |  |  - cadStore       |  |  - FeatureTree| |
|  |  - FeatureTree    |  |  - viewStore      |  |  - Selections | |
|  |  - Properties     |  |  - sketchStore    |  |  - Sync State | |
|  |  - Viewport       |  |  - historyStore   |  |               | |
|  +--------+----------+  +--------+----------+  +-------+-------+ |
|           |                       |                      |        |
|  +--------v-----------------------v----------------------v------+ |
|  |                  React Three Fiber (R3F)                     | |
|  |  - Scene graph    - OrbitControls    - Selection              | |
|  |  - Mesh rendering - Grid/axes       - Gizmos                 | |
|  |  - WebGPU/WebGL2  - Raycasting      - Post-processing        | |
|  +---------------------------+----------------------------------+ |
|                              |                                     |
|  +---------------------------v----------------------------------+ |
|  |                  Web Worker (CAD Kernel)                      | |
|  |                                                              | |
|  |  +------------------+  +------------------+                  | |
|  |  | opencascade.js   |  | Constraint       |                  | |
|  |  | (WASM)           |  | Solver (WASM)    |                  | |
|  |  | - BRep modeling  |  | - 2D constraints |                  | |
|  |  | - Boolean ops    |  | - Sketch solve   |                  | |
|  |  | - Fillet/Chamfer |  |                  |                  | |
|  |  | - STEP/IGES I/O  |  |                  |                  | |
|  |  +------------------+  +------------------+                  | |
|  |                                                              | |
|  |  +---------------------------------------------------+       | |
|  |  | Feature Engine                                     |       | |
|  |  | - Dependency graph  - Parametric rebuild           |       | |
|  |  | - Feature registry  - Error recovery               |       | |
|  |  +---------------------------------------------------+       | |
|  +--------------------------------------------------------------+ |
|                                                                   |
|  +--------------------------------------------------------------+ |
|  | IndexedDB (Persistence)                                       | |
|  | - Documents  - Feature trees  - Thumbnails  - Settings        | |
|  +--------------------------------------------------------------+ |
+------------------------------------------------------------------+
                |                              |
                v                              v
+---------------------------+  +-----------------------------+
| Cloudflare Pages (Static) |  | Optional Sync Server        |
| - SPA hosting             |  | - WebSocket (y-websocket)   |
| - Global CDN              |  | - Peer-to-peer (y-webrtc)   |
| - $0 cost                 |  | - Offline-first design      |
+---------------------------+  +-----------------------------+
```

### Data Model

```typescript
// Core document structure
interface CADDocument {
  id: string;
  name: string;
  created: number;
  modified: number;
  version: number;
  // CRDT-backed feature tree
  features: Y.Map<FeatureNode>;
  // Version history
  history: Y.Array<HistoryEntry>;
  // Metadata
  metadata: Y.Map<unknown>;
  units: 'mm' | 'cm' | 'm' | 'in' | 'ft';
}

interface FeatureNode {
  id: string;
  type: FeatureType;
  parameters: Record<string, unknown>;
  dependencies: string[];  // IDs of upstream features
  suppressed: boolean;
  children: string[];      // IDs of downstream features
  sketchRef?: string;      // Reference to sketch data
}

type FeatureType =
  | 'sketch' | 'extrude' | 'revolve' | 'sweep' | 'loft'
  | 'fillet' | 'chamfer' | 'shell' | 'mirror' | 'pattern'
  | 'boolean_union' | 'boolean_subtract' | 'boolean_intersect'
  | 'hole' | 'thread' | 'rib' | 'draft';

interface Sketch {
  id: string;
  plane: SketchPlane;
  elements: SketchElement[];
  constraints: SketchConstraint[];
}

interface SketchElement {
  id: string;
  type: 'line' | 'arc' | 'circle' | 'ellipse' | 'spline' | 'point';
  geometry: Record<string, unknown>;  // Type-specific geometry data
  style?: LineStyle;
}

interface SketchConstraint {
  id: string;
  type: ConstraintType;
  elements: string[];  // IDs of constrained elements
  value?: number;      // For dimensional constraints
  reference?: string;  // Reference element for angle/distance
}

type ConstraintType =
  | 'coincident' | 'parallel' | 'perpendicular' | 'tangent'
  | 'horizontal' | 'vertical' | 'equal' | 'midpoint'
  | 'distance' | 'angle' | 'radius' | 'diameter' | 'fix';
```

### Technology Stack

- **Framework**: Vite 6 + React 19 + TypeScript 5.8
- **3D Rendering**: Three.js via React Three Fiber (R3F) + Drei helpers
- **CAD Kernel**: opencascade.js (OpenCASCADE WASM) in Web Worker
- **Constraint Solver**: SolveSpace solver (WASM) or custom Newton-Raphson
- **State Management**: Zustand (lightweight, reactive)
- **Collaboration**: Yjs (CRDT) with y-indexeddb for persistence
- **Sync**: y-webrtc (peer-to-peer) or y-websocket (optional server)
- **File I/O**: opencascade.js (STEP/IGES) + Three.js loaders (STL/OBJ/glTF)
- **Persistence**: IndexedDB (via idb or Dexie.js)
- **PWA**: Service Worker + Web App Manifest
- **Deployment**: Cloudflare Pages via Wrangler ($0 budget)
- **Testing**: Vitest + React Testing Library + Playwright
- **Linting**: ESLint + Prettier + TypeScript strict mode
- **CI/CD**: GitHub Actions

### Justification

This stack is chosen because:
1. **Vite + React**: Fastest developer experience, largest ecosystem, best TypeScript support
2. **R3F**: Declarative Three.js in React, built-in raycasting, excellent DX
3. **opencascade.js**: Only production-grade open-source BRep kernel for web
4. **Yjs**: Lightest CRDT, works offline, structured data support
5. **Zustand**: Minimal state management, no boilerplate, fast re-renders
6. **Cloudflare Pages**: $0 cost, unlimited bandwidth, global CDN
7. **IndexedDB**: Browser-native, no server needed, works offline

---

## Development Approach

### Methodology

Iterative development with phased delivery. Each phase produces a working, deployable increment.

1. **Phase Size**: Each phase is a vertical slice that adds user-visible value
2. **Testing**: TDD for core CAD logic, integration tests for UI, E2E for workflows
3. **Deployment**: Continuous deployment to Cloudflare Pages on every push
4. **Documentation**: Update docs/ after each phase completion

### Quality Standards

- Code coverage: 80%+ for core modules
- Linting: ESLint strict + Prettier
- TypeScript: Strict mode enabled
- Testing: Vitest unit + React Testing Library component + Playwright E2E
- No `any` types in production code

---

## Implementation Phases

### Phase 1: Foundation

**Goal**: Working app deployed to Cloudflare Pages with 3D viewport

**Tasks**:
- Project scaffolding (Vite + React + TypeScript)
- Cloudflare Pages configuration (Wrangler)
- Three.js/R3F viewport with grid, axes, orbit controls
- Basic Zustand stores (document, viewport, selection)
- PWA manifest and service worker
- CI/CD pipeline (GitHub Actions)
- Testing infrastructure (Vitest)

**Deliverable**: Deployed URL with a 3D viewport showing a grid and axes

### Phase 2: CAD Kernel Integration

**Goal**: opencascade.js running in Web Worker, basic 3D primitives

**Tasks**:
- opencascade.js WASM integration in Web Worker
- Message-passing protocol between main thread and worker
- Primitive shape creation (box, cylinder, sphere, cone, torus)
- Tessellation pipeline (BRep -> triangles -> Three.js mesh)
- Feature tree data model
- Basic feature tree UI

**Deliverable**: Create and display 3D primitives from the CAD kernel

### Phase 3: 2D Sketcher

**Goal**: Full 2D sketching with constraints

**Tasks**:
- Sketch mode (select plane, enter 2D view)
- Drawing tools (line, arc, circle, rectangle, spline)
- Constraint system (coincident, parallel, perpendicular, tangent, dimensions)
- Constraint solver integration
- Sketch-to-3D workflow (select sketch for features)
- Sketch visualization (constraint icons, dimensions)

**Deliverable**: Draw 2D sketches with constraints, use them for 3D features

### Phase 4: Parametric Features

**Goal**: Full parametric modeling with feature tree

**Tasks**:
- Feature implementation (extrude, revolve, cut, sweep, loft)
- Fillet and chamfer
- Boolean operations (union, subtract, intersect)
- Feature dependency graph
- Parametric rebuild engine
- Feature edit/delete/reorder in feature tree
- Parameter table (named dimensions)

**Deliverable**: Full parametric modeling workflow like OnShape/Fusion

### Phase 5: Professional UI

**Goal**: Production-quality CAD interface

**Tasks**:
- Ribbon/toolbar system
- Properties panel (edit feature parameters)
- Context menus
- Keyboard shortcuts (professional CAD key bindings)
- Command palette
- View cube / navigation cube
- Multiple viewports (front/top/right/isometric)
- Measurement tools
- Section view
- Appearance/material system

**Deliverable**: Professional CAD application interface

### Phase 6: File I/O and Persistence

**Goal**: Import/export standard formats, local persistence

**Tasks**:
- STEP import/export (via opencascade.js)
- STL import/export (via Three.js)
- OBJ/glTF import/export
- 3MF export (for 3D printing)
- SVG export (for 2D drawings)
- IndexedDB document storage
- Document list/dashboard
- Auto-save and crash recovery
- Drag-and-drop file import

**Deliverable**: Full file compatibility with the CAD ecosystem

### Phase 7: Collaboration

**Goal**: Real-time multi-user editing

**Tasks**:
- Yjs document sync
- WebRTC peer-to-peer (y-webrtc)
- Optional WebSocket server (y-websocket)
- Presence indicators (cursors, selections)
- Share link generation
- Version branching and merging
- Comment annotations on geometry

**Deliverable**: Collaborative editing like OnShape

### Phase 8: Assemblies

**Goal**: Multi-part assembly support

**Tasks**:
- Assembly data model
- Part instance management
- Assembly constraints (mate, flush, tangent, align)
- Assembly tree UI
- Interference detection
- BOM (Bill of Materials) generation
- Assembly explosion views

**Deliverable**: Multi-part assembly management

### Phase 9: Drawings

**Goal**: 2D engineering drawing generation

**Tasks**:
- Drawing template system
- View creation (orthographic, isometric, section, detail)
- Dimensioning (linear, angular, radial, diameter)
- Annotations (notes, GD&T, surface finish)
- Title block and border
- PDF export
- SVG export

**Deliverable**: Professional engineering drawings

### Phase 10: Plugin System and AI

**Goal**: Extensibility and AI-assisted design

**Tasks**:
- Plugin SDK (TypeScript-based feature DSL)
- Plugin marketplace UI
- Script editor (Monaco)
- AI design assistant (constraint inference, feature suggestions)
- AI natural language to CAD operations
- Generative design (basic topology optimization)
- Rendering engine (path tracing)

**Deliverable**: Extensible platform with AI capabilities

---

## Risk Management

| Risk | Impact | Probability | Mitigation |
|------|--------|-------------|------------|
| opencascade.js WASM too slow for complex models | HIGH | MEDIUM | Progressive loading, LOD, server fallback (future) |
| WASM binary too large (15-30MB) | MEDIUM | HIGH | Lazy loading, compression, code splitting |
| Constraint solver insufficient | HIGH | LOW | Use SolveSpace solver, fallback to custom |
| Cloudflare Pages limits (10ms CPU) | MEDIUM | LOW | All compute client-side, Workers only for orchestration |
| WebGPU not universal | LOW | MEDIUM | WebGL2 fallback via Three.js |
| Browser memory limits | MEDIUM | MEDIUM | Progressive tessellation, model simplification |
| UX complexity overwhelms users | HIGH | MEDIUM | Progressive disclosure, tutorials, templates |

---

## Constraints

1. **$0 Budget**: No paid services. Cloudflare Pages free tier only. No Durable Objects.
2. **Client-Side Compute**: All CAD operations run in browser via WASM. Workers only for static hosting.
3. **Local-First**: Documents stored in IndexedDB. Sync is optional.
4. **Open Source**: MIT license. All dependencies must be compatible.
5. **Web-Native**: Not a port of desktop CAD. Built for the browser from the ground up.
6. **PWA**: Must work offline and be installable.
7. **No Durable Objects**: Cost constraint. Use IndexedDB + optional peer-to-peer sync.

---

## Success Metrics

### Phase 1 (Foundation)
- [ ] App loads on Cloudflare Pages URL
- [ ] 3D viewport renders with grid and orbit controls
- [ ] PWA installable
- [ ] Lighthouse PWA score > 80

### Phase 2 (CAD Kernel)
- [ ] Can create box, cylinder, sphere from UI
- [ ] Feature tree shows created features
- [ ] Models render correctly in viewport

### Phase 3 (Sketcher)
- [ ] Can draw 2D sketches with lines, arcs, circles
- [ ] Constraints solve correctly
- [ ] Sketches drive 3D features

### Phase 4 (Parametric)
- [ ] Full extrude/revolve/cut workflow
- [ ] Editing a feature rebuilds correctly
- [ ] Feature tree supports reorder/delete

### Phase 5 (UI)
- [ ] Professional-quality interface
- [ ] Keyboard shortcuts match industry conventions
- [ ] Multiple viewport layouts

### Phase 6 (File I/O)
- [ ] Import STEP files from other CAD tools
- [ ] Export STL for 3D printing
- [ ] Documents persist across sessions

### Phase 7 (Collaboration)
- [ ] Two users can edit same document
- [ ] Changes sync in real-time
- [ ] Offline edits merge correctly

---

## Key Dependencies

### npm Packages (Core)

| Package | Purpose | Size |
|---------|---------|------|
| `react` + `react-dom` | UI framework | ~45KB |
| `three` | 3D rendering engine | ~600KB |
| `@react-three/fiber` | React renderer for Three.js | ~40KB |
| `@react-three/drei` | R3F helpers (controls, gizmos) | ~100KB |
| `zustand` | State management | ~3KB |
| `yjs` | CRDT for collaboration | ~50KB |
| `y-indexeddb` | Yjs persistence to IndexedDB | ~5KB |
| `y-webrtc` | Peer-to-peer sync | ~20KB |
| `opencascade.js` | CAD geometry kernel (WASM) | ~15-30MB |
| `idb` | IndexedDB wrapper | ~3KB |
| `nanoid` | Unique ID generation | ~2KB |

### Dev Dependencies

| Package | Purpose |
|---------|---------|
| `typescript` | Type system |
| `vite` | Build tool |
| `vitest` | Testing |
| `@testing-library/react` | Component testing |
| `@playwright/test` | E2E testing |
| `eslint` + plugins | Linting |
| `prettier` | Code formatting |
| `wrangler` | Cloudflare Pages deployment |
| `@vitejs/plugin-react` | React support for Vite |

---

## Project Structure

```
opencad/
+-- public/
|   +-- manifest.json          # PWA manifest
|   +-- sw.js                  # Service worker
|   +-- icons/                 # PWA icons
|   +-- opencascade.wasm       # WASM binary (loaded at runtime)
+-- src/
|   +-- main.tsx               # App entry point
|   +-- App.tsx                # Root component
|   +-- cad/                   # CAD core (not React-dependent)
|   |   +-- kernel/
|   |   |   +-- worker.ts      # Web Worker entry
|   |   |   +-- occt-wrapper.ts # opencascade.js wrapper
|   |   |   +-- primitives.ts  # Box, cylinder, sphere, etc.
|   |   |   +-- operations.ts  # Boolean, fillet, chamfer
|   |   |   +-- tessellation.ts # BRep to mesh conversion
|   |   +-- features/
|   |   |   +-- feature-engine.ts    # Feature evaluation engine
|   |   |   +-- dependency-graph.ts  # Feature DAG
|   |   |   +-- feature-registry.ts  # Feature type registry
|   |   |   +-- features/
|   |   |       +-- extrude.ts
|   |   |       +-- revolve.ts
|   |   |       +-- fillet.ts
|   |   |       +-- chamfer.ts
|   |   |       +-- sweep.ts
|   |   |       +-- loft.ts
|   |   +-- sketch/
|   |   |   +-- sketch-engine.ts     # Sketch data model
|   |   |   +-- constraint-solver.ts # 2D constraint solver
|   |   |   +-- constraints.ts       # Constraint types
|   |   +-- io/
|   |   |   +-- step-io.ts     # STEP import/export
|   |   |   +-- stl-io.ts      # STL import/export
|   |   |   +-- gltf-io.ts     # glTF import/export
|   |   |   +-- svg-io.ts      # SVG export (drawings)
|   |   +-- document/
|   |       +-- document-model.ts    # Document CRUD
|   |       +-- document-store.ts    # IndexedDB persistence
|   |       +-- crdt-adapter.ts      # Yjs integration
|   +-- stores/                # Zustand state stores
|   |   +-- cad-store.ts       # Feature tree, selection, tool state
|   |   +-- view-store.ts      # Camera, viewport layout, display options
|   |   +-- sketch-store.ts    # Active sketch state
|   |   +-- ui-store.ts        # Panel visibility, theme, settings
|   |   +-- history-store.ts   # Undo/redo, version history
|   +-- components/            # React UI components
|   |   +-- viewport/
|   |   |   +-- Viewport.tsx        # Main 3D viewport
|   |   |   +-- Scene.tsx           # Scene setup
|   |   |   +-- CADModel.tsx        # Renders CAD geometry
|   |   |   +-- Grid.tsx            # Reference grid
|   |   |   +-- AxisIndicator.tsx   # XYZ axis gizmo
|   |   |   +-- SelectionHighlight.tsx
|   |   |   +-- ViewCube.tsx        # Navigation cube
|   |   +-- sketcher/
|   |   |   +-- SketchView.tsx      # 2D sketch overlay
|   |   |   +-- SketchTools.tsx     # Line, arc, circle tools
|   |   |   +-- ConstraintDisplay.tsx
|   |   |   +-- DimensionDisplay.tsx
|   |   +-- ui/
|   |   |   +-- Toolbar.tsx         # Main toolbar
|   |   |   +-- FeatureTree.tsx     # Feature tree panel
|   |   |   +-- PropertiesPanel.tsx # Feature properties editor
|   |   |   +-- MenuBar.tsx         # Top menu
|   |   |   +-- StatusBar.tsx       # Bottom status
|   |   |   +-- CommandPalette.tsx  # Ctrl+K command palette
|   |   |   +-- ContextMenu.tsx     # Right-click menu
|   |   +-- dialogs/
|   |   |   +-- NewDocument.tsx
|   |   |   +-- OpenDocument.tsx
|   |   |   +-- ExportDialog.tsx
|   |   |   +-- SettingsDialog.tsx
|   |   +-- app/
|   |       +-- AppLayout.tsx       # Main layout
|   |       +-- DocumentDashboard.tsx # Home screen
|   +-- hooks/                 # React hooks
|   |   +-- useCADWorker.ts    # Communicate with CAD worker
|   |   +-- useSelection.ts    # Selection management
|   |   +-- useShortcuts.ts    # Keyboard shortcuts
|   |   +-- useDocument.ts     # Document lifecycle
|   +-- lib/                   # Shared utilities
|   |   +-- math.ts            # Vector, matrix, plane math
|   |   +-- geometry.ts        # Geometry helpers
|   |   +-- colors.ts          # CAD color schemes
|   |   +-- constants.ts       # App constants
|   +-- types/                 # TypeScript type definitions
|       +-- cad.ts             # CAD types (Feature, Sketch, etc.)
|       +-- worker.ts          # Worker message types
|       +-- store.ts           # Store types
+-- tests/
|   +-- unit/
|   |   +-- cad/               # CAD kernel tests
|   +-- integration/
|   |   +-- components/        # React component tests
|   +-- e2e/
|       +-- workflows/         # Full workflow tests
+-- docs/
|   +-- BRAINSTORM.md
|   +-- PLAN.md                # This file
|   +-- TASKS.md               # Task breakdown
|   +-- PROGRESS.md            # Progress tracking
|   +-- architecture/
|       +-- OVERVIEW.md        # Architecture overview
|       +-- CAD_KERNEL.md      # CAD kernel design
|       +-- SKETCHER.md        # Sketcher design
|       +-- COLLABORATION.md   # Collaboration design
+-- .github/
|   +-- workflows/
|       +-- deploy.yml         # CI/CD pipeline
+-- .gitignore
+-- index.html                 # Vite entry
+-- package.json
+-- tsconfig.json
+-- vite.config.ts
+-- wrangler.toml              # Cloudflare Pages config
+-- vitest.config.ts
+-- eslint.config.js
+-- LICENSE                    # MIT
+-- README.md
```
