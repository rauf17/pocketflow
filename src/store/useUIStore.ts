import { create } from 'zustand';

interface UIState {
  isSidebarOpen: boolean;
  isAddExpenseModalOpen: boolean;
  
  // Actions
  toggleSidebar: () => void;
  setSidebarOpen: (isOpen: boolean) => void;
  setAddExpenseModalOpen: (isOpen: boolean) => void;
}

export const useUIStore = create<UIState>((set) => ({
  isSidebarOpen: false,
  isAddExpenseModalOpen: false,

  toggleSidebar: () => set((state) => ({ isSidebarOpen: !state.isSidebarOpen })),
  setSidebarOpen: (isOpen) => set({ isSidebarOpen: isOpen }),
  setAddExpenseModalOpen: (isOpen) => set({ isAddExpenseModalOpen: isOpen }),
}));
