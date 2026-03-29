/**
 * Project I/O for MCP server — reads/writes .ocad files on disk.
 */

import * as fs from 'node:fs';
import * as path from 'node:path';
import type { FeatureNode } from '@opencad/types/cad';

/** OpenCAD project structure matching the .ocad format */
export interface OpenCADProject {
  version: 1;
  name: string;
  created: number;
  modified: number;
  units: 'mm' | 'cm' | 'm' | 'in' | 'ft';
  features: FeatureNode[];
  sketches: unknown[];
}

/** Create a new empty project */
export function createProject(name: string, units: string = 'mm'): OpenCADProject {
  const now = Date.now();
  return {
    version: 1,
    name,
    created: now,
    modified: now,
    units: units as OpenCADProject['units'],
    features: [],
    sketches: [],
  };
}

/** Write project to a .ocad file */
export function writeProject(filePath: string, project: OpenCADProject): void {
  project.modified = Date.now();
  const dir = path.dirname(filePath);
  if (!fs.existsSync(dir)) {
    fs.mkdirSync(dir, { recursive: true });
  }
  if (!filePath.endsWith('.ocad')) {
    filePath += '.ocad';
  }
  fs.writeFileSync(filePath, JSON.stringify(project, null, 2), 'utf-8');
}

/** Read a .ocad file */
export function readProject(filePath: string): OpenCADProject {
  if (!fs.existsSync(filePath)) {
    throw new Error(`File not found: ${filePath}`);
  }
  const json = fs.readFileSync(filePath, 'utf-8');
  const data = JSON.parse(json);

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

/** List all .ocad files in a directory */
export function listProjects(dirPath: string): Array<{ name: string; path: string; featureCount: number }> {
  if (!fs.existsSync(dirPath)) {
    return [];
  }

  const files = fs.readdirSync(dirPath).filter((f) => f.endsWith('.ocad'));
  return files.map((f) => {
    const filePath = path.join(dirPath, f);
    try {
      const project = readProject(filePath);
      return {
        name: project.name,
        path: filePath,
        featureCount: project.features.length,
      };
    } catch {
      return { name: f, path: filePath, featureCount: 0 };
    }
  });
}

/** Delete a .ocad file */
export function deleteProject(filePath: string): boolean {
  if (!fs.existsSync(filePath)) {
    return false;
  }
  fs.unlinkSync(filePath);
  return true;
}
