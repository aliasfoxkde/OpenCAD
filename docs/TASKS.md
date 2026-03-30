# OpenCAD - Task Breakdown

**Version**: 1.1.0
**Last Updated**: 2026-03-30

---

## Task Status Legend

- [ ] Pending
- [~] In Progress
- [x] Completed
- [!] Blocked

---

## Phase 1: Foundation

### 1.1 Project Scaffolding

- [x] Create comprehensive PLAN.md
- [x] Write TASKS.md
- [x] Initialize Vite + React + TypeScript project
- [x] Configure package.json with all dependencies
- [x] Configure TypeScript (strict mode)
- [x] Configure ESLint + Prettier
- [x] Configure Vite for WASM + Worker support
- [x] Create .gitignore (exclude lock files, build, .claude, etc.)
- [x] Create index.html entry point
- [x] Create project directory structure (src/cad, src/components, etc.)

### 1.2 Cloudflare Pages Deployment

- [x] Create wrangler.toml configuration
- [ ] Test `wrangler pages dev` locally
- [x] Configure GitHub Actions CI/CD (deploy.yml)
- [ ] First deployment to Cloudflare Pages
- [ ] Verify live URL works

### 1.3 3D Viewport

- [x] Install and configure Three.js + R3F + Drei
- [x] Create Viewport component with Canvas
- [x] Add OrbitControls (rotate, pan, zoom)
- [x] Add reference grid plane
- [x] Add XYZ axis indicator
- [ ] Add view cube / navigation cube
- [x] Configure lighting (ambient + directional)
- [x] Set up camera defaults (perspective, isometric)
- [ ] Add multiple viewport layout (front/top/right/iso)

### 1.4 State Management

- [x] Create view-store (camera, viewport layout)
- [x] Create cad-store (document, features, selection)
- [x] Create ui-store (panel visibility, theme, active tool)
- [x] Wire stores to UI components

### 1.5 PWA Support

- [x] Create web app manifest (manifest.json)
- [x] Create service worker (sw.js)
- [x] Generate PWA icons
- [ ] Test installability
- [ ] Test offline support

### 1.6 Testing Infrastructure

- [x] Configure Vitest
- [ ] Configure React Testing Library
- [x] Write first viewport render test
- [x] Write first store test
- [ ] Configure Playwright for E2E

---

## Phase 2: CAD Kernel Integration

### 2.1 Web Worker Setup

- [x] Create CAD Worker entry point (worker.ts)
- [x] Define message protocol (request/response types)
- [x] Create useCADWorker hook for React communication
- [ ] Handle WASM loading in worker context
- [x] Add error handling and timeout management

### 2.2 OpenCASCADE.js Integration

- [ ] Install and configure opencascade.js
- [ ] Create OCCT wrapper with typed API
- [ ] Implement memory management helpers (RAII pattern)
- [ ] Test basic shape creation in worker

### 2.3 Primitive Shapes

- [x] Implement box primitive
- [x] Implement cylinder primitive
- [x] Implement sphere primitive
- [x] Implement cone primitive
- [x] Implement torus primitive
- [x] Create primitive creation UI (toolbar buttons)

### 2.4 Tessellation Pipeline

- [x] BRep -> triangle mesh tessellation
- [x] Transfer mesh data from worker to main thread (ArrayBuffer)
- [x] Create CADModel component to render tessellated meshes
- [ ] Implement progressive loading (low-res first, refine async)

### 2.5 Feature Tree (Basic)

- [x] Define FeatureNode data model
- [x] Implement feature tree as Zustand store
- [x] Create FeatureTreePanel UI component
- [x] Display created primitives in feature tree
- [x] Click feature tree item to select geometry

---

## Phase 3: 2D Sketcher

### 3.1 Sketch Mode

- [x] Select sketch plane (XY, XZ, YZ, or face)
- [x] Enter sketch mode (2D view, camera alignment)
- [x] Exit sketch mode (return to 3D view)
- [x] Create Sketch data model
- [x] Create sketch-store for active sketch state

### 3.2 Drawing Tools

- [x] Line tool (click-to-click)
- [x] Arc tool (3-point arc)
- [x] Circle tool (center + radius)
- [x] Rectangle tool (2-point)
- [x] Ellipse tool
- [x] Spline tool (control points)
- [x] Point tool (reference point)
- [x] Construction geometry toggle

### 3.3 Constraints

- [x] Coincident constraint
- [x] Parallel constraint
- [x] Perpendicular constraint
- [x] Tangent constraint
- [x] Horizontal / Vertical constraint
- [x] Equal length / radius constraint
- [x] Midpoint constraint
- [x] Fix constraint
- [x] Distance dimension
- [x] Angle dimension
- [x] Radius / Diameter dimension

### 3.4 Constraint Solver

- [ ] Integrate SolveSpace constraint solver (WASM)
- [x] Or: implement custom Newton-Raphson solver
- [x] Real-time solve as constraints are added
- [x] Over-constraint detection and warning
- [x] Under-constraint indicators (degrees of freedom)

### 3.5 Sketch Visualization

- [x] Render sketch elements (lines, arcs, circles)
- [x] Display constraint icons (parallel, tangent, etc.)
- [x] Display dimension annotations
- [x] Highlight selected elements
- [x] Snap indicators (endpoint, midpoint, center)

---

## Phase 4: Parametric Features

### 4.1 Core Features

- [x] Extrude (from sketch profile, distance / to-surface)
- [x] Revolve (from sketch profile, axis selection)
- [x] Cut / Extrude Cut (subtractive)
- [ ] Revolve Cut
- [ ] Sweep (profile along path)
- [ ] Loft (between profiles)
- [x] Hole feature (drill, counterbore, countersink)
- [x] Shell (hollow out)
- [ ] Draft (taper faces)
- [ ] Rib (from sketch line)
- [ ] Thread (cosmetic or modeled)

### 4.2 Edge Features

- [x] Fillet (constant radius)
- [ ] Fillet (variable radius)
- [x] Chamfer (equal distance)
- [ ] Chamfer (distance + angle)

### 4.3 Pattern Features

- [x] Linear pattern
- [x] Circular pattern
- [x] Mirror feature
- [ ] Pattern by sketch points

### 4.4 Boolean Operations

- [x] Union (join bodies)
- [x] Subtract (cut from body)
- [x] Intersect (common volume)

### 4.5 Feature Engine

- [x] Feature dependency graph (DAG)
- [x] Parametric rebuild engine
- [x] Feature edit (change parameters, rebuild)
- [x] Feature delete (remove + rebuild downstream)
- [x] Feature reorder (drag in tree)
- [x] Feature suppress / unsuppress
- [x] Parameter table (named dimensions across features)
- [x] Error recovery (failed feature handling)

---

## Phase 5: Professional UI

### 5.1 Toolbar System

- [x] Main toolbar (file operations, view controls)
- [x] Feature toolbar (sketch, extrude, fillet, etc.)
- [x] Sketch toolbar (line, arc, circle, constraint tools)
- [x] Context-sensitive toolbar (changes with selection)
- [ ] Toolbar customization (drag-and-drop)

### 5.2 Panels

- [x] Feature tree panel (left sidebar)
- [x] Properties panel (edit selected feature parameters)
- [ ] Color/material panel
- [x] Document panel (recent documents, settings)
- [x] Resizable and collapsible panels

### 5.3 Navigation

- [ ] View cube (click face to align view)
- [x] Keyboard shortcuts (industry-standard CAD bindings)
- [x] Command palette (Ctrl+K, search all commands)
- [x] Command palette UI component (modal overlay with search, keyboard nav, grouped results)
- [x] Context menus (right-click on geometry, features)
- [x] Menu bar (File, Edit, View, Insert, Tools, Help)

### 5.4 Measurement and Analysis

- [x] Measure distance (point-to-point)
- [x] Measure angle
- [ ] Measure radius/diameter
- [x] Section view (dynamic cross-section)
- [x] Mass properties (volume, surface area, center of mass)

### 5.5 Appearance

- [ ] Material library (metal, plastic, wood, glass)
- [ ] Color picker for bodies/faces
- [ ] Transparency mode
- [x] Wireframe / shaded / shaded-with-edges modes
- [x] Shadow toggle
- [ ] Ambient occlusion

### 5.6 Status and Feedback

- [x] Status bar (coordinates, units, active tool)
- [ ] Progress indicators (rebuild, import)
- [x] Toast notifications
- [ ] Error messages with actionable guidance
- [ ] Undo/redo indicator

---

## Phase 6: File I/O and Persistence

### 6.1 Import Formats

- [ ] STEP import (via opencascade.js)
- [ ] IGES import (via opencascade.js)
- [x] STL import (via Three.js)
- [x] OBJ import (via Three.js)
- [x] glTF/GLB import (via Three.js)
- [ ] 3MF import
- [x] Drag-and-drop file import

### 6.2 Export Formats

- [ ] STEP export (engineering exchange)
- [x] STL export (3D printing)
- [x] OBJ export
- [x] glTF/GLB export (web viewing)
- [ ] 3MF export (3D printing)
- [ ] SVG export (2D drawings)
- [ ] Screenshot export (PNG)

### 6.3 Document Persistence

- [x] IndexedDB document storage
- [x] Auto-save (every 30 seconds)
- [x] Crash recovery (restore from auto-save)
- [x] Document list / dashboard
- [ ] Document thumbnails
- [x] Document rename / duplicate / delete
- [x] Document dashboard (list, create, open, delete documents)

### 6.4 Yjs CRDT Integration

- [x] Yjs document adapter
- [x] y-indexeddb for local persistence
- [x] CRDT-backed feature tree
- [ ] Version history with snapshots
- [ ] Branch and merge workflow

---

## Phase 7: Collaboration

### 7.1 Sync Infrastructure

- [x] y-webrtc integration (peer-to-peer)
- [ ] Optional y-websocket server config
- [x] Connection management UI
- [x] Reconnection handling
- [ ] Offline queue (sync when online)

### 7.2 Multi-User UX

- [x] User presence indicators
- [x] Cursor sharing in viewport
- [ ] "Follow user" mode
- [ ] Selection broadcasting
- [ ] Conflict resolution UI

### 7.3 Sharing

- [ ] Generate share link
- [ ] Permission levels (view, comment, edit)
- [ ] Comment annotations on geometry
- [ ] Export as read-only link

---

## Phase 8: Assemblies

### 8.1 Assembly Data Model

- [x] Assembly document type
- [x] Part instance management
- [x] Part reference resolution
- [x] Assembly hierarchy tree

### 8.2 Assembly Constraints

- [ ] Mate constraint (face-to-face)
- [ ] Flush constraint (face alignment)
- [ ] Tangent constraint
- [ ] Align constraint (axis/hole alignment)
- [ ] Angle constraint
- [ ] Ground constraint (fix in place)

### 8.3 Assembly Tools

- [x] Insert part into assembly
- [x] Drag to position
- [ ] Interference detection
- [ ] Assembly explosion view
- [ ] BOM (Bill of Materials) table
- [ ] Assembly animation

---

## Phase 9: Drawings

### 9.1 Drawing System

- [ ] Drawing template system (A4, A3, ANSI sizes)
- [ ] Orthographic view creation
- [ ] Isometric view insertion
- [ ] Section view generation
- [ ] Detail view (zoomed area)
- [ ] Broken-out section

### 9.2 Annotations

- [ ] Linear dimensions
- [ ] Angular dimensions
- [ ] Radial / diameter dimensions
- [ ] Ordinate dimensions
- [ ] Text notes
- [ ] GD&T symbols
- [ ] Surface finish symbols
- [ ] Weld symbols

### 9.3 Drawing Output

- [ ] Title block (auto-filled from model)
- [ ] Revision table
- [ ] PDF export
- [ ] SVG export
- [ ] Print support

---

## Phase 10: Plugin System and AI

### 10.1 Plugin SDK

- [ ] Feature SDK (TypeScript-based feature DSL)
- [ ] Plugin API surface (geometry, UI, IO)
- [ ] Plugin lifecycle management
- [ ] Plugin sandboxing (safe execution)
- [ ] Plugin discovery UI

### 10.2 Scripting

- [ ] Monaco editor integration
- [ ] Script execution environment
- [ ] Script API for CAD operations
- [ ] Script examples and templates

### 10.3 AI Features

- [ ] Natural language to CAD operations
- [ ] Constraint inference from sketch
- [ ] Feature suggestion engine
- [ ] Error fix suggestions
- [ ] Design intent recognition

### 10.4 Rendering

- [ ] Basic path tracer
- [ ] Environment lighting
- [ ] Material rendering (PBR)
- [ ] Render queue management
- [ ] Render export (PNG, EXR)

---

## Progress Summary

- **Total Tasks**: 256
- **Completed**: 150
- **In Progress**: 0
- **Pending**: 106
- **Completion**: 59%
