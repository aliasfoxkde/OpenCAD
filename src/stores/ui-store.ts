import { create } from 'zustand';
import type { UIStoreState, UIStoreActions } from '../types/store';

export const useUIStore = create<UIStoreState & UIStoreActions>((set) => ({
  leftPanelOpen: true,
  rightPanelOpen: true,
  bottomPanelOpen: false,
  commandPaletteOpen: false,
  settingsOpen: false,
  theme: 'dark',

  toggleLeftPanel: () => set((s) => ({ leftPanelOpen: !s.leftPanelOpen })),
  toggleRightPanel: () => set((s) => ({ rightPanelOpen: !s.rightPanelOpen })),
  toggleBottomPanel: () => set((s) => ({ bottomPanelOpen: !s.bottomPanelOpen })),
  toggleCommandPalette: () =>
    set((s) => ({ commandPaletteOpen: !s.commandPaletteOpen })),
  toggleSettings: () => set((s) => ({ settingsOpen: !s.settingsOpen })),
  setTheme: (theme) => set({ theme }),
}));
