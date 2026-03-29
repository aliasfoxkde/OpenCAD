import { describe, it, expect, beforeEach } from 'vitest';
import {
  saveDocument,
  listDocuments,
  deleteDocument,
  createNewDocument,
  createDocumentId,
  deleteDatabase,
} from '../../cad/io/db';
import { useCADStore } from '../../stores/cad-store';

// Test the persistence logic that drives DocumentDashboard
describe('DocumentDashboard Logic', () => {
  beforeEach(async () => {
    await deleteDatabase();
    useCADStore.setState({ documentId: null, documentName: 'Untitled', features: [] });
  });

  describe('createNewDocument', () => {
    it('should create a document with default values', () => {
      const doc = createNewDocument();
      expect(doc.name).toBe('Untitled');
      expect(doc.units).toBe('mm');
      expect(doc.features).toEqual([]);
      expect(doc.id).toMatch(/^doc_/);
    });

    it('should create a document with custom name', () => {
      const doc = createNewDocument('My Part');
      expect(doc.name).toBe('My Part');
    });

    it('should create a document with custom units', () => {
      const doc = createNewDocument('Part', 'in');
      expect(doc.units).toBe('in');
    });

    it('should have created < modified timestamps', () => {
      const doc = createNewDocument();
      expect(doc.modified).toBeGreaterThanOrEqual(doc.created);
    });
  });

  describe('createDocumentId', () => {
    it('should generate unique IDs', () => {
      const id1 = createDocumentId();
      const id2 = createDocumentId();
      expect(id1).not.toBe(id2);
    });

    it('should start with doc_ prefix', () => {
      expect(createDocumentId()).toMatch(/^doc_/);
    });
  });

  describe('document CRUD (used by dashboard)', () => {
    it('should save and list documents', async () => {
      const doc = createNewDocument('Dashboard Test');
      await saveDocument(doc);
      const list = await listDocuments();
      expect(list).toHaveLength(1);
      expect(list[0]!.name).toBe('Dashboard Test');
    });

    it('should list documents sorted by modified date', async () => {
      const doc1 = createNewDocument('First');
      const doc2 = createNewDocument('Second');
      await saveDocument(doc1);
      await saveDocument(doc2);
      const list = await listDocuments();
      expect(list).toHaveLength(2);
      // Most recent modified should be first
      expect(list[0]!.modified).toBeGreaterThanOrEqual(list[1]!.modified);
    });

    it('should track feature count in metadata', async () => {
      const doc = createNewDocument('Features Test');
      doc.features.push({
        id: 'f1',
        type: 'extrude',
        name: 'Box',
        parameters: { depth: 10 },
        dependencies: [],
        children: [],
        suppressed: false,
      });
      await saveDocument(doc);
      const list = await listDocuments();
      expect(list[0]!.featureCount).toBe(1);
    });

    it('should delete documents', async () => {
      const doc = createNewDocument('Delete Me');
      await saveDocument(doc);
      expect(await listDocuments()).toHaveLength(1);
      await deleteDocument(doc.id);
      expect(await listDocuments()).toHaveLength(0);
    });
  });

  describe('dashboard → cad-store integration', () => {
    it('should set document in store on create', () => {
      const doc = createNewDocument('New Part');
      useCADStore.getState().setDocument(doc.id, doc.name);
      expect(useCADStore.getState().documentId).toBe(doc.id);
      expect(useCADStore.getState().documentName).toBe('New Part');
    });

    it('should load features into store', () => {
      const features = [
        {
          id: 'f1',
          type: 'extrude' as const,
          name: 'Box',
          parameters: { depth: 10 },
          dependencies: [] as string[],
          children: [] as string[],
          suppressed: false,
        },
      ];
      useCADStore.getState().loadFeatures(features);
      expect(useCADStore.getState().features).toHaveLength(1);
      expect(useCADStore.getState().features[0]!.name).toBe('Box');
    });

    it('should clear selection when loading features', () => {
      useCADStore.getState().select(['f1']);
      expect(useCADStore.getState().selectedIds).toEqual(['f1']);
      useCADStore.getState().loadFeatures([]);
      expect(useCADStore.getState().selectedIds).toEqual([]);
    });
  });
});
