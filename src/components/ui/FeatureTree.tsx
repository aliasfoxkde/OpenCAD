import { useState, useRef, useEffect, useCallback, useMemo } from 'react';
import { useCADStore } from '../../stores/cad-store';
import { useFeatureErrors } from '../../hooks/useFeatureErrors';

export function FeatureTree() {
  const features = useCADStore((s) => s.features);
  const selectedIds = useCADStore((s) => s.selectedIds);
  const select = useCADStore((s) => s.select);
  const updateFeature = useCADStore((s) => s.updateFeature);
  const removeFeature = useCADStore((s) => s.removeFeature);
  const reorderFeature = useCADStore((s) => s.reorderFeature);
  const duplicateFeature = useCADStore((s) => s.duplicateFeature);
  const featureErrors = useFeatureErrors(features);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editName, setEditName] = useState('');
  const [dragOverIndex, setDragOverIndex] = useState<number | null>(null);
  const [contextMenu, setContextMenu] = useState<{
    x: number; y: number; featureId: string;
  } | null>(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [lastClickedIndex, setLastClickedIndex] = useState<number | null>(null);
  const editInputRef = useRef<HTMLInputElement>(null);

  const filteredFeatures = useMemo(() => {
    if (!searchQuery.trim()) return features;
    const q = searchQuery.toLowerCase().trim();
    return features.filter((f) =>
      f.name.toLowerCase().includes(q) || f.type.toLowerCase().includes(q),
    );
  }, [features, searchQuery]);

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

  // Close context menu on click outside
  useEffect(() => {
    if (!contextMenu) return;
    const handler = () => setContextMenu(null);
    document.addEventListener('click', handler);
    return () => document.removeEventListener('click', handler);
  }, [contextMenu]);

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

  const handleFeatureClick = useCallback((featureId: string, index: number, e: React.MouseEvent) => {
    if (e.ctrlKey || e.metaKey) {
      // Toggle selection (multi-select)
      const isSelected = selectedIds.includes(featureId);
      if (isSelected) {
        select(selectedIds.filter((id) => id !== featureId));
      } else {
        select([...selectedIds, featureId]);
      }
      setLastClickedIndex(index);
    } else if (e.shiftKey && lastClickedIndex !== null) {
      // Range select from last clicked to current
      const start = Math.min(lastClickedIndex, index);
      const end = Math.max(lastClickedIndex, index);
      const rangeIds = filteredFeatures.slice(start, end + 1).map((f) => f.id);
      select([...selectedIds.filter((id) => !rangeIds.includes(id)), ...rangeIds]);
      setLastClickedIndex(index);
    } else {
      // Normal click — single select
      select([featureId]);
      setLastClickedIndex(index);
    }
  }, [selectedIds, select, lastClickedIndex, filteredFeatures]);

  const handleContextMenu = useCallback((e: React.MouseEvent, featureId: string) => {
    e.preventDefault();
    e.stopPropagation();
    setContextMenu({ x: e.clientX, y: e.clientY, featureId });
  }, []);

  const contextFeature = contextMenu ? features.find((f) => f.id === contextMenu.featureId) : null;

  return (
    <div style={styles.panel}>
      <div style={styles.header}>
        <span style={styles.title}>Feature Tree</span>
        <div style={styles.headerRight}>
          <span style={styles.count}>{filteredFeatures.length}</span>
          {selectedIds.length > 1 && (
            <span style={styles.selectedCount}>{selectedIds.length} selected</span>
          )}
        </div>
      </div>
      <div style={styles.searchWrap}>
        <input
          style={styles.searchInput}
          placeholder="Search features..."
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
        />
      </div>
      <div style={styles.list}>
        {filteredFeatures.length === 0 && (
          <div style={styles.empty}>
            {features.length === 0
              ? 'No features yet. Use the toolbar to create shapes.'
              : `No features match "${searchQuery}"`}
          </div>
        )}
        {filteredFeatures.map((feature, index) => (
          <div
            key={feature.id}
            draggable
            style={{
              ...styles.item,
              ...(selectedIds.includes(feature.id) ? styles.selected : {}),
              ...(dragOverIndex === index ? styles.dragOver : {}),
              ...(feature.suppressed ? styles.suppressedItem : {}),
            }}
            onClick={(e) => handleFeatureClick(feature.id, index, e)}
            onDoubleClick={() => startEditing(feature.id, feature.name)}
            onDragStart={(e) => handleDragStart(e, feature.id)}
            onDragOver={(e) => handleDragOver(e, index)}
            onDragLeave={handleDragLeave}
            onDrop={(e) => handleDrop(e, index)}
            onDragEnd={handleDragEnd}
            onContextMenu={(e) => handleContextMenu(e, feature.id)}
          >
            <span style={styles.dragHandle} title="Drag to reorder">&#x2261;</span>
            <span
              style={{
                ...styles.icon,
                ...(featureErrors.has(feature.id) ? { color: '#ef4444' } : {}),
              }}
              title={featureErrors.get(feature.id) ?? undefined}
            >
              {featureErrors.has(feature.id) ? '\u26A0' : '\u2713'}
            </span>
            {getDepBadge(feature, features) && (
              <span style={styles.depBadge}>{getDepBadge(feature, features)}</span>
            )}
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
              <span
                style={{
                  ...styles.name,
                  ...(featureErrors.has(feature.id) ? { color: '#fca5a5' } : {}),
                }}
                title={featureErrors.get(feature.id) ?? undefined}
              >
                {feature.name}
              </span>
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
      {/* Context Menu */}
      {contextMenu && contextFeature && (
        <div
          style={{
            ...styles.contextMenu,
            left: contextMenu.x,
            top: contextMenu.y,
          }}
          onClick={(e) => e.stopPropagation()}
        >
          <button
            style={styles.ctxItem}
            onClick={() => {
              startEditing(contextFeature.id, contextFeature.name);
              setContextMenu(null);
            }}
          >
            Rename
          </button>
          <button
            style={styles.ctxItem}
            onClick={() => {
              duplicateFeature(contextFeature.id);
              setContextMenu(null);
            }}
          >
            Duplicate
          </button>
          <div style={styles.ctxSeparator} />
          <button
            style={styles.ctxItem}
            onClick={() => {
              updateFeature(contextFeature.id, { suppressed: !contextFeature.suppressed });
              setContextMenu(null);
            }}
          >
            {contextFeature.suppressed ? 'Unsuppress' : 'Suppress'}
          </button>
          <button
            style={styles.ctxDangerItem}
            onClick={() => {
              removeFeature(contextFeature.id);
              setContextMenu(null);
            }}
          >
            Delete
          </button>
        </div>
      )}
    </div>
  );
}

function getDepBadge(
  feature: { type: string; parameters: Record<string, unknown> },
  allFeatures: { id: string; name: string }[],
): string {
  // Pattern features
  if (feature.type === 'pattern_linear' || feature.type === 'pattern_circular' || feature.type === 'mirror') {
    const refId = feature.parameters.featureRef as string;
    if (!refId) return '';
    const ref = allFeatures.find((f) => f.id === refId);
    return ref ? ref.name : '';
  }

  // Boolean union/intersect
  if (feature.type === 'boolean_union' || feature.type === 'boolean_intersect') {
    const bodyRefs = (feature.parameters.bodyRefs as string)?.split(',').map((s) => s.trim()).filter(Boolean) ?? [];
    if (bodyRefs.length === 0) return '';
    const names = bodyRefs.map((id) => {
      const ref = allFeatures.find((f) => f.id === id);
      return ref?.name ?? id;
    });
    return names.join(' + ');
  }

  // Boolean subtract
  if (feature.type === 'boolean_subtract') {
    const targetId = feature.parameters.targetRef as string;
    const toolId = feature.parameters.toolRef as string;
    const target = allFeatures.find((f) => f.id === targetId);
    const tool = allFeatures.find((f) => f.id === toolId);
    const tName = target?.name ?? targetId ?? '?';
    const uName = tool?.name ?? toolId ?? '?';
    return `${tName} - ${uName}`;
  }

  // Shell
  if (feature.type === 'shell') {
    const targetId = feature.parameters.targetRef as string;
    const target = allFeatures.find((f) => f.id === targetId);
    return target ? target.name : '';
  }

  return '';
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
  headerRight: {
    display: 'flex',
    alignItems: 'center',
    gap: 6,
  },
  selectedCount: {
    fontSize: 10,
    color: '#3b82f6',
    background: 'rgba(59, 130, 246, 0.12)',
    padding: '1px 6px',
    borderRadius: 10,
  },
  searchWrap: {
    padding: '0 4px',
    borderBottom: '1px solid #334155',
  },
  searchInput: {
    width: '100%',
    background: '#0f172a',
    border: '1px solid #334155',
    borderRadius: 4,
    padding: '5px 8px',
    fontSize: 12,
    color: '#e2e8f0',
    outline: 'none',
    boxSizing: 'border-box',
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
  suppressedItem: {
    opacity: 0.45,
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
  icon: {
    fontFamily: 'monospace',
    fontSize: 10,
    color: '#3b82f6',
  },
  depBadge: {
    fontSize: 9,
    color: '#f59e0b',
    background: 'rgba(245, 158, 11, 0.12)',
    padding: '0 4px',
    borderRadius: 3,
    maxWidth: 80,
    overflow: 'hidden',
    textOverflow: 'ellipsis',
    whiteSpace: 'nowrap',
    flexShrink: 0,
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
  contextMenu: {
    position: 'fixed',
    zIndex: 9999,
    background: '#1e293b',
    border: '1px solid #475569',
    borderRadius: 4,
    padding: 4,
    minWidth: 120,
    boxShadow: '0 4px 12px rgba(0,0,0,0.4)',
  },
  ctxItem: {
    display: 'block',
    width: '100%',
    padding: '6px 12px',
    border: 'none',
    borderRadius: 3,
    background: 'transparent',
    color: '#e2e8f0',
    fontSize: 12,
    textAlign: 'left',
    cursor: 'pointer',
  },
  ctxDangerItem: {
    display: 'block',
    width: '100%',
    padding: '6px 12px',
    border: 'none',
    borderRadius: 3,
    background: 'transparent',
    color: '#ef4444',
    fontSize: 12,
    textAlign: 'left',
    cursor: 'pointer',
  },
  ctxSeparator: {
    height: 1,
    background: '#475569',
    margin: '2px 0',
  },
};
