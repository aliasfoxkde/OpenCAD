/**
 * @vitest-environment jsdom
 */
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import { FeatureTree } from './FeatureTree';
import { useCADStore } from '../../stores/cad-store';

vi.mock('./ConfirmDialog', () => ({
  confirm: vi.fn(),
}));

vi.mock('../../hooks/useFeatureErrors', () => ({
  useFeatureErrors: () => new Map(),
}));

const makeFeature = (overrides: Record<string, any> = {}) => ({
  id: 'f1',
  type: 'box',
  name: 'Box',
  parameters: { width: 10, height: 10, depth: 10 },
  dependencies: [],
  children: [],
  suppressed: false,
  parentId: null,
  ...overrides,
});

describe('FeatureTree', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    useCADStore.setState({
      features: [],
      selectedIds: [],
    });
  });

  it('should render Feature Tree header', () => {
    render(<FeatureTree />);
    expect(screen.getByText('Feature Tree')).toBeDefined();
  });

  it('should show empty state when no features', () => {
    render(<FeatureTree />);
    expect(screen.getByText(/No features yet/)).toBeDefined();
  });

  it('should show feature names', () => {
    useCADStore.setState({
      features: [makeFeature({ id: 'f1', name: 'MyBox' })],
    });
    render(<FeatureTree />);
    expect(screen.getByText('MyBox')).toBeDefined();
  });

  it('should show feature count in header', () => {
    useCADStore.setState({
      features: [
        makeFeature({ id: 'f1', name: 'Box1' }),
        makeFeature({ id: 'f2', name: 'Box2' }),
      ],
    });
    render(<FeatureTree />);
    expect(screen.getByText('2')).toBeDefined();
  });

  it('should show selected count when multiple selected', () => {
    useCADStore.setState({
      features: [makeFeature({ id: 'f1' }), makeFeature({ id: 'f2' })],
      selectedIds: ['f1', 'f2'],
    });
    render(<FeatureTree />);
    expect(screen.getByText('2 selected')).toBeDefined();
  });

  it('should not show selected count when single selection', () => {
    useCADStore.setState({
      features: [makeFeature({ id: 'f1' })],
      selectedIds: ['f1'],
    });
    render(<FeatureTree />);
    expect(screen.queryByText(/selected/)).toBeNull();
  });

  it('should show suppress toggle buttons', () => {
    useCADStore.setState({
      features: [makeFeature({ id: 'f1' })],
    });
    render(<FeatureTree />);
    expect(screen.getByText('on')).toBeDefined();
  });

  it('should show off toggle for suppressed features', () => {
    useCADStore.setState({
      features: [makeFeature({ id: 'f1', suppressed: true })],
    });
    render(<FeatureTree />);
    expect(screen.getByText('off')).toBeDefined();
  });

  it('should show delete button for each feature', () => {
    useCADStore.setState({
      features: [makeFeature({ id: 'f1' })],
    });
    render(<FeatureTree />);
    expect(screen.getByTitle('Delete feature')).toBeDefined();
  });

  it('should render search input', () => {
    render(<FeatureTree />);
    expect(screen.getByPlaceholderText('Search features...')).toBeDefined();
  });

  it('should show assembly child count badge', () => {
    useCADStore.setState({
      features: [
        makeFeature({ id: 'a1', type: 'assembly', name: 'Asm1' }),
        makeFeature({ id: 'f1', parentId: 'a1', name: 'Child1' }),
        makeFeature({ id: 'f2', parentId: 'a1', name: 'Child2' }),
      ],
    });
    render(<FeatureTree />);
    expect(screen.getByText('2 features')).toBeDefined();
  });

  it('should show empty badge for assembly with no children', () => {
    useCADStore.setState({
      features: [makeFeature({ id: 'a1', type: 'assembly', name: 'Asm1' })],
    });
    render(<FeatureTree />);
    expect(screen.getByText('empty')).toBeDefined();
  });

  it('should show assembly with expand toggle', () => {
    useCADStore.setState({
      features: [
        makeFeature({ id: 'a1', type: 'assembly', name: 'Assembly1' }),
        makeFeature({ id: 'f1', parentId: 'a1', name: 'Child1' }),
      ],
    });
    render(<FeatureTree />);
    expect(screen.getByText('Assembly1')).toBeDefined();
    // Assembly children should be visible since assemblies auto-expand
    expect(screen.getByText('Child1')).toBeDefined();
  });

  it('should toggle assembly expand/collapse on click', () => {
    useCADStore.setState({
      features: [
        makeFeature({ id: 'a1', type: 'assembly', name: 'Assembly1' }),
        makeFeature({ id: 'f1', parentId: 'a1', name: 'Child1' }),
      ],
    });
    render(<FeatureTree />);
    // Children visible initially (auto-expanded)
    expect(screen.getByText('Child1')).toBeDefined();

    // Click the expand toggle arrow to collapse
    const expandToggle = screen.getByText('\u25BC'); // ▼
    fireEvent.click(expandToggle);
    // Children should now be hidden
    expect(screen.queryByText('Child1')).toBeNull();
  });

  it('should call select when clicking a feature', () => {
    const selectSpy = vi.spyOn(useCADStore.getState(), 'select');
    useCADStore.setState({
      features: [makeFeature({ id: 'f1', name: 'Box' })],
      selectedIds: [],
    });
    render(<FeatureTree />);

    fireEvent.click(screen.getByText('Box'));
    expect(selectSpy).toHaveBeenCalledWith(['f1']);
  });

  it('should show drag handle for each feature', () => {
    useCADStore.setState({
      features: [makeFeature({ id: 'f1' })],
    });
    render(<FeatureTree />);
    expect(screen.getByTitle('Drag to reorder or drop on assembly')).toBeDefined();
  });

  it('should show context menu on right-click', () => {
    useCADStore.setState({
      features: [makeFeature({ id: 'f1', name: 'Box' })],
    });
    render(<FeatureTree />);

    fireEvent.contextMenu(screen.getByText('Box'));
    expect(screen.getByText('Rename')).toBeDefined();
    expect(screen.getByText('Duplicate')).toBeDefined();
    expect(screen.getByText('Delete')).toBeDefined();
  });
});
