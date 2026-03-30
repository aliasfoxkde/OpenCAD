/**
 * @vitest-environment jsdom
 */
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import { ContextMenu, type ContextMenuItem } from './ContextMenu';

const defaultItems: (ContextMenuItem | 'divider')[] = [
  { id: 'cut', label: 'Cut', shortcut: 'Ctrl+X', action: vi.fn() },
  { id: 'copy', label: 'Copy', shortcut: 'Ctrl+C', action: vi.fn() },
  'divider',
  { id: 'paste', label: 'Paste', shortcut: 'Ctrl+V', action: vi.fn(), disabled: true },
  'divider',
  { id: 'delete', label: 'Delete', danger: true, action: vi.fn() },
  { id: 'submenu', label: 'Submenu', submenu: [{ id: 'sub1', label: 'Sub Item 1', action: vi.fn() }] },
];

describe('ContextMenu', () => {
  beforeEach(() => {
    defaultItems.forEach((item) => {
      if (item !== 'divider') item.action?.mockClear();
      if (item !== 'divider' && item.submenu) {
        item.submenu.forEach((s) => s.action?.mockClear());
      }
    });
  });

  it('should render menu items', () => {
    render(<ContextMenu x={10} y={10} items={defaultItems} onClose={vi.fn()} />);
    expect(screen.getByText('Cut')).toBeDefined();
    expect(screen.getByText('Copy')).toBeDefined();
    expect(screen.getByText('Paste')).toBeDefined();
    expect(screen.getByText('Delete')).toBeDefined();
  });

  it('should render shortcut hints', () => {
    render(<ContextMenu x={10} y={10} items={defaultItems} onClose={vi.fn()} />);
    expect(screen.getByText('Ctrl+X')).toBeDefined();
    expect(screen.getByText('Ctrl+C')).toBeDefined();
  });

  it('should render submenu arrow', () => {
    render(<ContextMenu x={10} y={10} items={defaultItems} onClose={vi.fn()} />);
    const submenuArrow = screen.getByText('\u25B6');
    expect(submenuArrow).toBeDefined();
  });

  it('should call action and onClose when item is clicked', () => {
    const onClose = vi.fn();
    render(<ContextMenu x={10} y={10} items={defaultItems} onClose={onClose} />);
    fireEvent.click(screen.getByText('Cut'));
    const cutItem = defaultItems[0] as ContextMenuItem;
    expect(cutItem.action).toHaveBeenCalled();
    expect(onClose).toHaveBeenCalled();
  });

  it('should not call action when disabled item is clicked', () => {
    const onClose = vi.fn();
    render(<ContextMenu x={10} y={10} items={defaultItems} onClose={onClose} />);
    fireEvent.click(screen.getByText('Paste'));
    const pasteItem = defaultItems[3] as ContextMenuItem;
    expect(pasteItem.action).not.toHaveBeenCalled();
  });

  it('should not call action when submenu item is clicked', () => {
    const onClose = vi.fn();
    render(<ContextMenu x={10} y={10} items={defaultItems} onClose={onClose} />);
    fireEvent.click(screen.getByText('Submenu'));
    expect(onClose).not.toHaveBeenCalled();
  });

  it('should call onClose on Escape key', () => {
    const onClose = vi.fn();
    render(<ContextMenu x={10} y={10} items={defaultItems} onClose={onClose} />);
    const menu = screen.getByText('Cut').closest('[tabindex]');
    fireEvent.keyDown(menu!, { key: 'Escape' });
    expect(onClose).toHaveBeenCalled();
  });

  it('should navigate items with arrow keys', () => {
    render(<ContextMenu x={10} y={10} items={defaultItems} onClose={vi.fn()} />);
    const menu = screen.getByText('Cut').closest('[tabindex]');
    fireEvent.keyDown(menu!, { key: 'ArrowDown' });
    fireEvent.keyDown(menu!, { key: 'Enter' });
    const cutItem = defaultItems[0] as ContextMenuItem;
    expect(cutItem.action).toHaveBeenCalled();
  });

  it('should render at given position', () => {
    render(<ContextMenu x={100} y={200} items={defaultItems} onClose={vi.fn()} />);
    const menu = screen.getByText('Cut').closest('[tabindex]');
    expect(menu!.style.left).toBe('100px');
    expect(menu!.style.top).toBe('200px');
  });
});
