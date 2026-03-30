/**
 * @vitest-environment jsdom
 */
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import { PropertiesPanel } from './PropertiesPanel';
import { useCADStore } from '../../stores/cad-store';
import { useViewStore } from '../../stores/view-store';

vi.mock('nanoid', () => ({
  nanoid: vi.fn(() => 'test-nanoid'),
}));

vi.mock('../../lib/mass-properties', () => ({
  computeFeatureProperties: vi.fn(() => ({
    volume: 1000,
    surfaceArea: 600,
    boundingBox: { minX: 0, minY: 0, minZ: 0, maxX: 10, maxY: 10, maxZ: 10 },
    centerOfMass: { x: 5, y: 5, z: 5 },
    triangleCount: 12,
  })),
  formatPropertyValue: vi.fn((v: number, unit: string) => `${v.toFixed(2)} ${unit}`),
}));

vi.mock('../../lib/assembly-tree', () => ({
  getChildCount: vi.fn(() => 3),
}));

const makeFeature = (overrides: Record<string, any> = {}) => ({
  id: 'f1',
  type: 'extrude',
  name: 'Box',
  parameters: { width: 10, height: 10, depth: 10 },
  dependencies: [],
  children: [],
  suppressed: false,
  parentId: null,
  ...overrides,
});

describe('PropertiesPanel', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    useCADStore.setState({
      features: [],
      selectedIds: [],
      units: 'mm',
    });
    useViewStore.setState({
      sectionPlane: { enabled: false, normal: 'y', offset: 0 },
    });
  });

  it('should render Create header', () => {
    render(<PropertiesPanel />);
    expect(screen.getByText('Create')).toBeDefined();
  });

  it('should render primitive buttons', () => {
    render(<PropertiesPanel />);
    expect(screen.getByText('Box')).toBeDefined();
    expect(screen.getByText('Cylinder')).toBeDefined();
    expect(screen.getByText('Sphere')).toBeDefined();
    expect(screen.getByText('Cone')).toBeDefined();
    expect(screen.getByText('Torus')).toBeDefined();
    expect(screen.getByText('Hole')).toBeDefined();
  });

  it('should show empty state when nothing selected', () => {
    render(<PropertiesPanel />);
    expect(screen.getByText('Select a feature to edit its properties')).toBeDefined();
  });

  it('should show feature name input when selected', () => {
    useCADStore.setState({
      features: [makeFeature({ id: 'f1', name: 'MyBox' })],
      selectedIds: ['f1'],
    });
    render(<PropertiesPanel />);
    expect(screen.getByDisplayValue('MyBox')).toBeDefined();
  });

  it('should show Properties section when feature selected', () => {
    useCADStore.setState({
      features: [makeFeature()],
      selectedIds: ['f1'],
    });
    render(<PropertiesPanel />);
    expect(screen.getByText('Properties')).toBeDefined();
  });

  it('should show type label for selected feature', () => {
    useCADStore.setState({
      features: [makeFeature()],
      selectedIds: ['f1'],
    });
    render(<PropertiesPanel />);
    // getFeatureDefinition for 'extrude' returns icon + label
    expect(screen.getByText(/extrude/i)).toBeDefined();
  });

  it('should show suppressed badge when feature is suppressed', () => {
    useCADStore.setState({
      features: [makeFeature({ suppressed: true })],
      selectedIds: ['f1'],
    });
    render(<PropertiesPanel />);
    expect(screen.getByText('suppressed')).toBeDefined();
  });

  it('should show Off button for suppressed feature', () => {
    useCADStore.setState({
      features: [makeFeature({ suppressed: true })],
      selectedIds: ['f1'],
    });
    render(<PropertiesPanel />);
    // "Off" appears for both section plane and suppress button
    expect(screen.getAllByText('Off').length).toBeGreaterThanOrEqual(2);
  });

  it('should render Section Plane section', () => {
    render(<PropertiesPanel />);
    expect(screen.getByText('Section Plane')).toBeDefined();
    expect(screen.getByText('Off')).toBeDefined();
  });

  it('should call addFeatureAndSelect when clicking a primitive', () => {
    const spy = vi.spyOn(useCADStore.getState(), 'addFeatureAndSelect');
    render(<PropertiesPanel />);
    fireEvent.click(screen.getByText('Box'));
    expect(spy).toHaveBeenCalledWith(
      expect.objectContaining({ type: 'extrude' }),
    );
  });

  it('should show Mass Properties section for selected feature', () => {
    useCADStore.setState({
      features: [makeFeature()],
      selectedIds: ['f1'],
    });
    render(<PropertiesPanel />);
    expect(screen.getByText('Mass Properties')).toBeDefined();
    expect(screen.getByText('Volume')).toBeDefined();
    expect(screen.getByText('Surface Area')).toBeDefined();
    expect(screen.getByText('Bounding Box')).toBeDefined();
    expect(screen.getByText('Center')).toBeDefined();
    expect(screen.getByText('Triangles')).toBeDefined();
  });

  it('should show assembly child count for assembly type', () => {
    useCADStore.setState({
      features: [makeFeature({ type: 'assembly', name: 'Asm1' })],
      selectedIds: ['f1'],
    });
    render(<PropertiesPanel />);
    expect(screen.getByText(/Contains 3 features/)).toBeDefined();
  });
});
