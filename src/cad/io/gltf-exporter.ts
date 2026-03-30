/**
 * glTF 2.0 Binary (GLB) Exporter — converts MeshData to GLB format.
 *
 * glTF 2.0 spec: https://registry.khronos.org/glTF/specs/2.0/glTF-2.0.html
 *
 * Structure: JSON chunk + Binary chunk in a single .glb file.
 */

import type { MeshData } from '../../types/cad';

const GLB_MAGIC = 0x46546c67; // 'glTF'
const GLB_VERSION = 2;
const JSON_CHUNK_TYPE = 0x4e4f534a; // 'JSON'
const BIN_CHUNK_TYPE = 0x004e4942; // 'BIN\0'

interface GLTFBuffer {
  uri: string;
  byteLength: number;
}

interface GLTFBufferView {
  buffer: number;
  byteOffset: number;
  byteLength: number;
  target?: number;
}

interface GLTFAccessor {
  bufferView: number;
  byteOffset: number;
  componentType: number;
  count: number;
  type: string;
  min?: number[];
  max?: number[];
}

interface GLTFMesh {
  name: string;
  primitives: {
    attributes: { POSITION: number; NORMAL: number };
    indices?: number;
    mode?: number;
  }[];
}

const COMPONENT_TYPE_FLOAT = 5126;
const COMPONENT_TYPE_UNSIGNED_INT = 5125;

export function exportGLB(meshes: MeshData[], name = 'OpenCAD'): ArrayBuffer {
  const bufferViews: GLTFBufferView[] = [];
  const accessors: GLTFAccessor[] = [];
  const gltfMeshes: GLTFMesh[] = [];

  // Collect all binary data
  const binaryChunks: ArrayBuffer[] = [];
  let binOffset = 0;

  for (let mi = 0; mi < meshes.length; mi++) {
    const mesh = meshes[mi]!;
    const vertexCount = mesh.vertices.length / 3;
    const indexCount = mesh.indices.length;

    // Vertices buffer view
    const vertexBufferViewIndex = bufferViews.length;
    const vertexByteLength = mesh.vertices.byteLength;
    bufferViews.push({
      buffer: 0,
      byteOffset: binOffset,
      byteLength: vertexByteLength,
      target: 34962, // ARRAY_BUFFER
    });
    binaryChunks.push(
      mesh.vertices.buffer.slice(mesh.vertices.byteOffset, mesh.vertices.byteOffset + vertexByteLength) as ArrayBuffer,
    );

    // Compute min/max for positions
    let minX = Infinity,
      minY = Infinity,
      minZ = Infinity;
    let maxX = -Infinity,
      maxY = -Infinity,
      maxZ = -Infinity;
    for (let i = 0; i < vertexCount; i++) {
      const x = mesh.vertices[i * 3]!;
      const y = mesh.vertices[i * 3 + 1]!;
      const z = mesh.vertices[i * 3 + 2]!;
      if (x < minX) minX = x;
      if (x > maxX) maxX = x;
      if (y < minY) minY = y;
      if (y > maxY) maxY = y;
      if (z < minZ) minZ = z;
      if (z > maxZ) maxZ = z;
    }

    // Position accessor
    const positionAccessorIndex = accessors.length;
    accessors.push({
      bufferView: vertexBufferViewIndex,
      byteOffset: 0,
      componentType: COMPONENT_TYPE_FLOAT,
      count: vertexCount,
      type: 'VEC3',
      min: [minX, minY, minZ],
      max: [maxX, maxY, maxZ],
    });

    binOffset += vertexByteLength;
    // Pad to 4-byte alignment
    const vertexPad = (4 - (vertexByteLength % 4)) % 4;
    if (vertexPad > 0) {
      binaryChunks.push(new ArrayBuffer(vertexPad));
      binOffset += vertexPad;
    }

    // Normals buffer view
    const normalBufferViewIndex = bufferViews.length;
    const normalByteLength = mesh.normals.byteLength;
    bufferViews.push({
      buffer: 0,
      byteOffset: binOffset,
      byteLength: normalByteLength,
      target: 34962,
    });
    binaryChunks.push(
      mesh.normals.buffer.slice(mesh.normals.byteOffset, mesh.normals.byteOffset + normalByteLength) as ArrayBuffer,
    );

    // Normal accessor
    const normalAccessorIndex = accessors.length;
    accessors.push({
      bufferView: normalBufferViewIndex,
      byteOffset: 0,
      componentType: COMPONENT_TYPE_FLOAT,
      count: mesh.normals.length / 3,
      type: 'VEC3',
    });

    binOffset += normalByteLength;
    const normalPad = (4 - (normalByteLength % 4)) % 4;
    if (normalPad > 0) {
      binaryChunks.push(new ArrayBuffer(normalPad));
      binOffset += normalPad;
    }

    // Indices buffer view
    let indicesAccessorIndex: number | undefined;
    if (indexCount > 0) {
      const indexBufferViewIndex = bufferViews.length;
      const indexByteLength = mesh.indices.byteLength;
      bufferViews.push({
        buffer: 0,
        byteOffset: binOffset,
        byteLength: indexByteLength,
        target: 34963, // ELEMENT_ARRAY_BUFFER
      });
      binaryChunks.push(
        mesh.indices.buffer.slice(mesh.indices.byteOffset, mesh.indices.byteOffset + indexByteLength) as ArrayBuffer,
      );

      indicesAccessorIndex = accessors.length;
      accessors.push({
        bufferView: indexBufferViewIndex,
        byteOffset: 0,
        componentType: COMPONENT_TYPE_UNSIGNED_INT,
        count: indexCount,
        type: 'SCALAR',
      });

      binOffset += indexByteLength;
      const indexPad = (4 - (indexByteLength % 4)) % 4;
      if (indexPad > 0) {
        binaryChunks.push(new ArrayBuffer(indexPad));
        binOffset += indexPad;
      }
    }

    gltfMeshes.push({
      name: mesh.featureId || `mesh_${mi}`,
      primitives: [
        {
          attributes: {
            POSITION: positionAccessorIndex,
            NORMAL: normalAccessorIndex,
          },
          indices: indicesAccessorIndex,
        },
      ],
    });
  }

  // Build glTF JSON
  const gltfJson = {
    asset: { version: '2.0', generator: 'OpenCAD' },
    scene: 0,
    scenes: [{ name, nodes: gltfMeshes.map((_, i) => i) }],
    nodes: gltfMeshes.map((m, i) => ({ name: m.name, mesh: i })),
    meshes: gltfMeshes,
    accessors,
    bufferViews,
    buffers: [{ uri: 'binary', byteLength: binOffset } as GLTFBuffer],
  };

  // Encode JSON
  const jsonStr = JSON.stringify(gltfJson);
  const jsonEncoder = new TextEncoder();
  const jsonData = jsonEncoder.encode(jsonStr);
  // Pad JSON to 4-byte alignment with spaces
  const jsonPad = (4 - (jsonData.length % 4)) % 4;
  const jsonPadded = new Uint8Array(jsonData.length + jsonPad);
  jsonPadded.set(jsonData);
  for (let i = 0; i < jsonPad; i++) jsonPadded[jsonData.length + i] = 0x20; // space

  // Combine binary chunks
  const binData = new Uint8Array(binOffset);
  let bo = 0;
  for (const chunk of binaryChunks) {
    binData.set(new Uint8Array(chunk), bo);
    bo += chunk.byteLength;
  }

  // Build GLB
  const jsonChunkLength = jsonPadded.length;
  const binChunkLength = binData.length;
  const totalLength = 12 + 8 + jsonChunkLength + 8 + binChunkLength;

  const glb = new ArrayBuffer(totalLength);
  const view = new DataView(glb);
  const bytes = new Uint8Array(glb);

  // GLB header (12 bytes)
  view.setUint32(0, GLB_MAGIC, true);
  view.setUint32(4, GLB_VERSION, true);
  view.setUint32(8, totalLength, true);

  // JSON chunk
  let off = 12;
  view.setUint32(off, jsonChunkLength, true);
  off += 4;
  view.setUint32(off, JSON_CHUNK_TYPE, true);
  off += 4;
  bytes.set(jsonPadded, off);
  off += jsonChunkLength;

  // BIN chunk
  view.setUint32(off, binChunkLength, true);
  off += 4;
  view.setUint32(off, BIN_CHUNK_TYPE, true);
  off += 4;
  bytes.set(binData, off);

  return glb;
}
