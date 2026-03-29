import { describe, it, expect, beforeEach } from 'vitest';
import { useUIStore } from '../../stores/ui-store';
import {
  registerCommand,
  resetRegistry,
  registerStandardCommands,
  searchCommands,
  getCommands,
  executeCommand,
} from '../../hooks/useKeyboardShortcuts';

// Test the logic that drives CommandPalette without DOM rendering
describe('CommandPalette Logic', () => {
  beforeEach(() => {
    resetRegistry();
  });

  describe('searchCommands (used by CommandPalette)', () => {
    it('should return empty when no commands registered', () => {
      expect(searchCommands('')).toEqual([]);
    });

    it('should return all commands with empty query', () => {
      registerCommand({ id: 'a', label: 'Save', category: 'file', action: () => {} });
      registerCommand({ id: 'b', label: 'Undo', category: 'edit', action: () => {} });
      expect(searchCommands('')).toHaveLength(2);
    });

    it('should filter commands by label', () => {
      registerCommand({ id: 'a', label: 'Toggle Grid', category: 'view', action: () => {} });
      registerCommand({ id: 'b', label: 'Toggle Wireframe', category: 'view', action: () => {} });
      registerCommand({ id: 'c', label: 'Save Document', category: 'file', action: () => {} });

      const results = searchCommands('toggle');
      expect(results).toHaveLength(2);
    });

    it('should filter commands by category', () => {
      registerCommand({ id: 'a', label: 'Grid', category: 'view', action: () => {} });
      registerCommand({ id: 'b', label: 'Save', category: 'file', action: () => {} });

      const results = searchCommands('file');
      expect(results).toHaveLength(1);
      expect(results[0]!.id).toBe('b');
    });

    it('should filter commands by shortcut text', () => {
      registerCommand({ id: 'a', label: 'Save', category: 'file', shortcut: 'Ctrl+S', action: () => {} });
      registerCommand({ id: 'b', label: 'Quit', category: 'file', action: () => {} });

      const results = searchCommands('ctrl+s');
      expect(results).toHaveLength(1);
      expect(results[0]!.id).toBe('a');
    });

    it('should return empty for no matches', () => {
      registerCommand({ id: 'a', label: 'Save', category: 'file', action: () => {} });
      expect(searchCommands('xyz')).toHaveLength(0);
    });
  });

  describe('getCommands (full list for palette)', () => {
    it('should return all registered commands', () => {
      registerCommand({ id: 'a', label: 'Save', category: 'file', action: () => {} });
      registerCommand({ id: 'b', label: 'Undo', category: 'edit', action: () => {} });
      registerCommand({ id: 'c', label: 'Grid', category: 'view', action: () => {} });
      expect(getCommands()).toHaveLength(3);
    });

    it('should include shortcut information', () => {
      registerCommand({
        id: 'test.save',
        label: 'Save',
        category: 'file',
        shortcut: 'Ctrl+S',
        action: () => {},
      });
      const cmds = getCommands();
      expect(cmds[0]!.shortcut).toBe('Ctrl+S');
    });
  });

  describe('executeCommand (palette selection)', () => {
    it('should execute the selected command', () => {
      let called = false;
      registerCommand({
        id: 'test.exec',
        label: 'Execute',
        category: 'tools',
        action: () => { called = true; },
      });

      expect(executeCommand('test.exec')).toBe(true);
      expect(called).toBe(true);
    });

    it('should return false for unknown command', () => {
      expect(executeCommand('nonexistent')).toBe(false);
    });
  });

  describe('standard commands for palette', () => {
    it('should register all standard CAD commands searchable by palette', () => {
      registerStandardCommands({
        toggleCommandPalette: () => {},
        save: () => {},
        undo: () => {},
      });

      const cmds = getCommands();
      expect(cmds.length).toBeGreaterThanOrEqual(15);

      // Verify palette can find them by search
      const viewCmds = searchCommands('toggle');
      expect(viewCmds.length).toBeGreaterThanOrEqual(1);

      const fileCmds = searchCommands('save');
      expect(fileCmds.length).toBeGreaterThanOrEqual(1);
    });

    it('should include shortcuts displayable in palette', () => {
      registerStandardCommands({});

      const cmds = getCommands();
      const withShortcuts = cmds.filter((c) => c.shortcut);
      expect(withShortcuts.length).toBeGreaterThan(0);

      // Check specific shortcuts appear
      const saveCmd = cmds.find((c) => c.id === 'file.save');
      expect(saveCmd).toBeDefined();
      expect(saveCmd!.shortcut).toBe('Ctrl+S');

      const paletteCmd = cmds.find((c) => c.id === 'tools.command_palette');
      expect(paletteCmd).toBeDefined();
      expect(paletteCmd!.shortcut).toBe('Ctrl+K');
    });
  });

  describe('command palette state integration', () => {
    it('should toggle command palette via store', () => {
      expect(useUIStore.getState().commandPaletteOpen).toBe(false);
      useUIStore.getState().toggleCommandPalette();
      expect(useUIStore.getState().commandPaletteOpen).toBe(true);
      useUIStore.getState().toggleCommandPalette();
      expect(useUIStore.getState().commandPaletteOpen).toBe(false);
    });
  });
});
