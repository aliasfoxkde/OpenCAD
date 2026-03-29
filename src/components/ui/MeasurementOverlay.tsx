/**
 * Measurement overlay that displays bounding box dimensions and other
 * measurement info when the measure tool is active and features are selected.
 */

import { useMemo } from 'react';
import { useCADStore } from '../../stores/cad-store';

export function MeasurementOverlay() {
  const activeTool = useCADStore((s) => s.activeTool);
  const features = useCADStore((s) => s.features);
  const selectedIds = useCADStore((s) => s.selectedIds);

  if (activeTool !== 'measure' || selectedIds.length === 0) return null;

  const selectedFeatures = features.filter((f) => selectedIds.includes(f.id));

  return (
    <div style={styles.container}>
      <div style={styles.header}>Measurements</div>
      {selectedFeatures.map((feature) => (
        <FeatureMeasurement key={feature.id} feature={feature} />
      ))}
    </div>
  );
}

function FeatureMeasurement({ feature }: { feature: { name: string; type: string; parameters: Record<string, unknown> } }) {
  const measurements = useMemo(() => getFeatureMeasurements(feature.parameters), [feature.parameters]);

  return (
    <div style={styles.item}>
      <div style={styles.featureName}>{feature.name}</div>
      <div style={styles.typeLabel}>{feature.type}</div>
      <div style={styles.measurements}>
        {measurements.map((m, i) => (
          <div key={i} style={styles.measurement}>
            <span style={styles.measureLabel}>{m.label}:</span>
            <span style={styles.measureValue}>{m.value.toFixed(2)} {m.unit}</span>
          </div>
        ))}
      </div>
    </div>
  );
}

function getFeatureMeasurements(params: Record<string, unknown>): Array<{ label: string; value: number; unit: string }> {
  const results: Array<{ label: string; value: number; unit: string }> = [];

  switch (true) {
    case 'width' in params && 'height' in params && 'depth' in params: {
      const w = (params.width as number) ?? 0;
      const h = (params.height as number) ?? 0;
      const d = (params.depth as number) ?? 0;
      results.push({ label: 'Width', value: w, unit: 'mm' });
      results.push({ label: 'Height', value: h, unit: 'mm' });
      results.push({ label: 'Depth', value: d, unit: 'mm' });
      results.push({ label: 'Volume', value: w * h * d, unit: 'mm\u00B3' });
      break;
    }
    case 'radius' in params && 'height' in params: {
      const r = (params.radius as number) ?? 0;
      const h = (params.height as number) ?? 0;
      results.push({ label: 'Radius', value: r, unit: 'mm' });
      results.push({ label: 'Diameter', value: r * 2, unit: 'mm' });
      if (h > 0) results.push({ label: 'Height', value: h, unit: 'mm' });
      break;
    }
    case 'radius' in params && 'tube' in params: {
      const r = (params.radius as number) ?? 0;
      const t = (params.tube as number) ?? 0;
      results.push({ label: 'Major Radius', value: r, unit: 'mm' });
      results.push({ label: 'Tube Radius', value: t, unit: 'mm' });
      break;
    }
    case 'radius' in params: {
      const r = (params.radius as number) ?? 0;
      results.push({ label: 'Radius', value: r, unit: 'mm' });
      results.push({ label: 'Diameter', value: r * 2, unit: 'mm' });
      break;
    }
  }

  const ox = (params.originX as number) ?? 0;
  const oy = (params.originY as number) ?? 0;
  const oz = (params.originZ as number) ?? 0;
  if (ox !== 0 || oy !== 0 || oz !== 0) {
    results.push({ label: 'Position', value: 0, unit: `(${ox.toFixed(1)}, ${oy.toFixed(1)}, ${oz.toFixed(1)})` });
  }

  return results;
}

const styles: Record<string, React.CSSProperties> = {
  container: {
    position: 'absolute',
    top: 48,
    right: 8,
    width: 180,
    background: 'rgba(30, 41, 59, 0.95)',
    border: '1px solid #334155',
    borderRadius: 6,
    padding: '8px',
    zIndex: 20,
    boxShadow: '0 4px 12px rgba(0,0,0,0.3)',
    maxHeight: 300,
    overflow: 'auto',
  },
  header: {
    fontSize: 11,
    fontWeight: 600,
    color: '#64748b',
    textTransform: 'uppercase',
    letterSpacing: '0.05em',
    marginBottom: 6,
    paddingBottom: 4,
    borderBottom: '1px solid #334155',
  },
  item: {
    marginBottom: 8,
  },
  featureName: {
    fontSize: 12,
    fontWeight: 600,
    color: '#e2e8f0',
    marginBottom: 1,
  },
  typeLabel: {
    fontSize: 10,
    color: '#64748b',
    marginBottom: 4,
  },
  measurements: {
    display: 'flex',
    flexDirection: 'column',
    gap: 2,
  },
  measurement: {
    display: 'flex',
    justifyContent: 'space-between',
    fontSize: 11,
  },
  measureLabel: {
    color: '#94a3b8',
  },
  measureValue: {
    color: '#3b82f6',
    fontFamily: 'monospace',
    fontSize: 10,
  },
};
