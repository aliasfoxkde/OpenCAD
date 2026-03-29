# OpenCAD Client API Reference

The OpenCAD client API is exposed as a global singleton `window.OpenCAD` for plugins, scripts, and browser console access.

## Quick Start

```javascript
// Access from browser console or plugin
const api = window.OpenCAD;

// List available feature types
const features = api.features.listAvailable();

// Add a box feature
api.features.add('box', 'My Box', { width: 50, height: 30, depth: 10 });

// Export current model as STL
const result = api.io.export({ format: 'stl', meshes: [myMesh] });
api.io.download(result);
```

## API Version

```javascript
window.OpenCAD.version // '1.0.0'
```

## Modules

### documents

Document management via IndexedDB.

| Method | Returns | Description |
|--------|---------|-------------|
| `documents.create(options?)` | `Promise<APIResponse<StoredDocument>>` | Create new document |
| `documents.list()` | `Promise<APIResponse<DocumentInfo[]>>` | List all saved documents |
| `documents.open(id)` | `Promise<APIResponse<StoredDocument>>` | Open document by ID |
| `documents.save(doc)` | `Promise<APIResponse<void>>` | Save document state |
| `documents.delete(id)` | `Promise<APIResponse<void>>` | Delete a document |
| `documents.generateId()` | `string` | Generate unique document ID |
| `documents.close()` | `Promise<void>` | Close IndexedDB connection |

**Options for `create`:**
```typescript
{ name?: string; units?: 'mm' | 'cm' | 'm' | 'in' }
```

### features

Feature tree management.

| Method | Returns | Description |
|--------|---------|-------------|
| `features.getAll()` | `FeatureNode[]` | Get all features |
| `features.get(id)` | `FeatureNode \| undefined` | Get feature by ID |
| `features.add(type, name?, params?)` | `APIResponse<FeatureNode>` | Add feature |
| `features.remove(id)` | `APIResponse<void>` | Remove feature |
| `features.modify(id, updates)` | `APIResponse<FeatureNode>` | Update feature |
| `features.list()` | `FeatureSummary[]` | Get feature summaries |
| `features.getDetails(id)` | `APIResponse<FeatureDetail>` | Feature + definition |
| `features.listAvailable()` | `AvailableFeature[]` | All feature types |
| `features.getDefaults(type)` | `Record<string, unknown>` | Default parameters |

### measure

Geometric measurements.

| Method | Returns | Description |
|--------|---------|-------------|
| `measure.distance(a, b)` | `DistanceResult` | Distance between two points |
| `measure.angle(a, b)` | `number` | Angle between vectors (radians) |
| `measure.bounds(mesh)` | `BoundingBoxResult` | Bounding box |
| `measure.massProperties(mesh)` | `MassPropertiesResult` | Centroid, area, volume, bounds |
| `measure.centroid(mesh)` | `Point3D` | Center of mass |
| `measure.surfaceArea(mesh)` | `number` | Surface area |
| `measure.volume(mesh)` | `number` | Volume |

### io

Export and import operations.

| Method | Returns | Description |
|--------|---------|-------------|
| `io.export(options)` | `ExportResult` | Export to STL/OBJ/GLB/OCAD |
| `io.download(result)` | `void` | Trigger browser download |
| `io.importSTL()` | `Promise<ImportResult>` | Open STL file picker |
| `io.importOBJ()` | `Promise<ImportResult>` | Open OBJ file picker |
| `io.serialize(data)` | `string` | Serialize to .ocad JSON |
| `io.deserialize(json)` | `OpenCADProject` | Parse .ocad JSON |

**Export options:**
```typescript
{
  format: 'stl' | 'obj' | 'glb' | 'ocad',
  filename?: string,
  meshes?: MeshData[],       // For STL/OBJ/GLB
  project?: {                // For OCAD
    name: string;
    units: string;
    features: FeatureNode[];
    sketches: unknown[];
  },
}
```

## Types

```typescript
interface APIResponse<T> {
  success: boolean;
  data?: T;
  error?: string;
}

interface FeatureNode {
  id: string;
  type: FeatureType;
  name: string;
  parameters: Record<string, unknown>;
  dependencies: string[];
  children: string[];
  suppressed: boolean;
}

interface MeshData {
  vertices: Float32Array;
  normals: Float32Array;
  indices: Uint32Array;
  featureId: string;
  color?: string;
}
```

## Error Handling

All async methods return `APIResponse<T` with a `success` flag:

```javascript
const result = await api.documents.open('nonexistent');
if (!result.success) {
  console.error(result.error);
}
```
