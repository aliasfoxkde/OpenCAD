/**
 * Project Save/Load — serializes OpenCAD project state to/from JSON.
 *
 * Format: .ocad files (JSON with versioning)
 */

import type { FeatureNode, SketchElement, SketchConstraint } from '../../types/cad';

export interface OpenCADProject {
  version: 1;
  name: string;
  created: number;
  modified: number;
  units: 'mm' | 'cm' | 'm' | 'in' | 'ft';
  features: FeatureNode[];
  sketches: SketchData[];
}

export interface SketchData {
  id: string;
  plane: string;
  elements: SketchElement[];
  constraints: SketchConstraint[];
}

export function serializeProject(data: {
  name: string;
  units: string;
  features: FeatureNode[];
  sketches: SketchData[];
}): string {
  const project: OpenCADProject = {
    version: 1,
    name: data.name,
    created: Date.now(),
    modified: Date.now(),
    units: data.units as OpenCADProject['units'],
    features: data.features,
    sketches: data.sketches,
  };
  return JSON.stringify(project, null, 2);
}

export function deserializeProject(json: string): OpenCADProject {
  const data = JSON.parse(json);

  // Version check
  if (!data.version || data.version > 1) {
    throw new Error(`Unsupported project version: ${data.version}`);
  }

  return {
    version: data.version,
    name: data.name || 'Untitled',
    created: data.created || Date.now(),
    modified: Date.now(),
    units: data.units || 'mm',
    features: data.features || [],
    sketches: data.sketches || [],
  };
}

/**
 * Helper to trigger a browser file download.
 */
export function downloadFile(data: string | ArrayBuffer, filename: string, mimeType: string): void {
  const blob = typeof data === 'string' ? new Blob([data], { type: mimeType }) : new Blob([data], { type: mimeType });

  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  a.click();
  URL.revokeObjectURL(url);
}

/**
 * Helper to open a file picker and read the selected file.
 */
export function openFile(accept: string): Promise<{ name: string; data: ArrayBuffer | string }> {
  return new Promise((resolve, reject) => {
    const input = document.createElement('input');
    input.type = 'file';
    input.accept = accept;
    input.onchange = () => {
      const file = input.files?.[0];
      if (!file) {
        reject(new Error('No file selected'));
        return;
      }

      const reader = new FileReader();
      reader.onload = () => {
        resolve({
          name: file.name,
          data: reader.result as ArrayBuffer | string,
        });
      };
      reader.onerror = () => reject(new Error('Failed to read file'));

      // Read as text for .ocad/.obj, as ArrayBuffer for .stl/.glb
      if (file.name.endsWith('.stl') || file.name.endsWith('.glb')) {
        reader.readAsArrayBuffer(file);
      } else {
        reader.readAsText(file);
      }
    };
    input.click();
  });
}
