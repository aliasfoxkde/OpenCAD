import { useState, useRef, useEffect, useCallback } from 'react';
import { useCADStore } from '../../stores/cad-store';
import { getFeatureDefinition } from '../../cad/features/feature-registry';

export function FeatureTree() {
  const features = useCADStore((s) => s.features);
  const selectedIds = useCADStore((s) => s.selectedIds);
  const select = useCADStore((s) => s.select);
  const updateFeature = useCADStore((s) => s.updateFeature);
  const removeFeature = useCADStore((s) => s.removeFeature);
  const reorderFeature = useCADStore((s) => s.reorderFeature);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editName, setEditName] = useState('');
  const [dragOverIndex, setDragOverIndex] = useState<number | null>(null);
  const editInputRef = useRef<HTMLInputElement>(null);

  const startEditing = useCallback((featureId: string, currentName: string) => {
    setEditingId(featureId);
    setEditName(currentName);
  }, []);

  const commitRename = useCallback(() => {
    if (editingId && editName.trim()) {
      updateFeature(editingId, { name: editName.trim() });
    }
    setEditingId(null);
  }, [editingId, editName, updateFeature]);

  const cancelRename = useCallback(() => {
    setEditingId(null);
  }, []);

  // Focus and select input when editing starts
  useEffect(() => {
    if (editingId && editInputRef.current) {
      editInputRef.current.focus();
      editInputRef.current.select();
    }
  }, [editingId]);

  const handleDragStart = useCallback((e: React.DragEvent, featureId: string) => {
    e.dataTransfer.effectAllowed = 'move';
    e.dataTransfer.setData('text/plain', featureId);
  }, []);

  const handleDragOver = useCallback((e: React.DragEvent, index: number) => {
    e.preventDefault();
    e.dataTransfer.dropEffect = 'move';
    setDragOverIndex(index);
  }, []);

  const handleDragLeave = useCallback(() => {
    setDragOverIndex(null);
  }, []);

  const handleDrop = useCallback((e: React.DragEvent, targetIndex: number) => {
    e.preventDefault();
    setDragOverIndex(null);
    const draggedId = e.dataTransfer.getData('text/plain');
    if (!draggedId) return;
    reorderFeature(draggedId, targetIndex);
  }, [reorderFeature]);

  const handleDragEnd = useCallback(() => {
    setDragOverIndex(null);
  }, []);

  return (
    <div style={styles.panel}>
      <div style={styles.header}>
        <span style={styles.title}>Feature Tree</span>
        <span style={styles.count}>{features.length}</span>
      </div>
      <div style={styles.list}>
        {features.length === 0 && (
          <div style={styles.empty}>
            No features yet. Use the toolbar to create shapes.
          </div>
        )}
        {features.map((feature, index) => (
          <div
            key={feature.id}
            draggable
            style={{
              ...styles.item,
              ...(selectedIds.includes(feature.id) ? styles.selected : {}),
              ...(dragOverIndex === index ? styles.dragOver : {}),
            }}
            onClick={() => select([feature.id])}
            onDoubleClick={() => startEditing(feature.id, feature.name)}
            onDragStart={(e) => handleDragStart(e, feature.id)}
            onDragOver={(e) => handleDragOver(e, index)}
            onDragLeave={handleDragLeave}
            onDrop={(e) => handleDrop(e, index)}
            onDragEnd={handleDragEnd}
          >
            <span style={styles.dragHandle} title="Drag to reorder">&#x2261;</span>
            <span style={styles.index}>{index + 1}</span>
            <span style={styles.icon}>{getFeatureIcon(feature.type)}</span>
            {editingId === feature.id ? (
              <input
                ref={editInputRef}
                style={styles.renameInput}
                value={editName}
                onChange={(e) => setEditName(e.target.value)}
                onBlur={commitRename}
                onKeyDown={(e) => {
                  if (e.key === 'Enter') commitRename();
                  if (e.key === 'Escape') cancelRename();
                }}
                onClick={(e) => e.stopPropagation()}
              />
            ) : (
              <span style={styles.name}>{feature.name}</span>
            )}
            <button
              style={styles.toggleBtn}
              onClick={(e) => {
                e.stopPropagation();
                updateFeature(feature.id, { suppressed: !feature.suppressed });
              }}
              title={feature.suppressed ? 'Unsuppress' : 'Suppress'}
            >
              {feature.suppressed ? 'off' : 'on'}
            </button>
            <button
              style={styles.deleteBtn}
              onClick={(e) => {
                e.stopPropagation();
                removeFeature(feature.id);
              }}
              title="Delete feature"
            >
              x
            </button>
          </div>
        ))}
      </div>
    </div>
  );
}

function getFeatureIcon(type: string): string {
  const def = getFeatureDefinition(type);
  return def?.icon ?? '[+]';
}

const styles: Record<string, React.CSSProperties> = {
  panel: {
    width: '100%',
    height: '100%',
    display: 'flex',
    flexDirection: 'column',
    background: '#1e293b',
    borderRight: '1px solid #334155',
  },
  header: {
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: '8px 12px',
    borderBottom: '1px solid #334155',
  },
  title: {
    fontSize: 12,
    fontWeight: 600,
    color: '#94a3b8',
    textTransform: 'uppercase',
    letterSpacing: '0.05em',
  },
  count: {
    fontSize: 11,
    color: '#64748b',
    background: '#334155',
    padding: '1px 6px',
    borderRadius: 10,
  },
  list: {
    flex: 1,
    overflow: 'auto',
    padding: 4,
  },
  empty: {
    padding: '16px 12px',
    color: '#64748b',
    fontSize: 12,
    textAlign: 'center',
  },
  item: {
    display: 'flex',
    alignItems: 'center',
    gap: 6,
    padding: '4px 8px',
    borderRadius: 4,
    cursor: 'pointer',
    fontSize: 12,
    color: '#94a3b8',
    userSelect: 'none',
  },
  selected: {
    background: '#334155',
    color: '#f1f5f9',
  },
  dragOver: {
    borderTop: '2px solid #3b82f6',
  },
  dragHandle: {
    fontSize: 12,
    color: '#475569',
    cursor: 'grab',
    width: 10,
    textAlign: 'center',
    flexShrink: 0,
  },
  index: {
    width: 16,
    textAlign: 'right',
    color: '#64748b',
    fontSize: 10,
  },
  icon: {
    fontFamily: 'monospace',
    fontSize: 10,
    color: '#3b82f6',
  },
  name: {
    flex: 1,
    overflow: 'hidden',
    textOverflow: 'ellipsis',
    whiteSpace: 'nowrap',
  },
  renameInput: {
    flex: 1,
    background: '#0f172a',
    border: '1px solid #3b82f6',
    borderRadius: 2,
    padding: '1px 4px',
    fontSize: 12,
    color: '#f1f5f9',
    outline: 'none',
    minWidth: 0,
  },
  toggleBtn: {
    fontSize: 9,
    color: '#64748b',
    padding: '0 4px',
  },
  deleteBtn: {
    fontSize: 9,
    color: '#ef4444',
    padding: '0 4px',
  },
};
