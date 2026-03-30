/**
 * @vitest-environment jsdom
 */
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen } from '@testing-library/react';
import { MeasurementOverlay } from './MeasurementOverlay';
import { useCADStore } from '../../stores/cad-store';
import { useViewStore } from '../../stores/view-store';

vi.mock('../../lib/annotations', () => ({
  createDistanceAnnotation: vi.fn(() => ({ id: 'ann-1' })),
}));

vi.mock('../../cad/analysis/measure', () => ({
  estimateRadiusAtPoint: vi.fn(() => null),
}));

vi.mock('../../lib/feature-to-mesh', () => ({
  featureToMesh: vi.fn(() => null),
}));

const makeFeature = (overrides: Record<string, any> = {}) => ({
  id: 'f1',
  type: 'extrude',
  name: 'Box',
  parameters: { width: 10, height: 20, depth: 30 },
  dependencies: [],
  children: [],
  suppressed: false,
  parentId: null,
  ...overrides,
});

describe('MeasurementOverlay', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    useCADStore.setState({
      features: [],
      selectedIds: [],
      activeTool: 'select',
    });
    useViewStore.setState({
      measurePoints: [],
    });
  });

  it('should return null when tool is not measure', () => {
    const { container } = render(<MeasurementOverlay />);
    expect(container.innerHTML).toBe('');
  });

  it('should show hint when measure tool active but no measurements', () => {
    useCADStore.setState({ activeTool: 'measure' });
    render(<MeasurementOverlay />);
    expect(screen.getByText('Measurements')).toBeDefined();
    expect(screen.getByText('Click on geometry to pick points')).toBeDefined();
  });

  it('should still show hint when only one point picked', () => {
    useCADStore.setState({ activeTool: 'measure' });
    useViewStore.setState({
      measurePoints: [[1.5, 2.5, 3.5]],
    });
    render(<MeasurementOverlay />);
    // Only 1 point — not enough for measurement, still shows hint
    expect(screen.getByText('Click on geometry to pick points')).toBeDefined();
  });

  it('should show point-to-point distance', () => {
    useCADStore.setState({ activeTool: 'measure' });
    useViewStore.setState({
      measurePoints: [[0, 0, 0], [3, 4, 0]],
    });
    render(<MeasurementOverlay />);
    expect(screen.getByText('Point-to-Point')).toBeDefined();
    expect(screen.getByText('5.00 mm')).toBeDefined();
  });

  it('should show dx/dy/dz for point measurements', () => {
    useCADStore.setState({ activeTool: 'measure' });
    useViewStore.setState({
      measurePoints: [[1, 2, 3], [4, 6, 10]],
    });
    render(<MeasurementOverlay />);
    expect(screen.getByText('3.00')).toBeDefined();
    expect(screen.getByText('4.00')).toBeDefined();
    expect(screen.getByText('7.00')).toBeDefined();
  });

  it('should show Pin and Clear buttons when points measured', () => {
    useCADStore.setState({ activeTool: 'measure' });
    useViewStore.setState({
      measurePoints: [[0, 0, 0], [1, 1, 1]],
    });
    render(<MeasurementOverlay />);
    expect(screen.getByText('Pin')).toBeDefined();
    expect(screen.getByText('Clear')).toBeDefined();
  });

  it('should show feature measurements when feature selected', () => {
    useCADStore.setState({
      activeTool: 'measure',
      features: [makeFeature()],
      selectedIds: ['f1'],
    });
    render(<MeasurementOverlay />);
    expect(screen.getByText('Box')).toBeDefined();
    expect(screen.getByText('extrude')).toBeDefined();
  });

  it('should show feature dimensions for box', () => {
    useCADStore.setState({
      activeTool: 'measure',
      features: [makeFeature()],
      selectedIds: ['f1'],
    });
    render(<MeasurementOverlay />);
    expect(screen.getByText('Width:')).toBeDefined();
    expect(screen.getByText('Height:')).toBeDefined();
    expect(screen.getByText('Depth:')).toBeDefined();
  });
});
