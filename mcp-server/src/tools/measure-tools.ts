/**
 * Measurement tools for the MCP server.
 */

import { z } from 'zod';
import type { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import { distance3D, computeBounds, computeCentroid, computeSurfaceArea, computeVolume, getMassProperties } from '../core/measurement.js';
import { generateBoxMesh, generateCylinderMesh, generateSphereMesh, generateConeMesh, generateTorusMesh } from '../core/mesh-engine.js';
import type { MeshData } from '@opencad/types/cad';

const meshGenerators: Record<string, (params: Record<string, number>) => MeshData> = {
  box: (p) => generateBoxMesh(p.width ?? 1, p.height ?? 1, p.depth ?? 1),
  cylinder: (p) => generateCylinderMesh(p.radius ?? 0.5, p.height ?? 1),
  sphere: (p) => generateSphereMesh(p.radius ?? 0.5),
  cone: (p) => generateConeMesh(p.radius ?? 0.5, p.height ?? 1),
  torus: (p) => generateTorusMesh(p.radius ?? 0.5, p.tube ?? 0.15),
};

export function registerMeasureTools(server: McpServer): void {
  server.tool(
    'measure',
    'Compute measurements on geometry',
    {
      type: z.enum(['distance', 'volume', 'surface_area', 'bounding_box', 'mass_properties']).describe('Measurement type'),
      primitiveType: z.enum(['box', 'cylinder', 'sphere', 'cone', 'torus']).optional().describe('Primitive type to measure'),
      parameters: z.record(z.number()).optional().describe('Primitive parameters'),
      pointA: z.object({ x: z.number(), y: z.number(), z: z.number() }).optional().describe('First point (for distance)'),
      pointB: z.object({ x: z.number(), y: z.number(), z: z.number() }).optional().describe('Second point (for distance)'),
    },
    async ({ type, primitiveType, parameters, pointA, pointB }) => {
      switch (type) {
        case 'distance': {
          if (!pointA || !pointB) {
            return { content: [{ type: 'text' as const, text: 'pointA and pointB required for distance measurement' }] };
          }
          const dist = distance3D(pointA, pointB);
          return {
            content: [{ type: 'text' as const, text: JSON.stringify({ distance: dist, pointA, pointB }, null, 2) }],
          };
        }

        case 'volume':
        case 'surface_area':
        case 'bounding_box':
        case 'mass_properties': {
          if (!primitiveType || !meshGenerators[primitiveType]) {
            return { content: [{ type: 'text' as const, text: 'Valid primitiveType required' }] };
          }
          const gen = meshGenerators[primitiveType];
          const mesh = gen(parameters ?? {});

          if (type === 'volume') {
            const vol = computeVolume(mesh);
            return { content: [{ type: 'text' as const, text: JSON.stringify({ volume: vol, unit: 'mm³' }, null, 2) }] };
          }
          if (type === 'surface_area') {
            const area = computeSurfaceArea(mesh);
            return { content: [{ type: 'text' as const, text: JSON.stringify({ surfaceArea: area, unit: 'mm²' }, null, 2) }] };
          }
          if (type === 'bounding_box') {
            const bb = computeBounds(mesh);
            return { content: [{ type: 'text' as const, text: JSON.stringify(bb, null, 2) }] };
          }
          // mass_properties
          const props = getMassProperties(mesh);
          return { content: [{ type: 'text' as const, text: JSON.stringify(props, null, 2) }] };
        }

        default:
          return { content: [{ type: 'text' as const, text: `Unknown measurement type: ${type}` }] };
      }
    },
  );
}
