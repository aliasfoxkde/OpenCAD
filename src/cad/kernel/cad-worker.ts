/**
 * CAD Kernel Worker - runs opencascade.js in a Web Worker
 * to avoid blocking the main thread during geometry operations.
 *
 * For Phase 1, this uses placeholder mesh generators.
 * Phase 2 will integrate the actual opencascade.js WASM kernel.
 */

import type { WorkerRequest, WorkerResponse } from '../../types/worker';
import {
  generateBoxMesh,
  generateCylinderMesh,
  generateSphereMesh,
  generateConeMesh,
  generateTorusMesh,
  generateHoleMesh,
} from './mesh-generators';

let initialized = false;

const primitives = new Map<string, { primitive: string; params: Record<string, number> }>();

function handleMessage(event: MessageEvent<WorkerRequest>): void {
  const request = event.data;

  switch (request.type) {
    case 'init':
      initialized = true;
      postResponse({ type: 'ready' });
      break;

    case 'create_primitive':
      if (!initialized) {
        postResponse({ type: 'error', message: 'Kernel not initialized' });
        return;
      }
      primitives.set(request.id, { primitive: request.primitive, params: request.params });
      postResponse({ type: 'shape_created', id: request.id });
      break;

    case 'delete_shape':
      primitives.delete(request.id);
      postResponse({ type: 'shape_deleted', id: request.id });
      break;

    case 'tessellate': {
      const def = primitives.get(request.id);
      if (!def) {
        postResponse({
          type: 'tessellation_error',
          id: request.id,
          message: `No shape found for id: ${request.id}`,
        });
        return;
      }
      const mesh = generatePlaceholderMesh(def.primitive, def.params);
      postResponse({ type: 'tessellation_result', id: request.id, mesh });
      break;
    }

    default:
      postResponse({
        type: 'error',
        message: `Unknown request type: ${(request as { type: string }).type}`,
      });
  }
}

function generatePlaceholderMesh(
  primitive: string,
  params: Record<string, number>,
): import('../../types/cad').MeshData {
  switch (primitive) {
    case 'box':
      return generateBoxMesh(params.width ?? 1, params.height ?? 1, params.depth ?? 1);
    case 'cylinder':
      return generateCylinderMesh(params.radius ?? 0.5, params.height ?? 1);
    case 'sphere':
      return generateSphereMesh(params.radius ?? 0.5);
    case 'cone':
      return generateConeMesh(params.radius ?? 0.5, params.height ?? 1);
    case 'torus':
      return generateTorusMesh(params.radius ?? 0.5, params.tube ?? 0.15);
    case 'hole':
      return generateHoleMesh(params.diameter ?? 5, params.depth ?? 10);
    default:
      return generateBoxMesh(1, 1, 1);
  }
}

function postResponse(response: WorkerResponse): void {
  self.postMessage(response);
}

self.onmessage = handleMessage;
