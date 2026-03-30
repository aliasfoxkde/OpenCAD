import { useCADStore } from '../../stores/cad-store';
import { useViewStore } from '../../stores/view-store';
import { getDefaultParameters } from '../../cad/features';
import { nanoid } from 'nanoid';
import { DisplayModeToggle } from './DisplayModeToggle';
import { useToast } from './Toast';
import type { FeatureType } from '../../types/cad';
import type { ToolType } from '../../types/cad';

/** Map primitive ToolType to feature-registry type */
const primitiveTypeMap: Partial<Record<ToolType, FeatureType>> = {
  box: 'extrude',
  cylinder: 'revolve',
  sphere: 'sphere',
  cone: 'cone',
  torus: 'torus',
  hole: 'hole',
};

/** Primitives that create features immediately */
const primitiveTools: ToolType[] = ['box', 'cylinder', 'sphere', 'cone', 'torus', 'hole'];

type ToolItem = { kind: 'tool'; id: ToolType; label: string; shortcut: string; tooltip: string };
type SeparatorItem = { kind: 'separator'; label: string };
type ToolbarItem = ToolItem | SeparatorItem;

const toolGroups: ToolbarItem[] = [
  { kind: 'tool', id: 'select', label: 'Select', shortcut: 'V', tooltip: 'Select & move objects (V)' },
  { kind: 'separator', label: 'Create' },
  { kind: 'tool', id: 'box', label: 'Box', shortcut: 'B', tooltip: 'Create a box (B)' },
  { kind: 'tool', id: 'cylinder', label: 'Cylinder', shortcut: 'C', tooltip: 'Create a cylinder (C)' },
  { kind: 'tool', id: 'sphere', label: 'Sphere', shortcut: 'S', tooltip: 'Create a sphere (S)' },
  { kind: 'tool', id: 'cone', label: 'Cone', shortcut: '', tooltip: 'Create a cone' },
  { kind: 'tool', id: 'torus', label: 'Torus', shortcut: '', tooltip: 'Create a torus' },
  { kind: 'tool', id: 'hole', label: 'Hole', shortcut: 'H', tooltip: 'Create a hole (H)' },
  { kind: 'separator', label: 'Boolean' },
  { kind: 'tool', id: 'boolean_union', label: 'Union', shortcut: '', tooltip: 'Union — merge bodies' },
  { kind: 'tool', id: 'boolean_subtract', label: 'Subtract', shortcut: '', tooltip: 'Subtract — cut from body' },
  { kind: 'tool', id: 'boolean_intersect', label: 'Intersect', shortcut: '', tooltip: 'Intersect — keep overlap' },
  { kind: 'separator', label: 'Modify' },
  { kind: 'tool', id: 'shell', label: 'Shell', shortcut: '', tooltip: 'Shell — hollow out a body' },
  { kind: 'tool', id: 'pattern_linear', label: 'Lin Pattern', shortcut: '', tooltip: 'Linear pattern — repeat along axis' },
  { kind: 'tool', id: 'pattern_circular', label: 'Circ Pattern', shortcut: '', tooltip: 'Circular pattern — repeat around axis' },
  { kind: 'tool', id: 'mirror', label: 'Mirror', shortcut: '', tooltip: 'Mirror — reflect across plane' },
  { kind: 'separator', label: 'Inspect' },
  { kind: 'tool', id: 'measure', label: 'Measure', shortcut: 'M', tooltip: 'Measure distance (M)' },
  { kind: 'tool', id: 'section', label: 'Section', shortcut: '', tooltip: 'Section cut plane' },
  { kind: 'separator', label: 'Edge' },
  { kind: 'tool', id: 'fillet', label: 'Fillet', shortcut: '', tooltip: 'Fillet — round edges (coming soon)' },
  { kind: 'tool', id: 'chamfer', label: 'Chamfer', shortcut: '', tooltip: 'Chamfer — bevel edges (coming soon)' },
];

export function Toolbar() {
  const activeTool = useCADStore((s) => s.activeTool);
  const setActiveTool = useCADStore((s) => s.setActiveTool);
  const addFeatureAndSelect = useCADStore((s) => s.addFeatureAndSelect);
  const features = useCADStore((s) => s.features);

  const handleToolClick = (toolId: ToolType) => {
    const comingSoon = ['fillet', 'chamfer'] as ToolType[];
    if (comingSoon.includes(toolId)) {
      useToast().addToast(`${toolId.charAt(0).toUpperCase() + toolId.slice(1)} tool coming soon`, 'warning');
      return;
    }

    if (toolId === 'section') {
      useViewStore.getState().toggleSectionPlane();
      return;
    }

    if (toolId === 'boolean_union' || toolId === 'boolean_subtract' || toolId === 'boolean_intersect') {
      const defaults = getDefaultParameters(toolId);
      const id = nanoid();
      const selectedIds = useCADStore.getState().selectedIds;
      const labels: Record<string, string> = {
        boolean_union: 'Union',
        boolean_subtract: 'Subtract',
        boolean_intersect: 'Intersect',
      };
      const label = labels[toolId] ?? toolId;
      const name = `${label} ${features.length + 1}`;

      if (toolId === 'boolean_subtract') {
        // Subtract needs exactly two references: target and tool
        if (selectedIds.length >= 2) {
          defaults.targetRef = selectedIds[0];
          defaults.toolRef = selectedIds[1];
        } else if (selectedIds.length === 1) {
          defaults.targetRef = selectedIds[0];
        }
      } else {
        // Union and intersect use comma-separated bodyRefs
        if (selectedIds.length >= 2) {
          defaults.bodyRefs = selectedIds.join(',');
        }
      }

      const dependencies = selectedIds.length > 0 ? [...selectedIds] : [];
      addFeatureAndSelect({
        id, type: toolId as FeatureType, name,
        parameters: defaults, dependencies, children: [], suppressed: false,
      });
      setActiveTool('select');
      return;
    }

    if (toolId === 'shell') {
      const defaults = getDefaultParameters('shell');
      const id = nanoid();
      const selectedId = useCADStore.getState().selectedIds[0];
      if (selectedId) {
        defaults.targetRef = selectedId;
      }
      const dependencies = selectedId ? [selectedId] : [];
      addFeatureAndSelect({
        id, type: 'shell' as FeatureType, name: `Shell ${features.length + 1}`,
        parameters: defaults, dependencies, children: [], suppressed: false,
      });
      setActiveTool('select');
      return;
    }

    if (toolId === 'pattern_linear' || toolId === 'pattern_circular' || toolId === 'mirror') {
      const defaults = getDefaultParameters(toolId);
      const id = nanoid();
      const labels: Record<string, string> = {
        pattern_linear: 'Linear Pattern',
        pattern_circular: 'Circular Pattern',
        mirror: 'Mirror',
      };
      const label = labels[toolId] ?? toolId;
      const name = `${label} ${features.length + 1}`;
      const selectedId = useCADStore.getState().selectedIds[0];
      if (selectedId) {
        defaults.featureRef = selectedId;
      }
      const dependencies = selectedId ? [selectedId] : [];
      addFeatureAndSelect({
        id, type: toolId as FeatureType, name,
        parameters: defaults, dependencies, children: [], suppressed: false,
      });
      setActiveTool('select');
      return;
    }

    if (primitiveTools.includes(toolId)) {
      const featureType = primitiveTypeMap[toolId];
      if (!featureType) return;

      const defaults = getDefaultParameters(featureType);
      const id = nanoid();
      const name = `${toolId.charAt(0).toUpperCase() + toolId.slice(1)} ${features.length + 1}`;

      addFeatureAndSelect({
        id,
        type: featureType,
        name,
        parameters: defaults,
        dependencies: [],
        children: [],
        suppressed: false,
      });
      setActiveTool('select');
    } else {
      setActiveTool(toolId);
    }
  };

  return (
    <div style={styles.toolbar}>
      {toolGroups.map((item, i) => {
        if (item.kind === 'separator') {
          return (
            <div key={`sep-${i}`} style={styles.groupDivider}>
              <div style={styles.groupDividerLine} />
              <span style={styles.groupDividerLabel}>{item.label}</span>
              <div style={styles.groupDividerLine} />
            </div>
          );
        }
        return (
          <button
            key={item.id}
            style={{
              ...styles.button,
              ...(activeTool === item.id ? styles.active : {}),
            }}
            onClick={() => handleToolClick(item.id)}
            title={item.tooltip}
          >
            {item.label}
            {item.shortcut && <span style={styles.shortcutHint}>{item.shortcut}</span>}
          </button>
        );
      })}
      <div style={styles.divider} />
      <DisplayModeToggle />
    </div>
  );
}

const styles: Record<string, React.CSSProperties> = {
  toolbar: {
    display: 'flex',
    alignItems: 'center',
    gap: 4,
    padding: '4px 8px',
    background: '#1e293b',
    borderBottom: '1px solid #334155',
    height: 40,
    overflow: 'hidden',
  },
  group: {
    display: 'flex',
    alignItems: 'center',
    gap: 2,
  },
  divider: {
    width: 1,
    height: 24,
    background: '#334155',
    margin: '0 4px',
  },
  button: {
    padding: '4px 10px',
    borderRadius: 4,
    fontSize: 12,
    color: '#94a3b8',
    background: 'transparent',
    border: '1px solid transparent',
    whiteSpace: 'nowrap',
  },
  active: {
    background: '#3b82f6',
    color: '#ffffff',
    border: '1px solid #2563eb',
  },
  shortcutHint: {
    fontSize: 9,
    color: '#475569',
    marginLeft: 3,
  },
  groupDivider: {
    display: 'flex',
    alignItems: 'center',
    gap: 4,
    margin: '0 4px',
    height: 24,
  },
  groupDividerLine: {
    width: 1,
    height: 16,
    background: '#475569',
  },
  groupDividerLabel: {
    fontSize: 8,
    color: '#475569',
    textTransform: 'uppercase',
    letterSpacing: '0.05em',
    whiteSpace: 'nowrap',
  },
};
