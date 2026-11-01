# OpenCAD

Open-source, browser-based parametric CAD prototype. It combines a custom TypeScript triangle-mesh modeling pipeline with a feature tree, sketch tools, local project storage, and optional peer-to-peer collaboration. It is not currently a full OpenCASCADE/B-rep CAD system.

## Features

- **Parametric Modeling**: Feature tree with primitives, sketch extrude/revolve, cut, sweep, loft, booleans, patterns, mirror, shell, and mesh-based fillet/chamfer operations; see the kernel limitations below
- **2D Sketcher**: Draw with lines, arcs, circles, and intelligent constraints
- **Collaboration**: Yjs CRDT document synchronization with a WebRTC peer-to-peer provider; connectivity and multi-user behavior still require deployment-level verification
- **File I/O**: Import STL/OBJ; export STL/OBJ/GLB/3MF; native project serialization. STEP and IGES are not currently supported.
- **Local Persistence**: IndexedDB-backed project storage and PWA scaffolding; offline/installability behavior still needs end-to-end verification
- **Deployment**: Cloudflare Pages configuration is present; actual cost depends on configured services and usage, and deployment status must be verified separately
- **Plugin System**: TypeScript-based feature SDK for extensions

## Kernel and capability boundary

OpenCAD currently builds and edits triangle meshes through custom generators
and CSG operations. This is not a boundary-representation (B-rep) kernel:
there is no OpenCASCADE/opencascade.js dependency in the current package.
Consequently, the project must not claim STEP/IGES support or professional
solid-modeling parity with Fusion 360/Onshape. Supported interchange formats
are STL/OBJ import and STL/OBJ/GLB/3MF export, plus native project
serialization. See [Current status](docs/CURRENT_STATUS.md) for the
operation/format matrix and known limitations.

## Tech Stack

- **Frontend**: Vite + React 19 + TypeScript 5.8
- **3D Rendering**: Three.js via React Three Fiber (WebGPU/WebGL2)
- **CAD Geometry**: Custom TypeScript mesh generators and `three-bvh-csg` boolean operations in Web Workers; no OpenCASCADE/B-rep kernel is included
- **State**: Zustand
- **Collaboration**: Yjs CRDT
- **Persistence**: IndexedDB
- **Deployment**: Cloudflare Pages

## Getting Started

```bash
# Install dependencies
npm install

# Start dev server
npm run dev

# Build for production
npm run build

# Preview production build
npm run preview

# Run tests
npm run test

# Deploy to Cloudflare Pages
npm run pages:deploy
```

## Documentation

- [Plan](docs/PLAN.md) - Comprehensive development plan
- [Tasks](docs/TASKS.md) - Task breakdown by phase
- [Progress](docs/PROGRESS.md) - Current status
- [Brainstorm](docs/BRAINSTORM.md) - Initial vision and research

## Architecture

```
Browser (Client-Side)
+-- React UI (toolbar, panels, menus)
+-- Zustand Stores (state management)
+-- React Three Fiber (3D rendering)
+-- Web Worker
|   +-- opencascade.js (CAD geometry kernel, WASM)
|   +-- Constraint Solver (2D sketch solving)
|   +-- Feature Engine (parametric rebuild)
+-- IndexedDB (document persistence)
+-- Yjs CRDT (collaboration sync)
```

## License

MIT License. See [LICENSE](LICENSE) for details.
