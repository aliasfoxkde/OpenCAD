/**
 * WebRTC-based real-time collaboration provider.
 *
 * Wraps y-webrtc for peer-to-peer synchronization with:
 * - Session create/join/leave lifecycle
 * - Connection state management
 * - Auto-reconnection with exponential backoff
 * - Room ID generation for shareable links
 */

import * as Y from 'yjs';
import { WebrtcProvider } from 'y-webrtc';
import type { CRDTDocument } from './crdt-store';

export type ConnectionState = 'disconnected' | 'connecting' | 'connected' | 'error';

export interface SyncState {
  connectionState: ConnectionState;
  roomId: string | null;
  peerCount: number;
  peers: PeerInfo[];
  lastConnected: number | null;
  reconnectAttempts: number;
}

export interface PeerInfo {
  peerId: string;
  displayName: string;
  color: string;
  connected: boolean;
}

export type SyncStateListener = (state: SyncState) => void;

const ICE_SERVERS: RTCConfiguration = {
  iceServers: [
    { urls: 'stun:stun.l.google.com:19302' },
    { urls: 'stun:stun1.l.google.com:19302' },
  ],
};

const MAX_RECONNECT_ATTEMPTS = 10;
const BASE_RECONNECT_DELAY_MS = 1000;

/** Generate a unique room ID for sharing */
export function generateRoomId(): string {
  const chars = 'abcdefghijklmnopqrstuvwxyz0123456789';
  let id = '';
  for (let i = 0; i < 12; i++) {
    id += chars[Math.floor(Math.random() * chars.length)];
  }
  return id;
}

/** Generate a peer color from peer ID hash */
export function peerColor(peerId: string): string {
  const colors = ['#3b82f6', '#ef4444', '#22c55e', '#f59e0b', '#8b5cf6', '#ec4899', '#06b6d4', '#f97316'];
  let hash = 0;
  for (let i = 0; i < peerId.length; i++) {
    hash = ((hash << 5) - hash + peerId.charCodeAt(i)) | 0;
  }
  return colors[Math.abs(hash) % colors.length]!;
}

/** Generate a random display name */
export function generateDisplayName(): string {
  const adjectives = ['Swift', 'Bold', 'Keen', 'Calm', 'Bright', 'Sharp', 'Cool', 'Warm'];
  const nouns = ['Fox', 'Bear', 'Hawk', 'Wolf', 'Lynx', 'Deer', 'Owl', 'Crow'];
  const adj = adjectives[Math.floor(Math.random() * adjectives.length)]!;
  const noun = nouns[Math.floor(Math.random() * nouns.length)]!;
  return `${adj}${noun}`;
}

export class CollaborationSync {
  private provider: WebrtcProvider | null = null;
  private crdtDoc: CRDTDocument | null = null;
  private state: SyncState;
  private listeners = new Set<SyncStateListener>();
  private reconnectTimer: ReturnType<typeof setTimeout> | null = null;
  private localPeerId: string;
  private localDisplayName: string;
  private localColor: string;

  constructor() {
    this.localPeerId = `peer_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`;
    this.localDisplayName = generateDisplayName();
    this.localColor = peerColor(this.localPeerId);
    this.state = {
      connectionState: 'disconnected',
      roomId: null,
      peerCount: 0,
      peers: [],
      lastConnected: null,
      reconnectAttempts: 0,
    };
  }

  get currentState(): SyncState {
    return { ...this.state };
  }

  get peerId(): string {
    return this.localPeerId;
  }

  get displayName(): string {
    return this.localDisplayName;
  }

  get color(): string {
    return this.localColor;
  }

  setDisplayName(name: string): void {
    this.localDisplayName = name;
    if (this.provider) {
      // Update awareness with new name
      this.provider.awareness.setLocalStateField('user', {
        name: this.localDisplayName,
        color: this.localColor,
      });
    }
  }

  /** Subscribe to sync state changes */
  onStateChange(listener: SyncStateListener): () => void {
    this.listeners.add(listener);
    return () => this.listeners.delete(listener);
  }

  private notify(): void {
    const state = this.currentState;
    for (const listener of this.listeners) {
      listener(state);
    }
  }

  private setState(partial: Partial<SyncState>): void {
    this.state = { ...this.state, ...partial };
    this.notify();
  }

  /** Create a new collaboration session */
  async createSession(crdtDoc: CRDTDocument): Promise<string> {
    const roomId = generateRoomId();
    await this.joinSession(crdtDoc, roomId);
    return roomId;
  }

  /** Join an existing collaboration session */
  async joinSession(crdtDoc: CRDTDocument, roomId: string): Promise<void> {
    // Leave any existing session first
    this.leaveSession();

    this.crdtDoc = crdtDoc;
    this.setState({
      connectionState: 'connecting',
      roomId,
      reconnectAttempts: 0,
    });

    try {
      this.provider = new WebrtcProvider(roomId, crdtDoc.doc, {
        signaling: ['wss://signaling.yjs.dev'],
        iceServers: ICE_SERVERS.iceServers,
        awareness: new Y.Map(),
      });

      // Set local awareness
      this.provider.awareness.setLocalStateField('user', {
        name: this.localDisplayName,
        color: this.localColor,
        peerId: this.localPeerId,
      });

      // Listen for peer changes
      this.provider.awareness.on('change', () => {
        this.updatePeers();
      });

      // Listen for connection
      this.provider.on('status', (event: { connected: boolean }) => {
        if (event.connected) {
          this.setState({
            connectionState: 'connected',
            lastConnected: Date.now(),
            reconnectAttempts: 0,
          });
        } else {
          this.setState({ connectionState: 'connecting' });
          this.scheduleReconnect();
        }
      });

      // Mark connected after a brief timeout if no status event fires
      // (y-webrtc may not fire for single-peer rooms)
      setTimeout(() => {
        if (this.state.connectionState === 'connecting') {
          this.setState({
            connectionState: 'connected',
            lastConnected: Date.now(),
          });
        }
      }, 2000);

    } catch (err) {
      this.setState({
        connectionState: 'error',
        reconnectAttempts: this.state.reconnectAttempts + 1,
      });
      this.scheduleReconnect();
    }
  }

  /** Leave the current session */
  leaveSession(): void {
    if (this.reconnectTimer) {
      clearTimeout(this.reconnectTimer);
      this.reconnectTimer = null;
    }

    if (this.provider) {
      this.provider.destroy();
      this.provider = null;
    }

    this.crdtDoc = null;
    this.setState({
      connectionState: 'disconnected',
      roomId: null,
      peerCount: 0,
      peers: [],
      reconnectAttempts: 0,
    });
  }

  /** Get the WebRTC provider (for awareness, etc.) */
  getProvider(): WebrtcProvider | null {
    return this.provider;
  }

  /** Update cursor position in awareness */
  setCursorPosition(position: { x: number; y: number; z: number } | null): void {
    if (this.provider) {
      this.provider.awareness.setLocalStateField('cursor', position);
    }
  }

  /** Update selection in awareness */
  setSelectedIds(ids: string[]): void {
    if (this.provider) {
      this.provider.awareness.setLocalStateField('selection', ids);
    }
  }

  /** Get peer count (excluding self) */
  getRemotePeerCount(): number {
    if (!this.provider) return 0;
    return this.provider.awareness.getStates().size - 1;
  }

  private updatePeers(): void {
    if (!this.provider) return;

    const peers: PeerInfo[] = [];
    this.provider.awareness.getStates().forEach((state: Map<string, unknown>, clientId: number) => {
      if (clientId === this.provider!.awareness.clientID) return;
      const user = state.get('user') as { name?: string; color?: string; peerId?: string } | undefined;
      peers.push({
        peerId: user?.peerId ?? `client_${clientId}`,
        displayName: user?.name ?? 'Unknown',
        color: user?.color ?? '#64748b',
        connected: true,
      });
    });

    this.setState({
      peers,
      peerCount: peers.length,
    });
  }

  private scheduleReconnect(): void {
    if (this.reconnectTimer) return;
    if (this.state.reconnectAttempts >= MAX_RECONNECT_ATTEMPTS) {
      this.setState({ connectionState: 'error' });
      return;
    }

    const delay = BASE_RECONNECT_DELAY_MS * Math.pow(2, this.state.reconnectAttempts);
    this.reconnectTimer = setTimeout(() => {
      this.reconnectTimer = null;
      if (this.state.connectionState !== 'disconnected' && this.crdtDoc && this.state.roomId) {
        this.setState({ reconnectAttempts: this.state.reconnectAttempts + 1 });
        this.joinSession(this.crdtDoc, this.state.roomId);
      }
    }, delay);
  }

  /** Destroy the sync instance */
  destroy(): void {
    this.leaveSession();
    this.listeners.clear();
  }
}

// Singleton instance
let syncInstance: CollaborationSync | null = null;

export function getCollaborationSync(): CollaborationSync {
  if (!syncInstance) {
    syncInstance = new CollaborationSync();
  }
  return syncInstance;
}

export function destroyCollaborationSync(): void {
  if (syncInstance) {
    syncInstance.destroy();
    syncInstance = null;
  }
}
