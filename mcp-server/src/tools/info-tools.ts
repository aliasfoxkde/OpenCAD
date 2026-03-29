/**
 * Info tools for the MCP server — metadata about available features.
 */

import { z } from 'zod';
import type { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import { getAllFeatureDefinitions, getFeatureDefinition } from '../core/feature-registry.js';

export function registerInfoTools(server: McpServer): void {
  server.tool(
    'list_available_features',
    'List all available feature types with their parameters',
    {},
    async () => {
      const definitions = getAllFeatureDefinitions();
      const summary = definitions.map((d) => ({
        type: d.type,
        label: d.label,
        category: d.category,
        description: d.description,
        parameters: d.parameters.map((p) => ({
          name: p.name,
          type: p.type,
          default: p.default,
          required: p.required,
          unit: p.unit,
          description: p.description,
        })),
      }));
      return {
        content: [{
          type: 'text' as const,
          text: JSON.stringify(summary, null, 2),
        }],
      };
    },
  );

  server.tool(
    'get_feature_parameters',
    'Get the parameter schema for a specific feature type',
    {
      type: z.string().describe('Feature type (e.g. box, extrude, fillet)'),
    },
    async ({ type }) => {
      const def = getFeatureDefinition(type);
      if (!def) {
        return {
          content: [{ type: 'text' as const, text: JSON.stringify({ error: `Unknown feature type: ${type}` }) }],
        };
      }
      return {
        content: [{
          type: 'text' as const,
          text: JSON.stringify({
            type: def.type,
            label: def.label,
            category: def.category,
            description: def.description,
            requiresSketch: def.requiresSketch,
            requiresBody: def.requiresBody,
            parameters: def.parameters,
          }, null, 2),
        }],
      };
    },
  );
}
