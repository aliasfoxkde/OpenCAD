import { describe, it, expect } from 'vitest';
import { useUIStore } from '../stores/ui-store';

describe('UIStore', () => {
  it('should have correct defaults', () => {
    const state = useUIStore.getState();
    expect(state.leftPanelOpen).toBe(true);
    expect(state.rightPanelOpen).toBe(true);
    expect(state.bottomPanelOpen).toBe(false);
    expect(state.commandPaletteOpen).toBe(false);
    expect(state.theme).toBe('dark');
  });

  it('should toggle left panel', () => {
    useUIStore.getState().toggleLeftPanel();
    expect(useUIStore.getState().leftPanelOpen).toBe(false);
    useUIStore.getState().toggleLeftPanel(); // restore
  });

  it('should toggle command palette', () => {
    useUIStore.getState().toggleCommandPalette();
    expect(useUIStore.getState().commandPaletteOpen).toBe(true);
    useUIStore.getState().toggleCommandPalette(); // restore
  });

  it('should set theme', () => {
    useUIStore.getState().setTheme('light');
    expect(useUIStore.getState().theme).toBe('light');
    useUIStore.getState().setTheme('dark'); // restore
  });
});
