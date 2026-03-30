import { useState, useEffect, useCallback } from 'react';
import {
  listDocuments,
  createNewDocument,
  saveDocument,
  deleteDocument,
  loadDocument,
  type DocumentMeta,
} from '../../cad/io/db';
import { useCADStore } from '../../stores/cad-store';

interface DocumentDashboardProps {
  onOpen?: () => void;
}

export function DocumentDashboard({ onOpen }: DocumentDashboardProps) {
  const [docs, setDocs] = useState<DocumentMeta[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [newName, setNewName] = useState('');
  const [showNewForm, setShowNewForm] = useState(false);
  const [confirmDeleteId, setConfirmDeleteId] = useState<string | null>(null);
  const setDocument = useCADStore((s) => s.setDocument);
  const loadFeatures = useCADStore((s) => s.loadFeatures);

  const refresh = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);
      const list = await listDocuments();
      setDocs(list);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load documents');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    refresh();
  }, [refresh]);

  const handleCreate = useCallback(async () => {
    const name = newName.trim() || 'Untitled';
    const doc = createNewDocument(name);
    await saveDocument(doc);
    setDocument(doc.id, doc.name);
    loadFeatures([]);
    onOpen?.();
  }, [newName, setDocument, loadFeatures, onOpen]);

  const handleOpen = useCallback(
    async (id: string) => {
      const doc = await loadDocument(id);
      if (doc) {
        setDocument(doc.id, doc.name);
        loadFeatures(doc.features);
        onOpen?.();
      }
    },
    [setDocument, loadFeatures, onOpen],
  );

  const handleDelete = useCallback(
    async (id: string) => {
      await deleteDocument(id);
      setConfirmDeleteId(null);
      refresh();
    },
    [refresh],
  );

  const formatDate = (ts: number) => {
    const d = new Date(ts);
    return d.toLocaleDateString() + ' ' + d.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
  };

  return (
    <div style={styles.root}>
      <div style={styles.header}>
        <h1 style={styles.title}>OpenCAD</h1>
        <p style={styles.subtitle}>Parametric 3D CAD in your browser</p>
      </div>

      <div style={styles.actions}>
        <button style={styles.newBtn} onClick={() => setShowNewForm(true)}>
          + New Document
        </button>
      </div>

      {showNewForm && (
        <div style={styles.newForm}>
          <input
            style={styles.newInput}
            placeholder="Document name..."
            value={newName}
            onChange={(e) => setNewName(e.target.value)}
            onKeyDown={(e) => e.key === 'Enter' && handleCreate()}
            autoFocus
          />
          <button style={styles.createBtn} onClick={handleCreate}>
            Create
          </button>
          <button
            style={styles.cancelBtn}
            onClick={() => {
              setShowNewForm(false);
              setNewName('');
            }}
          >
            Cancel
          </button>
        </div>
      )}

      {error && <div style={styles.error}>{error}</div>}

      {loading ? (
        <div style={styles.empty}>Loading...</div>
      ) : docs.length === 0 ? (
        <div style={styles.empty}>No documents yet. Create one to get started.</div>
      ) : (
        <div style={styles.list}>
          {docs.map((doc) => (
            <div key={doc.id} style={styles.docItem}>
              <div style={styles.docInfo} onClick={() => handleOpen(doc.id)}>
                <div style={styles.docName}>{doc.name}</div>
                <div style={styles.docMeta}>
                  {doc.featureCount} feature{doc.featureCount !== 1 ? 's' : ''} &middot; {formatDate(doc.modified)}
                </div>
              </div>
              {confirmDeleteId === doc.id ? (
                <div style={styles.confirmRow}>
                  <span style={styles.confirmText}>Delete?</span>
                  <button style={styles.confirmYes} onClick={() => handleDelete(doc.id)}>
                    Yes
                  </button>
                  <button style={styles.confirmNo} onClick={() => setConfirmDeleteId(null)}>
                    No
                  </button>
                </div>
              ) : (
                <button style={styles.deleteBtn} onClick={() => setConfirmDeleteId(doc.id)} title="Delete document">
                  &times;
                </button>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

const styles: Record<string, React.CSSProperties> = {
  root: {
    display: 'flex',
    flexDirection: 'column',
    width: '100%',
    height: '100vh',
    background: '#0f172a',
    color: '#e2e8f0',
    fontFamily: 'system-ui, sans-serif',
    overflow: 'auto',
  },
  header: {
    textAlign: 'center' as const,
    padding: '60px 20px 20px',
  },
  title: {
    fontSize: 32,
    fontWeight: 700,
    color: '#3b82f6',
    margin: 0,
    letterSpacing: '-0.02em',
  },
  subtitle: {
    color: '#64748b',
    fontSize: 14,
    marginTop: 4,
  },
  actions: {
    display: 'flex',
    justifyContent: 'center',
    padding: '20px',
  },
  newBtn: {
    background: '#3b82f6',
    color: '#fff',
    border: 'none',
    borderRadius: 6,
    padding: '10px 24px',
    fontSize: 14,
    fontWeight: 600,
    cursor: 'pointer',
  },
  newForm: {
    display: 'flex',
    justifyContent: 'center',
    gap: 8,
    padding: '0 20px 20px',
  },
  newInput: {
    background: '#1e293b',
    border: '1px solid #334155',
    borderRadius: 4,
    padding: '8px 12px',
    color: '#e2e8f0',
    fontSize: 14,
    width: 200,
    outline: 'none',
  },
  createBtn: {
    background: '#22c55e',
    color: '#fff',
    border: 'none',
    borderRadius: 4,
    padding: '8px 16px',
    cursor: 'pointer',
    fontSize: 13,
  },
  cancelBtn: {
    background: 'transparent',
    color: '#64748b',
    border: '1px solid #334155',
    borderRadius: 4,
    padding: '8px 12px',
    cursor: 'pointer',
    fontSize: 13,
  },
  error: {
    color: '#ef4444',
    textAlign: 'center' as const,
    padding: '8px 20px',
    fontSize: 13,
  },
  empty: {
    color: '#64748b',
    textAlign: 'center' as const,
    padding: '40px 20px',
    fontSize: 14,
  },
  list: {
    maxWidth: 600,
    margin: '0 auto',
    width: '100%',
    padding: '0 20px',
  },
  docItem: {
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: '12px 16px',
    background: '#1e293b',
    borderRadius: 6,
    marginBottom: 8,
  },
  docInfo: {
    flex: 1,
    cursor: 'pointer',
  },
  docName: {
    fontSize: 14,
    fontWeight: 600,
    color: '#f1f5f9',
  },
  docMeta: {
    fontSize: 12,
    color: '#64748b',
    marginTop: 2,
  },
  deleteBtn: {
    background: 'transparent',
    border: 'none',
    color: '#64748b',
    fontSize: 18,
    cursor: 'pointer',
    padding: '4px 8px',
    borderRadius: 4,
  },
  confirmRow: {
    display: 'flex',
    alignItems: 'center',
    gap: 6,
  },
  confirmText: {
    fontSize: 12,
    color: '#94a3b8',
  },
  confirmYes: {
    background: '#ef4444',
    color: '#fff',
    border: 'none',
    borderRadius: 3,
    padding: '2px 10px',
    fontSize: 12,
    cursor: 'pointer',
  },
  confirmNo: {
    background: '#334155',
    color: '#cbd5e1',
    border: 'none',
    borderRadius: 3,
    padding: '2px 10px',
    fontSize: 12,
    cursor: 'pointer',
  },
};
