/**
 * Export tools for the MCP server.
 */

import { z } from 'zod';
import type { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import { readProject } from '../core/project-io.js';
import { generateBoxMesh, generateCylinderMesh, generateSphereMesh, generateConeMesh, generateTorusMesh } from '../core/mesh-engine.js';
import { exportSTL } from '@opencad/cad/io/stl-exporter';
import { exportOBJ } from '@opencad/cad/io/obj-exporter';
import { exportGLB } from '@opencad/cad/io/gltf-exporter';

const meshGenerators: Record<string, (params: Record<string, number>) => ReturnType<typeof generateBoxMesh>> = {
  box: (p) => generateBoxMesh(p.width ?? 1, p.height ?? 1, p.depth ?? 1),
  cylinder: (p) => generateCylinderMesh(p.radius ?? 0.5, p.height ?? 1),
  sphere: (p) => generateSphereMesh(p.radius ?? 0.5),
  cone: (p) => generateConeMesh(p.radius ?? 0.5, p.height ?? 1),
  torus: (p) => generateTorusMesh(p.radius ?? 0.5, p.tube ?? 0.15),
};

export function registerExportTools(server: McpServer): void {
  server.tool(
    'export_file',
    'Export a project to STL, OBJ, or glTF format',
    {
      projectPath: z.string().describe('Path to the .ocad file'),
      format: z.enum(['stl', 'obj', 'glb']).describe('Export format'),
      outputPath: z.string().describe('Output file path'),
    },
    async ({ projectPath, format, outputPath }) => {
      const project = readProject(projectPath);

      // Generate meshes for primitive features
      const meshes = project.features
        .filter((f) => f.type in meshGenerators)
        .map((f) => {
          const gen = meshGenerators[f.type];
          const numParams: Record<string, number> = {};
          for (const [k, v] of Object.entries(f.parameters)) {
            if (typeof v === 'number') numParams[k] = v;
          }
          const mesh = gen(numParams);
          mesh.featureId = f.id;
          return mesh;
        });

      if (meshes.length === 0) {
        return {
          content: [{ type: 'text' as const, text: 'No primitive features found to export' }],
        };
      }

      let data: ArrayBuffer | string;
      let mimeType: string;

      switch (format) {
        case 'stl':
          data = exportSTL(meshes[0]);
          mimeType = 'application/octet-stream';
          break;
        case 'obj':
          data = exportOBJ(meshes).obj;
          mimeType = 'text/plain';
          break;
        case 'glb':
          data = exportGLB(meshes);
          mimeType = 'model/gltf-binary';
          break;
      }

      // Write to file
      const fs = await import('node:fs');
      fs.writeFileSync(outputPath, data);

      return {
        content: [{
          type: 'text' as const,
          text: JSON.stringify({
            success: true,
            format,
            outputPath,
            meshCount: meshes.length,
            fileSize: typeof data === 'string' ? data.length : data.byteLength,
          }, null, 2),
        }],
      };
    },
  );
}
