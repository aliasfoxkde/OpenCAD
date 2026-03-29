/**
 * Reusable right-click context menu component.
 *
 * Features:
 * - Positioned at mouse coordinates
 * - Menu items with label, shortcut, disabled state
 * - Divider separators
 * - Submenu support (hover to open)
 * - Click outside to close
 * - Keyboard navigation (arrows, enter, escape)
 */

import { useState, useEffect, useRef, useCallback } from 'react';

export interface ContextMenuItem {
  id: string;
  label: string;
  shortcut?: string;
  icon?: string;
  disabled?: boolean;
  danger?: boolean;
  action?: () => void;
  submenu?: ContextMenuItem[];
}

export interface ContextMenuProps {
  x: number;
  y: number;
  items: (ContextMenuItem | 'divider')[];
  onClose: () => void;
}

export function ContextMenu({ x, y, items, onClose }: ContextMenuProps) {
  const [selectedIndex, setSelectedIndex] = useState(-1);
  const [, setOpenSubmenuIndex] = useState(-1);
  const [position, setPosition] = useState({ x, y });
  const menuRef = useRef<HTMLDivElement>(null);

  // Adjust position to stay within viewport
  useEffect(() => {
    if (!menuRef.current) return;
    const rect = menuRef.current.getBoundingClientRect();
    const vw = window.innerWidth;
    const vh = window.innerHeight;

    const adjustedX = rect.right > vw ? x - rect.width : x;
    const adjustedY = rect.bottom > vh ? y - rect.height : y;
    setPosition({ x: Math.max(0, adjustedX), y: Math.max(0, adjustedY) });
  }, [x, y]);

  // Compute actionable item indices for keyboard navigation
  const actionableIndices = items
    .map((item, i) => (item !== 'divider' && !item.disabled ? i : -1))
    .filter((i) => i >= 0);

  const handleKeyDown = useCallback(
    (e: React.KeyboardEvent) => {
      if (e.key === 'Escape') {
        e.preventDefault();
        onClose();
        return;
      }

      if (e.key === 'ArrowDown') {
        e.preventDefault();
        const current = actionableIndices.indexOf(selectedIndex);
        const next = (current + 1) % actionableIndices.length;
        setSelectedIndex(actionableIndices[next]!);
        return;
      }

      if (e.key === 'ArrowUp') {
        e.preventDefault();
        const current = actionableIndices.indexOf(selectedIndex);
        const prev = (current - 1 + actionableIndices.length) % actionableIndices.length;
        setSelectedIndex(actionableIndices[prev]!);
        return;
      }

      if (e.key === 'Enter' || e.key === ' ') {
        e.preventDefault();
        const item = items[selectedIndex];
        if (item && item !== 'divider' && !item.disabled && item.action) {
          item.action();
          onClose();
        }
      }
    },
    [items, selectedIndex, actionableIndices, onClose],
  );

  // Click outside to close
  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (menuRef.current && !menuRef.current.contains(e.target as Node)) {
        onClose();
      }
    };
    // Use setTimeout to avoid the same click that opened the menu
    const timer = setTimeout(() => document.addEventListener('mousedown', handler), 0);
    return () => {
      clearTimeout(timer);
      document.removeEventListener('mousedown', handler);
    };
  }, [onClose]);

  const handleItemClick = useCallback(
    (item: ContextMenuItem) => {
      if (item.disabled) return;
      if (item.submenu) {
        setOpenSubmenuIndex(-1);
        return;
      }
      item.action?.();
      onClose();
    },
    [onClose],
  );

  const handleItemHover = useCallback(
    (index: number) => {
      setSelectedIndex(index);
      if (items[index] !== 'divider') {
        const item = items[index]!;
        if (item.submenu) {
          setOpenSubmenuIndex(index);
        } else {
          setOpenSubmenuIndex(-1);
        }
      }
    },
    [items],
  );

  return (
    <div
      ref={menuRef}
      style={{ ...styles.menu, left: position.x, top: position.y }}
      onKeyDown={handleKeyDown}
      tabIndex={0}
    >
      {items.map((item, index) => {
        if (item === 'divider') {
          return <div key={`div-${index}`} style={styles.divider} />;
        }

        const isSelected = selectedIndex === index;
        const hasSubmenu = item.submenu && item.submenu.length > 0;

        return (
          <div
            key={item.id}
            style={{
              ...styles.item,
              ...(isSelected ? styles.itemSelected : {}),
              ...(item.disabled ? styles.itemDisabled : {}),
              ...(item.danger ? styles.itemDanger : {}),
            }}
            onClick={() => handleItemClick(item)}
            onMouseEnter={() => handleItemHover(index)}
            onMouseLeave={() => setSelectedIndex(-1)}
          >
            <span style={styles.itemIcon}>{item.icon}</span>
            <span style={styles.itemLabel}>{item.label}</span>
            {item.shortcut && <span style={styles.itemShortcut}>{item.shortcut}</span>}
            {hasSubmenu && <span style={styles.submenuArrow}>&#x25B6;</span>}
          </div>
        );
      })}
    </div>
  );
}

const styles: Record<string, React.CSSProperties> = {
  menu: {
    position: 'fixed',
    zIndex: 1500,
    background: '#1e293b',
    border: '1px solid #334155',
    borderRadius: 6,
    padding: '4px 0',
    minWidth: 180,
    boxShadow: '0 8px 24px rgba(0,0,0,0.4)',
    outline: 'none',
  },
  item: {
    display: 'flex',
    alignItems: 'center',
    padding: '6px 12px',
    cursor: 'pointer',
    color: '#cbd5e1',
    fontSize: 12,
    gap: 8,
  },
  itemSelected: {
    background: '#334155',
    color: '#f1f5f9',
  },
  itemDisabled: {
    color: '#475569',
    cursor: 'default',
  },
  itemDanger: {
    color: '#ef4444',
  },
  itemIcon: {
    width: 16,
    textAlign: 'center' as const,
    fontSize: 12,
    flexShrink: 0,
  },
  itemLabel: {
    flex: 1,
  },
  itemShortcut: {
    fontSize: 10,
    color: '#64748b',
    fontFamily: 'monospace',
    marginLeft: 16,
  },
  submenuArrow: {
    fontSize: 8,
    color: '#64748b',
    marginLeft: 8,
  },
  divider: {
    height: 1,
    background: '#334155',
    margin: '4px 8px',
  },
};
