import { describe, it, expect, beforeEach, vi } from 'vitest';
import {
  CollaborationSync,
  generateRoomId,
  peerColor,
  generateDisplayName,
  getCollaborationSync,
  destroyCollaborationSync,
  type SyncState,
} from './webrtc-sync';

describe('WebRTC Collaboration Sync', () => {
  let sync: CollaborationSync;

  beforeEach(() => {
    destroyCollaborationSync();
    sync = new CollaborationSync();
  });

  afterEach(() => {
    sync.destroy();
  });

  describe('generateRoomId', () => {
    it('should generate a 12-character lowercase alphanumeric ID', () => {
      const id = generateRoomId();
      expect(id).toHaveLength(12);
      expect(id).toMatch(/^[a-z0-9]+$/);
    });

    it('should generate unique IDs', () => {
      const ids = new Set(Array.from({ length: 20 }, () => generateRoomId()));
      expect(ids.size).toBe(20);
    });
  });

  describe('peerColor', () => {
    it('should return a hex color string', () => {
      const color = peerColor('test-peer');
      expect(color).toMatch(/^#[0-9a-f]{6}$/);
    });

    it('should return consistent colors for the same peer ID', () => {
      const c1 = peerColor('peer-123');
      const c2 = peerColor('peer-123');
      expect(c1).toBe(c2);
    });

    it('should return different colors for different peer IDs', () => {
      const colors = new Set(Array.from({ length: 50 }, (_, i) => peerColor(`peer-${i}`)));
      // Should have at least a few different colors
      expect(colors.size).toBeGreaterThan(1);
    });
  });

  describe('generateDisplayName', () => {
    it('should generate a non-empty string', () => {
      const name = generateDisplayName();
      expect(name.length).toBeGreaterThan(0);
    });

    it('should generate names matching Adjective+Noun pattern', () => {
      const name = generateDisplayName();
      expect(name).toMatch(/^[A-Z][a-z]+[A-Z][a-z]+$/);
    });
  });

  describe('CollaborationSync', () => {
    it('should start in disconnected state', () => {
      expect(sync.currentState.connectionState).toBe('disconnected');
      expect(sync.currentState.roomId).toBeNull();
      expect(sync.currentState.peerCount).toBe(0);
      expect(sync.currentState.peers).toEqual([]);
    });

    it('should have a local peer ID', () => {
      expect(sync.peerId).toMatch(/^peer_/);
    });

    it('should have a display name', () => {
      expect(sync.displayName.length).toBeGreaterThan(0);
    });

    it('should have a peer color', () => {
      expect(sync.color).toMatch(/^#[0-9a-f]{6}$/);
    });

    it('should notify listeners on state change', () => {
      const states: SyncState[] = [];
      sync.onStateChange((state) => states.push(state));

      sync.leaveSession();
      expect(states.length).toBeGreaterThanOrEqual(1);
    });

    it('should unsubscribe listeners', () => {
      const states: SyncState[] = [];
      const unsub = sync.onStateChange((state) => states.push(state));
      unsub();
      sync.leaveSession();
      expect(states).toHaveLength(0);
    });

    it('should leave session and reset state', () => {
      sync.leaveSession();
      expect(sync.currentState.connectionState).toBe('disconnected');
      expect(sync.currentState.roomId).toBeNull();
      expect(sync.currentState.peerCount).toBe(0);
    });

    it('should be safe to leave when already disconnected', () => {
      sync.leaveSession(); // Already disconnected
      expect(sync.currentState.connectionState).toBe('disconnected');
    });

    it('should set display name', () => {
      sync.setDisplayName('Test User');
      expect(sync.displayName).toBe('Test User');
    });

    it('should return null provider when not connected', () => {
      expect(sync.getProvider()).toBeNull();
    });

    it('should return 0 remote peers when not connected', () => {
      expect(sync.getRemotePeerCount()).toBe(0);
    });

    it('should not crash on setCursorPosition when disconnected', () => {
      expect(() => sync.setCursorPosition({ x: 1, y: 2, z: 3 })).not.toThrow();
    });

    it('should not crash on setSelectedIds when disconnected', () => {
      expect(() => sync.setSelectedIds(['f1'])).not.toThrow();
    });

    it('should destroy cleanly', () => {
      sync.destroy();
      expect(sync.currentState.connectionState).toBe('disconnected');
    });
  });

  describe('Singleton', () => {
    it('should return same instance from getCollaborationSync', () => {
      const a = getCollaborationSync();
      const b = getCollaborationSync();
      expect(a).toBe(b);
      a.destroy();
    });

    it('should create new instance after destroy', () => {
      const a = getCollaborationSync();
      destroyCollaborationSync();
      const b = getCollaborationSync();
      expect(a).not.toBe(b);
      b.destroy();
    });
  });
});
