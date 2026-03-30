/**
 * File operation actions for menu bar and keyboard shortcuts.
 *
 * Wraps document-api and export-api for use in UI components.
 */

import { createDocument, saveCurrentDocument } from '@/api/document-api';
import { exportToFormat, downloadExport, serializeToOCAD, deserializeFromOCAD } from '@/api/export-api';
import { useCADStore } from '@/stores/cad-store';
import { featuresToMeshes } from '@/lib/feature-to-mesh';
import { getToast } from '@/components/ui/Toast';
import { confirm } from '@/components/ui/ConfirmDialog';
import { nanoid } from 'nanoid';

/** Create a new document and switch to it */
export async function handleNewDocument(): Promise<void> {
  if (useCADStore.getState().dirty) {
    const ok = await confirm({
      title: 'Unsaved changes',
      message: 'You have unsaved changes. Create a new document anyway?',
      confirmLabel: 'Discard',
      destructive: true,
    });
    if (!ok) return;
  }
  const result = await createDocument({ name: 'Untitled' });
  if (result.success && result.data) {
    useCADStore.getState().loadFeatures(result.data.features);
    useCADStore.getState().setDocument(result.data.id, result.data.name);
    getToast().addToast('New document created', 'success');
  } else {
    getToast().addToast('Failed to create document', 'error');
  }
}

/** Open a file picker for .ocad files */
export async function handleOpenDocument(): Promise<void> {
  if (useCADStore.getState().dirty) {
    const ok = await confirm({
      title: 'Unsaved changes',
      message: 'You have unsaved changes. Open another document anyway?',
      confirmLabel: 'Discard',
      destructive: true,
    });
    if (!ok) return;
  }
  const { openFile } = await import('@/cad/io/project');
  try {
    const { data, name } = await openFile('.ocad,.json');
    const json = typeof data === 'string' ? data : new TextDecoder().decode(data);
    const project = deserializeFromOCAD(json);
    useCADStore.getState().loadFeatures(project.features);
    useCADStore.getState().setDocument(nanoid(), project.name);
    getToast().addToast(`Opened ${name}`, 'success');
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
    thumbnail: captureThumbnail() ?? undefined,
  });
  if (result.success) {
    useCADStore.setState({ dirty: false });
    getToast().addToast(`Saved ${state.documentName}`, 'success');
  } else {
    getToast().addToast('Failed to save document', 'error');
  }
  return result.success;
}

/** Export current features to a format and trigger download */
export function handleExport(format: 'stl' | 'obj' | 'glb' | '3mf' | 'ocad'): void {
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
    getToast().addToast(`Exported as ${format.toUpperCase()}`, 'success');
  } catch (err) {
    console.error('Export failed:', err);
    getToast().addToast(`Export to ${format.toUpperCase()} failed`, 'error');
  }
}

/** Capture a small thumbnail (160x90 PNG) from the R3F canvas */
export function captureThumbnail(): string | null {
  const canvas = document.querySelector('canvas');
  if (!canvas) return null;
  try {
    const w = 160;
    const h = 90;
    const offscreen = document.createElement('canvas');
    offscreen.width = w;
    offscreen.height = h;
    const ctx = offscreen.getContext('2d');
    if (!ctx) return null;
    ctx.drawImage(canvas, 0, 0, w, h);
    return offscreen.toDataURL('image/jpeg', 0.6);
  } catch {
    return null;
  }
}

/** Capture a PNG screenshot of the current viewport */
export function handleScreenshot(): void {
  const canvas = document.querySelector('canvas');
  if (!canvas) {
    getToast().addToast('No viewport found', 'error');
    return;
  }
  try {
    const dataUrl = canvas.toDataURL('image/png');
    const a = document.createElement('a');
    a.href = dataUrl;
    const state = useCADStore.getState();
    a.download = `${state.documentName || 'opencad'}-screenshot.png`;
    a.click();
    getToast().addToast('Screenshot saved', 'success');
  } catch (err) {
    console.error('Screenshot failed:', err);
    getToast().addToast('Screenshot failed', 'error');
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
    getToast().addToast(`Imported ${name} (${(indices.length / 3).toFixed(0)} faces)`, 'success');
  } catch {
    // User cancelled or import failed
  }
}
