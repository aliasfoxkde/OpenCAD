# OpenCAD - Progress Tracking

**Last Updated**: 2026-03-30
**Current Phase**: Enhancement Sprint — Viewport Polish Complete
**Overall Progress**: 70%

---

## Progress Summary

| Phase | Status | Progress |
|-------|--------|----------|
| Phase 1: Foundation | COMPLETE | 90% |
| Phase 2: CAD Kernel | COMPLETE | 80% |
| Phase 3: Sketcher | COMPLETE | 80% |
| Phase 4: Parametric Features | COMPLETE | 80% |
| Phase 5: Professional UI | COMPLETE | 95% |
| Phase 6: File I/O | COMPLETE | 85% |
| Phase 7: Collaboration | COMPLETE | 80% |
| Phase 8: Assemblies | PENDING | 0% |
| Phase 9: Drawings | PENDING | 0% |
| Phase 10: Plugins & AI | COMPLETE | 80% |

---

## Session Log

### 2026-03-30 - Session 9: Comprehensive Enhancement Sprint (Phases 1-8 Plan)

**Completed all 8 phases from the comprehensive enhancement plan:**

**Phase 1: Feature Tree Multi-Select & Search**
- [x] Ctrl+Click to toggle feature in selection (multi-select)
- [x] Shift+Click to range-select from last clicked feature
- [x] Search input at top of tree with name/type filtering
- [x] Selected count shown in header when multi-selected
- [x] 9 multi-select and search tests

**Phase 2: Feature Health Display**
- [x] useFeatureErrors React hook — computes validation via FeatureEngine useMemo (no store subscription, avoids CRDT feedback loop)
- [x] Health icon per feature: checkmark (success) or warning triangle (error)
- [x] Feature name color-coded red for errors
- [x] Error message tooltip on hover
- [x] 11 feature error detection tests (valid, negative/zero dims, missing dependency, unknown type, etc.)

**Phase 3: 3D Transform Gizmo**
- [x] TransformControls from drei in translate mode
- [x] Invisible target mesh (0.001 size, transparent)
- [x] Updates originX/Y/Z parameters on drag with 3-decimal rounding
- [x] Only visible when single feature selected and tool is 'select'
- [x] Wired into Viewport canvas

**Phase 4: Mass Properties Panel**
- [x] computeMeshProperties: signed tetrahedron volume, triangle area, bounding box, center of mass
- [x] computeAllProperties: combined properties for all features
- [x] computeFeatureProperties: single feature properties
- [x] formatPropertyValue: smart number formatting with units
- [x] Mass Properties section in PropertiesPanel (Volume, Surface Area, Bounding Box, Center, Triangles)
- [x] 8 mass properties tests (unit cube, surface area, center of mass, etc.)

**Phase 5: Grid Snapping for 3D Viewport**
- [x] snapToGrid/gridSnapSize state in view store
- [x] Snap applied in TransformGizmo via rounding during drag
- [x] Shift+G keyboard shortcut for snap toggle
- [x] Snap status indicator in StatusBar ("Snap: 0.5mm")
- [x] Snap toggle in View menu

**Phase 6: Dimension Annotations**
- [x] annotations.ts: DimensionAnnotation type, factory functions (distance/radius/diameter), label/midpoint helpers
- [x] DimensionAnnotation.tsx: R3F component with dashed leader lines + Html labels via drei
- [x] Color-coded labels: cyan (distance), purple (radius), pink (diameter)
- [x] Click label to remove annotation
- [x] "Pin" button in MeasurementOverlay to persist point-to-point measurements
- [x] Annotation state management in view store (add/remove/clear)
- [x] 13 annotation tests

**Phase 7: Units System**
- [x] Unit type ('mm'|'cm'|'m'|'in'|'ft') in CAD store with conversion factors
- [x] Click-to-cycle units display in StatusBar
- [x] Parameter values converted to display units in PropertiesPanel
- [x] Mass properties (volume, area, bbox, center) displayed in current units
- [x] User input auto-converts back to mm for internal storage

**Phase 8: Viewport Polish — Selection Glow & Bloom**
- [x] useSelectionGlow hook with smooth emissive lerp transition (0.1 factor)
- [x] Emissive highlight on all selected mesh types (FeatureMesh, PatternInstance, BooleanMesh, ShellMesh)
- [x] @react-three/postprocessing installed
- [x] Bloom post-processing effect (intensity 0.3, luminance threshold 0.6, mipmap blur)
- [x] EffectComposer wired into Viewport canvas

**New Test → Source File Mapping:**
| Test File | Source File | Tests |
|-----------|------------|-------|
| FeatureTree.test.tsx | FeatureTree.tsx | 9 |
| useFeatureErrors.test.ts | useFeatureErrors.ts | 11 |
| mass-properties.test.ts | mass-properties.ts | 8 |
| annotations.test.ts | annotations.ts | 13 |

**Build Stats:**
- 51 test suites, 742 tests, all passing
- 0 TypeScript errors
- Clean production build
- New dependency: @react-three/postprocessing

---

### 2026-03-29 - Session 8: Client API, MCP Server, SEO, Documentation

**Completed:**
- [x] AGENTS.md — AI coding assistant guide (stack, architecture, types, conventions)
- [x] Vite SEO plugin (vite-plugin-seo.ts)
  - generateBundle hook emits robots.txt + sitemap.xml at build time
  - robots.txt: User-agent: *, Allow: /, Sitemap link
  - sitemap.xml: 3 SPA routes (/, /editor, /docs) with priority/changefreq
  - 6 SEO plugin tests
  - Wired into vite.config.ts + index.html (sitemap link, OG/Twitter meta)
- [x] Client-side API facade (src/api/)
  - types.ts: APIResponse, FeatureSummary, FeatureDetail, ExportOptions/Result, etc.
  - document-api.ts: createDocument, listAllDocuments, openDocument, saveCurrentDocument, removeDocument
  - feature-api.ts: addFeature, removeFeature, modifyFeature, getFeatures, listAvailable, getDefaults
  - measure-api.ts: measureDistance, computeVolume, computeSurfaceArea, computeBounds, getMassProperties
  - export-api.ts: exportToFormat (STL/OBJ/GLB/OCAD), downloadExport, importSTLFile, importOBJFile
  - opencad-api.ts: OpenCADAPI class combining all sub-APIs
  - Wired window.OpenCAD in main.tsx
  - 28 API tests (mocked stores/I/O)
- [x] MCP Server (mcp-server/)
  - index.ts: stdio MCP server entry point
  - core/project-io.ts: read/write/list/delete .ocad files on disk
  - core/mesh-engine.ts: re-exports pure-math mesh generators
  - core/measurement.ts: re-exports measurement functions
  - core/feature-registry.ts: re-exports feature registry
  - tools/document-tools.ts: create_document, list_documents, open_document, delete_document
  - tools/feature-tools.ts: add_feature, modify_feature, delete_feature, get_document_state
  - tools/export-tools.ts: export_file (STL/OBJ/glTF)
  - tools/measure-tools.ts: measure (distance, volume, surface_area, bounding_box, mass_properties)
  - tools/info-tools.ts: list_available_features, get_feature_parameters
  - 20 MCP server tests (project-io roundtrip, measurements)
  - .claude/mcp.json configured with opencad server
  - npm scripts: mcp:dev, test:mcp
- [x] Documentation
  - docs/API.md: Client API reference
  - docs/MCP.md: MCP server setup and tool reference

**Test → Source File Mapping (new):**
| Test File | Source File | Tests |
|-----------|------------|-------|
| vite-plugin-seo.test.ts | vite-plugin-seo.ts | 6 |
| opencad-api.test.ts | src/api/*.ts | 28 |
| project-io.test.ts | mcp-server/src/core/project-io.ts | 13 |
| measure-tools.test.ts | mcp-server/src/core/measurement.ts | 7 |

**Build Stats:**
- 24 test suites, 378 tests (root) + 2 suites, 20 tests (MCP) = 398 total, all passing
- Clean TypeScript compilation
- New dependencies: @modelcontextprotocol/sdk, zod, tsx

---

### 2026-03-29 - Session 7: WebRTC Sync, Collab Store, UI Components

**Completed:**
- [x] WebRTC collaboration sync layer (webrtc-sync.ts)
  - CollaborationSync class: create/join/leave session lifecycle
  - Connection state management (disconnected, connecting, connected, error)
  - Room ID generation (12-char lowercase alphanumeric)
  - Auto-reconnection with exponential backoff (max 10 attempts)
  - Peer color assignment from ID hash
  - Random display name generation (Adjective+Noun)
  - Cursor and selection awareness broadcasting
  - Singleton pattern (getCollaborationSync/destroyCollaborationSync)
  - 23 WebRTC sync tests
- [x] Collaboration Zustand store (collab-store.ts)
  - Connection state, room ID, peer list, host flag
  - joinSession/leaveSession actions
  - updatePeer/removePeer/setPeers actions
  - updateLocalPresence for cursor/selection
  - Selector hooks: useConnectionState, usePeers, useIsConnected, usePeerCount, useLocalUser
  - 17 collab-store tests
- [x] Toast notification system (Toast.tsx)
  - Module-level state (works outside React tree)
  - ToastContainer component with auto-dismiss
  - 4 toast types: success, error, warning, info
  - Click to dismiss, stacked layout
  - useToast imperative hook
  - 5 toast tests
- [x] DisplayModeToggle component (DisplayModeToggle.tsx)
  - Wireframe / Shaded / Shaded+Edges toggle buttons
  - Grid, Axes, Shadows toggle buttons
  - Connected to view-store
  - 8 display mode tests
- [x] ContextMenu component (ContextMenu.tsx)
  - Positioned at mouse coordinates with viewport clamping
  - Menu items with icon, label, shortcut, disabled/danger states
  - Divider separators
  - Keyboard navigation (arrows, enter, escape)
  - Click-outside-to-close
  - Submenu support
  - 10 context menu tests
- [x] Wired ToastContainer into AppLayout

**Test → Source File Mapping:**
| Test File | Source File | Tests |
|-----------|------------|-------|
| webrtc-sync.test.ts | webrtc-sync.ts | 23 |
| collab-store.test.ts | collab-store.ts | 17 |
| Toast.test.ts | Toast.tsx | 5 |
| DisplayModeToggle.test.ts | DisplayModeToggle.tsx + view-store.ts | 8 |
| ContextMenu.test.ts | ContextMenu.tsx | 10 |
| CommandPalette.test.tsx | CommandPalette.tsx + useKeyboardShortcuts.ts | 13 |
| DocumentDashboard.test.tsx | DocumentDashboard.tsx + db.ts + cad-store.ts | 13 |

**Build Stats:**
- 22 test suites, 344 tests, all passing
- Clean TypeScript compilation

---

### 2026-03-29 - Session 6: Command Palette, Document Dashboard, Keyboard Wiring

**Completed:**
- [x] CommandPalette.tsx: modal overlay component with search, keyboard navigation, category grouping
  - Searches command registry by label/category/shortcut
  - Arrow key navigation, Enter to execute, Escape to close
  - Click-outside-to-close, grouped by category headers
  - Footer with navigation hints
- [x] DocumentDashboard.tsx: document management screen shown when no document open
  - Lists documents from IndexedDB sorted by modified date
  - Create new document with custom name
  - Open existing document (loads features into cad-store)
  - Delete with confirmation
  - Error/loading states
- [x] Wired keyboard shortcuts into AppLayout
  - registerStandardCommands called on mount with store actions
  - Global keydown listener attached/cleaned up
  - Escape closes palette and exits sketch mode
  - Delete clears selection
- [x] Added loadFeatures action to cad-store for document loading
- [x] 13 CommandPalette logic tests (search, execute, state integration)
- [x] 13 DocumentDashboard logic tests (CRUD, store integration, feature loading)

**Test → Source File Mapping:**
| Test File | Source File | Tests |
|-----------|------------|-------|
| CommandPalette.test.tsx | CommandPalette.tsx + useKeyboardShortcuts.ts | 13 |
| DocumentDashboard.test.tsx | DocumentDashboard.tsx + db.ts + cad-store.ts | 13 |
| mesh-generators.test.ts | mesh-generators.ts | 36 |
| measure.test.ts | measure.ts | 22 |
| io.test.ts | stl/obj/gltf/project | 25 |
| db.test.ts | db.ts | 18 |
| useKeyboardShortcuts.test.ts | useKeyboardShortcuts.ts | 23 |
| crdt-store.test.ts | crdt-store.ts | 22 |
| constraint-solver.test.ts | constraint-solver.ts | 14 |
| snap-engine.test.ts | snap-engine.ts | 14 |
| sketch-store.test.ts | sketch-store.ts | 18 |
| dependency-graph.test.ts | dependency-graph.ts | 12 |
| feature-registry.test.ts | feature-registry.ts | 12 |
| feature-engine.test.ts | feature-engine.ts | 22 |
| cad-store.test.ts | cad-store.ts | 8 |
| view-store.test.ts | view-store.ts | 4 |
| ui-store.test.ts | ui-store.ts | 4 |

**Build Stats:**
- 17 test suites, 280 tests, all passing
- Clean TypeScript compilation (only pre-existing gltf-exporter SharedArrayBuffer warnings)

| Phase | Status | Progress |
|-------|--------|----------|
| Phase 1: Foundation | COMPLETE | 90% |
| Phase 2: CAD Kernel | IN PROGRESS | 25% |
| Phase 3: Sketcher | COMPLETE | 80% |
| Phase 4: Parametric Features | COMPLETE | 60% |
| Phase 5: Professional UI | COMPLETE | 75% |
| Phase 6: File I/O | COMPLETE | 85% |
| Phase 7: Collaboration | IN PROGRESS | 30% |
| Phase 8: Assemblies | PENDING | 0% |
| Phase 9: Drawings | PENDING | 0% |
| Phase 10: Plugins & AI | PENDING | 0% |

---

## Session Log

### 2026-03-29 - Session 5: Persistence, Shortcuts, Measurement, CRDT

**Completed:**
- [x] Extracted mesh generators from cad-worker.ts into mesh-generators.ts (testable module)
- [x] 36 mesh generator tests: box, cylinder, sphere, cone, torus + cross-cutting validations
  - Validated: vertex/normal/indices counts, index bounds, NaN-free, no degenerate triangles, unit normals, bounding box dimensions, radius accuracy
- [x] Measurement tools: distance3D, angleBetween, computeBounds, computeCentroid, computeSurfaceArea, computeVolume
  - Divergence theorem volume estimation, AABB bounding box, vertex centroid
  - 22 measurement tests with triangle mesh and unit cube fixtures
- [x] IndexedDB persistence: save/load documents, auto-save (30s), crash recovery snapshots, document list
  - AutoSaveManager class with start/stop lifecycle
  - Snapshot pruning (keep latest N)
  - 18 persistence tests using fake-indexeddb
- [x] Keyboard shortcut registry: command registration, shortcut parsing, key event handling
  - 17 standard CAD commands (Ctrl+Z, Ctrl+S, Ctrl+K, G, W, F, etc.)
  - Input field exclusion, command palette search
  - 23 keyboard shortcut tests
- [x] Yjs CRDT persistence layer: feature tree in Y.Array<Y.Map>, metadata in Y.Map
  - addFeature, removeFeature, updateFeature with transactions
  - observeFeatures for reactive updates
  - exportSnapshot/importSnapshot for roundtrip
  - 22 CRDT tests including concurrent edit simulation

**Test → Source File Mapping:**
| Test File | Source File | Tests |
|-----------|------------|-------|
| mesh-generators.test.ts | mesh-generators.ts | 36 |
| measure.test.ts | measure.ts | 22 |
| io.test.ts | stl/obj/gltf/project | 25 |
| db.test.ts | db.ts | 18 |
| useKeyboardShortcuts.test.ts | useKeyboardShortcuts.ts | 23 |
| crdt-store.test.ts | crdt-store.ts | 22 |
| constraint-solver.test.ts | constraint-solver.ts | 14 |
| snap-engine.test.ts | snap-engine.ts | 14 |
| sketch-store.test.ts | sketch-store.ts | 18 |
| dependency-graph.test.ts | dependency-graph.ts | 12 |
| feature-registry.test.ts | feature-registry.ts | 12 |
| feature-engine.test.ts | feature-engine.ts | 22 |
| cad-store.test.ts | cad-store.ts | 8 |
| view-store.test.ts | view-store.ts | 4 |
| ui-store.test.ts | ui-store.ts | 4 |

**Build Stats:**
- 15 test suites, 254 tests, all passing
- Clean TypeScript compilation

---

### 2026-03-29 - Session 4: File I/O System

**Completed:**
- [x] STL binary exporter: binary STL from MeshData with computed face normals
- [x] STL ASCII exporter: text-based STL for multiple meshes
- [x] STL importer: binary and ASCII STL parsing with auto-detection
- [x] OBJ exporter: Wavefront OBJ with v/vn/f format, multi-mesh support with index offsets
- [x] OBJ importer: parses v/vn/f with all face format variants (v, v/vt, v/vt/vn, v//vn), quad triangulation
- [x] glTF/GLB exporter: glTF 2.0 binary with JSON+BIN chunks, position min/max bounds, multi-mesh
- [x] Project save/load: .ocad JSON format with versioning, feature tree and sketch serialization
- [x] Download helper: browser file download via Blob + URL.createObjectURL
- [x] File picker helper: browser file open dialog with auto text/binary detection
- [x] Barrel export: src/cad/io/index.ts
- [x] 25 I/O tests (133 total passing across 10 test files)

**Build Stats:**
- 10 test suites, 133 tests, all passing
- Clean TypeScript compilation

---

### 2026-03-29 - Session 3: 2D Sketcher with Constraint Solver

**Completed:**
- [x] Sketch store (Zustand): elements, constraints, tools, selection, drawing workflow, undo/redo, DOF counting
- [x] Snap engine: endpoint/midpoint/center/grid snap detection with 8px threshold
- [x] Constraint solver: Newton-Raphson with analytical Jacobians
  - Coincident, horizontal, vertical, parallel, perpendicular, distance, equal, fix, midpoint constraints
  - Gaussian elimination with column pivoting for underdetermined systems
  - Damping factor (0.9) for convergence stability
- [x] SketchCanvas: HTML5 Canvas 2D overlay
  - Grid rendering (main + sub-grid), axis rendering (red X, green Y)
  - Element rendering: lines, circles, arcs (3-point), rectangles, points
  - Snap indicators: square (endpoint), diamond (midpoint), circle (center), cross (grid)
  - Drawing preview with dashed lines
  - Hit testing for element selection
  - Canvas coordinate system: Y-flipped, origin centered
- [x] SketchToolbar: floating tool palette with drawing tools, constraint tools, DOF indicator
- [x] Integration: SketchCanvas/Toolbar wired into AppLayout viewport overlay
- [x] 108 tests passing across 9 test files (45 new sketcher tests)

**Build Stats:**
- 9 test suites, 108 tests, all passing
- Clean TypeScript compilation (no errors)

---

### 2026-03-29 - Session 2: Parametric Feature System

**Completed:**
- [x] Feature registry with parameter schemas for 20+ feature types
  - Primitives: extrude, revolve, sphere, cone, torus
  - Sketch-based: extrude_sketch, revolve_sketch, cut, sweep, loft, shell, hole
  - Edges: fillet, chamfer
  - Boolean: union, subtract, intersect
  - Patterns: linear, circular, mirror
- [x] Dependency graph (DAG) with topological sort, cycle detection, ancestor/descendant queries
- [x] Feature engine with parametric evaluation, validation, and bounds computation
- [x] Fixed PropertiesPanel bug: was creating all primitives as type 'extrude'
- [x] Updated PropertiesPanel to use feature registry for dynamic parameter UI
- [x] Updated FeatureTree to use registry icons
- [x] Added sphere, cone, torus, extrude_sketch, revolve_sketch to FeatureType union
- [x] Fixed vitest config (removed jsdom default causing worker timeouts)
- [x] 63 tests passing across 6 test files (46 new feature system tests)
- [x] 1 commit pushed to main

**Build Stats:**
- Production build: 1m 25s (Rolldown)
- Total gzipped: ~312KB
- 6 test suites, 63 tests, all passing

---

### 2026-03-29 - Session 1: Planning + Foundation + Kernel Start

**Completed:**
- [x] Read and analyzed BRAINSTORM.md
- [x] Extensive research on OnShape, Fusion360, opencascade.js, Three.js, Yjs, Cloudflare Pages
- [x] Explored OpenZenith for Cloudflare Pages deployment patterns
- [x] Wrote comprehensive PLAN.md with full architecture and data model
- [x] Wrote comprehensive TASKS.md (~200 tasks across 10 phases)
- [x] Updated PROGRESS.md with session log
- [x] Initialized Vite + React 19 + TypeScript 5.9 project
- [x] Configured Wrangler for Cloudflare Pages deployment
- [x] Configured ESLint, Prettier, Vitest
- [x] Built 3D viewport with R3F (orbit controls, grid, axis indicators, gizmo)
- [x] Built professional CAD UI (menu bar, toolbar, feature tree, properties panel, status bar)
- [x] Built Zustand stores (cad-store, view-store, ui-store)
- [x] Built type system (CAD features, sketches, constraints, worker protocol)
- [x] PWA support (manifest.json, service worker, favicon)
- [x] GitHub Actions CI/CD pipeline
- [x] 16 unit tests passing across all stores
- [x] CAD kernel worker with primitive mesh generation (box, cylinder, sphere, cone, torus)
- [x] useCADWorker hook for React-Worker typed communication
- [x] Production build: ~310KB gzipped
- [x] 3 commits pushed to main

**Architecture Decisions:**
- **CAD Kernel**: opencascade.js (WASM in Web Worker) - Phase 1 uses placeholder meshes
- **Rendering**: Three.js via React Three Fiber + Drei
- **State**: Zustand stores (cad, view, ui)
- **Collaboration**: Yjs CRDT with y-webrtc (P2P) + y-indexeddb (local)
- **Deployment**: Cloudflare Pages ($0 budget, no Durable Objects)
- **Build**: Vite 8 + React 19 + TypeScript 5.9

**Build Stats:**
- Production build: 3.2s
- Total gzipped: ~311KB (vendor 56KB, react-three 249KB, app 5KB)
- 3 test suites, 16 tests, all passing

---

## Issues & Blockers

No active blockers.
