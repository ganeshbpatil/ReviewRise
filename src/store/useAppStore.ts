import { create } from "zustand";
import { persist } from "zustand/middleware";

interface AppState {
  selectedClientId: string | null;
  selectedLocationId: string | null;
  sidebarCollapsed: boolean;
  setSelectedClient: (clientId: string | null) => void;
  setSelectedLocation: (locationId: string | null) => void;
  toggleSidebar: () => void;
}

export const useAppStore = create<AppState>()(
  persist(
    (set) => ({
      selectedClientId: null,
      selectedLocationId: null,
      sidebarCollapsed: false,
      setSelectedClient: (clientId) => set({ selectedClientId: clientId, selectedLocationId: null }),
      setSelectedLocation: (locationId) => set({ selectedLocationId: locationId }),
      toggleSidebar: () => set((s) => ({ sidebarCollapsed: !s.sidebarCollapsed })),
    }),
    { name: "reviewrise-app-store" }
  )
);
