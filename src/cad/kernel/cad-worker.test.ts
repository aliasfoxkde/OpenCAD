import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';

// Mock self for worker environment
const mockPostMessage = vi.fn();
vi.stubGlobal('self', {
  onmessage: null as ((ev: MessageEvent) => void) | null,
  postMessage: mockPostMessage,
});

describe('cad-worker', () => {
  beforeEach(async () => {
    mockPostMessage.mockClear();
    // Import fresh worker module which sets self.onmessage
    await import('./cad-worker');
  });

  afterEach(() => {
    vi.resetModules();
  });

  it('should respond to init message with ready', async () => {
    await import('./cad-worker');
    self.onmessage!({ data: { type: 'init' } } as MessageEvent);
    expect(mockPostMessage).toHaveBeenCalledWith({ type: 'ready' });
  });

  it('should create a primitive and respond with shape_created', async () => {
    // First init
    self.onmessage!({ data: { type: 'init' } } as MessageEvent);
    mockPostMessage.mockClear();

    // Create primitive
    self.onmessage!({
      data: { type: 'create_primitive', id: 'box-1', primitive: 'box', params: { width: 2, height: 2, depth: 2 } },
    } as MessageEvent);
    expect(mockPostMessage).toHaveBeenCalledWith({ type: 'shape_created', id: 'box-1' });
  });

  it('should tessellate a created primitive', async () => {
    // Init
    self.onmessage!({ data: { type: 'init' } } as MessageEvent);
    mockPostMessage.mockClear();

    // Create
    self.onmessage!({
      data: { type: 'create_primitive', id: 'sphere-1', primitive: 'sphere', params: { radius: 3 } },
    } as MessageEvent);
    mockPostMessage.mockClear();

    // Tessellate
    self.onmessage!({
      data: { type: 'tessellate', id: 'sphere-1' },
    } as MessageEvent);

    const response = mockPostMessage.mock.calls[0]![0];
    expect(response.type).toBe('tessellation_result');
    expect(response.id).toBe('sphere-1');
    expect(response.mesh).toBeDefined();
    expect(response.mesh.vertices.length).toBeGreaterThan(0);
  });

  it('should return error for tessellation of unknown shape', async () => {
    // Init
    self.onmessage!({ data: { type: 'init' } } as MessageEvent);
    mockPostMessage.mockClear();

    // Tessellate non-existent shape
    self.onmessage!({
      data: { type: 'tessellate', id: 'nonexistent' },
    } as MessageEvent);

    expect(mockPostMessage).toHaveBeenCalledWith(
      expect.objectContaining({
        type: 'tessellation_error',
        id: 'nonexistent',
      }),
    );
  });

  it('should return error for operations before init', async () => {
    // Reset: don't send init
    mockPostMessage.mockClear();

    self.onmessage!({
      data: { type: 'create_primitive', id: 'box-1', primitive: 'box', params: {} },
    } as MessageEvent);

    expect(mockPostMessage).toHaveBeenCalledWith(
      expect.objectContaining({
        type: 'error',
        message: 'Kernel not initialized',
      }),
    );
  });

  it('should delete a shape', async () => {
    // Init
    self.onmessage!({ data: { type: 'init' } } as MessageEvent);
    mockPostMessage.mockClear();

    // Create
    self.onmessage!({
      data: { type: 'create_primitive', id: 'del-1', primitive: 'box', params: {} },
    } as MessageEvent);
    mockPostMessage.mockClear();

    // Delete
    self.onmessage!({
      data: { type: 'delete_shape', id: 'del-1' },
    } as MessageEvent);

    expect(mockPostMessage).toHaveBeenCalledWith({ type: 'shape_deleted', id: 'del-1' });

    // Tessellate should fail now
    mockPostMessage.mockClear();
    self.onmessage!({
      data: { type: 'tessellate', id: 'del-1' },
    } as MessageEvent);
    expect(mockPostMessage).toHaveBeenCalledWith(
      expect.objectContaining({ type: 'tessellation_error' }),
    );
  });

  it('should return error for unknown request type', async () => {
    mockPostMessage.mockClear();

    self.onmessage!({
      data: { type: 'unknown_type' },
    } as MessageEvent);

    expect(mockPostMessage).toHaveBeenCalledWith(
      expect.objectContaining({
        type: 'error',
        message: 'Unknown request type: unknown_type',
      }),
    );
  });
});
