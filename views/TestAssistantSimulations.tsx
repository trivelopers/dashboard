import React, { useCallback, useEffect, useRef, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { useNavigate } from 'react-router-dom';
import GradientSection from '../components/GradientSection';
import Spinner from '../components/Spinner';
import api from '../services/api';
import { SimulationChatEntry, readSimulationChats, writeSimulationChats } from '../utils/simulationStorage';

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
  const [isLoadingSimulations, setIsLoadingSimulations] = useState(false);
  const [isCreatingSimulation, setIsCreatingSimulation] = useState(false);
  const [deletingChatId, setDeletingChatId] = useState<string | null>(null);
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

  useEffect(() => {
    let isCancelled = false;

    const parseTimestamp = (value: unknown): number => {
      if (!value) {
        return 0;
      }
      const date = new Date(value as string | number | Date);
      const timestamp = date.getTime();
      return Number.isNaN(timestamp) ? 0 : timestamp;
    };

    const fetchSimulationChats = async () => {
      setIsLoadingSimulations(true);
      try {
        const response = await api.get('/dashboard/chats', {
          params: { platform: SIMULATION_DEFAULT_PLATFORM },
        });

        if (isCancelled) {
          return;
        }

        const rawChats = Array.isArray(response.data?.chats) ? response.data.chats : [];

        const normalized = rawChats
          .map((chat: any) => {
            const id =
              (typeof chat?.id === 'string' && chat.id.trim()) ||
              (typeof chat?._id === 'string' && chat._id.trim());

            if (!id) {
              return null;
            }

            const contactData = chat?.contact ?? null;
            let label: string | null = null;

            if (contactData && typeof contactData === 'object') {
              label =
                contactData.name ||
                contactData.displayName ||
                contactData.username ||
                contactData.userName ||
                contactData.phoneNumber ||
                contactData.platformChatId ||
                null;
            }

            if (!label && typeof chat?.platformChatId === 'string') {
              label = chat.platformChatId;
            }

            const updatedAt = chat?.updatedAt ?? chat?.createdAt ?? null;

            return { id, label, updatedAt };
          })
          .filter(
            (entry): entry is { id: string; label: string | null; updatedAt: string | null } => Boolean(entry),
          );

        normalized.sort((a, b) => parseTimestamp(b.updatedAt) - parseTimestamp(a.updatedAt));

        if (isCancelled) {
          return;
        }

        const entries = normalized.map(({ id }) => ({ id }));

        setSimulationChats(entries);
        setChatListError(null);
      } catch (error) {
        console.error('Error fetching simulation chats:', error);
        if (!isCancelled) {
          setChatListError(
            t(
              'testAssistant.simulationFetchError',
              'No se pudieron cargar las simulaciones. Actualiza e intenta nuevamente.',
            ),
          );
        }
      } finally {
        if (!isCancelled) {
          setIsLoadingSimulations(false);
        }
      }
    };

    fetchSimulationChats();

    return () => {
      isCancelled = true;
    };
  }, [t]);

  const handleCreateSimulation = useCallback(async () => {
    if (isCreatingSimulation) return;

    setIsCreatingSimulation(true);
    setChatListError(null);

    try {
      const platformChatId = generateSimulationChatId();
      const username = `simulacion-${platformChatId.slice(-5)}`;

      let chatData: any = null;
      let resolvedChatId: string | null = null;
      let fallbackUsed = false;

      try {
        const simulateResponse = await api.post('/dashboard/chats/simulate', {
          platform: SIMULATION_DEFAULT_PLATFORM,
          platformChatId,
          username,
        });

        chatData = simulateResponse.data?.chat ?? null;
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
        resolvedChatId = chatData?.id ?? chatData?._id ?? null;
      }

      if (!resolvedChatId) {
        throw new Error('Chat ID missing');
      }

      setSimulationChats((prev) => {
        const withoutDuplicate = prev.filter((entry) => entry.id !== resolvedChatId);
        return [{ id: resolvedChatId }, ...withoutDuplicate];
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

  const handleDeleteSimulation = useCallback(
    async (chatId: string) => {
      if (!chatId || deletingChatId === chatId) return;

      setChatListError(null);
      setDeletingChatId(chatId);

      try {
        await api.delete(`/dashboard/chats/${chatId}`);
        setSimulationChats((prev) => prev.filter((entry) => entry.id !== chatId));
      } catch (error) {
        console.error('Error deleting simulation chat:', error);
        setChatListError(
          t('testAssistant.simulationDeleteError', 'No se pudo eliminar la simulacion. Intenta nuevamente.'),
        );
      } finally {
        setDeletingChatId(null);
      }
    },
    [deletingChatId, t],
  );

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
      <div className="grid gap-5 lg:grid-cols-[minmax(0,320px)_1fr]">
        <section className="rounded-2xl border border-brand-border/50 bg-gradient-to-br from-white via-white to-brand-primary/5 p-6 shadow-brand-soft">
          <p className="text-xs font-semibold uppercase tracking-[0.18em] text-brand-muted">
            {t('testAssistant.simulationActions', 'Acciones rápidas')}
          </p>
          <h3 className="mt-3 text-lg font-semibold text-brand-dark">
            {t('testAssistant.simulationHeroTitle', 'Gestiona y crea nuevas simulaciones')}
          </h3>
          <p className="mt-2 text-sm text-brand-muted">{description}</p>
          <div className="mt-6 rounded-xl border border-brand-border/40 bg-white/80 px-4 py-3 text-sm text-brand-dark">
            {t('testAssistant.simulationSummary', '{{count}} simulaciones guardadas en este dispositivo.', {
              count: simulationChats.length,
            })}
          </div>
          <div className="mt-6 flex flex-col gap-3">
            <button
              type="button"
              onClick={handleCreateSimulation}
              disabled={isCreatingSimulation}
              className="inline-flex items-center justify-center gap-2 rounded-xl bg-brand-primary px-4 py-3 text-sm font-semibold text-white shadow-md transition hover:bg-brand-primary/90 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-primary/60 disabled:cursor-not-allowed disabled:opacity-70"
            >
              {isCreatingSimulation ? (
                <>
                  <Spinner small /> {t('testAssistant.creatingSimulation', 'Creando...')}
                </>
              ) : (
                <>
                  <svg
                    xmlns="http://www.w3.org/2000/svg"
                    viewBox="0 0 24 24"
                    fill="none"
                    stroke="currentColor"
                    strokeWidth={2}
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    className="h-4 w-4"
                  >
                    <path d="M12 5v14M5 12h14" />
                  </svg>
                  {t('testAssistant.newSimulation', 'Nueva simulación')}
                </>
              )}
            </button>
            <p className="text-xs text-brand-muted">
              {t(
                'testAssistant.simulationSecondaryHint',
                'Cada simulación crea un chat privado para validar respuestas sin afectar clientes reales.',
              )}
            </p>
          </div>
        </section>
        <section className="rounded-2xl border border-brand-border/60 bg-white/95 p-6 shadow-brand-soft">
          <div className="flex flex-col gap-2 md:flex-row md:items-center md:justify-between">
            <div>
              <p className="text-sm font-semibold text-brand-dark">
                {t('testAssistant.simulationListTitle', 'Simulaciones disponibles')}
              </p>
              <p className="text-xs text-brand-muted">
                {t('testAssistant.simulationListHint', 'Haz clic en una simulación para abrir su historial.')}
              </p>
            </div>
            <div className="flex items-center justify-between gap-3 rounded-xl bg-brand-primary/5 px-3 py-2 text-xs text-brand-primary md:text-sm">
              <span className="font-semibold">
                {t('testAssistant.simulationTotalLabel', '{{count}} activas', {
                  count: simulationChats.length,
                })}
              </span>
              <span className="text-brand-muted">{t('testAssistant.simulationTapHint', 'Toque para abrir')}</span>
            </div>
          </div>

          {chatListError && (
            <div className="mt-4 rounded-lg border border-amber-200 bg-amber-50 px-4 py-3 text-xs text-amber-700">
              {chatListError}
            </div>
          )}

          <div className="mt-6 grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
            {isLoadingSimulations ? (
              <div className="col-span-full flex flex-col items-center justify-center rounded-2xl border border-brand-border/60 bg-brand-primary/5 px-6 py-12 text-center text-brand-muted">
                <Spinner />
                <span className="mt-3 text-sm font-medium">
                  {t('testAssistant.loadingSimulations', 'Cargando simulaciones...')}
                </span>
              </div>
            ) : (
              <>
                {simulationChats.map((chat, index) => {
                  const displayName = t('testAssistant.simulationDefaultName', 'Simulación {{index}}', {
                    index: index + 1,
                  });

                  return (
                    <div
                      key={chat.id}
                      className="relative h-full rounded-2xl border border-brand-border/60 bg-white shadow-brand-soft transition hover:-translate-y-0.5 hover:border-brand-primary/40 hover:shadow-lg"
                    >
                      <button
                        type="button"
                        onClick={() => handleOpenSimulation(chat.id)}
                        className="flex h-full w-full flex-col gap-3 rounded-2xl px-4 py-4 text-left"
                      >
                        <div className="flex items-start justify-between gap-3">
                          <span className="text-sm font-semibold text-brand-dark">{displayName}</span>
                          <span className="rounded-full bg-brand-primary/10 px-2 py-0.5 text-[11px] font-semibold uppercase text-brand-primary">
                            {t('testAssistant.simulationBadge', 'Simulación')}
                          </span>
                        </div>
                        <span className="text-xs font-semibold text-brand-primary">
                          {t('testAssistant.openSimulation', 'Abrir conversación')}
                        </span>
                      </button>
                      <button
                        type="button"
                        onClick={(event) => {
                          event.preventDefault();
                          event.stopPropagation();
                          handleDeleteSimulation(chat.id);
                        }}
                        disabled={deletingChatId === chat.id}
                        aria-label={t('testAssistant.deleteSimulation', 'Eliminar simulacion')}
                        className="absolute right-3 top-3 inline-flex h-8 w-8 items-center justify-center rounded-full border border-brand-border/60 bg-white text-brand-muted shadow-sm transition hover:border-red-300 hover:bg-red-50 hover:text-red-500 disabled:cursor-not-allowed disabled:opacity-60"
                      >
                        {deletingChatId === chat.id ? (
                          <Spinner small />
                        ) : (
                          <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor" className="h-4 w-4">
                            <path
                              fillRule="evenodd"
                              d="M8.5 3a1 1 0 0 0-.894.553L7.382 4.5H5a.75.75 0 0 0 0 1.5h10a.75.75 0 0 0 0-1.5h-2.382l-.224-.447A1 1 0 0 0 11.5 3h-3Zm-2.958 4.5a.75.75 0 0 0-.742.651l-.75 6.75A2.25 2.25 0 0 0 6.29 17.5h7.42a2.25 2.25 0 0 0 2.24-2.599l-.75-6.75a.75.75 0 0 0-.742-.651H5.542Z"
                              clipRule="evenodd"
                            />
                          </svg>
                        )}
                      </button>
                    </div>
                  );
                })}
                {simulationChats.length === 0 && (
                  <div className="col-span-full flex flex-col items-center justify-center rounded-2xl border border-dashed border-brand-border/60 bg-brand-primary/5 px-6 py-12 text-center">
                    <p className="text-sm font-semibold text-brand-dark">
                      {t('testAssistant.noSimulations', 'Todavía no hay simulaciones creadas.')}
                    </p>
                    <p className="mt-2 text-xs text-brand-muted">
                      {t('testAssistant.emptyStateHint', 'Crea tu primera simulación para comenzar a validar flujos.')}
                    </p>
                  </div>
                )}
              </>
            )}
          </div>
        </section>
      </div>
    </GradientSection>
  );
};

export default TestAssistantSimulations;
