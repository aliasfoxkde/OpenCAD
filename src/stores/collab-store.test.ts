import { describe, it, expect, beforeEach } from 'vitest';
import { useCollabStore } from './collab-store';

describe('CollabStore', () => {
  beforeEach(() => {
    useCollabStore.setState({
      connectionState: 'disconnected',
      roomId: null,
      localPeerId: '',
      localDisplayName: '',
      localColor: '#3b82f6',
      peers: [],
      isHost: false,
      sessionStartTime: null,
    });
  });

  it('should start in disconnected state', () => {
    const state = useCollabStore.getState();
    expect(state.connectionState).toBe('disconnected');
    expect(state.roomId).toBeNull();
    expect(state.peers).toEqual([]);
    expect(state.isHost).toBe(false);
  });

  describe('joinSession', () => {
    it('should set connection state to connecting', () => {
      useCollabStore.getState().joinSession('room-abc', 'peer-1', 'Alice', '#3b82f6');
      const state = useCollabStore.getState();
      expect(state.connectionState).toBe('connecting');
      expect(state.roomId).toBe('room-abc');
      expect(state.localPeerId).toBe('peer-1');
      expect(state.localDisplayName).toBe('Alice');
      expect(state.localColor).toBe('#3b82f6');
      expect(state.sessionStartTime).toBeGreaterThan(0);
      expect(state.peers).toEqual([]);
    });

    it('should reset isHost on join', () => {
      useCollabStore.setState({ isHost: true });
      useCollabStore.getState().joinSession('room', 'p1', 'A', '#000');
      expect(useCollabStore.getState().isHost).toBe(false);
    });

    it('should clear peers on join', () => {
      useCollabStore.setState({
        peers: [{ peerId: 'old', displayName: 'Old', color: '#000', cursor: null, selection: [], lastSeen: Date.now() }],
      });
      useCollabStore.getState().joinSession('room', 'p1', 'A', '#000');
      expect(useCollabStore.getState().peers).toEqual([]);
    });
  });

  describe('leaveSession', () => {
    it('should reset to initial state', () => {
      useCollabStore.getState().joinSession('room-abc', 'peer-1', 'Alice', '#3b82f6');
      useCollabStore.getState().leaveSession();
      const state = useCollabStore.getState();
      expect(state.connectionState).toBe('disconnected');
      expect(state.roomId).toBeNull();
      expect(state.peers).toEqual([]);
      expect(state.sessionStartTime).toBeNull();
    });
  });

  describe('setConnectionState', () => {
    it('should update connection state', () => {
      useCollabStore.getState().setConnectionState('connected');
      expect(useCollabStore.getState().connectionState).toBe('connected');
    });

    it('should support all states', () => {
      const states = ['disconnected', 'connecting', 'connected', 'error'] as const;
      for (const s of states) {
        useCollabStore.getState().setConnectionState(s);
        expect(useCollabStore.getState().connectionState).toBe(s);
      }
    });
  });

  describe('setPeers', () => {
    it('should set peer list', () => {
      const peers = [
        { peerId: 'p2', displayName: 'Bob', color: '#ef4444', cursor: null, selection: [], lastSeen: Date.now() },
        { peerId: 'p3', displayName: 'Carol', color: '#22c55e', cursor: null, selection: [], lastSeen: Date.now() },
      ];
      useCollabStore.getState().setPeers(peers);
      expect(useCollabStore.getState().peers).toHaveLength(2);
    });
  });

  describe('updatePeer', () => {
    it('should update an existing peer', () => {
      useCollabStore.getState().setPeers([
        { peerId: 'p2', displayName: 'Bob', color: '#ef4444', cursor: null, selection: [], lastSeen: 1000 },
      ]);
      useCollabStore.getState().updatePeer('p2', { cursor: { x: 1, y: 2, z: 3 } });
      const peer = useCollabStore.getState().peers.find((p) => p.peerId === 'p2');
      expect(peer?.cursor).toEqual({ x: 1, y: 2, z: 3 });
      expect(peer?.lastSeen).toBeGreaterThan(1000);
    });

    it('should not add a new peer if not found', () => {
      useCollabStore.getState().setPeers([]);
      useCollabStore.getState().updatePeer('nonexistent', { displayName: 'Ghost' });
      expect(useCollabStore.getState().peers).toHaveLength(0);
    });
  });

  describe('removePeer', () => {
    it('should remove a peer by ID', () => {
      useCollabStore.getState().setPeers([
        { peerId: 'p2', displayName: 'Bob', color: '#ef4444', cursor: null, selection: [], lastSeen: Date.now() },
        { peerId: 'p3', displayName: 'Carol', color: '#22c55e', cursor: null, selection: [], lastSeen: Date.now() },
      ]);
      useCollabStore.getState().removePeer('p2');
      expect(useCollabStore.getState().peers).toHaveLength(1);
      expect(useCollabStore.getState().peers[0]!.peerId).toBe('p3');
    });

    it('should be safe to remove non-existent peer', () => {
      useCollabStore.getState().setPeers([]);
      expect(() => useCollabStore.getState().removePeer('ghost')).not.toThrow();
    });
  });

  describe('setDisplayName', () => {
    it('should update local display name', () => {
      useCollabStore.getState().joinSession('room', 'p1', 'Alice', '#3b82f6');
      useCollabStore.getState().setDisplayName('Alice V2');
      expect(useCollabStore.getState().localDisplayName).toBe('Alice V2');
    });
  });

  describe('setHost', () => {
    it('should set host flag', () => {
      useCollabStore.getState().setHost(true);
      expect(useCollabStore.getState().isHost).toBe(true);
    });

    it('should clear host flag', () => {
      useCollabStore.getState().setHost(true);
      useCollabStore.getState().setHost(false);
      expect(useCollabStore.getState().isHost).toBe(false);
    });
  });

  describe('updateLocalPresence', () => {
    it('should not crash when updating cursor', () => {
      expect(() =>
        useCollabStore.getState().updateLocalPresence({ cursor: { x: 1, y: 2, z: 3 } }),
      ).not.toThrow();
    });

    it('should not crash when updating selection', () => {
      expect(() =>
        useCollabStore.getState().updateLocalPresence({ selection: ['f1', 'f2'] }),
      ).not.toThrow();
    });
  });
});
