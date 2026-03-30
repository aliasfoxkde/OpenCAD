import { describe, it, expect, vi } from 'vitest';
import {
  createDocument,
  listAllDocuments,
  openDocument,
  saveCurrentDocument,
  removeDocument,
  generateDocumentId,
} from './document-api';

// Mock the db module
vi.mock('@/cad/io/db', () => ({
  saveDocument: vi.fn().mockResolvedValue(undefined),
  loadDocument: vi.fn().mockResolvedValue({ id: 'doc-1', name: 'Test', features: [] }),
  deleteDocument: vi.fn().mockResolvedValue(undefined),
  listDocuments: vi
    .fn()
    .mockResolvedValue([{ id: 'doc-1', name: 'Test', created: 1000, modified: 2000, featureCount: 3 }]),
  createDocumentId: vi.fn().mockReturnValue('generated-id'),
  createNewDocument: vi.fn().mockReturnValue({ id: 'doc-new', name: 'Untitled', features: [], units: 'mm' }),
  closeDB: vi.fn().mockResolvedValue(undefined),
}));

describe('document-api', () => {
  describe('createDocument', () => {
    it('should create a new document with defaults', async () => {
      const result = await createDocument();
      expect(result.success).toBe(true);
      expect(result.data).toBeDefined();
      expect(result.data!.id).toBe('doc-new');
      expect(result.data!.name).toBe('Untitled');
    });

    it('should create a document with custom options', async () => {
      const result = await createDocument({ name: 'Custom', units: 'cm' });
      expect(result.success).toBe(true);
    });
  });

  describe('listAllDocuments', () => {
    it('should list all documents', async () => {
      const result = await listAllDocuments();
      expect(result.success).toBe(true);
      expect(result.data).toHaveLength(1);
      expect(result.data![0]!.id).toBe('doc-1');
      expect(result.data![0]!.featureCount).toBe(3);
    });
  });

  describe('openDocument', () => {
    it('should open an existing document', async () => {
      const result = await openDocument('doc-1');
      expect(result.success).toBe(true);
      expect(result.data!.id).toBe('doc-1');
    });

    it('should return error for missing document', async () => {
      const { loadDocument } = await import('@/cad/io/db');
      vi.mocked(loadDocument).mockResolvedValueOnce(null);
      const result = await openDocument('nonexistent');
      expect(result.success).toBe(false);
      expect(result.error).toContain('not found');
    });
  });

  describe('saveCurrentDocument', () => {
    it('should save a document', async () => {
      const result = await saveCurrentDocument({ id: 'doc-1', name: 'Test', features: [] } as any);
      expect(result.success).toBe(true);
    });
  });

  describe('removeDocument', () => {
    it('should delete a document', async () => {
      const result = await removeDocument('doc-1');
      expect(result.success).toBe(true);
    });
  });

  describe('generateDocumentId', () => {
    it('should generate a unique ID', () => {
      const id = generateDocumentId();
      expect(id).toBe('generated-id');
    });
  });
});
