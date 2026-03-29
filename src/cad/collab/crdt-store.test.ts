import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import * as Y from 'yjs';
import {
  createCRDTDocument,
  closeCRDTDocument,
  getActiveCRDTDocument,
  addFeature,
  removeFeature,
  updateFeature,
  getFeatures,
  observeFeatures,
  getMetadata,
  exportSnapshot,
  importSnapshot,
  type CRDTDocument,
} from './crdt-store';
import type { FeatureNode } from '../../types/cad';

function createTestFeature(overrides: Partial<FeatureNode> = {}): FeatureNode {
  return {
    id: `f_${Math.random().toString(36).slice(2, 8)}`,
    type: 'extrude',
    name: 'Test Feature',
    parameters: { depth: 10 },
    dependencies: [],
    children: [],
    suppressed: false,
    ...overrides,
  };
}

describe('CRDT Store', () => {
  let crdtDoc: CRDTDocument;

  beforeEach(() => {
    closeCRDTDocument();
    crdtDoc = createCRDTDocument(`test_${Date.now()}`);
  });

  afterEach(() => {
    closeCRDTDocument();
  });

  describe('createCRDTDocument', () => {
    it('should create a document with correct structure', () => {
      expect(crdtDoc.doc).toBeInstanceOf(Y.Doc);
      expect(crdtDoc.features).toBeInstanceOf(Y.Array);
      expect(crdtDoc.sketches).toBeInstanceOf(Y.Array);
      expect(crdtDoc.metadata).toBeInstanceOf(Y.Map);
    });

    it('should set metadata', () => {
      const meta = getMetadata(crdtDoc);
      expect(meta.created).toBeTypeOf('number');
      expect(meta.modified).toBeTypeOf('number');
      expect(meta.created).toBeGreaterThan(0);
    });

    it('should set as active document', () => {
      expect(getActiveCRDTDocument()).toBe(crdtDoc);
    });
  });

  describe('closeCRDTDocument', () => {
    it('should clean up the active document', () => {
      closeCRDTDocument();
      expect(getActiveCRDTDocument()).toBeNull();
    });

    it('should be safe to call when no document is active', () => {
      closeCRDTDocument();
      closeCRDTDocument(); // Should not throw
    });
  });

  describe('Feature operations', () => {
    describe('addFeature', () => {
      it('should add a feature to the tree', () => {
        const feature = createTestFeature({ name: 'Box 1' });
        addFeature(crdtDoc, feature);

        const features = getFeatures(crdtDoc);
        expect(features).toHaveLength(1);
        expect(features[0]!.name).toBe('Box 1');
        expect(features[0]!.type).toBe('extrude');
      });

      it('should preserve all feature properties', () => {
        const feature = createTestFeature({
          id: 'f1',
          type: 'fillet',
          name: 'Edge Fillet',
          parameters: { radius: 2.5 },
          dependencies: ['f0'],
          children: [],
          suppressed: true,
        });
        addFeature(crdtDoc, feature);

        const loaded = getFeatures(crdtDoc)[0]!;
        expect(loaded.id).toBe('f1');
        expect(loaded.type).toBe('fillet');
        expect(loaded.name).toBe('Edge Fillet');
        expect(loaded.parameters).toEqual({ radius: 2.5 });
        expect(loaded.dependencies).toEqual(['f0']);
        expect(loaded.suppressed).toBe(true);
      });

      it('should add multiple features', () => {
        addFeature(crdtDoc, createTestFeature({ name: 'A' }));
        addFeature(crdtDoc, createTestFeature({ name: 'B' }));
        addFeature(crdtDoc, createTestFeature({ name: 'C' }));

        expect(getFeatures(crdtDoc)).toHaveLength(3);
      });

      it('should update modified timestamp', () => {
        const before = getMetadata(crdtDoc).modified as number;
        addFeature(crdtDoc, createTestFeature());
        const after = getMetadata(crdtDoc).modified as number;
        expect(after).toBeGreaterThanOrEqual(before);
      });
    });

    describe('removeFeature', () => {
      it('should remove a feature by ID', () => {
        const f1 = createTestFeature({ id: 'f1', name: 'Keep' });
        const f2 = createTestFeature({ id: 'f2', name: 'Remove' });
        addFeature(crdtDoc, f1);
        addFeature(crdtDoc, f2);

        removeFeature(crdtDoc, 'f2');

        const features = getFeatures(crdtDoc);
        expect(features).toHaveLength(1);
        expect(features[0]!.name).toBe('Keep');
      });

      it('should handle removing non-existent feature', () => {
        addFeature(crdtDoc, createTestFeature());
        removeFeature(crdtDoc, 'nonexistent');
        expect(getFeatures(crdtDoc)).toHaveLength(1);
      });
    });

    describe('updateFeature', () => {
      it('should update feature name', () => {
        addFeature(crdtDoc, createTestFeature({ id: 'f1', name: 'Old' }));
        updateFeature(crdtDoc, 'f1', { name: 'New' });

        expect(getFeatures(crdtDoc)[0]!.name).toBe('New');
      });

      it('should update feature parameters', () => {
        addFeature(crdtDoc, createTestFeature({ id: 'f1', parameters: { depth: 5 } }));
        updateFeature(crdtDoc, 'f1', { parameters: { depth: 20, width: 10 } });

        const params = getFeatures(crdtDoc)[0]!.parameters;
        expect(params).toEqual({ depth: 20, width: 10 });
      });

      it('should update suppressed state', () => {
        addFeature(crdtDoc, createTestFeature({ id: 'f1', suppressed: false }));
        updateFeature(crdtDoc, 'f1', { suppressed: true });

        expect(getFeatures(crdtDoc)[0]!.suppressed).toBe(true);
      });

      it('should handle updating non-existent feature', () => {
        updateFeature(crdtDoc, 'nonexistent', { name: 'X' }); // Should not throw
      });
    });

    describe('getFeatures', () => {
      it('should return empty array when no features', () => {
        expect(getFeatures(crdtDoc)).toEqual([]);
      });
    });
  });

  describe('observeFeatures', () => {
    it('should call callback when features change', () => {
      const changes: FeatureNode[][] = [];
      const unsub = observeFeatures(crdtDoc, (features) => {
        changes.push(features);
      });

      addFeature(crdtDoc, createTestFeature({ name: 'Box' }));

      // Yjs observe is synchronous within the same tick
      expect(changes.length).toBeGreaterThanOrEqual(1);
      expect(changes[changes.length - 1]!).toHaveLength(1);

      unsub();
    });

    it('should stop observing after unsubscribe', () => {
      const changes: FeatureNode[][] = [];
      const unsub = observeFeatures(crdtDoc, (features) => {
        changes.push(features);
      });

      addFeature(crdtDoc, createTestFeature({ name: 'First' }));
      unsub();

      addFeature(crdtDoc, createTestFeature({ name: 'Second' }));

      // After unsub, only the first change should be recorded
      const lastChange = changes[changes.length - 1]!;
      expect(lastChange).toHaveLength(1);
      expect(lastChange[0]!.name).toBe('First');
    });
  });

  describe('exportSnapshot / importSnapshot', () => {
    it('should roundtrip features through snapshot', () => {
      addFeature(crdtDoc, createTestFeature({ id: 'f1', name: 'Box', type: 'extrude', parameters: { depth: 10 } }));
      addFeature(crdtDoc, createTestFeature({ id: 'f2', name: 'Fillet', type: 'fillet', parameters: { radius: 2 } }));

      const snapshot = exportSnapshot(crdtDoc);
      const parsed = JSON.parse(snapshot);
      expect(parsed.version).toBe(1);
      expect(parsed.features).toHaveLength(2);

      // Import into a new document
      const newDoc = createCRDTDocument(`import_${Date.now()}`);
      importSnapshot(newDoc, snapshot);

      const imported = getFeatures(newDoc);
      expect(imported).toHaveLength(2);
      expect(imported[0]!.name).toBe('Box');
      expect(imported[1]!.name).toBe('Fillet');
    });

    it('should reject unsupported snapshot version', () => {
      expect(() => importSnapshot(crdtDoc, JSON.stringify({ version: 99 }))).toThrow('Unsupported snapshot version');
    });

    it('should clear existing features on import', () => {
      addFeature(crdtDoc, createTestFeature({ name: 'Old' }));

      const snapshot = JSON.stringify({
        version: 1,
        features: [createTestFeature({ name: 'New' })],
        metadata: {},
      });

      importSnapshot(crdtDoc, snapshot);
      expect(getFeatures(crdtDoc)).toHaveLength(1);
      expect(getFeatures(crdtDoc)[0]!.name).toBe('New');
    });
  });

  describe('Conflict-free behavior', () => {
    it('should handle concurrent edits to different features', () => {
      // Simulate two concurrent edits in the same document
      const f1 = createTestFeature({ id: 'f1', name: 'Feature 1' });
      const f2 = createTestFeature({ id: 'f2', name: 'Feature 2' });

      // Both added in separate transactions (simulating concurrent peers)
      crdtDoc.doc.transact(() => {
        addFeature(crdtDoc, f1);
      });
      crdtDoc.doc.transact(() => {
        addFeature(crdtDoc, f2);
      });

      const features = getFeatures(crdtDoc);
      expect(features).toHaveLength(2);
      // Both features should exist
      const names = features.map((f) => f.name);
      expect(names).toContain('Feature 1');
      expect(names).toContain('Feature 2');
    });
  });
});
