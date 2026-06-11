import { create } from 'zustand';

export const useSearchStore = create((set) => ({
  // Estado Global
  selectedIfa: null,
  selectedStrategy: null,
  articles: [],
  isLoading: false,
  totalPubMedCount: 0,
  toast: null,

  // Acciones
  setSelectedIfa: (ifa) => set({ 
    selectedIfa: ifa, 
    selectedStrategy: null, 
    articles: [], 
    totalPubMedCount: 0 
  }),
  setSelectedStrategy: (strat) => set({ 
    selectedStrategy: strat, 
    articles: [], 
    totalPubMedCount: 0 
  }),
  setArticles: (articles) => set({ articles }),
  setIsLoading: (isLoading) => set({ isLoading }),
  setTotalPubMedCount: (count) => set({ totalPubMedCount: count }),
  setToast: (toast) => set({ toast }),

  // Helpers para modificar la tabla
  toggleTriaje: (index) => set((state) => {
    const newArticles = [...state.articles];
    newArticles[index].triaje = !newArticles[index].triaje;
    return { articles: newArticles };
  }),
  toggleTriajeAll: (checked) => set((state) => ({
    articles: state.articles.map(a => ({ ...a, triaje: checked }))
  })),
  setInclusion: (index, value) => set((state) => {
    const newArticles = [...state.articles];
    newArticles[index].inclusion = value;
    return { articles: newArticles };
  }),

  // Limpieza
  resetSearch: () => set({
    selectedIfa: null,
    selectedStrategy: null,
    articles: [],
    totalPubMedCount: 0
  })
}));
