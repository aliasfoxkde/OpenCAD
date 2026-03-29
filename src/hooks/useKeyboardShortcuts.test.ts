import { describe, it, expect, beforeEach } from 'vitest';
import {
  registerCommand,
  unregisterCommand,
  getCommands,
  searchCommands,
  executeCommand,
  parseShortcut,
  handleKeyEvent,
  registerStandardCommands,
  resetRegistry,
  type Command,
} from './useKeyboardShortcuts';

function createKeyEvent(key: string, opts: { ctrlKey?: boolean; shiftKey?: boolean; altKey?: boolean; metaKey?: boolean; target?: HTMLElement } = {}): KeyboardEvent {
  const event = {
    key,
    ctrlKey: opts.ctrlKey ?? false,
    shiftKey: opts.shiftKey ?? false,
    altKey: opts.altKey ?? false,
    metaKey: opts.metaKey ?? false,
    bubbles: true,
    cancelable: true,
    target: opts.target ?? ({} as HTMLElement),
    defaultPrevented: false,
    preventDefault() { (this as any).defaultPrevented = true; },
    stopPropagation() {},
    type: 'keydown',
  } as unknown as KeyboardEvent;
  return event;
}

describe('Keyboard Shortcuts', () => {
  beforeEach(() => {
    resetRegistry();
  });

  describe('registerCommand', () => {
    it('should register a command', () => {
      const cmd: Command = {
        id: 'test.hello',
        label: 'Hello',
        category: 'tools',
        action: () => {},
      };
      registerCommand(cmd);

      const all = getCommands();
      expect(all.find((c) => c.id === 'test.hello')).toBeDefined();
    });

    it('should auto-register shortcut binding', () => {
      registerCommand({
        id: 'test.save',
        label: 'Save',
        category: 'file',
        shortcut: 'Ctrl+S',
        action: () => {},
      });

      const event = createKeyEvent('s', { ctrlKey: true });
      const handled = handleKeyEvent(event);
      expect(handled).toBe(true);
    });
  });

  describe('unregisterCommand', () => {
    it('should remove command and its binding', () => {
      registerCommand({
        id: 'test.remove',
        label: 'Remove Me',
        category: 'tools',
        shortcut: 'Ctrl+R',
        action: () => {},
      });

      unregisterCommand('test.remove');
      expect(getCommands().find((c) => c.id === 'test.remove')).toBeUndefined();

      const event = createKeyEvent('r', { ctrlKey: true });
      expect(handleKeyEvent(event)).toBe(false);
    });
  });

  describe('searchCommands', () => {
    it('should find commands by label', () => {
      registerCommand({ id: 'a', label: 'Toggle Grid', category: 'view', action: () => {} });
      registerCommand({ id: 'b', label: 'Toggle Wireframe', category: 'view', action: () => {} });
      registerCommand({ id: 'c', label: 'Save Document', category: 'file', action: () => {} });

      const results = searchCommands('toggle');
      expect(results).toHaveLength(2);
    });

    it('should find commands by category', () => {
      registerCommand({ id: 'a', label: 'Grid', category: 'view', action: () => {} });
      registerCommand({ id: 'b', label: 'Save', category: 'file', action: () => {} });

      const results = searchCommands('file');
      expect(results).toHaveLength(1);
      expect(results[0]!.id).toBe('b');
    });

    it('should find commands by shortcut', () => {
      registerCommand({ id: 'a', label: 'Save', category: 'file', shortcut: 'Ctrl+S', action: () => {} });

      const results = searchCommands('ctrl+s');
      expect(results).toHaveLength(1);
    });

    it('should return all commands with empty query', () => {
      registerCommand({ id: 'a', label: 'A', category: 'tools', action: () => {} });
      registerCommand({ id: 'b', label: 'B', category: 'tools', action: () => {} });

      expect(searchCommands('')).toHaveLength(2);
    });

    it('should return empty for no matches', () => {
      registerCommand({ id: 'a', label: 'Save', category: 'file', action: () => {} });
      expect(searchCommands('xyz')).toHaveLength(0);
    });
  });

  describe('executeCommand', () => {
    it('should call the command action', () => {
      let called = false;
      registerCommand({
        id: 'test.exec',
        label: 'Execute',
        category: 'tools',
        action: () => { called = true; },
      });

      const result = executeCommand('test.exec');
      expect(result).toBe(true);
      expect(called).toBe(true);
    });

    it('should return false for unknown command', () => {
      expect(executeCommand('nonexistent')).toBe(false);
    });
  });

  describe('parseShortcut', () => {
    it('should parse Ctrl+S', () => {
      const binding = parseShortcut('Ctrl+S');
      expect(binding.key).toBe('s');
      expect(binding.ctrl).toBe(true);
      expect(binding.shift).toBe(false);
      expect(binding.alt).toBe(false);
    });

    it('should parse Ctrl+Shift+Z', () => {
      const binding = parseShortcut('Ctrl+Shift+Z');
      expect(binding.key).toBe('z');
      expect(binding.ctrl).toBe(true);
      expect(binding.shift).toBe(true);
    });

    it('should parse Alt+Enter', () => {
      const binding = parseShortcut('Alt+Enter');
      expect(binding.key).toBe('enter');
      expect(binding.alt).toBe(true);
    });

    it('should parse single key', () => {
      const binding = parseShortcut('Escape');
      expect(binding.key).toBe('escape');
      expect(binding.ctrl).toBe(false);
      expect(binding.shift).toBe(false);
    });
  });

  describe('handleKeyEvent', () => {
    it('should handle Ctrl+Z', () => {
      let called = false;
      registerCommand({
        id: 'edit.undo',
        label: 'Undo',
        category: 'edit',
        shortcut: 'Ctrl+Z',
        action: () => { called = true; },
      });

      const event = createKeyEvent('z', { ctrlKey: true });
      expect(handleKeyEvent(event)).toBe(true);
      expect(called).toBe(true);
    });

    it('should handle single key shortcuts', () => {
      let called = false;
      registerCommand({
        id: 'test.key',
        label: 'Press G',
        category: 'view',
        shortcut: 'G',
        action: () => { called = true; },
      });

      const event = createKeyEvent('g');
      expect(handleKeyEvent(event)).toBe(true);
      expect(called).toBe(true);
    });

    it('should handle Escape', () => {
      let called = false;
      registerCommand({
        id: 'test.escape',
        label: 'Escape',
        category: 'help',
        shortcut: 'Escape',
        action: () => { called = true; },
      });

      const event = createKeyEvent('Escape');
      expect(handleKeyEvent(event)).toBe(true);
      expect(called).toBe(true);
    });

    it('should not handle events in input fields', () => {
      let called = false;
      registerCommand({
        id: 'test.input',
        label: 'Input Test',
        category: 'tools',
        shortcut: 'Ctrl+S',
        action: () => { called = true; },
      });

      // Simulate an input element target
      const fakeInput = { tagName: 'INPUT' } as HTMLElement;
      const event = createKeyEvent('s', { ctrlKey: true, target: fakeInput });

      expect(handleKeyEvent(event)).toBe(false);
      expect(called).toBe(false);
    });

    it('should return false for unbound keys', () => {
      const event = createKeyEvent('x');
      expect(handleKeyEvent(event)).toBe(false);
    });

    it('should prevent default when command is triggered', () => {
      registerCommand({
        id: 'test.prevent',
        label: 'Prevent',
        category: 'tools',
        shortcut: 'Ctrl+S',
        action: () => {},
      });

      const event = createKeyEvent('s', { ctrlKey: true });
      handleKeyEvent(event);
      // defaultPrevented is set by the browser, we called preventDefault
      expect(event.defaultPrevented).toBe(true);
    });
  });

  describe('registerStandardCommands', () => {
    it('should register all standard commands', () => {
      registerStandardCommands({});
      const cmds = getCommands();

      expect(cmds.length).toBeGreaterThanOrEqual(15);

      const ids = cmds.map((c) => c.id);
      expect(ids).toContain('edit.undo');
      expect(ids).toContain('edit.redo');
      expect(ids).toContain('file.save');
      expect(ids).toContain('file.new');
      expect(ids).toContain('view.toggle_grid');
      expect(ids).toContain('tools.command_palette');
    });

    it('should wire actions to commands', () => {
      let saved = false;
      registerStandardCommands({ save: () => { saved = true; } });

      executeCommand('file.save');
      expect(saved).toBe(true);
    });

    it('should handle Ctrl+K for command palette', () => {
      let paletteOpened = false;
      registerStandardCommands({ toggleCommandPalette: () => { paletteOpened = true; } });

      const event = createKeyEvent('k', { ctrlKey: true });
      handleKeyEvent(event);
      expect(paletteOpened).toBe(true);
    });
  });
});
