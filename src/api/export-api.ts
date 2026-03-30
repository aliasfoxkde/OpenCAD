/**
 * Export/Import API — wraps file I/O exporters and project serialization.
 */

import { exportSTL } from '@/cad/io/stl-exporter';
import { exportOBJ } from '@/cad/io/obj-exporter';
import { exportGLB } from '@/cad/io/gltf-exporter';
import { export3MF } from '@/cad/io/3mf-exporter';
import { importSTL } from '@/cad/io/stl-importer';
import { importOBJ } from '@/cad/io/obj-importer';
import { serializeProject, deserializeProject, downloadFile, openFile } from '@/cad/io/project';
import type { FeatureNode } from '@/types/cad';
import type { ImportResult } from '@/cad/io/stl-importer';
import type { ExportOptions, ExportResult } from './types';

/** Export data in the specified format */
export function exportToFormat(options: ExportOptions): ExportResult {
  const { format, filename } = options;

  switch (format) {
    case 'stl': {
      const meshes = options.meshes ?? [];
      if (meshes.length === 0) {
        throw new Error('No meshes provided for STL export');
      }
      const mesh = meshes[0];
      if (!mesh) throw new Error('No mesh data');
      const buffer = exportSTL(mesh);
      return {
        data: buffer,
        filename: filename ?? 'model.stl',
        mimeType: 'application/octet-stream',
      };
    }
    case 'obj': {
      const meshes = options.meshes ?? [];
      if (meshes.length === 0) {
        throw new Error('No meshes provided for OBJ export');
      }
      const result = exportOBJ(meshes);
      return {
        data: result.obj,
        filename: filename ?? 'model.obj',
        mimeType: 'text/plain',
      };
    }
    case 'glb': {
      const meshes = options.meshes ?? [];
      if (meshes.length === 0) {
        throw new Error('No meshes provided for GLB export');
      }
      const buffer = exportGLB(meshes);
      return {
        data: buffer,
        filename: filename ?? 'model.glb',
        mimeType: 'model/gltf-binary',
      };
    }
    case '3mf': {
      const meshes = options.meshes ?? [];
      if (meshes.length === 0) {
        throw new Error('No meshes provided for 3MF export');
      }
      const xml = export3MF(meshes);
      return {
        data: xml,
        filename: filename ?? 'model.3mf',
        mimeType: 'application/xml',
      };
    }
    case 'ocad': {
      if (!options.project) {
        throw new Error('No project data provided for .ocad export');
      }
      const json = serializeProject(options.project);
      return {
        data: json,
        filename: filename ?? `${options.project.name}.ocad`,
        mimeType: 'application/json',
      };
    }
    default: {
      throw new Error(`Unsupported export format: ${format}`);
    }
  }
}

/** Trigger browser download of exported data */
export function downloadExport(result: ExportResult): void {
  const data = typeof result.data === 'string' ? result.data : result.data;
  downloadFile(data, result.filename, result.mimeType);
}

/** Import an STL file */
export async function importSTLFile(): Promise<ImportResult> {
  const { data } = await openFile('.stl');
  const buffer = data instanceof ArrayBuffer ? data : new TextEncoder().encode(data).buffer;
  return importSTL(buffer);
}

/** Import an OBJ file */
export async function importOBJFile(): Promise<ImportResult> {
  const { data } = await openFile('.obj');
  const text = typeof data === 'string' ? data : new TextDecoder().decode(data);
  return importOBJ(text);
}

/** Serialize project to .ocad JSON string */
export function serializeToOCAD(data: {
  name: string;
  units: string;
  features: FeatureNode[];
  sketches: unknown[];
}): string {
  return serializeProject(data as Parameters<typeof serializeProject>[0]);
}

/** Deserialize .ocad JSON string to project */
export function deserializeFromOCAD(json: string) {
  return deserializeProject(json);
}
