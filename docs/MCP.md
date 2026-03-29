# OpenCAD MCP Server

The OpenCAD MCP server exposes CAD operations as tools for AI agents (Claude Code, Claude Desktop, etc.) via the Model Context Protocol.

## Setup

### Running Locally

```bash
npm run mcp:dev
```

### Claude Code Configuration

The MCP server is pre-configured in `.claude/mcp.json`:

```json
{
  "opencad": {
    "command": "npx",
    "args": ["tsx", "mcp-server/src/index.ts"],
    "cwd": "/path/to/OpenCAD"
  }
}
```

### Claude Desktop Configuration

Add to your `claude_desktop_config.json`:

```json
{
  "mcpServers": {
    "opencad": {
      "command": "npx",
      "args": ["tsx", "mcp-server/src/index.ts"],
      "cwd": "/path/to/OpenCAD"
    }
  }
}
```

## Available Tools

### Document Tools

| Tool | Description | Parameters |
|------|-------------|------------|
| `create_document` | Create a new .ocad project file | `name`, `directory?`, `units?` |
| `list_documents` | List .ocad files in a directory | `directory?` |
| `open_document` | Read full project state | `path` |
| `delete_document` | Delete a .ocad file | `path` |

### Feature Tools

| Tool | Description | Parameters |
|------|-------------|------------|
| `add_feature` | Add feature to project | `projectPath`, `type`, `name?`, `parameters?` |
| `modify_feature` | Update feature parameters | `projectPath`, `featureId`, `parameters` |
| `delete_feature` | Remove feature from project | `projectPath`, `featureId` |
| `get_document_state` | Get full project state | `projectPath` |

### Export Tools

| Tool | Description | Parameters |
|------|-------------|------------|
| `export_file` | Export to STL/OBJ/glTF | `projectPath`, `format`, `outputPath` |

### Measurement Tools

| Tool | Description | Parameters |
|------|-------------|------------|
| `measure` | Compute geometric measurements | `type`, `primitiveType?`, `parameters?`, `pointA?`, `pointB?` |

Measurement types: `distance`, `volume`, `surface_area`, `bounding_box`, `mass_properties`

### Info Tools

| Tool | Description | Parameters |
|------|-------------|------------|
| `list_available_features` | List all feature types with parameters | none |
| `get_feature_parameters` | Get parameter schema for a feature type | `type` |

## Example Usage

### Create a project with a box and export to STL

```
1. create_document(name="bracket", units="mm")
2. add_feature(projectPath="bracket.ocad", type="box", parameters={width: 50, height: 30, depth: 10})
3. export_file(projectPath="bracket.ocad", format="stl", outputPath="./bracket.stl")
```

### Measure a sphere

```
measure(type="volume", primitiveType="sphere", parameters={radius: 5})
→ { volume: 523.6, unit: "mm³" }
```

### List available feature types

```
list_available_features()
→ [{ type: "box", label: "Box", category: "primitives", ... }, ...]
```

## Architecture

The MCP server is a standalone Node.js process that:

- **Reads/writes .ocad files** on disk using `fs`
- **Generates meshes** using shared pure-math generators from `src/cad/kernel/`
- **Exports** using shared exporters (STL, OBJ, glTF)
- **Measures** using shared analysis functions

No browser APIs are needed — all computation is pure TypeScript math.
