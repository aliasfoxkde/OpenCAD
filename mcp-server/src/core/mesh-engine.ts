/**
 * Mesh engine — re-exports mesh generators for use in Node.js.
 *
 * All mesh generators are pure math (no DOM, no browser APIs),
 * so they work directly in Node.js.
 */

export {
  generateBoxMesh,
  generateCylinderMesh,
  generateSphereMesh,
  generateConeMesh,
  generateTorusMesh,
} from '@opencad/cad/kernel/mesh-generators';
