import { useCADStore } from '../../stores/cad-store';
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

const tools: { id: ToolType; label: string; shortcut: string }[] = [
  { id: 'select', label: 'Select', shortcut: 'V' },
  { id: 'box', label: 'Box', shortcut: 'B' },
  { id: 'cylinder', label: 'Cylinder', shortcut: 'C' },
  { id: 'sphere', label: 'Sphere', shortcut: 'S' },
  { id: 'cone', label: 'Cone', shortcut: '' },
  { id: 'torus', label: 'Torus', shortcut: '' },
  { id: 'hole', label: 'Hole', shortcut: 'H' },
  { id: 'fillet', label: 'Fillet', shortcut: '' },
  { id: 'chamfer', label: 'Chamfer', shortcut: '' },
  { id: 'pattern_linear', label: 'Lin Pattern', shortcut: '' },
  { id: 'pattern_circular', label: 'Circ Pattern', shortcut: '' },
  { id: 'measure', label: 'Measure', shortcut: 'M' },
  { id: 'section', label: 'Section', shortcut: '' },
];

export function Toolbar() {
  const activeTool = useCADStore((s) => s.activeTool);
  const setActiveTool = useCADStore((s) => s.setActiveTool);
  const addFeatureAndSelect = useCADStore((s) => s.addFeatureAndSelect);
  const features = useCADStore((s) => s.features);

  const handleToolClick = (toolId: ToolType) => {
    const comingSoon = ['fillet', 'chamfer', 'section'] as ToolType[];
    if (comingSoon.includes(toolId)) {
      useToast().addToast(`${toolId.charAt(0).toUpperCase() + toolId.slice(1)} tool coming soon`, 'warning');
      return;
    }

    if (toolId === 'pattern_linear' || toolId === 'pattern_circular') {
      const defaults = getDefaultParameters(toolId);
      const id = nanoid();
      const label = toolId === 'pattern_linear' ? 'Linear Pattern' : 'Circular Pattern';
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
      <div style={styles.group}>
        {tools.map((tool) => (
          <button
            key={tool.id}
            style={{
              ...styles.button,
              ...(activeTool === tool.id ? styles.active : {}),
            }}
            onClick={() => handleToolClick(tool.id)}
            title={tool.shortcut ? `${tool.label} (${tool.shortcut})` : tool.label}
          >
            {tool.label}
          </button>
        ))}
      </div>
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
};
