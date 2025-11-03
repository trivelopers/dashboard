import React, { useCallback, useEffect, useRef, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { useNavigate } from 'react-router-dom';
import GradientSection from '../components/GradientSection';
import Spinner from '../components/Spinner';
import api from '../services/api';
import {
  DEFAULT_SIMULATION_CHAT_ID,
  SimulationChatEntry,
  readSimulationChats,
  writeSimulationChats,
} from '../utils/simulationStorage';

const SIMULATION_SERVICE_KEY_HEADER = 'x-api-key';
const SIMULATION_SERVICE_KEY_VALUE = 'x-api-key';
const SIMULATION_DEFAULT_PLATFORM: 'web' | 'whatsapp' | 'telegram' | 'facebook' | 'instagram' = 'web';

const generateSimulationChatId = () => {
  if (typeof crypto !== 'undefined' && typeof crypto.randomUUID === 'function') {
    return crypto.randomUUID().replace(/-/g, '').slice(0, 24);
  }

  return Math.random().toString(16).slice(2).padEnd(24, '0').slice(0, 24);
};

const TestAssistantSimulations: React.FC = () => {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const clientIdEnv = import.meta.env?.VITE_CLIENT_ID as string | undefined;
  const [simulationChats, setSimulationChats] = useState<SimulationChatEntry[]>(() => readSimulationChats());
  const [chatListError, setChatListError] = useState<string | null>(null);
  const [isCreatingSimulation, setIsCreatingSimulation] = useState(false);
  const hasHydratedSimulationsRef = useRef(false);

  useEffect(() => {
    hasHydratedSimulationsRef.current = true;
  }, []);

  useEffect(() => {
    if (!hasHydratedSimulationsRef.current) return;

    try {
      writeSimulationChats(simulationChats);
    } catch (error) {
      console.error('Error persisting simulation chats:', error);
      setChatListError(
        t(
          'testAssistant.simulationPersistError',
          'No se pudo guardar la lista de simulaciones. Los cambios podrían perderse al recargar.',
        ),
      );
    }
  }, [simulationChats, t]);

  const handleCreateSimulation = useCallback(async () => {
    if (isCreatingSimulation) return;

    setIsCreatingSimulation(true);
    setChatListError(null);

    try {
      const platformChatId = generateSimulationChatId();
      const username = `sim-${platformChatId.slice(-8)}`;

      let chatData: any = null;
      let contactData: any = null;
      let resolvedChatId: string | null = null;
      let fallbackUsed = false;

      try {
        const simulateResponse = await api.post('/dashboard/chats/simulate', {
          platform: SIMULATION_DEFAULT_PLATFORM,
          platformChatId,
          username,
        });

        chatData = simulateResponse.data?.chat ?? null;
        contactData = simulateResponse.data?.contact ?? chatData?.contact ?? null;
        resolvedChatId = chatData?.id ?? chatData?._id ?? null;
      } catch (simulateError: unknown) {
        const status = (simulateError as any)?.response?.status ?? null;
        if (status === 404) {
          fallbackUsed = true;
        } else {
          throw simulateError;
        }
      }

      if (!resolvedChatId) {
        if (!fallbackUsed) {
          throw new Error('Chat data missing in response');
        }

        if (!clientIdEnv) {
          throw new Error('No se pudo crear la simulación porque falta configurar el clientId (VITE_CLIENT_ID).');
        }

        const fallbackResponse = await api.post(
          '/dashboard/chats/find-or-create',
          {
            platform: SIMULATION_DEFAULT_PLATFORM,
            platformChatId,
            username,
            clientId: clientIdEnv,
          },
          {
            headers: {
              [SIMULATION_SERVICE_KEY_HEADER]: SIMULATION_SERVICE_KEY_VALUE,
            },
          },
        );

        chatData = fallbackResponse.data?.chat ?? null;
        contactData = fallbackResponse.data?.contact ?? chatData?.contact ?? null;
        resolvedChatId = chatData?.id ?? chatData?._id ?? null;
      }

      if (!resolvedChatId) {
        throw new Error('Chat ID missing');
      }

      const resolvedContactId =
        (contactData && typeof contactData === 'object' && (contactData.id || contactData._id)) ||
        (typeof contactData === 'string' ? contactData : null) ||
        null;

      let displayName = 'Contacto de simulación';
      if (contactData && typeof contactData === 'object') {
        displayName =
          contactData.name ||
          contactData.username ||
          contactData.displayName ||
          contactData.phoneNumber ||
          contactData.platformChatId ||
          username;
      } else if (typeof contactData === 'string') {
        displayName = contactData;
      } else if (resolvedContactId) {
        displayName = resolvedContactId;
      } else {
        displayName = username;
      }

      const entryLabel = displayName !== resolvedContactId ? displayName : null;

      setSimulationChats((prev) => {
        const withoutDuplicate = prev.filter((entry) => entry.id !== resolvedChatId);
        return [{ id: resolvedChatId, label: entryLabel }, ...withoutDuplicate];
      });

      navigate(`/test-assistant/${resolvedChatId}`);
    } catch (error) {
      console.error('Error creating simulation chat:', error);
      setChatListError(
        t('testAssistant.simulationCreateError', 'No se pudo crear la nueva simulación. Intenta nuevamente.'),
      );
    } finally {
      setIsCreatingSimulation(false);
    }
  }, [clientIdEnv, isCreatingSimulation, navigate, t]);

  const handleOpenSimulation = (chatId: string) => {
    navigate(`/test-assistant/${chatId}`);
  };

  const description = simulationChats.length
    ? t(
        'testAssistant.simulationListDescription',
        'Selecciona una simulación para revisar la conversación de prueba o crea un nuevo contacto simulado.',
      )
    : t(
        'testAssistant.simulationListEmptyDescription',
        'Aún no hay simulaciones de prueba. Genera la primera para comenzar a validar tus flujos.',
      );

  return (
    <GradientSection
      title={t('testAssistant.title', 'Simulador de conversación real')}
      description={description}
      contentClassName="space-y-6"
    >
      <div className="rounded-2xl border border-brand-border/60 bg-white/90 p-6 shadow-brand-soft">
        <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <p className="text-sm font-semibold text-brand-dark">
              {t('testAssistant.simulationListTitle', 'Simulaciones disponibles')}
            </p>
            <p className="text-xs text-brand-muted">
              {t('testAssistant.simulationListHint', 'Haz clic en una simulación para abrir su historial.')}
            </p>
          </div>
          <button
            type="button"
            onClick={handleCreateSimulation}
            disabled={isCreatingSimulation}
            className="inline-flex items-center gap-2 rounded-lg border border-brand-primary/30 bg-white px-3 py-2 text-xs font-semibold text-brand-primary shadow-sm transition hover:bg-brand-primary/10 disabled:cursor-not-allowed disabled:opacity-60 sm:text-sm"
          >
            {isCreatingSimulation ? (
              <>
                <Spinner small /> {t('testAssistant.creatingSimulation', 'Creando...')}
              </>
            ) : (
              t('testAssistant.newSimulation', 'Nueva simulación')
            )}
          </button>
        </div>

        {chatListError && (
          <div className="mt-4 rounded-lg border border-amber-200 bg-amber-50 px-4 py-3 text-xs text-amber-700">
            {chatListError}
          </div>
        )}

        <div className="mt-6 flex flex-wrap gap-3">
          {simulationChats.map((chat, index) => {
            const displayName =
              chat.label ??
              t('testAssistant.simulationDefaultName', 'Simulación {{index}}', {
                index: index + 1,
              });
            const subtitle = chat.id === DEFAULT_SIMULATION_CHAT_ID ? 'predeterminada' : chat.id;

            return (
              <button
                key={chat.id}
                type="button"
                onClick={() => handleOpenSimulation(chat.id)}
                className="flex min-w-[200px] flex-col gap-1 rounded-xl border border-brand-border/70 bg-white px-4 py-3 text-left shadow-sm transition hover:border-brand-primary/40 hover:bg-brand-primary/5"
              >
                <span className="text-sm font-semibold text-brand-dark">{displayName}</span>
                <span className="break-all text-xs text-brand-muted">{subtitle}</span>
              </button>
            );
          })}
          {simulationChats.length === 0 && (
            <div className="w-full rounded-xl border border-dashed border-brand-border/60 bg-white px-4 py-8 text-center text-sm text-brand-muted">
              {t('testAssistant.noSimulations', 'Todavía no hay simulaciones creadas.')}
            </div>
          )}
        </div>
      </div>
    </GradientSection>
  );
};

export default TestAssistantSimulations;
