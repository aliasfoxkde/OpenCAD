/**
 * @vitest-environment jsdom
 */
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import { SketchToolbar } from './SketchToolbar';
import { useSketchStore } from '../../stores/sketch-store';

describe('SketchToolbar', () => {
  beforeEach(() => {
    useSketchStore.setState({
      active: true,
      tool: 'select',
      elements: [],
      constraints: [],
      isFullyConstrained: false,
      degreesOfFreedom: 0,
      pendingConstraintType: null,
    });
  });

  it('should return null when sketch is not active', () => {
    useSketchStore.setState({ active: false });
    const { container } = render(<SketchToolbar />);
    expect(container.innerHTML).toBe('');
  });

  it('should render all sketch tool buttons', () => {
    render(<SketchToolbar />);
    expect(screen.getByTitle('Select')).toBeDefined();
    expect(screen.getByTitle('Line')).toBeDefined();
    expect(screen.getByTitle('Arc')).toBeDefined();
    expect(screen.getByTitle('Circle')).toBeDefined();
    expect(screen.getByTitle('Rectangle')).toBeDefined();
    expect(screen.getByTitle('Ellipse')).toBeDefined();
    expect(screen.getByTitle('Spline')).toBeDefined();
    expect(screen.getByTitle('Point')).toBeDefined();
  });

  it('should render all constraint tool buttons', () => {
    render(<SketchToolbar />);
    expect(screen.getByTitle('Coincident')).toBeDefined();
    expect(screen.getByTitle('Horizontal')).toBeDefined();
    expect(screen.getByTitle('Vertical')).toBeDefined();
    expect(screen.getByTitle('Parallel')).toBeDefined();
    expect(screen.getByTitle('Perpendicular')).toBeDefined();
    expect(screen.getByTitle('Tangent')).toBeDefined();
    expect(screen.getByTitle('Equal')).toBeDefined();
    expect(screen.getByTitle('Distance')).toBeDefined();
    expect(screen.getByTitle('Angle')).toBeDefined();
    expect(screen.getByTitle('Radius')).toBeDefined();
    expect(screen.getByTitle('Fix')).toBeDefined();
  });

  it('should call setTool when a sketch tool is clicked', () => {
    const setTool = vi.spyOn(useSketchStore.getState(), 'setTool');
    render(<SketchToolbar />);
    fireEvent.click(screen.getByTitle('Line'));
    expect(setTool).toHaveBeenCalledWith('line');
  });

  it('should call setTool and setPendingConstraintType when a constraint tool is clicked', () => {
    const setTool = vi.spyOn(useSketchStore.getState(), 'setTool');
    const setConstraint = vi.spyOn(useSketchStore.getState(), 'setPendingConstraintType');
    render(<SketchToolbar />);
    fireEvent.click(screen.getByTitle('Horizontal'));
    expect(setTool).toHaveBeenCalledWith('constraint');
    expect(setConstraint).toHaveBeenCalledWith('horizontal');
  });

  it('should show DOF count when not fully constrained', () => {
    useSketchStore.setState({ degreesOfFreedom: 4, isFullyConstrained: false });
    render(<SketchToolbar />);
    expect(screen.getByText('4 DOF')).toBeDefined();
  });

  it('should show Fully Constrained when fully constrained', () => {
    useSketchStore.setState({ degreesOfFreedom: 0, isFullyConstrained: true });
    render(<SketchToolbar />);
    expect(screen.getByText('Fully Constrained')).toBeDefined();
  });

  it('should show exit button when no elements exist', () => {
    render(<SketchToolbar />);
    expect(screen.getByText('Exit Sketch')).toBeDefined();
  });

  it('should show confirm dialog when exit is clicked with elements', () => {
    useSketchStore.setState({
      elements: [{ id: 'e1', type: 'line', geometry: { x1: 0, y1: 0, x2: 1, y2: 1 }, construction: false }],
    });
    render(<SketchToolbar />);
    fireEvent.click(screen.getByText('Exit Sketch'));
    expect(screen.getByText('Discard sketch?')).toBeDefined();
    expect(screen.getByText('Discard')).toBeDefined();
    expect(screen.getByText('Keep')).toBeDefined();
  });

  it('should call exitSketch when Discard is clicked', () => {
    const exitSketch = vi.spyOn(useSketchStore.getState(), 'exitSketch');
    useSketchStore.setState({
      elements: [{ id: 'e1', type: 'line', geometry: { x1: 0, y1: 0, x2: 1, y2: 1 }, construction: false }],
    });
    render(<SketchToolbar />);
    fireEvent.click(screen.getByText('Exit Sketch'));
    fireEvent.click(screen.getByText('Discard'));
    expect(exitSketch).toHaveBeenCalled();
  });

  it('should dismiss confirm dialog when Keep is clicked', () => {
    useSketchStore.setState({
      elements: [{ id: 'e1', type: 'line', geometry: { x1: 0, y1: 0, x2: 1, y2: 1 }, construction: false }],
    });
    render(<SketchToolbar />);
    fireEvent.click(screen.getByText('Exit Sketch'));
    fireEvent.click(screen.getByText('Keep'));
    expect(screen.queryByText('Discard sketch?')).toBeNull();
    expect(screen.getByText('Exit Sketch')).toBeDefined();
  });

  it('should call exitSketch directly when no elements exist', () => {
    const exitSketch = vi.spyOn(useSketchStore.getState(), 'exitSketch');
    render(<SketchToolbar />);
    fireEvent.click(screen.getByText('Exit Sketch'));
    expect(exitSketch).toHaveBeenCalled();
  });
});
