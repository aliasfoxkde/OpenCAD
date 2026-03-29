import { describe, it, expect, beforeEach } from 'vitest';
import { useSketchStore } from './sketch-store';

describe('SketchStore', () => {
  beforeEach(() => {
    useSketchStore.getState().reset();
  });

  it('should start inactive', () => {
    const state = useSketchStore.getState();
    expect(state.active).toBe(false);
    expect(state.elements).toEqual([]);
    expect(state.constraints).toEqual([]);
  });

  it('should enter sketch mode', () => {
    useSketchStore.getState().enterSketch('xy');
    const state = useSketchStore.getState();
    expect(state.active).toBe(true);
    expect(state.plane).toBe('xy');
    expect(state.tool).toBe('line');
  });

  it('should exit sketch mode', () => {
    useSketchStore.getState().enterSketch('xz');
    useSketchStore.getState().exitSketch();
    expect(useSketchStore.getState().active).toBe(false);
  });

  it('should set tool', () => {
    useSketchStore.getState().setTool('circle');
    expect(useSketchStore.getState().tool).toBe('circle');
  });

  it('should add and remove elements', () => {
    const el = {
      id: 'el1',
      type: 'line' as const,
      geometry: { x1: 0, y1: 0, x2: 10, y2: 10 },
      construction: false,
    };
    useSketchStore.getState().addElement(el);
    expect(useSketchStore.getState().elements).toHaveLength(1);
    expect(useSketchStore.getState().elements[0]!.id).toBe('el1');

    useSketchStore.getState().removeElement('el1');
    expect(useSketchStore.getState().elements).toHaveLength(0);
  });

  it('should update element geometry', () => {
    const el = {
      id: 'el2',
      type: 'line' as const,
      geometry: { x1: 0, y1: 0, x2: 10, y2: 10 },
      construction: false,
    };
    useSketchStore.getState().addElement(el);
    useSketchStore.getState().updateElement('el2', { x2: 20, y2: 20 });

    const updated = useSketchStore.getState().elements[0];
    expect(updated?.geometry.x2).toBe(20);
    expect(updated?.geometry.y2).toBe(20);
  });

  it('should add and remove constraints', () => {
    const el1 = { id: 'el1', type: 'line' as const, geometry: { x1: 0, y1: 0, x2: 10, y2: 0 }, construction: false };
    useSketchStore.getState().addElement(el1);

    useSketchStore.getState().addConstraint({
      type: 'horizontal',
      elements: ['el1'],
    });

    expect(useSketchStore.getState().constraints).toHaveLength(1);

    const cId = useSketchStore.getState().constraints[0]!.id;
    useSketchStore.getState().removeConstraint(cId);
    expect(useSketchStore.getState().constraints).toHaveLength(0);
  });

  it('should remove constraints when element is deleted', () => {
    const el1 = { id: 'el1', type: 'line' as const, geometry: { x1: 0, y1: 0, x2: 10, y2: 0 }, construction: false };
    const el2 = { id: 'el2', type: 'line' as const, geometry: { x1: 0, y1: 0, x2: 0, y2: 10 }, construction: false };
    useSketchStore.getState().addElement(el1);
    useSketchStore.getState().addElement(el2);

    useSketchStore.getState().addConstraint({
      type: 'coincident',
      elements: ['el1', 'el2'],
    });

    expect(useSketchStore.getState().constraints).toHaveLength(1);
    useSketchStore.getState().removeElement('el1');
    expect(useSketchStore.getState().constraints).toHaveLength(0);
  });

  it('should select and clear selection', () => {
    useSketchStore.getState().select(['el1', 'el2']);
    expect(useSketchStore.getState().selectedIds).toEqual(['el1', 'el2']);
    useSketchStore.getState().clearSelection();
    expect(useSketchStore.getState().selectedIds).toEqual([]);
  });

  it('should set cursor and snap', () => {
    useSketchStore.getState().setCursor({ x: 5, y: 10 });
    expect(useSketchStore.getState().cursor).toEqual({ x: 5, y: 10 });

    useSketchStore.getState().setSnap({ point: { x: 5, y: 10 }, type: 'endpoint', distance: 2 });
    expect(useSketchStore.getState().snap?.type).toBe('endpoint');
  });

  it('should manage drawing state', () => {
    useSketchStore.getState().startDrawing('line', { x: 0, y: 0 });
    expect(useSketchStore.getState().drawing).not.toBeNull();
    expect(useSketchStore.getState().drawing?.type).toBe('line');
    expect(useSketchStore.getState().drawing?.points).toHaveLength(1);

    useSketchStore.getState().continueDrawing({ x: 10, y: 10 });
    expect(useSketchStore.getState().drawing?.points).toHaveLength(2);

    useSketchStore.getState().cancelDrawing();
    expect(useSketchStore.getState().drawing).toBeNull();
  });

  it('should finish drawing and create element', () => {
    useSketchStore.getState().startDrawing('line', { x: 0, y: 0 });
    useSketchStore.getState().continueDrawing({ x: 10, y: 10 });
    useSketchStore.getState().finishDrawing();

    expect(useSketchStore.getState().drawing).toBeNull();
    expect(useSketchStore.getState().elements).toHaveLength(1);
    const el = useSketchStore.getState().elements[0]!;
    expect(el.type).toBe('line');
    expect(el.geometry.x1).toBe(0);
    expect(el.geometry.y1).toBe(0);
    expect(el.geometry.x2).toBe(10);
    expect(el.geometry.y2).toBe(10);
  });

  it('should create circle element from drawing', () => {
    useSketchStore.getState().startDrawing('circle', { x: 5, y: 5 });
    useSketchStore.getState().continueDrawing({ x: 10, y: 5 });
    useSketchStore.getState().finishDrawing();

    expect(useSketchStore.getState().elements).toHaveLength(1);
    const el = useSketchStore.getState().elements[0]!;
    expect(el.type).toBe('circle');
    expect(el.geometry.cx).toBe(5);
    expect(el.geometry.cy).toBe(5);
    expect(el.geometry.r).toBe(5);
  });

  it('should create point element from drawing', () => {
    useSketchStore.getState().startDrawing('point', { x: 3, y: 7 });
    useSketchStore.getState().finishDrawing();

    expect(useSketchStore.getState().elements).toHaveLength(1);
    const el = useSketchStore.getState().elements[0]!;
    expect(el.type).toBe('point');
    expect(el.geometry.x).toBe(3);
    expect(el.geometry.y).toBe(7);
  });

  it('should create rectangle element from drawing', () => {
    useSketchStore.getState().startDrawing('rectangle', { x: 0, y: 0 });
    useSketchStore.getState().continueDrawing({ x: 10, y: 5 });
    useSketchStore.getState().finishDrawing();

    expect(useSketchStore.getState().elements).toHaveLength(1);
    const el = useSketchStore.getState().elements[0]!;
    expect(el.type).toBe('rectangle');
    expect(el.geometry.x).toBe(0);
    expect(el.geometry.y).toBe(0);
    expect(el.geometry.width).toBe(10);
    expect(el.geometry.height).toBe(5);
  });

  it('should not create element with insufficient points', () => {
    useSketchStore.getState().startDrawing('line', { x: 0, y: 0 });
    // Only 1 point — need 2 for line
    useSketchStore.getState().finishDrawing();
    expect(useSketchStore.getState().elements).toHaveLength(0);
  });

  it('should support undo/redo', () => {
    const el1 = { id: 'el1', type: 'point' as const, geometry: { x: 1, y: 2 }, construction: false };
    const el2 = { id: 'el2', type: 'point' as const, geometry: { x: 3, y: 4 }, construction: false };

    useSketchStore.getState().addElement(el1);
    useSketchStore.getState().addElement(el2);
    expect(useSketchStore.getState().elements).toHaveLength(2);

    useSketchStore.getState().undo();
    expect(useSketchStore.getState().elements).toHaveLength(1);

    useSketchStore.getState().redo();
    expect(useSketchStore.getState().elements).toHaveLength(2);
  });

  it('should compute degrees of freedom', () => {
    const el = { id: 'el1', type: 'line' as const, geometry: { x1: 0, y1: 0, x2: 10, y2: 10 }, construction: false };
    useSketchStore.getState().addElement(el);

    // A line has 4 DOF (2 points × 2 coords)
    useSketchStore.getState().solveConstraints();
    expect(useSketchStore.getState().degreesOfFreedom).toBe(4);
  });

  it('should detect fully constrained', () => {
    const el = { id: 'el1', type: 'point' as const, geometry: { x: 5, y: 5 }, construction: false };
    useSketchStore.getState().addElement(el);

    // Fix the point (2 DOF removed)
    useSketchStore.getState().addConstraint({ type: 'fix', elements: ['el1'] });
    useSketchStore.getState().solveConstraints();

    // Point has 2 DOF, fix removes 2 → 0 → fully constrained
    expect(useSketchStore.getState().isFullyConstrained).toBe(true);
  });
});
