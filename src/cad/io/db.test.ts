import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import {
  saveDocument,
  loadDocument,
  deleteDocument,
  listDocuments,
  saveSnapshot,
  getLatestSnapshot,
  pruneSnapshots,
  AutoSaveManager,
  createDocumentId,
  createNewDocument,
  closeDB,
  deleteDatabase,
  type StoredDocument,
} from './db';

// Use a unique DB name per test run to avoid collisions
const TEST_PREFIX = `test_${Date.now()}_`;

function createTestDoc(overrides: Partial<StoredDocument> = {}): StoredDocument {
  return {
    id: TEST_PREFIX + Math.random().toString(36).slice(2, 8),
    name: 'Test Document',
    units: 'mm',
    features: [],
    created: Date.now(),
    modified: Date.now(),
    autoSave: true,
    ...overrides,
  };
}

describe('IndexedDB Persistence', () => {
  beforeEach(async () => {
    await deleteDatabase();
  });

  afterEach(async () => {
    await closeDB();
  });

  describe('saveDocument / loadDocument', () => {
    it('should save and load a document', async () => {
      const doc = createTestDoc({ name: 'SaveLoad Test' });
      await saveDocument(doc);

      const loaded = await loadDocument(doc.id);
      expect(loaded).not.toBeNull();
      expect(loaded!.name).toBe('SaveLoad Test');
      expect(loaded!.units).toBe('mm');
      expect(loaded!.features).toEqual([]);
    });

    it('should update an existing document', async () => {
      const doc = createTestDoc({ name: 'Version 1' });
      await saveDocument(doc);

      doc.name = 'Version 2';
      await saveDocument(doc);

      const loaded = await loadDocument(doc.id);
      expect(loaded!.name).toBe('Version 2');
    });

    it('should return null for non-existent document', async () => {
      const loaded = await loadDocument('nonexistent');
      expect(loaded).toBeNull();
    });

    it('should update modified timestamp on save', async () => {
      const doc = createTestDoc();
      const beforeSave = Date.now();
      await saveDocument(doc);

      const loaded = await loadDocument(doc.id);
      expect(loaded!.modified).toBeGreaterThanOrEqual(beforeSave);
    });
  });

  describe('deleteDocument', () => {
    it('should delete a document', async () => {
      const doc = createTestDoc();
      await saveDocument(doc);

      await deleteDocument(doc.id);
      const loaded = await loadDocument(doc.id);
      expect(loaded).toBeNull();
    });

    it('should not throw when deleting non-existent document', async () => {
      await expect(deleteDocument('nonexistent')).resolves.toBeUndefined();
    });
  });

  describe('listDocuments', () => {
    it('should return empty list initially', async () => {
      const docs = await listDocuments();
      // Filter to only our test docs
      const testDocs = docs.filter((d) => d.id.startsWith(TEST_PREFIX));
      expect(testDocs).toHaveLength(0);
    });

    it('should list saved documents sorted by modified date', async () => {
      const doc1 = createTestDoc({ name: 'First' });
      const doc2 = createTestDoc({ name: 'Second' });

      await saveDocument(doc1);
      // Small delay to ensure different timestamps
      await new Promise((r) => setTimeout(r, 10));
      await saveDocument(doc2);

      const docs = await listDocuments();
      const testDocs = docs.filter((d) => d.id.startsWith(TEST_PREFIX));
      expect(testDocs).toHaveLength(2);
      // Most recently modified should be first
      expect(testDocs[0]!.modified).toBeGreaterThanOrEqual(testDocs[1]!.modified);
    });

    it('should include feature count in metadata', async () => {
      const doc = createTestDoc({
        features: [
          { id: 'f1', type: 'extrude', name: 'Box', parameters: {}, dependencies: [], children: [], suppressed: false },
          { id: 'f2', type: 'fillet', name: 'Fillet', parameters: {}, dependencies: [], children: [], suppressed: false },
        ],
      });
      await saveDocument(doc);

      const docs = await listDocuments();
      const found = docs.find((d) => d.id === doc.id);
      expect(found).toBeDefined();
      expect(found!.featureCount).toBe(2);
    });
  });

  describe('Snapshots', () => {
    it('should save and retrieve a snapshot', async () => {
      const doc = createTestDoc();
      await saveSnapshot(doc.id, JSON.stringify(doc));

      const snapshot = await getLatestSnapshot(doc.id);
      expect(snapshot).not.toBeNull();
      expect(snapshot!.documentId).toBe(doc.id);

      const parsed = JSON.parse(snapshot!.data);
      expect(parsed.name).toBe(doc.name);
    });

    it('should return null when no snapshot exists', async () => {
      const snapshot = await getLatestSnapshot('nonexistent');
      expect(snapshot).toBeNull();
    });
  });

  describe('pruneSnapshots', () => {
    it('should keep only the specified number of snapshots', async () => {
      const docId = TEST_PREFIX + 'prune_test';

      // Create 5 snapshots with small delays for different timestamps
      for (let i = 0; i < 5; i++) {
        await saveSnapshot(docId, `snapshot_${i}`);
        if (i < 4) await new Promise((r) => setTimeout(r, 10));
      }

      const deleted = await pruneSnapshots(docId, 2);
      expect(deleted).toBe(3); // 5 - 2 = 3 deleted

      const latest = await getLatestSnapshot(docId);
      expect(latest).not.toBeNull();
      // Latest snapshot should be the last one saved
      expect(latest!.data).toBe('snapshot_4');
    });
  });

  describe('AutoSaveManager', () => {
    it('should start and stop', () => {
      const manager = new AutoSaveManager();
      expect(manager.isActive()).toBe(false);

      manager.start('test-doc', () => createTestDoc(), 1000);
      expect(manager.isActive()).toBe(true);

      manager.stop();
      expect(manager.isActive()).toBe(false);
    });

    it('should auto-save at the specified interval', async () => {
      const manager = new AutoSaveManager();
      const doc = createTestDoc({ name: 'AutoSave Test' });

      manager.start(doc.id, () => doc, 50); // 50ms interval

      // Wait for at least one auto-save cycle
      await new Promise((r) => setTimeout(r, 120));

      manager.stop();

      const loaded = await loadDocument(doc.id);
      expect(loaded).not.toBeNull();
      expect(loaded!.name).toBe('AutoSave Test');
    });

    it('should stop cleanly when already stopped', () => {
      const manager = new AutoSaveManager();
      manager.stop(); // Should not throw
      expect(manager.isActive()).toBe(false);
    });
  });

  describe('createNewDocument', () => {
    it('should create a document with defaults', () => {
      const doc = createNewDocument();
      expect(doc.id).toMatch(/^doc_/);
      expect(doc.name).toBe('Untitled');
      expect(doc.units).toBe('mm');
      expect(doc.features).toEqual([]);
      expect(doc.created).toBeGreaterThan(0);
      expect(doc.modified).toBeGreaterThan(0);
    });

    it('should accept custom name and units', () => {
      const doc = createNewDocument('My Part', 'in');
      expect(doc.name).toBe('My Part');
      expect(doc.units).toBe('in');
    });
  });

  describe('createDocumentId', () => {
    it('should generate unique IDs', () => {
      const ids = new Set<string>();
      for (let i = 0; i < 100; i++) {
        ids.add(createDocumentId());
      }
      expect(ids.size).toBe(100);
    });
  });
});
