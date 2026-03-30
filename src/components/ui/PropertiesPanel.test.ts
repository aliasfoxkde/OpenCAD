import { describe, it, expect, beforeEach } from 'vitest';
import { useCADStore } from '../../stores/cad-store';
import { resetUndoHistory } from '../../lib/undo-history';
import { getFeatureDefinition, getDefaultParameters } from '../../cad/features';
import type { FeatureNode } from '../../types/cad';

function makeFeature(overrides: Partial<FeatureNode> = {}): FeatureNode {
  return {
    id: overrides.id ?? 'feat-1',
    type: overrides.type ?? 'extrude',
    name: overrides.name ?? 'Box 1',
    parameters: overrides.parameters ?? { width: 2, height: 2, depth: 2 },
    dependencies: overrides.dependencies ?? [],
    children: overrides.children ?? [],
    suppressed: overrides.suppressed ?? false,
    ...overrides,
  };
}

describe('PropertiesPanel — Store interactions', () => {
  beforeEach(() => {
    resetUndoHistory();
    useCADStore.setState({
      features: [],
      selectedIds: [],
      dirty: false,
    });
  });

  describe('feature name editing', () => {
    it('should update feature name via updateFeature', () => {
      const f = makeFeature({ name: 'Box 1' });
      useCADStore.setState({ features: [f], selectedIds: [f.id] });

      useCADStore.getState().updateFeature(f.id, { name: 'My Custom Box' });

      const updated = useCADStore.getState().features.find((feat) => feat.id === f.id);
      expect(updated?.name).toBe('My Custom Box');
    });

    it('should allow setting empty name', () => {
      const f = makeFeature({ name: 'Box 1' });
      useCADStore.setState({ features: [f], selectedIds: [f.id] });

      useCADStore.getState().updateFeature(f.id, { name: '' });

      const updated = useCADStore.getState().features.find((feat) => feat.id === f.id);
      expect(updated?.name).toBe('');
    });

    it('should preserve other properties when updating name', () => {
      const f = makeFeature({
        parameters: { width: 10, height: 20, depth: 30 },
        suppressed: false,
      });
      useCADStore.setState({ features: [f], selectedIds: [f.id] });

      useCADStore.getState().updateFeature(f.id, { name: 'Renamed' });

      const updated = useCADStore.getState().features.find((feat) => feat.id === f.id);
      expect(updated?.parameters.width).toBe(10);
      expect(updated?.suppressed).toBe(false);
    });
  });

  describe('parameter updates by type', () => {
    it('should update number parameters', () => {
      const f = makeFeature({ parameters: { width: 2, height: 2, depth: 2 } });
      useCADStore.setState({ features: [f], selectedIds: [f.id] });

      useCADStore.getState().updateFeature(f.id, {
        parameters: { ...f.parameters, width: 50 },
      });

      const updated = useCADStore.getState().features.find((feat) => feat.id === f.id);
      expect(updated?.parameters.width).toBe(50);
      expect(updated?.parameters.height).toBe(2);
    });

    it('should update string parameters', () => {
      const f = makeFeature({
        type: 'fillet',
        parameters: { radius: 1, edgeIndices: '' },
      });
      useCADStore.setState({ features: [f], selectedIds: [f.id] });

      useCADStore.getState().updateFeature(f.id, {
        parameters: { ...f.parameters, edgeIndices: '0,1,2' },
      });

      const updated = useCADStore.getState().features.find((feat) => feat.id === f.id);
      expect(updated?.parameters.edgeIndices).toBe('0,1,2');
    });

    it('should update boolean parameters', () => {
      const f = makeFeature({
        parameters: { width: 2, visible: true },
      });
      useCADStore.setState({ features: [f], selectedIds: [f.id] });

      useCADStore.getState().updateFeature(f.id, {
        parameters: { ...f.parameters, visible: false },
      });

      const updated = useCADStore.getState().features.find((feat) => feat.id === f.id);
      expect(updated?.parameters.visible).toBe(false);
    });

    it('should update enum parameters', () => {
      const f = makeFeature({
        type: 'extrude_sketch',
        parameters: { sketchRef: '', depth: 5, direction: 'normal', draft: 0 },
      });
      useCADStore.setState({ features: [f], selectedIds: [f.id] });

      useCADStore.getState().updateFeature(f.id, {
        parameters: { ...f.parameters, direction: 'reverse' },
      });

      const updated = useCADStore.getState().features.find((feat) => feat.id === f.id);
      expect(updated?.parameters.direction).toBe('reverse');
    });

    it('should update reference parameters', () => {
      const target = makeFeature({ id: 'target-1', name: 'Target Body' });
      const f = makeFeature({
        id: 'bool-1',
        type: 'boolean_subtract',
        parameters: { targetRef: '', toolRef: '' },
      });
      useCADStore.setState({ features: [target, f], selectedIds: [f.id] });

      useCADStore.getState().updateFeature(f.id, {
        parameters: { ...f.parameters, targetRef: 'target-1' },
      });

      const updated = useCADStore.getState().features.find((feat) => feat.id === f.id);
      expect(updated?.parameters.targetRef).toBe('target-1');
    });
  });

  describe('feature suppression', () => {
    it('should toggle suppression via updateFeature', () => {
      const f = makeFeature({ suppressed: false });
      useCADStore.setState({ features: [f], selectedIds: [f.id] });

      useCADStore.getState().updateFeature(f.id, { suppressed: true });

      const updated = useCADStore.getState().features.find((feat) => feat.id === f.id);
      expect(updated?.suppressed).toBe(true);
    });

    it('should un-suppress a suppressed feature', () => {
      const f = makeFeature({ suppressed: true });
      useCADStore.setState({ features: [f], selectedIds: [f.id] });

      useCADStore.getState().updateFeature(f.id, { suppressed: false });

      const updated = useCADStore.getState().features.find((feat) => feat.id === f.id);
      expect(updated?.suppressed).toBe(false);
    });
  });

  describe('feature definitions — parameter type coverage', () => {
    it('should have definitions for all 5 primitive types', () => {
      const primitives = ['extrude', 'revolve', 'sphere', 'cone', 'torus'];
      for (const type of primitives) {
        const def = getFeatureDefinition(type);
        expect(def).toBeDefined();
        expect(def!.parameters.length).toBeGreaterThan(0);
      }
    });

    it('should have number parameters for primitives', () => {
      const def = getFeatureDefinition('extrude');
      const numberParams = def!.parameters.filter((p) => p.type === 'number');
      expect(numberParams.length).toBeGreaterThan(0);
      expect(numberParams.some((p) => p.name === 'width')).toBe(true);
    });

    it('should have enum parameters for sketch-based features', () => {
      const def = getFeatureDefinition('extrude_sketch');
      const enumParams = def!.parameters.filter((p) => p.type === 'enum');
      expect(enumParams.length).toBeGreaterThan(0);
      expect(enumParams[0]!.enumValues).toBeDefined();
      expect(enumParams[0]!.enumValues!.length).toBeGreaterThan(0);
    });

    it('should have reference parameters for boolean operations', () => {
      const def = getFeatureDefinition('boolean_subtract');
      const refParams = def!.parameters.filter((p) => p.type === 'reference');
      expect(refParams.length).toBe(2);
      expect(refParams.some((p) => p.name === 'targetRef')).toBe(true);
      expect(refParams.some((p) => p.name === 'toolRef')).toBe(true);
    });

    it('should have string parameters for fillet edge indices', () => {
      const def = getFeatureDefinition('fillet');
      const stringParams = def!.parameters.filter((p) => p.type === 'string');
      expect(stringParams.length).toBe(1);
      expect(stringParams[0]!.name).toBe('edgeIndices');
    });

    it('should provide default parameters for all registered types', () => {
      const types = [
        'extrude',
        'revolve',
        'sphere',
        'cone',
        'torus',
        'extrude_sketch',
        'revolve_sketch',
        'cut',
        'fillet',
        'chamfer',
        'shell',
        'boolean_union',
        'boolean_subtract',
        'boolean_intersect',
        'pattern_linear',
        'pattern_circular',
        'mirror',
        'hole',
      ];
      for (const type of types) {
        const params = getDefaultParameters(type);
        expect(params).toBeDefined();
        expect(Object.keys(params).length).toBeGreaterThan(0);
      }
    });

    it('should include min/max/step constraints for number params', () => {
      const def = getFeatureDefinition('extrude');
      const width = def!.parameters.find((p) => p.name === 'width');
      expect(width?.min).toBe(0.01);
      expect(width?.step).toBe(0.1);
      expect(width?.unit).toBe('mm');
    });
  });

  describe('selection state', () => {
    it('should find the selected feature from the store', () => {
      const f1 = makeFeature({ id: 'a', name: 'Feature A' });
      const f2 = makeFeature({ id: 'b', name: 'Feature B' });
      useCADStore.setState({ features: [f1, f2], selectedIds: ['b'] });

      const features = useCADStore.getState().features;
      const selectedIds = useCADStore.getState().selectedIds;
      const selected = features.find((f) => selectedIds.includes(f.id));

      expect(selected?.id).toBe('b');
      expect(selected?.name).toBe('Feature B');
    });

    it('should have no selected feature when selectedIds is empty', () => {
      const f = makeFeature();
      useCADStore.setState({ features: [f], selectedIds: [] });

      const features = useCADStore.getState().features;
      const selectedIds = useCADStore.getState().selectedIds;
      const selected = features.find((f) => selectedIds.includes(f.id));

      expect(selected).toBeUndefined();
    });
  });

  describe('parameter definitions — type validation', () => {
    it('should only accept valid parameter types', () => {
      const validTypes = ['number', 'string', 'boolean', 'enum', 'reference'] as const;
      const allDefs = [
        getFeatureDefinition('extrude'),
        getFeatureDefinition('extrude_sketch'),
        getFeatureDefinition('fillet'),
        getFeatureDefinition('boolean_subtract'),
        getFeatureDefinition('pattern_linear'),
        getFeatureDefinition('hole'),
      ];
      for (const def of allDefs) {
        for (const param of def!.parameters) {
          expect(validTypes).toContain(param.type);
        }
      }
    });
  });

  describe('reference parameter — validation states', () => {
    it('should resolve a valid reference feature', () => {
      const target = makeFeature({ id: 'target-1', name: 'Target Body' });
      const shell = makeFeature({
        id: 'shell-1',
        type: 'shell',
        parameters: { targetRef: 'target-1', thickness: 1, removeFaces: '' },
      });
      useCADStore.setState({ features: [target, shell], selectedIds: [shell.id] });

      const features = useCADStore.getState().features;
      const refId = shell.parameters.targetRef as string;
      const refFeature = features.find((f) => f.id === refId);

      expect(refFeature).toBeDefined();
      expect(refFeature!.name).toBe('Target Body');
      expect(refFeature!.suppressed).toBe(false);
    });

    it('should detect missing reference', () => {
      const shell = makeFeature({
        id: 'shell-1',
        type: 'shell',
        parameters: { targetRef: 'nonexistent', thickness: 1, removeFaces: '' },
      });
      useCADStore.setState({ features: [shell], selectedIds: [shell.id] });

      const features = useCADStore.getState().features;
      const refId = shell.parameters.targetRef as string;
      const refFeature = features.find((f) => f.id === refId);

      expect(refFeature).toBeUndefined();
    });

    it('should detect suppressed reference', () => {
      const target = makeFeature({ id: 'target-1', name: 'Target Body', suppressed: true });
      const shell = makeFeature({
        id: 'shell-1',
        type: 'shell',
        parameters: { targetRef: 'target-1', thickness: 1, removeFaces: '' },
      });
      useCADStore.setState({ features: [target, shell], selectedIds: [shell.id] });

      const features = useCADStore.getState().features;
      const refId = shell.parameters.targetRef as string;
      const refFeature = features.find((f) => f.id === refId);

      expect(refFeature).toBeDefined();
      expect(refFeature!.suppressed).toBe(true);
    });

    it('should allow selecting referenced feature via store', () => {
      const target = makeFeature({ id: 'target-1', name: 'Target Body' });
      useCADStore.setState({ features: [target], selectedIds: [] });

      useCADStore.getState().select(['target-1']);

      expect(useCADStore.getState().selectedIds).toEqual(['target-1']);
    });

    it('should resolve boolean_subtract target and tool references', () => {
      const bodyA = makeFeature({ id: 'a', name: 'Body A' });
      const bodyB = makeFeature({ id: 'b', name: 'Body B' });
      const sub = makeFeature({
        id: 'sub-1',
        type: 'boolean_subtract',
        parameters: { targetRef: 'a', toolRef: 'b' },
        dependencies: ['a', 'b'],
      });
      useCADStore.setState({ features: [bodyA, bodyB, sub], selectedIds: [sub.id] });

      const features = useCADStore.getState().features;
      const targetRef = sub.parameters.targetRef as string;
      const toolRef = sub.parameters.toolRef as string;
      const target = features.find((f) => f.id === targetRef);
      const tool = features.find((f) => f.id === toolRef);

      expect(target?.name).toBe('Body A');
      expect(tool?.name).toBe('Body B');
    });
  });
});
