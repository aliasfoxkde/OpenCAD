/**
 * Keyboard shortcut handler and command registry for OpenCAD.
 *
 * Provides industry-standard CAD keyboard bindings and a command palette
 * that can be opened with Ctrl+K.
 */

export interface Command {
  id: string;
  label: string;
  category: 'file' | 'edit' | 'view' | 'tools' | 'sketch' | 'help';
  shortcut?: string;
  action: () => void;
}

export interface KeyBinding {
  key: string;
  ctrl?: boolean;
  shift?: boolean;
  alt?: boolean;
  commandId: string;
}

type CommandListener = (commandId: string) => void;

const listeners = new Set<CommandListener>();
const commands = new Map<string, Command>();
const bindings = new Map<string, string>(); // normalized key -> commandId

function normalizeKey(event: KeyboardEvent): string {
  const parts: string[] = [];
  if (event.ctrlKey || event.metaKey) parts.push('mod');
  if (event.shiftKey) parts.push('shift');
  if (event.altKey) parts.push('alt');
  parts.push(event.key.toLowerCase());
  return parts.join('+');
}

/** Register a command */
export function registerCommand(command: Command): void {
  commands.set(command.id, command);

  // Auto-register shortcut binding
  if (command.shortcut) {
    registerBinding(parseShortcut(command.shortcut), command.id);
  }
}

/** Register a key binding */
export function registerBinding(binding: KeyBinding, commandId: string): void {
  const parts: string[] = [];
  if (binding.ctrl) parts.push('mod');
  if (binding.shift) parts.push('shift');
  if (binding.alt) parts.push('alt');
  parts.push(binding.key.toLowerCase());
  bindings.set(parts.join('+'), commandId);
}

/** Parse a shortcut string like "Ctrl+Shift+S" into a KeyBinding */
export function parseShortcut(shortcut: string): KeyBinding {
  const parts = shortcut.toLowerCase().split('+');
  const key = parts[parts.length - 1]!;
  return {
    key,
    ctrl: parts.includes('ctrl') || parts.includes('cmd') || parts.includes('mod'),
    shift: parts.includes('shift'),
    alt: parts.includes('alt'),
    commandId: '',
  };
}

/** Unregister a command */
export function unregisterCommand(id: string): void {
  commands.delete(id);
  // Remove associated bindings
  for (const [key, cmdId] of bindings) {
    if (cmdId === id) bindings.delete(key);
  }
}

/** Get all registered commands */
export function getCommands(): Command[] {
  return Array.from(commands.values());
}

/** Search commands by label */
export function searchCommands(query: string): Command[] {
  const q = query.toLowerCase().trim();
  if (!q) return getCommands();

  return getCommands().filter(
    (cmd) =>
      cmd.label.toLowerCase().includes(q) ||
      cmd.category.toLowerCase().includes(q) ||
      (cmd.shortcut && cmd.shortcut.toLowerCase().includes(q)),
  );
}

/** Execute a command by ID */
export function executeCommand(id: string): boolean {
  const cmd = commands.get(id);
  if (!cmd) return false;
  cmd.action();
  return true;
}

/** Subscribe to command execution events */
export function onCommand(listener: CommandListener): () => void {
  listeners.add(listener);
  return () => listeners.delete(listener);
}

/** Handle a keyboard event, returns true if a command was triggered */
export function handleKeyEvent(event: KeyboardEvent): boolean {
  // Don't intercept when typing in input fields
  const target = event.target as HTMLElement;
  if (target.tagName === 'INPUT' || target.tagName === 'TEXTAREA' || target.isContentEditable) {
    return false;
  }

  const normalized = normalizeKey(event);
  const commandId = bindings.get(normalized);

  if (commandId) {
    event.preventDefault();
    event.stopPropagation();
    executeCommand(commandId);
    for (const listener of listeners) {
      listener(commandId);
    }
    return true;
  }

  return false;
}

/** Reset all commands and bindings (for testing) */
export function resetRegistry(): void {
  commands.clear();
  bindings.clear();
  listeners.clear();
}

// ============================================================
// Built-in command definitions (registered by the app on startup)
// ============================================================

export interface CommandActions {
  undo?: () => void;
  redo?: () => void;
  save?: () => void;
  delete?: () => void;
  escape?: () => void;
  toggleGrid?: () => void;
  toggleWireframe?: () => void;
  fitView?: () => void;
  zoomToSelection?: () => void;
  zoomIn?: () => void;
  zoomOut?: () => void;
  newDocument?: () => void;
  openDocument?: () => void;
  toggleCommandPalette?: () => void;
  selectAll?: () => void;
  copy?: () => void;
  cut?: () => void;
  paste?: () => void;
  duplicate?: () => void;
  enterSketch?: () => void;
  cameraFront?: () => void;
  cameraBack?: () => void;
  cameraTop?: () => void;
  cameraBottom?: () => void;
  cameraRight?: () => void;
  cameraLeft?: () => void;
  cameraIso?: () => void;
}

/** Register all standard CAD commands */
export function registerStandardCommands(actions: CommandActions): void {
  const cmds: Array<[string, string, string, string | undefined, (() => void) | undefined]> = [
    ['edit.undo', 'Undo', 'edit', 'Ctrl+Z', actions.undo],
    ['edit.redo', 'Redo', 'edit', 'Ctrl+Shift+Z', actions.redo],
    ['file.save', 'Save', 'file', 'Ctrl+S', actions.save],
    ['file.new', 'New Document', 'file', 'Ctrl+N', actions.newDocument],
    ['file.open', 'Open Document', 'file', 'Ctrl+O', actions.openDocument],
    ['edit.delete', 'Delete', 'edit', 'Delete', actions.delete],
    ['edit.select_all', 'Select All', 'edit', 'Ctrl+A', actions.selectAll],
    ['edit.copy', 'Copy', 'edit', 'Ctrl+C', actions.copy],
    ['edit.cut', 'Cut', 'edit', 'Ctrl+X', actions.cut],
    ['edit.paste', 'Paste', 'edit', 'Ctrl+V', actions.paste],
    ['edit.duplicate', 'Duplicate', 'edit', 'Ctrl+D', actions.duplicate],
    ['view.toggle_grid', 'Toggle Grid', 'view', 'G', actions.toggleGrid],
    ['view.toggle_wireframe', 'Toggle Wireframe', 'view', 'W', actions.toggleWireframe],
    ['view.fit', 'Fit View', 'view', 'F', actions.fitView],
    ['view.zoom_selection', 'Zoom to Selection', 'view', 'Shift+F', actions.zoomToSelection],
    ['view.zoom_in', 'Zoom In', 'view', 'Ctrl+=', actions.zoomIn],
    ['view.zoom_out', 'Zoom Out', 'view', 'Ctrl+-', actions.zoomOut],
    ['tools.command_palette', 'Command Palette', 'tools', 'Ctrl+K', actions.toggleCommandPalette],
    ['tools.enter_sketch', 'Enter Sketch Mode', 'sketch', 'S', actions.enterSketch],
    ['view.camera_front', 'Front View', 'view', '1', actions.cameraFront],
    ['view.camera_back', 'Back View', 'view', '4', actions.cameraBack],
    ['view.camera_top', 'Top View', 'view', '2', actions.cameraTop],
    ['view.camera_bottom', 'Bottom View', 'view', '5', actions.cameraBottom],
    ['view.camera_right', 'Right View', 'view', '3', actions.cameraRight],
    ['view.camera_left', 'Left View', 'view', '6', actions.cameraLeft],
    ['view.camera_iso', 'Isometric View', 'view', '0', actions.cameraIso],
    ['general.escape', 'Cancel / Escape', 'help', 'Escape', actions.escape],
  ];

  for (const [id, label, category, shortcut, action] of cmds) {
    registerCommand({
      id,
      label,
      category: category as Command['category'],
      shortcut,
      action: action ?? (() => {}),
    });
  }
}
