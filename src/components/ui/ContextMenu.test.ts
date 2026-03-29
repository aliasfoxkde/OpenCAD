import { describe, it, expect } from 'vitest';
import type { ContextMenuItem } from './ContextMenu';

describe('ContextMenu Logic', () => {
  describe('ContextMenuItem interface', () => {
    it('should support minimal item (id + label)', () => {
      const item: ContextMenuItem = { id: 'delete', label: 'Delete' };
      expect(item.id).toBe('delete');
      expect(item.label).toBe('Delete');
      expect(item.shortcut).toBeUndefined();
      expect(item.disabled).toBeUndefined();
      expect(item.submenu).toBeUndefined();
    });

    it('should support item with shortcut', () => {
      const item: ContextMenuItem = { id: 'save', label: 'Save', shortcut: 'Ctrl+S' };
      expect(item.shortcut).toBe('Ctrl+S');
    });

    it('should support disabled item', () => {
      const item: ContextMenuItem = { id: 'undo', label: 'Undo', disabled: true };
      expect(item.disabled).toBe(true);
    });

    it('should support danger item', () => {
      const item: ContextMenuItem = { id: 'remove', label: 'Remove', danger: true };
      expect(item.danger).toBe(true);
    });

    it('should support item with submenu', () => {
      const item: ContextMenuItem = {
        id: 'view',
        label: 'View',
        submenu: [
          { id: 'zoom-in', label: 'Zoom In' },
          { id: 'zoom-out', label: 'Zoom Out' },
        ],
      };
      expect(item.submenu).toHaveLength(2);
    });

    it('should support item with action', () => {
      let called = false;
      const item: ContextMenuItem = { id: 'click', label: 'Click Me', action: () => { called = true; } };
      item.action!();
      expect(called).toBe(true);
    });

    it('should support item with icon', () => {
      const item: ContextMenuItem = { id: 'copy', label: 'Copy', icon: '\uD83D\uDCCB' };
      expect(item.icon).toBe('\uD83D\uDCCB');
    });
  });

  describe('divider items', () => {
    it('should use string "divider" as separator', () => {
      const items: (ContextMenuItem | 'divider')[] = [
        { id: 'a', label: 'Item A' },
        'divider',
        { id: 'b', label: 'Item B' },
      ];
      expect(items).toHaveLength(3);
      expect(items[1]).toBe('divider');
    });
  });

  describe('menu structure patterns', () => {
    it('should build a typical edit context menu', () => {
      const items: (ContextMenuItem | 'divider')[] = [
        { id: 'undo', label: 'Undo', shortcut: 'Ctrl+Z' },
        { id: 'redo', label: 'Redo', shortcut: 'Ctrl+Shift+Z' },
        'divider',
        { id: 'cut', label: 'Cut', shortcut: 'Ctrl+X' },
        { id: 'copy', label: 'Copy', shortcut: 'Ctrl+C' },
        { id: 'paste', label: 'Paste', shortcut: 'Ctrl+V' },
        'divider',
        { id: 'delete', label: 'Delete', shortcut: 'Del', danger: true },
      ];
      expect(items).toHaveLength(8);
      const dividers = items.filter((i) => i === 'divider');
      expect(dividers).toHaveLength(2);
      const dangerItems = items.filter((i): i is ContextMenuItem => i !== 'divider' && !!i.danger);
      expect(dangerItems).toHaveLength(1);
    });

    it('should build a feature tree context menu', () => {
      const items: (ContextMenuItem | 'divider')[] = [
        { id: 'edit', label: 'Edit Feature', icon: '\u270E' },
        { id: 'suppress', label: 'Suppress', disabled: true },
        'divider',
        { id: 'move-up', label: 'Move Up' },
        { id: 'move-down', label: 'Move Down' },
        'divider',
        { id: 'delete', label: 'Delete Feature', danger: true },
      ];
      const enabled = items.filter((i): i is ContextMenuItem => i !== 'divider' && !i.disabled);
      expect(enabled).toHaveLength(4);
      const disabled = items.filter((i): i is ContextMenuItem => i !== 'divider' && !!i.disabled);
      expect(disabled).toHaveLength(1);
    });

    it('should support nested submenu structure', () => {
      const items: (ContextMenuItem | 'divider')[] = [
        {
          id: 'add-feature',
          label: 'Add Feature',
          submenu: [
            { id: 'add-box', label: 'Box' },
            { id: 'add-cylinder', label: 'Cylinder' },
            { id: 'add-sphere', label: 'Sphere' },
            { id: 'add-extrude', label: 'Extrude' },
          ],
        },
      ];
      const submenu = (items[0] as ContextMenuItem).submenu;
      expect(submenu).toHaveLength(4);
    });
  });
});
