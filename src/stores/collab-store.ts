/**
 * Collaboration store for managing real-time collaboration state.
 *
 * Tracks user presence, connection state, session management,
 * and peer information using Zustand.
 */

import { create } from 'zustand';
import type { ConnectionState } from '../cad/collab/webrtc-sync';

export interface CollabUser {
  peerId: string;
  displayName: string;
  color: string;
  cursor: { x: number; y: number; z: number } | null;
  selection: string[];
  lastSeen: number;
}

export interface CollabState {
  connectionState: ConnectionState;
  roomId: string | null;
  localPeerId: string;
  localDisplayName: string;
  localColor: string;
  peers: CollabUser[];
  isHost: boolean;
  sessionStartTime: number | null;
}

export interface CollabActions {
  setConnectionState: (state: ConnectionState) => void;
  joinSession: (roomId: string, localPeerId: string, displayName: string, color: string) => void;
  leaveSession: () => void;
  updateLocalPresence: (updates: Partial<Pick<CollabUser, 'cursor' | 'selection'>>) => void;
  setPeers: (peers: CollabUser[]) => void;
  updatePeer: (peerId: string, updates: Partial<CollabUser>) => void;
  removePeer: (peerId: string) => void;
  setDisplayName: (name: string) => void;
  setHost: (isHost: boolean) => void;
}

type CollabStore = CollabState & CollabActions;

const INITIAL_STATE: CollabState = {
  connectionState: 'disconnected',
  roomId: null,
  localPeerId: '',
  localDisplayName: '',
  localColor: '#3b82f6',
  peers: [],
  isHost: false,
  sessionStartTime: null,
};

export const useCollabStore = create<CollabStore>((set) => ({
  ...INITIAL_STATE,

  setConnectionState: (connectionState) => set({ connectionState }),

  joinSession: (roomId, localPeerId, displayName, color) =>
    set({
      connectionState: 'connecting',
      roomId,
      localPeerId,
      localDisplayName: displayName,
      localColor: color,
      isHost: false,
      sessionStartTime: Date.now(),
      peers: [],
    }),

  leaveSession: () =>
    set({
      ...INITIAL_STATE,
      localPeerId: INITIAL_STATE.localPeerId,
      localDisplayName: INITIAL_STATE.localDisplayName,
      localColor: INITIAL_STATE.localColor,
    }),

  updateLocalPresence: (_updates) =>
    set(() => ({
      // Cursor/selection are broadcast via awareness, not stored in state
    })),

  setPeers: (peers) =>
    set((state) => ({
      peers,
      connectionState: peers.length > 0 ? 'connected' : state.connectionState,
    })),

  updatePeer: (peerId, updates) =>
    set((state) => ({
      peers: state.peers.map((p) => (p.peerId === peerId ? { ...p, ...updates, lastSeen: Date.now() } : p)),
    })),

  removePeer: (peerId) =>
    set((state) => ({
      peers: state.peers.filter((p) => p.peerId !== peerId),
    })),

  setDisplayName: (name) => set({ localDisplayName: name }),

  setHost: (isHost) => set({ isHost }),
}));

// Selector hooks
export const useConnectionState = () => useCollabStore((s) => s.connectionState);
export const useRoomId = () => useCollabStore((s) => s.roomId);
export const usePeers = () => useCollabStore((s) => s.peers);
export const useIsConnected = () => useCollabStore((s) => s.connectionState === 'connected');
export const usePeerCount = () => useCollabStore((s) => s.peers.length);
export const useLocalUser = () =>
  useCollabStore((s) => ({
    peerId: s.localPeerId,
    displayName: s.localDisplayName,
    color: s.localColor,
  }));
