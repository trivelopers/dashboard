export type SimulationChatEntry = {
  id: string;
  label?: string | null;
};

export const SIMULATION_STORAGE_KEY = 'testAssistant.simulations';

export const readSimulationChats = (): SimulationChatEntry[] => {
  if (typeof window === 'undefined') return [];

  try {
    const stored = window.localStorage.getItem(SIMULATION_STORAGE_KEY);
    if (!stored) return [];

    const parsed = JSON.parse(stored);
    if (!Array.isArray(parsed)) return [];

    const normalized = parsed
      .map((entry) => {
        if (!entry || typeof entry !== 'object') return null;
        const id = typeof entry.id === 'string' ? entry.id.trim() : '';
        if (!id) return null;
        const label = typeof entry.label === 'string' ? entry.label : null;
        return { id, label };
      })
      .filter((entry): entry is SimulationChatEntry => Boolean(entry));

    return normalized;
  } catch (error) {
    console.error('Error reading stored simulations:', error);
    return [];
  }
};

export const writeSimulationChats = (entries: SimulationChatEntry[]) => {
  if (typeof window === 'undefined') return;
  window.localStorage.setItem(SIMULATION_STORAGE_KEY, JSON.stringify(entries));
};

export const updateStoredSimulationLabel = (chatId: string, label: string | null) => {
  if (typeof window === 'undefined') return;
  const current = readSimulationChats();
  const next = current.map((entry) => (entry.id === chatId ? { ...entry, label } : entry));
  writeSimulationChats(next);
};

export const removeStoredSimulation = (chatId: string) => {
  if (typeof window === 'undefined') return;
  const current = readSimulationChats();
  const next = current.filter((entry) => entry.id !== chatId);
  writeSimulationChats(next);
};
