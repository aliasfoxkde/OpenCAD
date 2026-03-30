/**
 * @vitest-environment jsdom
 */
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import { Toolbar } from './Toolbar';
import { useCADStore } from '../../stores/cad-store';

// Mock nanoid
vi.mock('nanoid', () => ({
  nanoid: vi.fn(() => 'mock-id-123'),
}));

// Mock Toast
vi.mock('./Toast', () => ({
  getToast: () => ({
    addToast: vi.fn(),
    removeToast: vi.fn(),
    clearAll: vi.fn(),
  }),
  useToast: () => ({
    addToast: vi.fn(),
    removeToast: vi.fn(),
    clearAll: vi.fn(),
  }),
}));

// Mock DisplayModeToggle
vi.mock('./DisplayModeToggle', () => ({
  DisplayModeToggle: () => <div data-testid="display-mode-toggle" />,
}));

// Mock getDefaultParameters
vi.mock('../../cad/features', () => ({
  getDefaultParameters: vi.fn((type: string) => {
    if (type === 'extrude') return { width: 10, height: 10, depth: 10 };
    if (type === 'assembly') return {};
    return {};
  }),
}));

describe('Toolbar', () => {
  beforeEach(() => {
    vi.restoreAllMocks();
    useCADStore.setState({
      activeTool: 'select',
      features: [],
      selectedIds: [],
    });
  });

  it('should render all tool buttons', () => {
    render(<Toolbar />);
    expect(screen.getByTitle(/Select & move objects/)).toBeDefined();
    expect(screen.getByTitle(/Create a box/)).toBeDefined();
    expect(screen.getByTitle(/Create a cylinder/)).toBeDefined();
    expect(screen.getByTitle(/Create a sphere/)).toBeDefined();
    expect(screen.getByTitle(/Measure distance/)).toBeDefined();
  });

  it('should render group dividers', () => {
    render(<Toolbar />);
    expect(screen.getByText('Create')).toBeDefined();
    expect(screen.getByText('Boolean')).toBeDefined();
    expect(screen.getByText('Modify')).toBeDefined();
    expect(screen.getByText('Inspect')).toBeDefined();
    expect(screen.getByText('Edge')).toBeDefined();
  });

  it('should show shortcut hints', () => {
    render(<Toolbar />);
    expect(screen.getByText('V')).toBeDefined();
    expect(screen.getByText('B')).toBeDefined();
    expect(screen.getByText('M')).toBeDefined();
  });

  it('should call setActiveTool for non-primitive tools', () => {
    const setTool = vi.spyOn(useCADStore.getState(), 'setActiveTool');
    render(<Toolbar />);
    fireEvent.click(screen.getByTitle(/Select & move objects/));
    expect(setTool).toHaveBeenCalledWith('select');
  });

  it('should add a feature when a primitive tool is clicked', () => {
    const addFeature = vi.spyOn(useCADStore.getState(), 'addFeatureAndSelect');
    render(<Toolbar />);
    fireEvent.click(screen.getByTitle(/Create a box/));
    expect(addFeature).toHaveBeenCalled();
    const call = addFeature.mock.calls[0]![0];
    expect(call.type).toBe('extrude');
    expect(call.name).toMatch(/^Box /);
  });

  it('should show coming soon toast for fillet', () => {
    render(<Toolbar />);
    const featureCountBefore = useCADStore.getState().features.length;
    fireEvent.click(screen.getByTitle(/Fillet/));
    // Fillet shows a toast and does not add a feature
    expect(useCADStore.getState().features.length).toBe(featureCountBefore);
  });

  it('should render DisplayModeToggle', () => {
    render(<Toolbar />);
    expect(screen.getByTestId('display-mode-toggle')).toBeDefined();
  });
});
