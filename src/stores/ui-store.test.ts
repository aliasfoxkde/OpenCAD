import { describe, it, expect, beforeEach } from 'vitest';
import { useUIStore } from './ui-store';

describe('UIStore', () => {
  beforeEach(() => {
    useUIStore.setState({
      leftPanelOpen: true,
      rightPanelOpen: true,
      bottomPanelOpen: false,
      commandPaletteOpen: false,
      settingsOpen: false,
      theme: 'dark',
    });
  });

  it('should have correct defaults', () => {
    const state = useUIStore.getState();
    expect(state.leftPanelOpen).toBe(true);
    expect(state.rightPanelOpen).toBe(true);
    expect(state.commandPaletteOpen).toBe(false);
    expect(state.theme).toBe('dark');
  });

  it('should toggle left panel', () => {
    useUIStore.getState().toggleLeftPanel();
    expect(useUIStore.getState().leftPanelOpen).toBe(false);
  });

  it('should toggle command palette', () => {
    useUIStore.getState().toggleCommandPalette();
    expect(useUIStore.getState().commandPaletteOpen).toBe(true);
  });

  it('should set theme', () => {
    useUIStore.getState().setTheme('light');
    expect(useUIStore.getState().theme).toBe('light');
  });
});
