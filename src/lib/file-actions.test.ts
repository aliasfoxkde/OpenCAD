/**
 * @vitest-environment jsdom
 */
import { describe, it, expect, vi, beforeEach } from 'vitest';
import {
  handleNewDocument,
  handleSaveDocument,
  handleExport,
  captureThumbnail,
  handleScreenshot,
} from './file-actions';
import { useCADStore } from '@/stores/cad-store';

// Mock all heavy dependencies
vi.mock('@/api/document-api', () => ({
  createDocument: vi.fn(),
  saveCurrentDocument: vi.fn(),
}));

vi.mock('@/api/export-api', () => ({
  exportToFormat: vi.fn(),
  downloadExport: vi.fn(),
  serializeToOCAD: vi.fn(() => '{"features":[]}'),
  deserializeFromOCAD: vi.fn(() => ({ features: [], name: 'Test' })),
}));

vi.mock('@/lib/feature-to-mesh', () => ({
  featuresToMeshes: vi.fn(() => []),
}));

const mockToastInstance = {
  addToast: vi.fn(),
  removeToast: vi.fn(),
  clearAll: vi.fn(),
};

vi.mock('@/components/ui/Toast', () => ({
  getToast: () => mockToastInstance,
}));

vi.mock('@/components/ui/ConfirmDialog', () => ({
  confirm: vi.fn(),
}));

vi.mock('nanoid', () => ({
  nanoid: vi.fn(() => 'test-nanoid-123'),
}));

describe('file-actions', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    // Clean up any leftover DOM elements from previous tests
    document.querySelectorAll('canvas').forEach((c) => c.remove());
    useCADStore.setState({
      features: [],
      documentId: 'doc-1',
      documentName: 'TestDocument',
      dirty: false,
    });
  });

  describe('handleNewDocument', () => {
    it('should create new document when no unsaved changes', async () => {
      const { createDocument } = await import('@/api/document-api');
      vi.mocked(createDocument).mockResolvedValue({
        success: true,
        data: { id: 'new-doc', name: 'Untitled', features: [] },
      });

      await handleNewDocument();

      expect(createDocument).toHaveBeenCalledWith({ name: 'Untitled' });
      expect(useCADStore.getState().documentId).toBe('new-doc');
      expect(useCADStore.getState().dirty).toBe(false);
    });

    it('should show success toast on successful creation', async () => {
      const { createDocument } = await import('@/api/document-api');
      vi.mocked(createDocument).mockResolvedValue({
        success: true,
        data: { id: 'new-doc', name: 'Untitled', features: [] },
      });

      await handleNewDocument();

      expect(mockToastInstance.addToast).toHaveBeenCalledWith('New document created', 'success');
    });

    it('should show error toast on failure', async () => {
      const { createDocument } = await import('@/api/document-api');
      vi.mocked(createDocument).mockResolvedValue({ success: false });

      await handleNewDocument();

      expect(mockToastInstance.addToast).toHaveBeenCalledWith('Failed to create document', 'error');
    });

    it('should prompt when dirty and abort if declined', async () => {
      const { confirm } = await import('@/components/ui/ConfirmDialog');
      const { createDocument } = await import('@/api/document-api');
      vi.mocked(confirm).mockResolvedValue(false);
      useCADStore.setState({ dirty: true });

      await handleNewDocument();

      expect(confirm).toHaveBeenCalled();
      expect(createDocument).not.toHaveBeenCalled();
    });

    it('should proceed when dirty and user confirms', async () => {
      const { confirm } = await import('@/components/ui/ConfirmDialog');
      const { createDocument } = await import('@/api/document-api');
      vi.mocked(confirm).mockResolvedValue(true);
      vi.mocked(createDocument).mockResolvedValue({
        success: true,
        data: { id: 'new-doc', name: 'Untitled', features: [] },
      });
      useCADStore.setState({ dirty: true });

      await handleNewDocument();

      expect(createDocument).toHaveBeenCalled();
    });
  });

  describe('handleSaveDocument', () => {
    it('should save document and clear dirty flag on success', async () => {
      const { saveCurrentDocument } = await import('@/api/document-api');
      vi.mocked(saveCurrentDocument).mockResolvedValue({ success: true });

      const result = await handleSaveDocument();

      expect(result).toBe(true);
      expect(useCADStore.getState().dirty).toBe(false);
    });

    it('should show success toast on save', async () => {
      const { saveCurrentDocument } = await import('@/api/document-api');
      vi.mocked(saveCurrentDocument).mockResolvedValue({ success: true });

      await handleSaveDocument();

      expect(mockToastInstance.addToast).toHaveBeenCalledWith('Saved TestDocument', 'success');
    });

    it('should show error toast on save failure', async () => {
      const { saveCurrentDocument } = await import('@/api/document-api');
      vi.mocked(saveCurrentDocument).mockResolvedValue({ success: false });

      const result = await handleSaveDocument();

      expect(result).toBe(false);
      expect(mockToastInstance.addToast).toHaveBeenCalledWith('Failed to save document', 'error');
    });

    it('should create new document if no documentId', async () => {
      const { createDocument } = await import('@/api/document-api');
      vi.mocked(createDocument).mockResolvedValue({
        success: true,
        data: { id: 'new-doc', name: 'Untitled', features: [] },
      });
      useCADStore.setState({ documentId: null });

      const result = await handleSaveDocument();

      expect(createDocument).toHaveBeenCalled();
      expect(result).toBe(true);
    });

    it('should pass features to saveCurrentDocument', async () => {
      const { saveCurrentDocument } = await import('@/api/document-api');
      const testFeatures = [{ id: 'f1', type: 'box', name: 'Box', parameters: {}, dependencies: [], children: [], suppressed: false }];
      useCADStore.setState({ features: testFeatures as any });

      await handleSaveDocument();

      expect(saveCurrentDocument).toHaveBeenCalledWith(
        expect.objectContaining({ features: testFeatures }),
      );
    });
  });

  describe('handleExport', () => {
    it('should export as ocad format using serializeToOCAD', async () => {
      const { serializeToOCAD } = await import('@/api/export-api');
      handleExport('ocad');

      expect(serializeToOCAD).toHaveBeenCalledWith(
        expect.objectContaining({ name: 'TestDocument' }),
      );
    });

    it('should export to STL format when features produce meshes', async () => {
      const { featuresToMeshes } = await import('@/lib/feature-to-mesh');
      const { exportToFormat, downloadExport } = await import('@/api/export-api');
      vi.mocked(featuresToMeshes).mockReturnValue([{ vertices: new Float32Array([0, 0, 0]), indices: new Uint32Array([0]) }]);

      handleExport('stl');

      expect(exportToFormat).toHaveBeenCalledWith(expect.objectContaining({ format: 'stl' }));
      expect(downloadExport).toHaveBeenCalled();
    });

    it('should not export mesh formats when no meshes produced', async () => {
      const { featuresToMeshes } = await import('@/lib/feature-to-mesh');
      const { exportToFormat } = await import('@/api/export-api');
      vi.mocked(featuresToMeshes).mockReturnValue([]);

      handleExport('stl');

      expect(exportToFormat).not.toHaveBeenCalled();
    });

    it('should show success toast for mesh export', async () => {
      const { featuresToMeshes } = await import('@/lib/feature-to-mesh');
      vi.mocked(featuresToMeshes).mockReturnValue([{ vertices: new Float32Array([0, 0, 0]), indices: new Uint32Array([0]) }]);

      handleExport('obj');

      expect(mockToastInstance.addToast).toHaveBeenCalledWith('Exported as OBJ', 'success');
    });

    it('should show error toast for failed mesh export', async () => {
      const { exportToFormat } = await import('@/api/export-api');
      const { featuresToMeshes } = await import('@/lib/feature-to-mesh');
      vi.mocked(featuresToMeshes).mockReturnValue([{ vertices: new Float32Array([0, 0, 0]), indices: new Uint32Array([0]) }]);
      vi.mocked(exportToFormat).mockImplementation(() => { throw new Error('fail'); });

      handleExport('stl');

      expect(mockToastInstance.addToast).toHaveBeenCalledWith('Export to STL failed', 'error');
    });
  });

  describe('captureThumbnail', () => {
    it('should return null when no canvas exists', () => {
      expect(captureThumbnail()).toBeNull();
    });

    it('should return a data URL when canvas exists', () => {
      const mockCanvas = document.createElement('canvas');
      mockCanvas.width = 800;
      mockCanvas.height = 600;
      document.body.appendChild(mockCanvas);

      const mockCtx = { drawImage: vi.fn() };
      const getContextSpy = vi.spyOn(HTMLCanvasElement.prototype, 'getContext').mockReturnValue(mockCtx as any);
      const toDataUrlSpy = vi.spyOn(HTMLCanvasElement.prototype, 'toDataURL').mockReturnValue('data:image/jpeg;base64,abc');

      const result = captureThumbnail();

      expect(result).toBe('data:image/jpeg;base64,abc');
      expect(getContextSpy).toHaveBeenCalledWith('2d');
      expect(mockCtx.drawImage).toHaveBeenCalled();

      getContextSpy.mockRestore();
      toDataUrlSpy.mockRestore();
    });
  });

  describe('handleScreenshot', () => {
    it('should show error toast when no canvas exists', () => {
      handleScreenshot();

      expect(mockToastInstance.addToast).toHaveBeenCalledWith('No viewport found', 'error');
    });

    it('should trigger download when canvas exists', () => {
      const mockCanvas = document.createElement('canvas');
      mockCanvas.toDataURL = vi.fn(() => 'data:image/png;base64,test');
      document.body.appendChild(mockCanvas);

      const mockAnchor = { href: '', download: '', click: vi.fn() };
      const origCreateElement = document.createElement.bind(document);
      vi.spyOn(document, 'createElement').mockImplementation((tag: string) => {
        if (tag === 'a') return mockAnchor as any;
        return origCreateElement(tag);
      });

      handleScreenshot();

      expect(mockAnchor.download).toContain('screenshot.png');
      expect(mockAnchor.click).toHaveBeenCalled();
      expect(mockToastInstance.addToast).toHaveBeenCalledWith('Screenshot saved', 'success');

      document.body.removeChild(mockCanvas);
      vi.restoreAllMocks();
    });

    it('should use document name in screenshot filename', () => {
      useCADStore.setState({ documentName: 'MyPart' });
      const mockCanvas = document.createElement('canvas');
      mockCanvas.toDataURL = vi.fn(() => 'data:image/png;base64,test');
      document.body.appendChild(mockCanvas);

      const mockAnchor = { href: '', download: '', click: vi.fn() };
      const origCreateElement = document.createElement.bind(document);
      vi.spyOn(document, 'createElement').mockImplementation((tag: string) => {
        if (tag === 'a') return mockAnchor as any;
        return origCreateElement(tag);
      });

      handleScreenshot();

      expect(mockAnchor.download).toContain('MyPart-screenshot.png');

      document.body.removeChild(mockCanvas);
      vi.restoreAllMocks();
    });
  });
});
