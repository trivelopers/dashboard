import React, {
  FormEvent,
  KeyboardEvent,
  useCallback,
  useEffect,
  useRef,
  useState,
} from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import GradientSection from '../components/GradientSection';
import { Message } from '../types';
import Spinner from '../components/Spinner';
import api from '../services/api';
import { readSimulationChats, updateStoredSimulationLabel } from '../utils/simulationStorage';

const TEST_WEBHOOK_URL = 'https://18-116-178-41.nip.io/webhook/test/client-message';
const DEFAULT_SIMULATION_FROM = '5492222222222';
const DEFAULT_SIMULATION_NAME = 'Cliente Falso';

// --- Funciones auxiliares (sin cambios)
const formatApiMessage = (message: any): Message | null => {
  if (!message) return null;
  const timestamp = message.timestamp || message.createdAt || message.updatedAt || null;
  const id = message.id || message._id;
  if (!id) return null;
  const rawSender =
    typeof message.sender === 'string'
      ? message.sender.toLowerCase()
      : typeof message.role === 'string'
      ? message.role.toLowerCase()
      : typeof message.from === 'string'
      ? message.from.toLowerCase()
      : null;
  let role: Message['role'] = 'assistant';
  if (rawSender === 'user' || rawSender === 'contact') role = 'user';
  else if (rawSender === 'admin' || rawSender === 'administrator') role = 'admin';
  return { id, role, text: message.text || '', timestamp, sender: rawSender };
};

const mergeMessageLists = (serverMessages: Message[], pendingMessages: Message[]): Message[] => {
  const combined = [...serverMessages, ...pendingMessages];
  const byId = new Map<string, Message>();
  for (const msg of combined) if (msg?.id) byId.set(msg.id, msg);
  const merged = Array.from(byId.values());
  merged.sort((a, b) => {
    const timeA = a.timestamp ? new Date(a.timestamp).getTime() : 0;
    const timeB = b.timestamp ? new Date(b.timestamp).getTime() : 0;
    return timeA - timeB;
  });
  return merged;
};

// --- Componente principal
const TestAssistant: React.FC = () => {
  const { t } = useTranslation();
  const { chatId } = useParams<{ chatId?: string }>();
  const navigate = useNavigate();
  const [activeChatId, setActiveChatId] = useState<string | null>(null);
  const [isKnownSimulation, setIsKnownSimulation] = useState(true);
  const [messages, setMessages] = useState<Message[]>([]);
  const [pendingMessagesState, setPendingMessagesState] = useState<Message[]>([]);
  const [clientMessage, setClientMessage] = useState('');
  const [isSendingClient, setIsSendingClient] = useState(false);
  const [clientError, setClientError] = useState<string | null>(null);
  const [isLoadingHistory, setIsLoadingHistory] = useState(true);
  const [historyError, setHistoryError] = useState<string | null>(null);
  const [contactDisplayName, setContactDisplayName] = useState<string | null>(null);
  const [contactId, setContactId] = useState<string | null>(null);
  const [currentChatId, setCurrentChatId] = useState<string | null>(null);
  const [historyReloadToken, setHistoryReloadToken] = useState(0);
  const [assistantPlaceholderId, setAssistantPlaceholderId] = useState<string | null>(null);
  const [assistantPlaceholderMessage, setAssistantPlaceholderMessage] = useState<Message | null>(null);
  const [isAssistantTyping, setIsAssistantTyping] = useState(false);
  const [isClearingHistory, setIsClearingHistory] = useState(false);
  const [resetError, setResetError] = useState<string | null>(null);
  const chatEndRef = useRef<HTMLDivElement>(null);
  const serverMessagesRef = useRef<Message[]>([]);
  const pendingMessagesRef = useRef<Message[]>([]);
  const lastServerMessageIdRef = useRef<string | null>(null);
  const pendingClientMessageIdRef = useRef<string | null>(null);
  const pendingClientMessageSentAtRef = useRef<number | null>(null);
  const pendingClientMessageTextRef = useRef<string | null>(null);
  const historyReloadTimeoutRef = useRef<number | null>(null);
  const previousSimulationIdRef = useRef<string | null>(null);
  const historyReloadAttemptsRef = useRef(0);

  useEffect(() => {
    if (!chatId) {
      navigate('/test-assistant', { replace: true });
      return;
    }
    setActiveChatId(chatId);
    const storedChats = readSimulationChats();
    setIsKnownSimulation(storedChats.some((entry) => entry.id === chatId));
  }, [chatId, navigate]);

  useEffect(() => {
    return () => {
      if (historyReloadTimeoutRef.current !== null && typeof window !== 'undefined') {
        window.clearTimeout(historyReloadTimeoutRef.current);
      }
    };
  }, []);

  const sectionDescription = contactId
    ? t(
        'testAssistant.descriptionWithContact',
        'Historial de prueba para {{contactName}} (ID: {{contactId}}). EnvÃ­a mensajes para validar el flujo.',
        { contactName: contactDisplayName ?? contactId, contactId }
      )
    : activeChatId
    ? t(
        'testAssistant.descriptionWithChat',
        'SimulaciÃ³n activa con chat ID {{chatId}}. EnvÃ­a mensajes de prueba para revisar el flujo.',
        { chatId: activeChatId },
      )
    : t('testAssistant.description', 'EnvÃ­a mensajes de prueba como cliente y visualiza el hilo de la conversaciÃ³n.');

  const applyMergedMessages = useCallback(() => {
    setMessages(mergeMessageLists(serverMessagesRef.current, pendingMessagesRef.current));
  }, []);

  const setServerMessages = useCallback((nextMessages: Message[]) => {
    serverMessagesRef.current = nextMessages;
    lastServerMessageIdRef.current = nextMessages.length ? nextMessages[nextMessages.length - 1]?.id ?? null : null;
    applyMergedMessages();
  }, [applyMergedMessages]);

  const setPendingMessages = useCallback(
    (update: Message[] | ((prev: Message[]) => Message[])) => {
      const resolved =
        typeof update === 'function'
          ? (update as (prev: Message[]) => Message[])(pendingMessagesRef.current)
          : update;
      pendingMessagesRef.current = resolved;
      setPendingMessagesState(resolved);
      applyMergedMessages();
    },
    [applyMergedMessages]
  );

  // Simulation list is handled in the selection view.

  // --- Hooks y funciones de carga / envÃ­o (idÃ©nticos al original) ---
  useEffect(() => {
    if (!activeChatId) return;

    let isCancelled = false;
    const isSelectionChange = previousSimulationIdRef.current !== activeChatId;
    previousSimulationIdRef.current = activeChatId;

    const resetStateForSelection = () => {
      setServerMessages([]);
      setPendingMessages([]);
      setMessages([]);
      setContactId(null);
      setContactDisplayName(null);
      setCurrentChatId(null);
      setClientError(null);
      setClientMessage('');
      setHistoryError(null);
      setResetError(null);
      setAssistantPlaceholderId(null);
      setAssistantPlaceholderMessage(null);
      setIsAssistantTyping(false);
      pendingClientMessageIdRef.current = null;
      pendingClientMessageSentAtRef.current = null;
      pendingClientMessageTextRef.current = null;
      historyReloadAttemptsRef.current = 0;
      if (typeof window !== 'undefined' && historyReloadTimeoutRef.current !== null) {
        window.clearTimeout(historyReloadTimeoutRef.current);
        historyReloadTimeoutRef.current = null;
      }
    };

    if (isSelectionChange) {
      resetStateForSelection();
    } else {
      setHistoryError(null);
    }

    setIsLoadingHistory(true);

    const fetchHistory = async () => {
      try {
        setHistoryError(null);
        setResetError(null);

        const chatResponse = await api.get(`/dashboard/chats/${activeChatId}`);
        const chatData = chatResponse.data?.chat;
        if (!chatData) throw new Error('Chat not found');

        if (isCancelled) return;

        const resolvedChatId = chatData.id ?? chatData._id ?? activeChatId;
        setCurrentChatId(resolvedChatId);
        const contactData = chatData.contact ?? null;
        const resolvedContactId =
          (typeof contactData === 'object' && (contactData.id || contactData._id)) ||
          (typeof contactData === 'string' ? contactData : null);
        if (!resolvedContactId) throw new Error('Contact id missing');
        setContactId(resolvedContactId);
        let displayName = 'Contacto de prueba';
        if (contactData && typeof contactData === 'object') {
          displayName =
            contactData.name ||
            contactData.username ||
            contactData.displayName ||
            contactData.phoneNumber ||
            contactData.platformChatId ||
            resolvedContactId;
        } else if (typeof contactData === 'string') displayName = contactData;
        else displayName = resolvedContactId;
        setContactDisplayName(displayName);
        const labelForStorage = displayName === resolvedContactId ? null : displayName;
        updateStoredSimulationLabel(resolvedChatId, labelForStorage);
        setIsKnownSimulation(true);

        const response = await api.get(`/dashboard/contacts/${resolvedContactId}/messages`);
        const apiMessages = response.data.messages || [];
        const formattedMessages = apiMessages
          .map(formatApiMessage)
          .filter((message): message is Message => Boolean(message));
        formattedMessages.sort((a, b) => {
          const timeA = a.timestamp ? new Date(a.timestamp).getTime() : 0;
          const timeB = b.timestamp ? new Date(b.timestamp).getTime() : 0;
          return timeA - timeB;
        });
        if (!isCancelled) {
          historyReloadAttemptsRef.current = 0;
          if (typeof window !== 'undefined' && historyReloadTimeoutRef.current !== null) {
            window.clearTimeout(historyReloadTimeoutRef.current);
            historyReloadTimeoutRef.current = null;
          }
          setServerMessages(formattedMessages);
        }
      } catch (error) {
        if (isCancelled) return;
        console.error('Error fetching test chat history:', error);
        setServerMessages([]);
        setContactId(null);
        setContactDisplayName(null);
        setCurrentChatId(null);

        const status = (error as any)?.response?.status;
        if (status === 404) {
          setHistoryError(null);
          if (typeof window !== 'undefined') {
            if (historyReloadTimeoutRef.current !== null) {
              window.clearTimeout(historyReloadTimeoutRef.current);
              historyReloadTimeoutRef.current = null;
            }
            const shouldRetry =
              historyReloadAttemptsRef.current < 5 &&
              (pendingClientMessageIdRef.current !== null ||
                pendingMessagesRef.current.length > 0 ||
                isSendingClient);
            if (shouldRetry) {
              historyReloadAttemptsRef.current += 1;
              historyReloadTimeoutRef.current = window.setTimeout(() => {
                setHistoryReloadToken(Date.now());
              }, 1500);
            }
          }
        } else {
          historyReloadAttemptsRef.current = 0;
          if (typeof window !== 'undefined' && historyReloadTimeoutRef.current !== null) {
            window.clearTimeout(historyReloadTimeoutRef.current);
            historyReloadTimeoutRef.current = null;
          }
          setHistoryError(t('testAssistant.historyError', 'No se pudo obtener el historial de prueba.'));
        }

      } finally {
        if (!isCancelled) {
          setIsLoadingHistory(false);
        }
      }
    };

    fetchHistory();

    return () => {
      isCancelled = true;
    };
  }, [
    historyReloadToken,
    isSendingClient,
    activeChatId,
    setHistoryReloadToken,
    setPendingMessages,
    setServerMessages,
    t,
  ]);

  useEffect(() => {
    chatEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  const handleSendClientMessage = async (
    event: FormEvent<HTMLFormElement> | KeyboardEvent<HTMLTextAreaElement>
  ) => {
    event.preventDefault();
    const trimmed = clientMessage.trim();
    if (!trimmed || isSendingClient) return;
    if (!activeChatId) {
      setClientError(
        t(
          'testAssistant.simulationRequired',
          'Selecciona o crea una simulaciÃ³n antes de enviar mensajes.',
        ),
      );
      return;
    }

    const now = new Date();
    const userMessage: Message = {
      id: 'client-' + now.toISOString(),
      role: 'user',
      text: trimmed,
      timestamp: now.toISOString(),
    };

    const placeholder: Message = {
      id: 'assistant-pending-' + now.getTime(),
      role: 'assistant',
      text: t('testAssistant.assistantPlaceholder', 'El asistente estÃ¡ preparando la respuesta...'),
      timestamp: new Date(now.getTime() + 1).toISOString(),
    };

    setPendingMessages((prev) => [...prev, userMessage, placeholder]);
    setClientMessage('');
    setIsSendingClient(true);
    setAssistantPlaceholderId(placeholder.id);
    setAssistantPlaceholderMessage(placeholder);
    setIsAssistantTyping(true);
    setClientError(null);
    pendingClientMessageIdRef.current = userMessage.id;
    pendingClientMessageSentAtRef.current = now.getTime();
    pendingClientMessageTextRef.current = trimmed;

    try {
      await fetch(TEST_WEBHOOK_URL, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          from: DEFAULT_SIMULATION_FROM,
          text: trimmed,
          name: DEFAULT_SIMULATION_NAME,
          tipo: 'testing',
          chatId: activeChatId,
        }),
      });
      if (typeof window !== 'undefined') {
        if (historyReloadTimeoutRef.current !== null) {
          window.clearTimeout(historyReloadTimeoutRef.current);
        }
        historyReloadAttemptsRef.current = 0;
        historyReloadTimeoutRef.current = window.setTimeout(() => {
          setHistoryReloadToken(Date.now());
        }, 1000);
      }
    } catch (error) {
      console.error('Error sending client test message:', error);
      setClientError(t('testAssistant.clientError', 'No se pudo enviar el mensaje de prueba.'));
    } finally {
      setIsSendingClient(false);
    }
  };

  const handleClientMessageKeyDown = (event: KeyboardEvent<HTMLTextAreaElement>) => {
    if (event.key === 'Enter' && !event.shiftKey) {
      event.preventDefault();
      handleSendClientMessage(event);
    }
  };

  useEffect(() => {
    if (!contactId) return;

    let isCancelled = false;
    let timeoutId: ReturnType<typeof setTimeout> | undefined;

    const fetchAndSync = async () => {
      try {
        const response = await api.get(`/dashboard/contacts/${contactId}/messages`);
        const apiMessages = response.data.messages || [];
        const formattedMessages = apiMessages
          .map(formatApiMessage)
          .filter((message): message is Message => Boolean(message));
        formattedMessages.sort((a, b) => {
          const timeA = a.timestamp ? new Date(a.timestamp).getTime() : 0;
          const timeB = b.timestamp ? new Date(b.timestamp).getTime() : 0;
          return timeA - timeB;
        });
        setServerMessages(formattedMessages);

        if (assistantPlaceholderId) {
          const placeholderTime = assistantPlaceholderMessage?.timestamp
            ? new Date(assistantPlaceholderMessage.timestamp).getTime()
            : null;
          const hasAssistantReply = formattedMessages.some((msg) => {
            if (msg.role !== 'assistant') return false;
            if (!placeholderTime) return true;
            const messageTime = msg.timestamp ? new Date(msg.timestamp).getTime() : null;
            return messageTime === null || messageTime >= placeholderTime;
          });

          if (hasAssistantReply) {
            setPendingMessages((prev) =>
              prev.filter(
                (msg) =>
                  msg.id !== assistantPlaceholderId &&
                  !msg.id.startsWith('client-') &&
                  msg.id !== pendingClientMessageIdRef.current
              )
            );
            setAssistantPlaceholderId(null);
            setAssistantPlaceholderMessage(null);
            setIsAssistantTyping(false);
            pendingClientMessageIdRef.current = null;
            pendingClientMessageSentAtRef.current = null;
            pendingClientMessageTextRef.current = null;
          }
        } else if (pendingClientMessageIdRef.current) {
          const pendingText = pendingClientMessageTextRef.current?.trim() ?? '';
          const pendingSentAt = pendingClientMessageSentAtRef.current ?? 0;
          const hasUserEcho = formattedMessages.some((msg) => {
            if (msg.role !== 'user') return false;
            const messageTime = msg.timestamp ? new Date(msg.timestamp).getTime() : 0;
            if (pendingText && msg.text?.trim() === pendingText) return true;
            return messageTime >= pendingSentAt;
          });

          if (hasUserEcho) {
            setPendingMessages((prev) => prev.filter((msg) => !msg.id.startsWith('client-')));
            pendingClientMessageIdRef.current = null;
            pendingClientMessageSentAtRef.current = null;
            pendingClientMessageTextRef.current = null;
          }
        }
      } catch (error) {
        if (!isCancelled) {
          console.error('Error syncing test messages:', error);
        }
      } finally {
        if (!isCancelled) {
          timeoutId = setTimeout(fetchAndSync, isAssistantTyping ? 1500 : 4000);
        }
      }
    };

    fetchAndSync();

    return () => {
      isCancelled = true;
      if (timeoutId) clearTimeout(timeoutId);
    };
  }, [
    assistantPlaceholderId,
    assistantPlaceholderMessage,
    contactId,
    isAssistantTyping,
    setPendingMessages,
    setServerMessages,
  ]);

  const handleResetSimulation = useCallback(async () => {
    if (isClearingHistory) return;

    const confirmMessage = t(
      'testAssistant.resetConfirm',
      'Â¿Deseas reiniciar la simulaciÃ³n? Esto borrarÃ¡ todos los mensajes de la conversaciÃ³n actual.',
    );
    const confirmed = typeof window === 'undefined' ? true : window.confirm(confirmMessage);
    if (!confirmed) return;

    const targetChatId = currentChatId ?? activeChatId;
    if (!targetChatId && !contactId) {
      setResetError(t('testAssistant.resetError', 'No se pudo limpiar el historial de prueba.'));
      return;
    }

    setIsClearingHistory(true);
    setResetError(null);

    try {
      let primaryDeletionError: unknown = null;

      if (targetChatId) {
        try {
          await api.delete(`/dashboard/chats/${targetChatId}/messages`);
        } catch (error) {
          console.warn('Error deleting chat messages, attempting contact fallback.', error);
          primaryDeletionError = error;
        }
      }

      if ((primaryDeletionError || !targetChatId) && contactId) {
        await api.delete(`/dashboard/contacts/${contactId}/messages`);
        primaryDeletionError = null;
      }

      if (primaryDeletionError) {
        throw primaryDeletionError;
      }

      setServerMessages([]);
      setPendingMessages([]);
      setAssistantPlaceholderId(null);
      setAssistantPlaceholderMessage(null);
      setIsAssistantTyping(false);
      historyReloadAttemptsRef.current = 0;
      if (typeof window !== 'undefined' && historyReloadTimeoutRef.current !== null) {
        window.clearTimeout(historyReloadTimeoutRef.current);
        historyReloadTimeoutRef.current = null;
      }
      setHistoryReloadToken(Date.now());
    } catch (error) {
      console.error('Error clearing test chat history:', error);
      setResetError(t('testAssistant.resetError', 'No se pudo limpiar el historial de prueba.'));
    } finally {
      setIsClearingHistory(false);
    }
  }, [
    contactId,
    currentChatId,
    isClearingHistory,
    activeChatId,
    setHistoryReloadToken,
    setAssistantPlaceholderId,
    setAssistantPlaceholderMessage,
    setPendingMessages,
    setServerMessages,
    setIsAssistantTyping,
    t,
  ]);

  const hasAnyMessages = messages.length > 0 || pendingMessagesState.length > 0;

  // --- Render ---
  return (
    <GradientSection
      title={t('testAssistant.title', 'Simulador de conversaciÃ³n real')}
      description={sectionDescription}
      contentClassName="space-y-6"
    >
      <div className="flex h-[calc(100vh-12rem)] flex-col rounded-2xl border border-brand-border/60 bg-white/85 shadow-brand-soft backdrop-blur">
        {/* Encabezado */}
        <div className="border-b border-brand-border/60 bg-white/70 px-6 py-4">
          <div className="flex flex-col gap-4">
            <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
              <div>
                <p className="text-sm font-semibold text-brand-dark">
                  {t('testAssistant.historyHeading', 'Historial de la simulaciÃ³n')}
                </p>
                <p className="text-xs text-brand-muted">
                  {t('testAssistant.resetNotice', 'Reinicia la simulaciÃ³n para borrar los mensajes conservando el mismo chat.')}
                </p>
              </div>
              <button
                type="button"
                onClick={handleResetSimulation}
                disabled={
                  isClearingHistory ||
                  isLoadingHistory ||
                  !hasAnyMessages ||
                  (!contactId && !currentChatId && !activeChatId)
                }
                className="inline-flex items-center gap-2 rounded-xl border border-brand-primary/20 bg-white px-4 py-2 text-xs font-semibold text-brand-primary shadow-sm transition hover:bg-brand-primary/10 disabled:cursor-not-allowed disabled:opacity-60 sm:text-sm"
              >
                {isClearingHistory ? (
                  <>
                    <Spinner small /> {t('testAssistant.resetting', 'Reiniciando...')}
                  </>
                ) : (
                  t('testAssistant.resetButton', 'Reiniciar simulaciÃ³n')
                )}
              </button>
            </div>

            <div className="flex flex-col gap-3">
              <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
                <p className="text-xs font-semibold uppercase tracking-wide text-brand-muted">
                  {t('testAssistant.activeSimulationLabel', 'SimulaciÃ³n seleccionada')}
                </p>
                <button
                  type="button"
                  onClick={() => navigate('/test-assistant')}
                  className="inline-flex items-center gap-2 rounded-lg border border-brand-primary/30 bg-white px-3 py-2 text-xs font-semibold text-brand-primary shadow-sm transition hover:bg-brand-primary/10 sm:text-sm"
                >
                  {t('testAssistant.backToList', 'Ver todas las simulaciones')}
                </button>
              </div>

              {!isKnownSimulation && (
                <div className="rounded-lg border border-amber-200 bg-amber-50 px-4 py-3 text-xs text-amber-700">
                  {t(
                    'testAssistant.unknownSimulation',
                    'Este chat no estÃ¡ en la lista local. Puedes volver a la lista para sincronizarlo.',
                  )}
                </div>
              )}

              {activeChatId && (
                <div className="rounded-xl border border-brand-border/70 bg-white px-4 py-3 text-xs text-brand-dark shadow-sm">
                  <p className="font-semibold text-brand-primary">{activeChatId}</p>
                  <p className="text-brand-muted">
                    {t(
                      'testAssistant.simulationHint',
                      'Los mensajes que envÃ­es aquÃ­ solo afectarÃ¡n a esta simulaciÃ³n.',
                    )}
                  </p>
                </div>
              )}
            </div>
          </div>
        </div>
        {resetError && (
          <div className="mx-6 mt-3 rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-600">
            {resetError}
          </div>
        )}

        {/* Mensajes */}
        <div className="flex-1 space-y-4 overflow-y-auto bg-brand-background/80 p-6">
          {isLoadingHistory ? (
            <div className="flex h-full flex-col items-center justify-center space-y-4 text-sm text-brand-muted">
              <Spinner />
              <span>{t('testAssistant.loadingHistory', 'Cargando historial de prueba...')}</span>
            </div>
          ) : messages.length > 0 ? (
            messages.map((msg) => {
              const isUser = msg.role === 'user';
              const isPendingAssistant = msg.id === assistantPlaceholderId && isAssistantTyping;
              const label = isUser
                ? t('testAssistant.clientLabel', 'Cliente de prueba')
                : t('testAssistant.botLabel', 'Asistente');
              return (
                <div key={msg.id} className={`flex ${isUser ? 'justify-start' : 'justify-end'}`}>
                  <div
                    className={`max-w-xl space-y-1 rounded-xl px-4 py-3 shadow-sm ${
                      isUser
                        ? 'bg-brand-primary text-white'
                        : 'border border-brand-border/50 bg-white text-brand-dark'
                    }`}
                  >
                    <p className={`text-xs font-semibold uppercase tracking-wide ${isUser ? 'text-white/70' : 'text-brand-muted'}`}>
                      {label}
                    </p>
                    <p className="text-sm leading-relaxed">
                      {isPendingAssistant ? (
                        <span className="flex items-center gap-2">
                          <span className="inline-block h-3 w-3 animate-spin rounded-full border-2 border-brand-primary/30 border-t-brand-primary" />
                          <span>{msg.text}</span>
                        </span>
                      ) : (
                        msg.text
                      )}
                    </p>
                  </div>
                </div>
              );
            })
          ) : (
            <div className="flex h-full items-center justify-center text-sm text-brand-muted">
              {t('testAssistant.noMessages', 'TodavÃ­a no hay mensajes de prueba.')}
            </div>
          )}
          <div ref={chatEndRef} />
          {historyError && (
            <div className="rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-600">{historyError}</div>
          )}
        </div>

        {/* Input del cliente (Ãºnico, a todo ancho y con colores del cliente) */}
        <div className="border-t border-brand-border/60 bg-white/80 px-6 py-6">
          <div className="border-t border-brand-border/40 bg-white/90 px-6 py-4 backdrop-blur-sm">
            <form onSubmit={handleSendClientMessage} className="flex flex-col gap-3">
              <label className="text-sm font-medium text-brand-dark">
                {t('testAssistant.clientInputTitle', 'Mensaje de prueba')}
              </label>

              <textarea
                className="w-full resize-none rounded-xl border border-brand-border/50 bg-white px-4 py-3 text-sm text-brand-dark placeholder-brand-muted focus:border-brand-primary focus:ring-2 focus:ring-brand-primary/30 focus:outline-none transition"
                rows={3}
                value={clientMessage}
                onChange={(e) => setClientMessage(e.target.value)}
                onKeyDown={handleClientMessageKeyDown}
                placeholder={t('testAssistant.clientPlaceholder', 'Escribe un mensaje para probar...')}
                disabled={isSendingClient}
              />

              <div className="flex items-center justify-between">
                {clientError && <p className="text-sm text-red-600">{clientError}</p>}

                <button
                  type="submit"
                  disabled={isSendingClient || !clientMessage.trim()}
                  className="inline-flex items-center gap-2 rounded-xl bg-brand-primary px-5 py-2.5 text-sm font-semibold text-white shadow-sm transition hover:bg-brand-primary/90 disabled:cursor-not-allowed disabled:opacity-50"
                >
                  {isSendingClient ? (
                    <>
                      <Spinner small /> {t('testAssistant.clientSending', 'Enviando...')}
                    </>
                  ) : (
                    t('testAssistant.clientSend', 'Enviar')
                  )}
                </button>
              </div>
            </form>
          </div>
        </div>
      </div>
    </GradientSection>
  );
};

export default TestAssistant;


