# OpenCAD - Task Breakdown

**Version**: 1.0.0
**Last Updated**: 2026-03-29

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
- [ ] Initialize Vite + React + TypeScript project
- [ ] Configure package.json with all dependencies
- [ ] Configure TypeScript (strict mode)
- [ ] Configure ESLint + Prettier
- [ ] Configure Vite for WASM + Worker support
- [ ] Create .gitignore (exclude lock files, build, .claude, etc.)
- [ ] Create index.html entry point
- [ ] Create project directory structure (src/cad, src/components, etc.)

### 1.2 Cloudflare Pages Deployment

- [ ] Create wrangler.toml configuration
- [ ] Test `wrangler pages dev` locally
- [ ] Configure GitHub Actions CI/CD (deploy.yml)
- [ ] First deployment to Cloudflare Pages
- [ ] Verify live URL works

### 1.3 3D Viewport

- [ ] Install and configure Three.js + R3F + Drei
- [ ] Create Viewport component with Canvas
- [ ] Add OrbitControls (rotate, pan, zoom)
- [ ] Add reference grid plane
- [ ] Add XYZ axis indicator
- [ ] Add view cube / navigation cube
- [ ] Configure lighting (ambient + directional)
- [ ] Set up camera defaults (perspective, isometric)
- [ ] Add multiple viewport layout (front/top/right/iso)

### 1.4 State Management

- [ ] Create view-store (camera, viewport layout)
- [ ] Create cad-store (document, features, selection)
- [ ] Create ui-store (panel visibility, theme, active tool)
- [ ] Wire stores to UI components

### 1.5 PWA Support

- [ ] Create web app manifest (manifest.json)
- [ ] Create service worker (sw.js)
- [ ] Generate PWA icons
- [ ] Test installability
- [ ] Test offline support

### 1.6 Testing Infrastructure

- [ ] Configure Vitest
- [ ] Configure React Testing Library
- [ ] Write first viewport render test
- [ ] Write first store test
- [ ] Configure Playwright for E2E

---

## Phase 2: CAD Kernel Integration

### 2.1 Web Worker Setup

- [ ] Create CAD Worker entry point (worker.ts)
- [ ] Define message protocol (request/response types)
- [ ] Create useCADWorker hook for React communication
- [ ] Handle WASM loading in worker context
- [ ] Add error handling and timeout management

### 2.2 OpenCASCADE.js Integration

- [ ] Install and configure opencascade.js
- [ ] Create OCCT wrapper with typed API
- [ ] Implement memory management helpers (RAII pattern)
- [ ] Test basic shape creation in worker

### 2.3 Primitive Shapes

- [ ] Implement box primitive
- [ ] Implement cylinder primitive
- [ ] Implement sphere primitive
- [ ] Implement cone primitive
- [ ] Implement torus primitive
- [ ] Create primitive creation UI (toolbar buttons)

### 2.4 Tessellation Pipeline

- [ ] BRep -> triangle mesh tessellation
- [ ] Transfer mesh data from worker to main thread (ArrayBuffer)
- [ ] Create CADModel component to render tessellated meshes
- [ ] Implement progressive loading (low-res first, refine async)

### 2.5 Feature Tree (Basic)

- [ ] Define FeatureNode data model
- [ ] Implement feature tree as Zustand store
- [ ] Create FeatureTreePanel UI component
- [ ] Display created primitives in feature tree
- [ ] Click feature tree item to select geometry

---

## Phase 3: 2D Sketcher

### 3.1 Sketch Mode

- [ ] Select sketch plane (XY, XZ, YZ, or face)
- [ ] Enter sketch mode (2D view, camera alignment)
- [ ] Exit sketch mode (return to 3D view)
- [ ] Create Sketch data model
- [ ] Create sketch-store for active sketch state

### 3.2 Drawing Tools

- [ ] Line tool (click-to-click)
- [ ] Arc tool (3-point arc)
- [ ] Circle tool (center + radius)
- [ ] Rectangle tool (2-point)
- [ ] Ellipse tool
- [ ] Spline tool (control points)
- [ ] Point tool (reference point)
- [ ] Construction geometry toggle

### 3.3 Constraints

- [ ] Coincident constraint
- [ ] Parallel constraint
- [ ] Perpendicular constraint
- [ ] Tangent constraint
- [ ] Horizontal / Vertical constraint
- [ ] Equal length / radius constraint
- [ ] Midpoint constraint
- [ ] Fix constraint
- [ ] Distance dimension
- [ ] Angle dimension
- [ ] Radius / Diameter dimension

### 3.4 Constraint Solver

- [ ] Integrate SolveSpace constraint solver (WASM)
- [ ] Or: implement custom Newton-Raphson solver
- [ ] Real-time solve as constraints are added
- [ ] Over-constraint detection and warning
- [ ] Under-constraint indicators (degrees of freedom)

### 3.5 Sketch Visualization

- [ ] Render sketch elements (lines, arcs, circles)
- [ ] Display constraint icons (parallel, tangent, etc.)
- [ ] Display dimension annotations
- [ ] Highlight selected elements
- [ ] Snap indicators (endpoint, midpoint, center)

---

## Phase 4: Parametric Features

### 4.1 Core Features

- [ ] Extrude (from sketch profile, distance / to-surface)
- [ ] Revolve (from sketch profile, axis selection)
- [ ] Cut / Extrude Cut (subtractive)
- [ ] Revolve Cut
- [ ] Sweep (profile along path)
- [ ] Loft (between profiles)
- [ ] Hole feature (drill, counterbore, countersink)
- [ ] Shell (hollow out)
- [ ] Draft (taper faces)
- [ ] Rib (from sketch line)
- [ ] Thread (cosmetic or modeled)

### 4.2 Edge Features

- [ ] Fillet (constant radius)
- [ ] Fillet (variable radius)
- [ ] Chamfer (equal distance)
- [ ] Chamfer (distance + angle)

### 4.3 Pattern Features

- [ ] Linear pattern
- [ ] Circular pattern
- [ ] Mirror feature
- [ ] Pattern by sketch points

### 4.4 Boolean Operations

- [ ] Union (join bodies)
- [ ] Subtract (cut from body)
- [ ] Intersect (common volume)

### 4.5 Feature Engine

- [ ] Feature dependency graph (DAG)
- [ ] Parametric rebuild engine
- [ ] Feature edit (change parameters, rebuild)
- [ ] Feature delete (remove + rebuild downstream)
- [ ] Feature reorder (drag in tree)
- [ ] Feature suppress / unsuppress
- [ ] Parameter table (named dimensions across features)
- [ ] Error recovery (failed feature handling)

---

## Phase 5: Professional UI

### 5.1 Toolbar System

- [ ] Main toolbar (file operations, view controls)
- [ ] Feature toolbar (sketch, extrude, fillet, etc.)
- [ ] Sketch toolbar (line, arc, circle, constraint tools)
- [ ] Context-sensitive toolbar (changes with selection)
- [ ] Toolbar customization (drag-and-drop)

### 5.2 Panels

- [ ] Feature tree panel (left sidebar)
- [ ] Properties panel (edit selected feature parameters)
- [ ] Color/material panel
- [ ] Document panel (recent documents, settings)
- [ ] Resizable and collapsible panels

### 5.3 Navigation

- [ ] View cube (click face to align view)
- [x] Keyboard shortcuts (industry-standard CAD bindings)
- [x] Command palette (Ctrl+K, search all commands)
- [x] Command palette UI component (modal overlay with search, keyboard nav, grouped results)
- [ ] Context menus (right-click on geometry, features)
- [x] Menu bar (File, Edit, View, Insert, Tools, Help)

### 5.4 Measurement and Analysis

- [x] Measure distance (point-to-point)
- [x] Measure angle
- [ ] Measure radius/diameter
- [ ] Section view (dynamic cross-section)
- [x] Mass properties (volume, surface area, center of mass)

### 5.5 Appearance

- [ ] Material library (metal, plastic, wood, glass)
- [ ] Color picker for bodies/faces
- [ ] Transparency mode
- [ ] Wireframe / shaded / shaded-with-edges modes
- [ ] Shadow toggle
- [ ] Ambient occlusion

### 5.6 Status and Feedback

- [ ] Status bar (coordinates, units, active tool)
- [ ] Progress indicators (rebuild, import)
- [ ] Toast notifications
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
- [ ] Drag-and-drop file import

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

- [ ] y-webrtc integration (peer-to-peer)
- [ ] Optional y-websocket server config
- [ ] Connection management UI
- [ ] Reconnection handling
- [ ] Offline queue (sync when online)

### 7.2 Multi-User UX

- [ ] User presence indicators
- [ ] Cursor sharing in viewport
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

- [ ] Assembly document type
- [ ] Part instance management
- [ ] Part reference resolution
- [ ] Assembly hierarchy tree

### 8.2 Assembly Constraints

- [ ] Mate constraint (face-to-face)
- [ ] Flush constraint (face alignment)
- [ ] Tangent constraint
- [ ] Align constraint (axis/hole alignment)
- [ ] Angle constraint
- [ ] Ground constraint (fix in place)

### 8.3 Assembly Tools

- [ ] Insert part into assembly
- [ ] Drag to position
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

- **Total Tasks**: ~200
- **Completed**: 46
- **In Progress**: 3
- **Pending**: ~151
- **Completion**: 23%
