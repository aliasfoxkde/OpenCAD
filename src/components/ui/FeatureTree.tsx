import { useState, useRef, useEffect, useCallback, useMemo } from 'react';
import { useCADStore } from '../../stores/cad-store';
import { useFeatureErrors } from '../../hooks/useFeatureErrors';
import { confirm } from './ConfirmDialog';
import type { FeatureNode } from '../../types/cad';

export function FeatureTree() {
  const features = useCADStore((s) => s.features);
  const selectedIds = useCADStore((s) => s.selectedIds);
  const select = useCADStore((s) => s.select);
  const updateFeature = useCADStore((s) => s.updateFeature);
  const removeFeature = useCADStore((s) => s.removeFeature);
  const reorderFeature = useCADStore((s) => s.reorderFeature);
  const duplicateFeature = useCADStore((s) => s.duplicateFeature);
  const moveFeatureToAssembly = useCADStore((s) => s.moveFeatureToAssembly);
  const featureErrors = useFeatureErrors(features);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editName, setEditName] = useState('');
  const [dragOverId, setDragOverId] = useState<string | null>(null);
  const [dragOverIsAssembly, setDragOverIsAssembly] = useState(false);
  const [contextMenu, setContextMenu] = useState<{
    x: number;
    y: number;
    featureId: string;
  } | null>(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [expandedIds, setExpandedIds] = useState<Set<string>>(new Set());
  const editInputRef = useRef<HTMLInputElement>(null);

  // Auto-expand all assemblies when features change
  useEffect(() => {
    const asmIds = new Set(features.filter((f) => f.type === 'assembly').map((f) => f.id));
    setExpandedIds(asmIds);
  }, [features]);

  // For search: collect matching feature IDs + ancestor assembly IDs
  const { visibleIds, autoExpandIds } = useMemo(() => {
    if (!searchQuery.trim()) return { visibleIds: null, autoExpandIds: new Set<string>() };
    const q = searchQuery.toLowerCase().trim();
    const matchIds = new Set<string>();
    const ancestorIds = new Set<string>();
    for (const f of features) {
      if (f.name.toLowerCase().includes(q) || f.type.toLowerCase().includes(q)) {
        matchIds.add(f.id);
        let pid = f.parentId;
        while (pid) {
          ancestorIds.add(pid);
          const parent = features.find((p) => p.id === pid);
          pid = parent?.parentId;
        }
      }
    }
    return { visibleIds: new Set([...matchIds, ...ancestorIds]), autoExpandIds: ancestorIds };
  }, [features, searchQuery]);

  // Auto-expand assemblies when search matches their descendants
  useEffect(() => {
    if (autoExpandIds.size > 0) {
      setExpandedIds((prev) => {
        const next = new Set(prev);
        for (const id of autoExpandIds) next.add(id);
        return next;
      });
    }
  }, [autoExpandIds]);

  const toggleExpand = useCallback((id: string) => {
    setExpandedIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  }, []);

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

  const handleDragOver = useCallback(
    (e: React.DragEvent, featureId: string) => {
      e.preventDefault();
      const feature = features.find((f) => f.id === featureId);
      e.dataTransfer.dropEffect = 'move';
      setDragOverId(featureId);
      setDragOverIsAssembly(feature?.type === 'assembly');
    },
    [features],
  );

  const handleDragLeave = useCallback(() => {
    setDragOverId(null);
    setDragOverIsAssembly(false);
  }, []);

  const handleDrop = useCallback(
    (e: React.DragEvent, targetId: string) => {
      e.preventDefault();
      e.stopPropagation();
      setDragOverId(null);
      setDragOverIsAssembly(false);
      const draggedId = e.dataTransfer.getData('text/plain');
      if (!draggedId || draggedId === targetId) return;

      const target = features.find((f) => f.id === targetId);
      if (!target) return;

      // Dropping onto an assembly → move feature into assembly
      if (target.type === 'assembly') {
        moveFeatureToAssembly(draggedId, targetId);
        return;
      }

      // Dropping onto a non-assembly → reorder (keep same parentId as target)
      const targetIndex = features.findIndex((f) => f.id === targetId);
      if (targetIndex !== -1) {
        reorderFeature(draggedId, targetIndex);
      }
    },
    [features, moveFeatureToAssembly, reorderFeature],
  );

  const handleDragEnd = useCallback(() => {
    setDragOverId(null);
    setDragOverIsAssembly(false);
  }, []);

  const handleFeatureClick = useCallback(
    (featureId: string, e: React.MouseEvent) => {
      if (e.ctrlKey || e.metaKey) {
        const isSelected = selectedIds.includes(featureId);
        if (isSelected) {
          select(selectedIds.filter((id) => id !== featureId));
        } else {
          select([...selectedIds, featureId]);
        }
      } else {
        select([featureId]);
      }
    },
    [selectedIds, select],
  );

  const handleContextMenu = useCallback((e: React.MouseEvent, featureId: string) => {
    e.preventDefault();
    e.stopPropagation();
    setContextMenu({ x: e.clientX, y: e.clientY, featureId });
  }, []);

  const contextFeature = contextMenu ? features.find((f) => f.id === contextMenu.featureId) : null;

  const visibleFeatureCount = visibleIds ? visibleIds.size : features.length;

  return (
    <div style={styles.panel}>
      <div style={styles.header}>
        <span style={styles.title}>Feature Tree</span>
        <div style={styles.headerRight}>
          <span style={styles.count}>{visibleFeatureCount}</span>
          {selectedIds.length > 1 && <span style={styles.selectedCount}>{selectedIds.length} selected</span>}
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
        {features.length === 0 && <div style={styles.empty}>No features yet. Use the toolbar to create shapes.</div>}
        {visibleIds && visibleFeatureCount === 0 && (
          <div style={styles.empty}>No features match &quot;{searchQuery}&quot;</div>
        )}
        {renderTreeItems(features, null, 0, {
          visibleIds,
          expandedIds,
          toggleExpand,
          selectedIds,
          editingId,
          editName,
          dragOverId,
          dragOverIsAssembly,
          featureErrors,
          onFeatureClick: handleFeatureClick,
          onDoubleClick: startEditing,
          onDragStart: handleDragStart,
          onDragOver: handleDragOver,
          onDragLeave: handleDragLeave,
          onDrop: handleDrop,
          onDragEnd: handleDragEnd,
          onContextMenu: handleContextMenu,
          onToggleSuppress: (id) => updateFeature(id, { suppressed: !features.find((f) => f.id === id)!.suppressed }),
          onDelete: async (id: string) => {
            const feature = features.find((f) => f.id === id);
            const ok = await confirm({
              title: 'Delete Feature?',
              message: `Delete "${feature?.name ?? 'this feature'}"? This cannot be undone.`,
              confirmLabel: 'Delete',
              destructive: true,
            });
            if (ok) removeFeature(id);
          },
          setEditName,
          commitRename,
          cancelRename,
          editInputRef,
        })}
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
          {contextFeature.parentId && (
            <button
              style={styles.ctxItem}
              onClick={() => {
                moveFeatureToAssembly(contextFeature.id, null);
                setContextMenu(null);
              }}
            >
              Move to Root
            </button>
          )}
          <div style={styles.ctxSeparator} />
          <button
            style={styles.ctxDangerItem}
            onClick={async () => {
              setContextMenu(null);
              const ok = await confirm({
                title: 'Delete Feature?',
                message: `Delete "${contextFeature.name}"? This cannot be undone.`,
                confirmLabel: 'Delete',
                destructive: true,
              });
              if (ok) removeFeature(contextFeature.id);
            }}
          >
            Delete
          </button>
        </div>
      )}
    </div>
  );
}

interface TreeRenderContext {
  visibleIds: Set<string> | null;
  expandedIds: Set<string>;
  toggleExpand: (id: string) => void;
  selectedIds: string[];
  editingId: string | null;
  editName: string;
  dragOverId: string | null;
  dragOverIsAssembly: boolean;
  featureErrors: Map<string, string>;
  onFeatureClick: (featureId: string, e: React.MouseEvent) => void;
  onDoubleClick: (featureId: string, name: string) => void;
  onDragStart: (e: React.DragEvent, featureId: string) => void;
  onDragOver: (e: React.DragEvent, featureId: string) => void;
  onDragLeave: () => void;
  onDrop: (e: React.DragEvent, targetId: string) => void;
  onDragEnd: () => void;
  onContextMenu: (e: React.MouseEvent, featureId: string) => void;
  onToggleSuppress: (id: string) => void;
  onDelete: (id: string) => void;
  setEditName: (name: string) => void;
  commitRename: () => void;
  cancelRename: () => void;
  editInputRef: React.RefObject<HTMLInputElement | null>;
}

function renderTreeItems(
  features: FeatureNode[],
  parentId: string | null,
  depth: number,
  ctx: TreeRenderContext,
): React.ReactNode {
  const children = parentId ? features.filter((f) => f.parentId === parentId) : features.filter((f) => !f.parentId);

  return children.map((feature) => {
    if (ctx.visibleIds && !ctx.visibleIds.has(feature.id)) return null;

    const isAssembly = feature.type === 'assembly';
    const isExpanded = ctx.expandedIds.has(feature.id);
    const indent = depth * 16;

    return (
      <div key={feature.id}>
        <div
          draggable
          style={{
            ...styles.item,
            ...(ctx.selectedIds.includes(feature.id) ? styles.selected : {}),
            ...(ctx.dragOverId === feature.id
              ? ctx.dragOverIsAssembly
                ? styles.dragOverAssembly
                : styles.dragOver
              : {}),
            ...(feature.suppressed ? styles.suppressedItem : {}),
            paddingLeft: 8 + indent,
          }}
          onClick={(e) => {
            if (isAssembly) {
              // Clicking an assembly toggles expand, but still selects
              ctx.onFeatureClick(feature.id, e);
              ctx.toggleExpand(feature.id);
            } else {
              ctx.onFeatureClick(feature.id, e);
            }
          }}
          onDoubleClick={() => ctx.onDoubleClick(feature.id, feature.name)}
          onDragStart={(e) => ctx.onDragStart(e, feature.id)}
          onDragOver={(e) => ctx.onDragOver(e, feature.id)}
          onDragLeave={ctx.onDragLeave}
          onDrop={(e) => ctx.onDrop(e, feature.id)}
          onDragEnd={ctx.onDragEnd}
          onContextMenu={(e) => ctx.onContextMenu(e, feature.id)}
        >
          <span style={styles.dragHandle} title="Drag to reorder or drop on assembly">
            &#x2261;
          </span>
          {isAssembly ? (
            <span
              style={styles.expandToggle}
              onClick={(e) => {
                e.stopPropagation();
                ctx.toggleExpand(feature.id);
              }}
            >
              {isExpanded ? '\u25BC' : '\u25B6'}
            </span>
          ) : (
            <span style={{ width: 14, flexShrink: 0 }} />
          )}
          <span
            style={{
              ...styles.icon,
              ...(ctx.featureErrors.has(feature.id) ? { color: '#ef4444' } : {}),
            }}
            title={ctx.featureErrors.get(feature.id) ?? undefined}
          >
            {ctx.featureErrors.has(feature.id) ? '\u26A0' : '\u2713'}
          </span>
          {getDepBadge(feature, features) && <span style={styles.depBadge}>{getDepBadge(feature, features)}</span>}
          {ctx.editingId === feature.id ? (
            <input
              ref={ctx.editInputRef}
              style={styles.renameInput}
              value={ctx.editName}
              onChange={(e) => ctx.setEditName(e.target.value)}
              onBlur={ctx.commitRename}
              onKeyDown={(e) => {
                if (e.key === 'Enter') ctx.commitRename();
                if (e.key === 'Escape') ctx.cancelRename();
              }}
              onClick={(e) => e.stopPropagation()}
            />
          ) : (
            <span
              style={{
                ...styles.name,
                ...(ctx.featureErrors.has(feature.id) ? { color: '#fca5a5' } : {}),
                ...(isAssembly ? { fontWeight: 600 } : {}),
              }}
              title={ctx.featureErrors.get(feature.id) ?? undefined}
            >
              {feature.name}
            </span>
          )}
          <button
            style={styles.toggleBtn}
            onClick={(e) => {
              e.stopPropagation();
              ctx.onToggleSuppress(feature.id);
            }}
            title={feature.suppressed ? 'Unsuppress' : 'Suppress'}
          >
            {feature.suppressed ? 'off' : 'on'}
          </button>
          <button
            style={styles.deleteBtn}
            onClick={(e) => {
              e.stopPropagation();
              ctx.onDelete(feature.id);
            }}
            title="Delete feature"
          >
            x
          </button>
        </div>
        {isAssembly && isExpanded && renderTreeItems(features, feature.id, depth + 1, ctx)}
      </div>
    );
  });
}

function getDepBadge(
  feature: { id: string; type: string; parameters: Record<string, unknown> },
  allFeatures: { id: string; name: string; parentId?: string; type?: string }[],
): string {
  // Assembly — show child count
  if (feature.type === 'assembly') {
    const count = allFeatures.filter((f) => f.parentId === feature.id && f.type !== 'assembly').length;
    const asmCount = allFeatures.filter((f) => f.parentId === feature.id && f.type === 'assembly').length;
    const parts: string[] = [];
    if (count > 0) parts.push(`${count} feature${count !== 1 ? 's' : ''}`);
    if (asmCount > 0) parts.push(`${asmCount} asm`);
    return parts.length > 0 ? parts.join(', ') : 'empty';
  }

  // Pattern features
  if (feature.type === 'pattern_linear' || feature.type === 'pattern_circular' || feature.type === 'mirror') {
    const refId = feature.parameters.featureRef as string;
    if (!refId) return '';
    const ref = allFeatures.find((f) => f.id === refId);
    return ref ? ref.name : '';
  }

  // Boolean union/intersect
  if (feature.type === 'boolean_union' || feature.type === 'boolean_intersect') {
    const bodyRefs =
      (feature.parameters.bodyRefs as string)
        ?.split(',')
        .map((s) => s.trim())
        .filter(Boolean) ?? [];
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
  dragOverAssembly: {
    outline: '2px dashed #3b82f6',
    outlineOffset: -2,
    borderRadius: 4,
  },
  dragHandle: {
    fontSize: 12,
    color: '#475569',
    cursor: 'grab',
    width: 10,
    textAlign: 'center',
    flexShrink: 0,
  },
  expandToggle: {
    fontSize: 8,
    color: '#94a3b8',
    cursor: 'pointer',
    width: 14,
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
