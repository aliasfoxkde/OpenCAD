/**
 * Feature tools for the MCP server.
 */

import { z } from 'zod';
import type { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import { readProject, writeProject } from '../core/project-io.js';
import { getFeatureDefinition, getDefaultParameters } from '../core/feature-registry.js';
import type { FeatureNode } from '@opencad/types/cad';

export function registerFeatureTools(server: McpServer): void {
  server.tool(
    'add_feature',
    'Add a feature to a project file',
    {
      projectPath: z.string().describe('Path to the .ocad file'),
      type: z.string().describe('Feature type (e.g. box, sphere, extrude)'),
      name: z.string().optional().describe('Feature name (default: type)'),
      parameters: z.record(z.unknown()).optional().describe('Feature parameters'),
    },
    async ({ projectPath, type, name, parameters }) => {
      const project = readProject(projectPath);
      const defaults = getDefaultParameters(type);
      const feature: FeatureNode = {
        id: `f-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
        type: type as FeatureNode['type'],
        name: name ?? type,
        parameters: { ...defaults, ...parameters },
        dependencies: [],
        children: [],
        suppressed: false,
      };
      project.features.push(feature);
      writeProject(projectPath, project);
      return {
        content: [{
          type: 'text' as const,
          text: JSON.stringify({ success: true, feature }, null, 2),
        }],
      };
    },
  );

  server.tool(
    'modify_feature',
    'Update a feature\'s parameters in a project file',
    {
      projectPath: z.string().describe('Path to the .ocad file'),
      featureId: z.string().describe('ID of the feature to modify'),
      parameters: z.record(z.unknown()).describe('Parameters to update'),
    },
    async ({ projectPath, featureId, parameters }) => {
      const project = readProject(projectPath);
      const feature = project.features.find((f) => f.id === featureId);
      if (!feature) {
        return {
          content: [{ type: 'text' as const, text: JSON.stringify({ success: false, error: `Feature "${featureId}" not found` }) }],
        };
      }
      Object.assign(feature.parameters, parameters);
      writeProject(projectPath, project);
      return {
        content: [{
          type: 'text' as const,
          text: JSON.stringify({ success: true, feature }, null, 2),
        }],
      };
    },
  );

  server.tool(
    'delete_feature',
    'Remove a feature from a project file',
    {
      projectPath: z.string().describe('Path to the .ocad file'),
      featureId: z.string().describe('ID of the feature to delete'),
    },
    async ({ projectPath, featureId }) => {
      const project = readProject(projectPath);
      const index = project.features.findIndex((f) => f.id === featureId);
      if (index === -1) {
        return {
          content: [{ type: 'text' as const, text: JSON.stringify({ success: false, error: `Feature "${featureId}" not found` }) }],
        };
      }
      project.features.splice(index, 1);
      writeProject(projectPath, project);
      return {
        content: [{
          type: 'text' as const,
          text: JSON.stringify({ success: true, remainingFeatures: project.features.length }, null, 2),
        }],
      };
    },
  );

  server.tool(
    'get_document_state',
    'Get the full project state including all features',
    {
      projectPath: z.string().describe('Path to the .ocad file'),
    },
    async ({ projectPath }) => {
      const project = readProject(projectPath);
      return {
        content: [{
          type: 'text' as const,
          text: JSON.stringify(project, null, 2),
        }],
      };
    },
  );
}
