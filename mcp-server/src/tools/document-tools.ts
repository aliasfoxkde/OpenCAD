/**
 * Document tools for the MCP server.
 */

import { z } from 'zod';
import type { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import { createProject, writeProject, readProject, listProjects, deleteProject } from '../core/project-io.js';

const DEFAULT_DIR = process.cwd();

export function registerDocumentTools(server: McpServer): void {
  server.tool(
    'create_document',
    'Create a new .ocad project file',
    {
      name: z.string().describe('Document name'),
      directory: z.string().optional().describe('Directory path (default: current directory)'),
      units: z.enum(['mm', 'cm', 'm', 'in', 'ft']).optional().describe('Units system (default: mm)'),
    },
    async ({ name, directory, units }) => {
      const dir = directory ?? DEFAULT_DIR;
      const project = createProject(name, units);
      const filePath = `${dir}/${name}.ocad`;
      writeProject(filePath, project);
      return {
        content: [{
          type: 'text' as const,
          text: JSON.stringify({ id: name, name: project.name, units: project.units, path: filePath, featureCount: 0 }, null, 2),
        }],
      };
    },
  );

  server.tool(
    'list_documents',
    'List all .ocad project files in a directory',
    {
      directory: z.string().optional().describe('Directory path (default: current directory)'),
    },
    async ({ directory }) => {
      const dir = directory ?? DEFAULT_DIR;
      const projects = listProjects(dir);
      return {
        content: [{
          type: 'text' as const,
          text: JSON.stringify(projects, null, 2),
        }],
      };
    },
  );

  server.tool(
    'open_document',
    'Read and return the full project state from a .ocad file',
    {
      path: z.string().describe('Path to the .ocad file'),
    },
    async ({ path: filePath }) => {
      const project = readProject(filePath);
      return {
        content: [{
          type: 'text' as const,
          text: JSON.stringify(project, null, 2),
        }],
      };
    },
  );

  server.tool(
    'delete_document',
    'Delete a .ocad project file',
    {
      path: z.string().describe('Path to the .ocad file'),
    },
    async ({ path: filePath }) => {
      const deleted = deleteProject(filePath);
      return {
        content: [{
          type: 'text' as const,
          text: deleted ? 'Document deleted' : 'Document not found',
        }],
      };
    },
  );
}
