/**
 * @vitest-environment jsdom
 */
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import { CollabPanel } from './CollabPanel';
import { useCollabStore } from '../../stores/collab-store';

// Mock heavy collaboration dependencies
vi.mock('../../cad/collab/webrtc-sync', () => ({
  getCollaborationSync: () => ({
    peerId: 'peer-123',
    displayName: 'Test User',
    color: '#3b82f6',
    onStateChange: vi.fn(() => vi.fn()),
    createSession: vi.fn(() => Promise.resolve('room-abc')),
    joinSession: vi.fn(() => Promise.resolve()),
    leaveSession: vi.fn(),
  }),
  generateRoomId: vi.fn(() => 'generated-room-xyz'),
}));

vi.mock('../../cad/collab/crdt-cad-bridge', () => ({
  startCollabSync: vi.fn(),
  stopCollabSync: vi.fn(),
}));

vi.mock('../../cad/collab/crdt-store', () => ({
  addFeature: vi.fn(),
  closeCRDTDocument: vi.fn(),
  createCRDTDocument: vi.fn(() => ({})),
}));

vi.mock('./Toast', () => ({
  getToast: () => ({
    addToast: vi.fn(),
    removeToast: vi.fn(),
    clearAll: vi.fn(),
  }),
  useToast: () => ({
    addToast: vi.fn(),
    removeToast: vi.fn(),
    clearAll: vi.fn(),
  }),
}));

describe('CollabPanel', () => {
  beforeEach(() => {
    useCollabStore.setState({
      connectionState: 'disconnected',
      roomId: null,
      localDisplayName: 'You',
      localColor: '#3b82f6',
      peers: [],
      isHost: false,
    });
  });

  it('should render Collab header', () => {
    render(<CollabPanel />);
    expect(screen.getByText('Collaborate')).toBeDefined();
  });

  it('should show disconnected state', () => {
    render(<CollabPanel />);
    expect(screen.getByText('disconnected')).toBeDefined();
  });

  it('should show connecting state', () => {
    useCollabStore.setState({ connectionState: 'connecting' });
    render(<CollabPanel />);
    expect(screen.getByText('Connecting...')).toBeDefined();
  });

  it('should show connected state', () => {
    useCollabStore.setState({ connectionState: 'connected' });
    render(<CollabPanel />);
    expect(screen.getByText('connected')).toBeDefined();
  });

  it('should show error state', () => {
    useCollabStore.setState({ connectionState: 'error' });
    render(<CollabPanel />);
    expect(screen.getByText('error')).toBeDefined();
  });

  it('should show Share and Join buttons when disconnected', () => {
    render(<CollabPanel />);
    expect(screen.getByText('Share Session')).toBeDefined();
    expect(screen.getByText('Join Session')).toBeDefined();
  });

  it('should show Leave button when connected', () => {
    useCollabStore.setState({ connectionState: 'connected' });
    render(<CollabPanel />);
    expect(screen.getByText('Leave Session')).toBeDefined();
  });

  it('should show Retry button on error', () => {
    useCollabStore.setState({ connectionState: 'error' });
    render(<CollabPanel />);
    expect(screen.getByText('Retry')).toBeDefined();
  });

  it('should show local user as host when isHost', () => {
    useCollabStore.setState({ connectionState: 'connected', isHost: true });
    render(<CollabPanel />);
    expect(screen.getByText('Host')).toBeDefined();
  });

  it('should show user count including local user', () => {
    useCollabStore.setState({
      connectionState: 'connected',
      peers: [
        { peerId: 'p1', displayName: 'Alice', color: '#ef4444', cursor: null, selection: [], lastSeen: Date.now() },
        { peerId: 'p2', displayName: 'Bob', color: '#22c55e', cursor: null, selection: [], lastSeen: Date.now() },
      ],
    });
    render(<CollabPanel />);
    expect(screen.getByText(/Users \(3\)/)).toBeDefined();
  });

  it('should show peer names when connected', () => {
    useCollabStore.setState({
      connectionState: 'connected',
      peers: [
        { peerId: 'p1', displayName: 'Alice', color: '#ef4444', cursor: null, selection: [], lastSeen: Date.now() },
      ],
    });
    render(<CollabPanel />);
    expect(screen.getByText('Alice')).toBeDefined();
  });

  it('should show room ID when connected', () => {
    useCollabStore.setState({ connectionState: 'connected', roomId: 'room-test-123' });
    render(<CollabPanel />);
    expect(screen.getByText('room-test-123')).toBeDefined();
    expect(screen.getByText('Copy')).toBeDefined();
  });

  it('should show join dialog after clicking Join Session', () => {
    render(<CollabPanel />);
    fireEvent.click(screen.getByText('Join Session'));
    // After clicking, both the button and dialog title say "Join Session"
    expect(screen.getAllByText('Join Session').length).toBe(2);
    expect(screen.getByPlaceholderText('Enter room ID')).toBeDefined();
  });

  it('should dismiss join dialog on Cancel', () => {
    render(<CollabPanel />);
    // Click the "Join Session" button (first occurrence before dialog opens)
    fireEvent.click(screen.getByText('Join Session'));
    expect(screen.getByPlaceholderText('Enter room ID')).toBeDefined();

    fireEvent.click(screen.getByText('Cancel'));
    expect(screen.queryByPlaceholderText('Enter room ID')).toBeNull();
  });

  it('should show local display name', () => {
    useCollabStore.setState({ connectionState: 'connected', localDisplayName: 'TestUser' });
    render(<CollabPanel />);
    expect(screen.getByText(/TestUser/)).toBeDefined();
  });
});
