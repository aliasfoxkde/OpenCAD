/**
 * 3MF (3D Manufacturing Format) Exporter — converts MeshData to 3MF format.
 *
 * 3MF spec: https://3mf.io/specification/
 *
 * 3MF is an XML-based format optimized for additive manufacturing/3D printing.
 */

import type { MeshData } from '../../types/cad';

const XML_DECL = '<?xml version="1.0" encoding="UTF-8"?>';

/** Export a single mesh to 3MF XML fragment */
function meshToXML(mesh: MeshData, meshIndex: number): string {
  const vertexCount = mesh.vertices.length / 3;
  const indexCount = mesh.indices.length;

  const vertices = Array.from({ length: vertexCount }, (_, i) => {
    const x = mesh.vertices[i * 3]!.toFixed(6);
    const y = mesh.vertices[i * 3 + 1]!.toFixed(6);
    const z = mesh.vertices[i * 3 + 2]!.toFixed(6);
    return `        <vertex x="${x}" y="${y}" z="${z}" />`;
  }).join('\n');

  const triangles = Array.from({ length: indexCount / 3 }, (_, i) => {
    const v1 = mesh.indices[i * 3]!;
    const v2 = mesh.indices[i * 3 + 1]!;
    const v3 = mesh.indices[i * 3 + 2]!;
    return `        <triangle v1="${v1}" v2="${v2}" v3="${v3}" />`;
  }).join('\n');

  return `
    <object id="${mesh.featureId || `mesh_${meshIndex}`}" type="model">
      <mesh>
        <vertices>
${vertices}
        </vertices>
        <triangles count="${indexCount / 3}">
${triangles}
        </triangles>
      </mesh>
    </object>`;
}

/** Export meshes to 3MF XML string */
export function export3MF(meshes: MeshData[]): string {
  const objects = meshes.map((mesh, i) => meshToXML(mesh, i)).join('\n');

  return `${XML_DECL}
<model unit="millimeter" xml:lang="en-US" xmlns="http://schemas.microsoft.com/3dmanufacturing/core/2015/02">
  <resources>
    ${objects}
  </resources>
  <build>
    <item objectid="${meshes[0]?.featureId || 'mesh_0'}" />
  </build>
</model>`;
}
