/**
 * OpenCAD MCP Server — exposes CAD operations as MCP tools for AI agents.
 *
 * Usage: npx tsx mcp-server/src/index.ts
 *
 * Tools:
 * - create_document, list_documents, open_document, delete_document
 * - add_feature, modify_feature, delete_feature, get_document_state
 * - export_file (STL, OBJ, glTF)
 * - measure (distance, volume, surface_area, bounding_box, mass_properties)
 * - list_available_features, get_feature_parameters
 */

import { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import { StdioServerTransport } from '@modelcontextprotocol/sdk/server/stdio.js';
import { registerDocumentTools } from './tools/document-tools.js';
import { registerFeatureTools } from './tools/feature-tools.js';
import { registerExportTools } from './tools/export-tools.js';
import { registerMeasureTools } from './tools/measure-tools.js';
import { registerInfoTools } from './tools/info-tools.js';

const server = new McpServer({
  name: 'opencad',
  version: '1.0.0',
});

registerDocumentTools(server);
registerFeatureTools(server);
registerExportTools(server);
registerMeasureTools(server);
registerInfoTools(server);

async function main(): Promise<void> {
  const transport = new StdioServerTransport();
  await server.connect(transport);
}

main().catch((err) => {
  console.error('MCP server error:', err);
  process.exit(1);
});
