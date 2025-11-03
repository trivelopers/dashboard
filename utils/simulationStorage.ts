export type SimulationChatEntry = {
  id: string;
  label?: string | null;
};

export const SIMULATION_STORAGE_KEY = 'testAssistant.simulations';
export const DEFAULT_SIMULATION_CHAT_ID = '6907df7ffc87be11d0fccc3c';

const ensureDefaultEntry = (entries: SimulationChatEntry[]): SimulationChatEntry[] => {
  const hasDefault = entries.some((entry) => entry.id === DEFAULT_SIMULATION_CHAT_ID);
  if (hasDefault) return entries;
  return [{ id: DEFAULT_SIMULATION_CHAT_ID, label: null }, ...entries];
};

export const readSimulationChats = (): SimulationChatEntry[] => {
  if (typeof window === 'undefined') {
    return [{ id: DEFAULT_SIMULATION_CHAT_ID, label: null }];
  }

  try {
    const stored = window.localStorage.getItem(SIMULATION_STORAGE_KEY);
    if (!stored) {
      return [{ id: DEFAULT_SIMULATION_CHAT_ID, label: null }];
    }

    const parsed = JSON.parse(stored);
    if (!Array.isArray(parsed)) {
      return [{ id: DEFAULT_SIMULATION_CHAT_ID, label: null }];
    }

    const normalized = parsed
      .map((entry) => {
        if (!entry || typeof entry !== 'object') return null;
        const id = typeof entry.id === 'string' ? entry.id.trim() : '';
        if (!id) return null;
        const label = typeof entry.label === 'string' ? entry.label : null;
        return { id, label };
      })
      .filter((entry): entry is SimulationChatEntry => Boolean(entry));

    if (!normalized.length) {
      return [{ id: DEFAULT_SIMULATION_CHAT_ID, label: null }];
    }

    return ensureDefaultEntry(normalized);
  } catch (error) {
    console.error('Error reading stored simulations:', error);
    return [{ id: DEFAULT_SIMULATION_CHAT_ID, label: null }];
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
