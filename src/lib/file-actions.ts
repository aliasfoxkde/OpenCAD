/**
 * File operation actions for menu bar and keyboard shortcuts.
 *
 * Wraps document-api and export-api for use in UI components.
 */

import { createDocument, saveCurrentDocument } from '@/api/document-api';
import { exportToFormat, downloadExport, serializeToOCAD, deserializeFromOCAD } from '@/api/export-api';
import { useCADStore } from '@/stores/cad-store';
import { featuresToMeshes } from '@/lib/feature-to-mesh';
import { useToast } from '@/components/ui/Toast';
import { nanoid } from 'nanoid';

/** Create a new document and switch to it */
export async function handleNewDocument(): Promise<void> {
  const result = await createDocument({ name: 'Untitled' });
  if (result.success && result.data) {
    useCADStore.getState().loadFeatures(result.data.features);
    useCADStore.getState().setDocument(result.data.id, result.data.name);
    useToast().addToast('New document created', 'success');
  } else {
    useToast().addToast('Failed to create document', 'error');
  }
}

/** Open a file picker for .ocad files */
export async function handleOpenDocument(): Promise<void> {
  const { openFile } = await import('@/cad/io/project');
  try {
    const { data, name } = await openFile('.ocad,.json');
    const json = typeof data === 'string' ? data : new TextDecoder().decode(data);
    const project = deserializeFromOCAD(json);
    useCADStore.getState().loadFeatures(project.features);
    useCADStore.getState().setDocument(nanoid(), project.name);
    useToast().addToast(`Opened ${name}`, 'success');
  } catch {
    // User cancelled or invalid file — silent
  }
}

/** Save current document to IndexedDB */
export async function handleSaveDocument(): Promise<boolean> {
  const state = useCADStore.getState();
  if (!state.documentId) {
    // No document — create one first
    await handleNewDocument();
    return true;
  }
  const result = await saveCurrentDocument({
    id: state.documentId,
    name: state.documentName,
    units: 'mm',
    features: state.features,
    created: Date.now(),
    modified: Date.now(),
    autoSave: false,
  });
  if (result.success) {
    useToast().addToast(`Saved ${state.documentName}`, 'success');
  } else {
    useToast().addToast('Failed to save document', 'error');
  }
  return result.success;
}

/** Export current features to a format and trigger download */
export function handleExport(format: 'stl' | 'obj' | 'glb' | 'ocad'): void {
  const state = useCADStore.getState();

  if (format === 'ocad') {
    const json = serializeToOCAD({
      name: state.documentName,
      units: 'mm',
      features: state.features,
      sketches: [],
    });
    const blob = new Blob([json], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `${state.documentName}.ocad`;
    a.click();
    URL.revokeObjectURL(url);
    return;
  }

  const meshes = featuresToMeshes(state.features);
  if (meshes.length === 0) return;

  try {
    const result = exportToFormat({ format, meshes });
    downloadExport(result);
    useToast().addToast(`Exported as ${format.toUpperCase()}`, 'success');
  } catch (err) {
    console.error('Export failed:', err);
    useToast().addToast(`Export to ${format.toUpperCase()} failed`, 'error');
  }
}

/** Import STL/OBJ file and add as a feature */
export async function handleImportFile(): Promise<void> {
  try {
    // Show file picker for supported formats
    const { openFile } = await import('@/cad/io/project');
    const { data, name } = await openFile('.stl,.obj');

    let vertices: number[] = [];
    let indices: number[] = [];

    if (name.endsWith('.stl')) {
      const buffer = data instanceof ArrayBuffer ? data : new TextEncoder().encode(data).buffer;
      const { importSTL } = await import('@/cad/io/stl-importer');
      const result = importSTL(buffer);
      vertices = Array.from(result.mesh.vertices);
      indices = Array.from(result.mesh.indices);
    } else {
      const text = typeof data === 'string' ? data : new TextDecoder().decode(data);
      const { importOBJ } = await import('@/cad/io/obj-importer');
      const result = importOBJ(text);
      vertices = Array.from(result.mesh.vertices);
      indices = Array.from(result.mesh.indices);
    }

    // Add imported geometry as a mesh_import feature with stored vertex/index data
    const feature = {
      id: nanoid(),
      type: 'mesh_import' as const,
      name: name.replace(/\.[^.]+$/, ''),
      parameters: {
        _vertices: vertices,
        _indices: indices,
        vertexCount: vertices.length / 3,
        faceCount: indices.length / 3,
        sourceFile: name,
      },
      dependencies: [] as string[],
      children: [] as string[],
      suppressed: false,
    };
    useCADStore.getState().addFeatureAndSelect(feature);
    useToast().addToast(`Imported ${name} (${(indices.length / 3).toFixed(0)} faces)`, 'success');
  } catch {
    // User cancelled or import failed
  }
}
