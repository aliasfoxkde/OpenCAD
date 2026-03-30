import { useState, useEffect, useRef, useCallback } from 'react';
import { useUIStore } from '../../stores/ui-store';
import { searchCommands, executeCommand, getCommands, type Command } from '../../hooks/useKeyboardShortcuts';

export function CommandPalette() {
  const open = useUIStore((s) => s.commandPaletteOpen);
  const toggle = useUIStore((s) => s.toggleCommandPalette);
  const [query, setQuery] = useState('');
  const [selectedIndex, setSelectedIndex] = useState(0);
  const inputRef = useRef<HTMLInputElement>(null);
  const listRef = useRef<HTMLDivElement>(null);

  const results = query ? searchCommands(query) : getCommands();

  // Focus input when opened
  useEffect(() => {
    if (open) {
      setQuery('');
      setSelectedIndex(0);
      setTimeout(() => inputRef.current?.focus(), 0);
    }
  }, [open]);

  // Reset selection when query changes
  useEffect(() => {
    setSelectedIndex(0);
  }, [query]);

  const close = useCallback(() => {
    toggle();
  }, [toggle]);

  const run = useCallback(
    (cmd: Command) => {
      executeCommand(cmd.id);
      close();
    },
    [close],
  );

  const handleKeyDown = useCallback(
    (e: React.KeyboardEvent) => {
      if (e.key === 'Escape') {
        e.preventDefault();
        close();
        return;
      }

      if (e.key === 'ArrowDown') {
        e.preventDefault();
        setSelectedIndex((i) => Math.min(i + 1, results.length - 1));
        return;
      }

      if (e.key === 'ArrowUp') {
        e.preventDefault();
        setSelectedIndex((i) => Math.max(i - 1, 0));
        return;
      }

      if (e.key === 'Enter') {
        e.preventDefault();
        const cmd = results[selectedIndex];
        if (cmd) run(cmd);
        return;
      }
    },
    [close, results, selectedIndex, run],
  );

  // Scroll selected item into view
  useEffect(() => {
    const el = listRef.current?.children[selectedIndex] as HTMLElement | undefined;
    el?.scrollIntoView({ block: 'nearest' });
  }, [selectedIndex]);

  if (!open) return null;

  const grouped = groupByCategory(results);

  return (
    <div style={styles.overlay} onClick={close}>
      <div style={styles.panel} onClick={(e) => e.stopPropagation()}>
        <div style={styles.inputRow}>
          <span style={styles.searchIcon}>&#x1F50D;</span>
          <input
            ref={inputRef}
            style={styles.input}
            placeholder="Type a command..."
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            onKeyDown={handleKeyDown}
          />
          {query && (
            <button style={styles.clearBtn} onClick={() => setQuery('')}>
              &times;
            </button>
          )}
        </div>

        <div style={styles.list} ref={listRef}>
          {results.length === 0 && <div style={styles.empty}>No commands found</div>}
          {grouped.map(([category, cmds]) => (
            <div key={category}>
              <div style={styles.categoryHeader}>{category.toUpperCase()}</div>
              {cmds.map((cmd) => {
                const globalIdx = results.indexOf(cmd);
                return (
                  <div
                    key={cmd.id}
                    style={{
                      ...styles.item,
                      ...(globalIdx === selectedIndex ? styles.itemSelected : {}),
                    }}
                    onClick={() => run(cmd)}
                    onMouseEnter={() => setSelectedIndex(globalIdx)}
                  >
                    <span style={styles.itemLabel}>{cmd.label}</span>
                    {cmd.shortcut && <span style={styles.itemShortcut}>{cmd.shortcut}</span>}
                  </div>
                );
              })}
            </div>
          ))}
        </div>

        <div style={styles.footer}>
          <span>&uarr;&darr; Navigate</span>
          <span>&crarr; Execute</span>
          <span>Esc Close</span>
        </div>
      </div>
    </div>
  );
}

function groupByCategory(commands: Command[]): [string, Command[]][] {
  const map = new Map<string, Command[]>();
  for (const cmd of commands) {
    const list = map.get(cmd.category) ?? [];
    list.push(cmd);
    map.set(cmd.category, list);
  }
  return Array.from(map.entries());
}

const styles: Record<string, React.CSSProperties> = {
  overlay: {
    position: 'fixed',
    inset: 0,
    background: 'rgba(0, 0, 0, 0.5)',
    display: 'flex',
    alignItems: 'flex-start',
    justifyContent: 'center',
    paddingTop: '15vh',
    zIndex: 1000,
  },
  panel: {
    width: 520,
    maxWidth: '90vw',
    maxHeight: '60vh',
    background: '#1e293b',
    borderRadius: 8,
    boxShadow: '0 25px 50px rgba(0,0,0,0.5)',
    display: 'flex',
    flexDirection: 'column',
    overflow: 'hidden',
  },
  inputRow: {
    display: 'flex',
    alignItems: 'center',
    padding: '0 12px',
    borderBottom: '1px solid #334155',
  },
  searchIcon: {
    fontSize: 14,
    marginRight: 8,
    opacity: 0.6,
  },
  input: {
    flex: 1,
    background: 'transparent',
    border: 'none',
    outline: 'none',
    color: '#f1f5f9',
    fontSize: 14,
    padding: '12px 0',
    fontFamily: 'inherit',
  },
  clearBtn: {
    background: 'none',
    border: 'none',
    color: '#64748b',
    fontSize: 18,
    cursor: 'pointer',
    padding: '4px 6px',
  },
  list: {
    flex: 1,
    overflowY: 'auto',
    padding: '4px 0',
  },
  categoryHeader: {
    padding: '6px 16px 2px',
    fontSize: 10,
    fontWeight: 700,
    color: '#64748b',
    letterSpacing: '0.08em',
    textTransform: 'uppercase' as const,
  },
  item: {
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: '6px 16px',
    cursor: 'pointer',
    color: '#cbd5e1',
    fontSize: 13,
  },
  itemSelected: {
    background: '#334155',
    color: '#f1f5f9',
  },
  itemLabel: {
    flex: 1,
  },
  itemShortcut: {
    fontSize: 11,
    color: '#64748b',
    fontFamily: 'monospace',
    marginLeft: 12,
  },
  empty: {
    padding: '20px 16px',
    textAlign: 'center' as const,
    color: '#64748b',
    fontSize: 13,
  },
  footer: {
    display: 'flex',
    gap: 16,
    padding: '6px 16px',
    borderTop: '1px solid #334155',
    fontSize: 10,
    color: '#475569',
  },
};
