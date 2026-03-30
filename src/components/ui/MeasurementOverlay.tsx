/**
 * Measurement overlay that displays bounding box dimensions and other
 * measurement info when the measure tool is active and features are selected.
 */

import { useMemo } from 'react';
import { useCADStore } from '../../stores/cad-store';
import { useViewStore } from '../../stores/view-store';
import { createDistanceAnnotation } from '../../lib/annotations';

export function MeasurementOverlay() {
  const activeTool = useCADStore((s) => s.activeTool);
  const features = useCADStore((s) => s.features);
  const selectedIds = useCADStore((s) => s.selectedIds);
  const measurePoints = useViewStore((s) => s.measurePoints);
  const clearMeasurePoints = useViewStore((s) => s.clearMeasurePoints);
  const addAnnotation = useViewStore((s) => s.addAnnotation);

  if (activeTool !== 'measure') return null;

  const hasPointMeasure = measurePoints.length >= 2;
  const selectedFeatures = features.filter((f) => selectedIds.includes(f.id));
  const hasFeatureMeasure = selectedFeatures.length > 0;

  if (!hasPointMeasure && !hasFeatureMeasure) {
    return (
      <div style={styles.container}>
        <div style={styles.header}>Measurements</div>
        <div style={styles.hint}>Click on geometry to pick points</div>
      </div>
    );
  }

  return (
    <div style={styles.container}>
      <div style={styles.headerRow}>
        <div style={styles.header}>Measurements</div>
        {hasPointMeasure && (
          <>
            <button
              style={styles.pinBtn}
              onClick={() => {
                const a = measurePoints[0]!;
                const b = measurePoints[1]!;
                addAnnotation(createDistanceAnnotation(a, b));
              }}
              title="Pin this measurement as a persistent annotation"
            >
              Pin
            </button>
            <button style={styles.clearBtn} onClick={clearMeasurePoints}>
              Clear
            </button>
          </>
        )}
      </div>
      {hasPointMeasure && <PointToDistance points={measurePoints} />}
      {selectedFeatures.length > 1 && <InterFeatureDistances features={selectedFeatures} />}
      {selectedFeatures.map((feature) => (
        <FeatureMeasurement key={feature.id} feature={feature} />
      ))}
    </div>
  );
}

function PointToDistance({ points }: { points: Array<[number, number, number]> }) {
  if (points.length < 2) {
    const a = points[0]!;
    return (
      <div style={styles.item}>
        <div style={styles.featureName}>Point 1</div>
        <div style={styles.measurements}>
          <div style={styles.measurement}>
            <span style={styles.measureLabel}>X:</span>
            <span style={styles.measureValue}>{a[0].toFixed(2)}</span>
          </div>
          <div style={styles.measurement}>
            <span style={styles.measureLabel}>Y:</span>
            <span style={styles.measureValue}>{a[1].toFixed(2)}</span>
          </div>
          <div style={styles.measurement}>
            <span style={styles.measureLabel}>Z:</span>
            <span style={styles.measureValue}>{a[2].toFixed(2)}</span>
          </div>
        </div>
      </div>
    );
  }

  const a = points[0]!;
  const b = points[1]!;
  const dx = b[0] - a[0];
  const dy = b[1] - a[1];
  const dz = b[2] - a[2];
  const dist = Math.sqrt(dx * dx + dy * dy + dz * dz);
  const dxy = Math.sqrt(dx * dx + dy * dy);

  return (
    <div style={styles.item}>
      <div style={styles.featureName}>Point-to-Point</div>
      <div style={styles.measurements}>
        <div style={{ ...styles.measurement, ...styles.primaryMeasurement }}>
          <span style={styles.measureLabel}>Distance:</span>
          <span style={styles.measureValue}>{dist.toFixed(2)} mm</span>
        </div>
        <div style={styles.measurement}>
          <span style={styles.measureLabel}>dX:</span>
          <span style={styles.measureValue}>{dx.toFixed(2)}</span>
        </div>
        <div style={styles.measurement}>
          <span style={styles.measureLabel}>dY:</span>
          <span style={styles.measureValue}>{dy.toFixed(2)}</span>
        </div>
        <div style={styles.measurement}>
          <span style={styles.measureLabel}>dZ:</span>
          <span style={styles.measureValue}>{dz.toFixed(2)}</span>
        </div>
        <div style={styles.measurement}>
          <span style={styles.measureLabel}>dXY:</span>
          <span style={styles.measureValue}>{dxy.toFixed(2)}</span>
        </div>
      </div>
    </div>
  );
}

function FeatureMeasurement({
  feature,
}: {
  feature: { name: string; type: string; parameters: Record<string, unknown> };
}) {
  const measurements = useMemo(() => getFeatureMeasurements(feature.parameters), [feature.parameters]);

  return (
    <div style={styles.item}>
      <div style={styles.featureName}>{feature.name}</div>
      <div style={styles.typeLabel}>{feature.type}</div>
      <div style={styles.measurements}>
        {measurements.map((m, i) => (
          <div key={i} style={styles.measurement}>
            <span style={styles.measureLabel}>{m.label}:</span>
            <span style={styles.measureValue}>
              {m.value.toFixed(2)} {m.unit}
            </span>
          </div>
        ))}
      </div>
    </div>
  );
}

export function getFeatureMeasurements(
  params: Record<string, unknown>,
): Array<{ label: string; value: number; unit: string }> {
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
    case 'diameter' in params && 'depth' in params: {
      const d = (params.diameter as number) ?? 0;
      const depth = (params.depth as number) ?? 0;
      results.push({ label: 'Diameter', value: d, unit: 'mm' });
      results.push({ label: 'Depth', value: depth, unit: 'mm' });
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

/** Show distance between the first selected feature and each other selected feature */
function InterFeatureDistances({
  features,
}: {
  features: Array<{ name: string; parameters: Record<string, unknown> }>;
}) {
  if (features.length < 2) return null;
  const first = features[0]!;
  const ox0 = (first.parameters.originX as number) ?? 0;
  const oy0 = (first.parameters.originY as number) ?? 0;
  const oz0 = (first.parameters.originZ as number) ?? 0;

  return (
    <div style={styles.item}>
      <div style={styles.featureName}>Distances from {first.name}</div>
      <div style={styles.measurements}>
        {features.slice(1).map((f, i) => {
          const ox = (f.parameters.originX as number) ?? 0;
          const oy = (f.parameters.originY as number) ?? 0;
          const oz = (f.parameters.originZ as number) ?? 0;
          const dx = ox - ox0;
          const dy = oy - oy0;
          const dz = oz - oz0;
          const dist = Math.sqrt(dx * dx + dy * dy + dz * dz);
          return (
            <div key={i} style={styles.measurement}>
              <span style={styles.measureLabel}>{f.name}:</span>
              <span style={styles.measureValue}>{dist.toFixed(2)} mm</span>
            </div>
          );
        })}
      </div>
    </div>
  );
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
  headerRow: {
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  clearBtn: {
    fontSize: 9,
    color: '#94a3b8',
    background: 'transparent',
    border: '1px solid #475569',
    borderRadius: 3,
    padding: '1px 6px',
    cursor: 'pointer',
  },
  pinBtn: {
    fontSize: 9,
    color: '#22d3ee',
    background: 'transparent',
    border: '1px solid #22d3ee40',
    borderRadius: 3,
    padding: '1px 6px',
    cursor: 'pointer',
    marginRight: 4,
  },
  hint: {
    fontSize: 11,
    color: '#64748b',
    fontStyle: 'italic',
  },
  primaryMeasurement: {
    paddingTop: 2,
    borderTop: '1px solid #334155',
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
