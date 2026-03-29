/**
 * Collaboration panel showing connection state, room info, peer list,
 * and share/join/leave actions for real-time multi-user editing.
 */

import { useState, useCallback, useEffect } from 'react';
import { useCollabStore } from '../../stores/collab-store';
import { getCollaborationSync, generateRoomId } from '../../cad/collab/webrtc-sync';

export function CollabPanel() {
  const connectionState = useCollabStore((s) => s.connectionState);
  const roomId = useCollabStore((s) => s.roomId);
  const localDisplayName = useCollabStore((s) => s.localDisplayName);
  const localColor = useCollabStore((s) => s.localColor);
  const peers = useCollabStore((s) => s.peers);
  const isHost = useCollabStore((s) => s.isHost);
  const joinSession = useCollabStore((s) => s.joinSession);
  const leaveSession = useCollabStore((s) => s.leaveSession);
  const setConnectionState = useCollabStore((s) => s.setConnectionState);

  const [joinId, setJoinId] = useState('');
  const [showJoin, setShowJoin] = useState(false);
  const [copied, setCopied] = useState(false);

  const sync = getCollaborationSync();

  // Sync collaboration state changes to the store
  useEffect(() => {
    const unsub = sync.onStateChange((state) => {
      setConnectionState(state.connectionState);
      if (state.peers.length > 0) {
        useCollabStore.getState().setPeers(
          state.peers.map((p) => ({
            peerId: p.peerId,
            displayName: p.displayName,
            color: p.color,
            cursor: null,
            selection: [],
            lastSeen: Date.now(),
          })),
        );
      }
    });
    return unsub;
  }, [setConnectionState]);

  const handleShare = useCallback(async () => {
    try {
      const { createCRDTDocument } = await import('../../cad/collab/crdt-store');
      const docId = useCollabStore.getState().roomId ?? crypto.randomUUID();
      const crdtDoc = createCRDTDocument(docId);
      const newRoomId = await sync.createSession(crdtDoc);
      joinSession(newRoomId, sync.peerId, sync.displayName, sync.color);
    } catch (err) {
      console.error('Failed to create session:', err);
      setConnectionState('error');
    }
  }, [sync, joinSession, setConnectionState]);

  const handleJoin = useCallback(async () => {
    if (!joinId.trim()) return;
    try {
      const { createCRDTDocument } = await import('../../cad/collab/crdt-store');
      const docId = crypto.randomUUID();
      const crdtDoc = createCRDTDocument(docId);
      await sync.joinSession(crdtDoc, joinId.trim());
      joinSession(joinId.trim(), sync.peerId, sync.displayName, sync.color);
      setShowJoin(false);
      setJoinId('');
    } catch (err) {
      console.error('Failed to join session:', err);
      setConnectionState('error');
    }
  }, [joinId, sync, joinSession, setConnectionState]);

  const handleLeave = useCallback(() => {
    sync.leaveSession();
    leaveSession();
  }, [sync, leaveSession]);

  const handleCopyRoom = useCallback(() => {
    if (roomId) {
      navigator.clipboard.writeText(roomId).then(() => {
        setCopied(true);
        setTimeout(() => setCopied(false), 2000);
      });
    }
  }, [roomId]);

  const handleGenerateLink = useCallback(() => {
    const id = generateRoomId();
    setJoinId(id);
    setShowJoin(true);
  }, []);

  const stateColors: Record<string, string> = {
    disconnected: '#64748b',
    connecting: '#fbbf24',
    connected: '#22c55e',
    error: '#ef4444',
  };

  return (
    <div style={styles.container}>
      <div style={styles.header}>
        <span style={styles.title}>Collaborate</span>
        <span
          style={{
            ...styles.stateDot,
            background: stateColors[connectionState] ?? '#64748b',
          }}
        />
        <span style={{ ...styles.stateLabel, color: stateColors[connectionState] }}>
          {connectionState}
        </span>
      </div>

      {connectionState === 'connected' && roomId && (
        <div style={styles.roomSection}>
          <div style={styles.roomLabel}>Room</div>
          <div style={styles.roomRow}>
            <code style={styles.roomCode}>{roomId}</code>
            <button style={styles.copyBtn} onClick={handleCopyRoom} title="Copy room ID">
              {copied ? 'Copied!' : 'Copy'}
            </button>
          </div>
        </div>
      )}

      {connectionState === 'connected' && (
        <div style={styles.peerSection}>
          <div style={styles.peerLabel}>Users ({peers.length + 1})</div>
          <div style={styles.peerItem}>
            <span style={{ ...styles.peerDot, background: localColor }} />
            <span style={styles.peerName}>{localDisplayName} (you)</span>
            {isHost && <span style={styles.hostBadge}>Host</span>}
          </div>
          {peers.map((peer) => (
            <div key={peer.peerId} style={styles.peerItem}>
              <span style={{ ...styles.peerDot, background: peer.color }} />
              <span style={styles.peerName}>{peer.displayName}</span>
            </div>
          ))}
        </div>
      )}

      <div style={styles.actions}>
        {connectionState === 'disconnected' && (
          <>
            <button style={styles.btn} onClick={handleShare}>Share Session</button>
            <button style={styles.btnSecondary} onClick={handleGenerateLink}>Join Session</button>
          </>
        )}
        {connectionState === 'connected' && (
          <button style={styles.btnDanger} onClick={handleLeave}>Leave Session</button>
        )}
        {connectionState === 'connecting' && (
          <span style={styles.connectingText}>Connecting...</span>
        )}
        {connectionState === 'error' && (
          <button style={styles.btn} onClick={handleShare}>Retry</button>
        )}
      </div>

      {showJoin && (
        <div style={styles.joinDialog}>
          <div style={styles.joinTitle}>Join Session</div>
          <input
            style={styles.joinInput}
            value={joinId}
            onChange={(e) => setJoinId(e.target.value)}
            placeholder="Enter room ID"
            onKeyDown={(e) => { if (e.key === 'Enter') handleJoin(); if (e.key === 'Escape') setShowJoin(false); }}
            autoFocus
          />
          <div style={styles.joinActions}>
            <button style={styles.btnSmall} onClick={handleJoin}>Join</button>
            <button style={styles.btnSecondarySmall} onClick={() => { setShowJoin(false); setJoinId(''); }}>Cancel</button>
          </div>
        </div>
      )}
    </div>
  );
}

const styles: Record<string, React.CSSProperties> = {
  container: {
    width: '100%',
    padding: 8,
    display: 'flex',
    flexDirection: 'column',
    gap: 8,
  },
  header: {
    display: 'flex',
    alignItems: 'center',
    gap: 6,
  },
  title: {
    fontSize: 12,
    fontWeight: 600,
    color: '#94a3b8',
  },
  stateDot: {
    width: 6,
    height: 6,
    borderRadius: '50%',
    flexShrink: 0,
  },
  stateLabel: {
    fontSize: 10,
    textTransform: 'uppercase',
    letterSpacing: '0.05em',
  },
  roomSection: {
    padding: '6px 0',
    borderTop: '1px solid #334155',
  },
  roomLabel: {
    fontSize: 10,
    color: '#64748b',
    marginBottom: 4,
  },
  roomRow: {
    display: 'flex',
    alignItems: 'center',
    gap: 4,
  },
  roomCode: {
    flex: 1,
    fontSize: 11,
    color: '#e2e8f0',
    fontFamily: 'monospace',
    background: '#0f172a',
    padding: '2px 6px',
    borderRadius: 3,
    overflow: 'hidden',
    textOverflow: 'ellipsis',
  },
  copyBtn: {
    fontSize: 10,
    color: '#3b82f6',
    background: 'transparent',
    border: '1px solid #3b82f6',
    borderRadius: 3,
    padding: '2px 8px',
    cursor: 'pointer',
  },
  peerSection: {
    display: 'flex',
    flexDirection: 'column',
    gap: 4,
  },
  peerLabel: {
    fontSize: 10,
    color: '#64748b',
    marginBottom: 2,
  },
  peerItem: {
    display: 'flex',
    alignItems: 'center',
    gap: 6,
    fontSize: 11,
    color: '#cbd5e1',
  },
  peerDot: {
    width: 8,
    height: 8,
    borderRadius: '50%',
    flexShrink: 0,
  },
  peerName: {
    flex: 1,
    overflow: 'hidden',
    textOverflow: 'ellipsis',
    whiteSpace: 'nowrap',
  },
  hostBadge: {
    fontSize: 9,
    color: '#fbbf24',
    background: 'rgba(251, 191, 36, 0.15)',
    padding: '0 4px',
    borderRadius: 3,
  },
  actions: {
    display: 'flex',
    flexDirection: 'column',
    gap: 4,
  },
  btn: {
    width: '100%',
    padding: '6px',
    borderRadius: 4,
    fontSize: 11,
    fontWeight: 600,
    color: '#f1f5f9',
    background: '#3b82f6',
    border: 'none',
    cursor: 'pointer',
  },
  btnSecondary: {
    width: '100%',
    padding: '6px',
    borderRadius: 4,
    fontSize: 11,
    color: '#94a3b8',
    background: '#334155',
    border: '1px solid #475569',
    cursor: 'pointer',
  },
  btnDanger: {
    width: '100%',
    padding: '6px',
    borderRadius: 4,
    fontSize: 11,
    fontWeight: 600,
    color: '#fca5a5',
    background: 'rgba(239, 68, 68, 0.15)',
    border: '1px solid #ef4444',
    cursor: 'pointer',
  },
  connectingText: {
    fontSize: 11,
    color: '#fbbf24',
    textAlign: 'center',
    padding: 6,
  },
  joinDialog: {
    padding: 8,
    background: '#0f172a',
    borderRadius: 4,
    border: '1px solid #334155',
  },
  joinTitle: {
    fontSize: 11,
    color: '#e2e8f0',
    marginBottom: 6,
  },
  joinInput: {
    width: '100%',
    padding: '4px 8px',
    fontSize: 11,
    color: '#f1f5f9',
    background: '#1e293b',
    border: '1px solid #334155',
    borderRadius: 3,
    outline: 'none',
    fontFamily: 'monospace',
    boxSizing: 'border-box',
  },
  joinActions: {
    display: 'flex',
    gap: 4,
    marginTop: 6,
  },
  btnSmall: {
    flex: 1,
    padding: '4px',
    borderRadius: 3,
    fontSize: 10,
    color: '#f1f5f9',
    background: '#3b82f6',
    border: 'none',
    cursor: 'pointer',
  },
  btnSecondarySmall: {
    flex: 1,
    padding: '4px',
    borderRadius: 3,
    fontSize: 10,
    color: '#94a3b8',
    background: '#334155',
    border: '1px solid #475569',
    cursor: 'pointer',
  },
};
