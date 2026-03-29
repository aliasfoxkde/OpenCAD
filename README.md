# OpenCAD

Open-source, web-native parametric 3D CAD platform. Combining the best of OnShape (collaboration, cloud-native) and Fusion360 (CAD + CAM + CAE breadth) into a free, open-source tool built for the browser.

## Features

- **Parametric Modeling**: Full feature tree with extrude, revolve, fillet, chamfer, sweep, loft, and more
- **2D Sketcher**: Draw with lines, arcs, circles, and intelligent constraints
- **Real-Time Collaboration**: Multi-user editing via CRDT (Yjs)
- **File Compatibility**: Import/export STEP, STL, OBJ, glTF, IGES
- **Offline-First**: Works without internet via PWA and IndexedDB storage
- **$0 Cost**: Runs on Cloudflare Pages free tier
- **Plugin System**: TypeScript-based feature SDK for extensions

## Tech Stack

- **Frontend**: Vite + React 19 + TypeScript 5.8
- **3D Rendering**: Three.js via React Three Fiber (WebGPU/WebGL2)
- **CAD Kernel**: OpenCASCADE (opencascade.js WASM) in Web Worker
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
npm run deploy
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
