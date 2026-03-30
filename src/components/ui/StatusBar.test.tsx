/**
 * @vitest-environment jsdom
 */
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import { StatusBar, buildSelectionInfo } from './StatusBar';
import { useCADStore } from '../../stores/cad-store';
import { useViewStore } from '../../stores/view-store';
import { useUIStore } from '../../stores/ui-store';

// Mock getFeatureDefinition to avoid import chain issues
vi.mock('../../cad/features', () => ({
  getFeatureDefinition: (type: string) => ({
    icon: '\u25A0',
    label: type,
    parameters: [],
  }),
}));

// Mock useCanUndo/useCanRedo to avoid depending on undo/redo stacks
vi.mock('../../stores/cad-store', async () => {
  const actual = await vi.importActual('../../stores/cad-store');
  return {
    ...actual,
    useCanUndo: () => false,
    useCanRedo: () => false,
  };
});

describe('StatusBar', () => {
  beforeEach(() => {
    useCADStore.setState({
      activeTool: 'select',
      features: [],
      selectedIds: [],
      dirty: false,
      units: 'mm',
    });
    useViewStore.setState({
      displayMode: 'shaded_edges',
      showGrid: true,
      snapToGrid: false,
      gridSnapSize: 1,
      cameraPreset: null,
    });
    useUIStore.setState({
      leftPanelOpen: false,
      rightPanelOpen: false,
    });
  });

  it('should render version string', () => {
    render(<StatusBar />);
    expect(screen.getByText('OpenCAD v0.1.0')).toBeDefined();
  });

  it('should show active tool name', () => {
    useCADStore.setState({ activeTool: 'box' });
    render(<StatusBar />);
    expect(screen.getByText('Box')).toBeDefined();
  });

  it('should show feature count', () => {
    useCADStore.setState({ features: [{ id: 'f1', type: 'extrude', name: 'Box 1', parameters: {}, dependencies: [], children: [], suppressed: false }] });
    render(<StatusBar />);
    expect(screen.getByText('1 feature')).toBeDefined();
  });

  it('should show plural feature count', () => {
    useCADStore.setState({
      features: [
        { id: 'f1', type: 'extrude', name: 'Box 1', parameters: {}, dependencies: [], children: [], suppressed: false },
        { id: 'f2', type: 'sphere', name: 'Sphere 1', parameters: {}, dependencies: [], children: [], suppressed: false },
      ],
    });
    render(<StatusBar />);
    expect(screen.getByText('2 features')).toBeDefined();
  });

  it('should show dirty indicator', () => {
    useCADStore.setState({ dirty: true });
    render(<StatusBar />);
    expect(screen.getByText('*')).toBeDefined();
  });

  it('should show units and cycle on click', () => {
    const setUnits = vi.spyOn(useCADStore.getState(), 'setUnits');
    render(<StatusBar />);
    const unitsEl = screen.getByText('mm');
    expect(unitsEl).toBeDefined();
    fireEvent.click(unitsEl);
    expect(setUnits).toHaveBeenCalledWith('cm');
  });

  it('should show panel toggle buttons', () => {
    render(<StatusBar />);
    expect(screen.getByText('Tree')).toBeDefined();
    expect(screen.getByText('Props')).toBeDefined();
  });

  it('should show display mode', () => {
    render(<StatusBar />);
    expect(screen.getByText('Shaded+Edges')).toBeDefined();
  });

  it('should show Grid off when grid is hidden', () => {
    useViewStore.setState({ showGrid: false });
    render(<StatusBar />);
    expect(screen.getByText('Grid off')).toBeDefined();
  });
});

describe('buildSelectionInfo', () => {
  it('should return "none" for empty selection', () => {
    expect(buildSelectionInfo([], [])).toBe('none');
  });

  it('should return feature name for single selection', () => {
    const features = [{ id: 'f1', name: 'Box 1', type: 'extrude' }];
    expect(buildSelectionInfo(['f1'], features)).toContain('Box 1');
  });

  it('should return feature ID when feature not found', () => {
    expect(buildSelectionInfo(['missing'], [])).toBe('missing');
  });

  it('should return count for multi-selection', () => {
    const features = [
      { id: 'f1', name: 'Box 1', type: 'extrude' },
      { id: 'f2', name: 'Sphere 1', type: 'sphere' },
    ];
    expect(buildSelectionInfo(['f1', 'f2'], features)).toBe('2 selected');
  });
});
