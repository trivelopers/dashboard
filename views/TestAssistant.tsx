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
import { Message } from '../types';
import Spinner from '../components/Spinner';
import api from '../services/api';
import { useAuth } from '../hooks/useAuth';
import { readSimulationChats, removeStoredSimulation, updateStoredSimulationLabel } from '../utils/simulationStorage';

const BASE_WEBHOOK_URL = 'https://18-116-178-41.nip.io/webhook/client-message';
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
  const { user } = useAuth();
  const { chatId } = useParams<{ chatId?: string }>();
  const navigate = useNavigate();
  
  // Create webhook URL with client ID
  const webhookUrl = user?.clientId 
    ? `${BASE_WEBHOOK_URL}/${user.clientId}`
    : BASE_WEBHOOK_URL;
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
  const [isDeletingChat, setIsDeletingChat] = useState(false);
  const [deleteError, setDeleteError] = useState<string | null>(null);
  const chatEndRef = useRef<HTMLDivElement>(null);
  const serverMessagesRef = useRef<Message[]>([]);
  const pendingMessagesRef = useRef<Message[]>([]);
  const lastServerMessageIdRef = useRef<string | null>(null);
  const pendingClientMessageIdRef = useRef<string | null>(null);
  const pendingClientMessageSentAtRef = useRef<number | null>(null);
  const pendingClientMessageTextRef = useRef<string | null>(null);
  const fetchHistoryRef = useRef<(() => Promise<void>) | null>(null);
  const historyReloadTimeoutRef = useRef<number | null>(null);
  const previousSimulationIdRef = useRef<string | null>(null);
  const historyReloadAttemptsRef = useRef(0);
  const hasInitialScrollRef = useRef(false);

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

  // --- Hooks y funciones de carga / envío (idénticos al original) ---
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
        const storedSimulations = readSimulationChats();
        const simulationIndex = storedSimulations.findIndex((entry) => entry.id === resolvedChatId);
        const displayName = t('testAssistant.simulationDefaultName', 'Simulación {{index}}', {
          index: simulationIndex >= 0 ? simulationIndex + 1 : storedSimulations.length + 1,
        });
        setContactDisplayName(displayName);
        updateStoredSimulationLabel(resolvedChatId, null);
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

    fetchHistoryRef.current = fetchHistory;
    fetchHistory();

    return () => {
      isCancelled = true;
      fetchHistoryRef.current = null;
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
    if (hasInitialScrollRef.current) return;
    if (!messages.length) return;
    chatEndRef.current?.scrollIntoView({ behavior: 'smooth' });
    hasInitialScrollRef.current = true;
  }, [messages]);

  useEffect(() => {
    if (!isAssistantTyping) return;

    let delay = 10000;
    let timeoutId: ReturnType<typeof setTimeout> | null = null;
    let isCancelled = false;

    const checkAssistantResponse = async () => {
      if (isCancelled) return;

      const fetchHistoryFn = fetchHistoryRef.current;

      if (fetchHistoryFn) {
        try {
          await fetchHistoryFn();
        } catch (error) {
          console.error('Error refreshing assistant history:', error);
        }
      }

      if (isCancelled) return;

      const mergedMessages = mergeMessageLists(
        serverMessagesRef.current,
        pendingMessagesRef.current
      );
      const lastMessage = mergedMessages[mergedMessages.length - 1];
      const assistantResponded =
        lastMessage?.role === 'assistant' && lastMessage.id !== assistantPlaceholderId;

      if (assistantResponded) {
        setIsAssistantTyping(false);
        return;
      }

      delay = 5000;
      timeoutId = setTimeout(checkAssistantResponse, delay);
    };

    timeoutId = setTimeout(checkAssistantResponse, delay);

    return () => {
      isCancelled = true;
      if (timeoutId) clearTimeout(timeoutId);
    };
  }, [assistantPlaceholderId, isAssistantTyping]);

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
          'Selecciona o crea una simulación antes de enviar mensajes.',
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
      text: t('testAssistant.assistantPlaceholder', 'El asistente está preparando la respuesta...'),
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
      await fetch(webhookUrl, {
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

  const handleDeleteChat = useCallback(async () => {
    if (isDeletingChat) return;

    const targetChatId = currentChatId ?? activeChatId;
    if (!targetChatId) return;

    setDeleteError(null);
    setIsDeletingChat(true);

    try {
      await api.delete(`/dashboard/chats/${targetChatId}`);
      removeStoredSimulation(targetChatId);
      navigate('/test-assistant');
    } catch (error) {
      console.error('Error deleting simulation chat:', error);
      setDeleteError(
        t('testAssistant.deleteChatError', 'No se pudo eliminar la simulación. Intenta nuevamente.'),
      );
    } finally {
      setIsDeletingChat(false);
    }
  }, [activeChatId, currentChatId, isDeletingChat, navigate, removeStoredSimulation, t]);

  // --- Render ---
  return (
    <div className="-mx-4 flex h-full min-h-0 flex-1 flex-col overflow-hidden md:-mx-8">
      <section className="flex h-full min-h-0 w-full flex-col overflow-hidden rounded-2xl border border-brand-border/60 bg-white/95 shadow-brand-soft backdrop-blur">
        <header className="flex-shrink-0 border-b border-brand-border/50 bg-gradient-to-r from-white to-brand-primary/5 px-6 py-4 sm:px-10 sm:py-5">
          <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
            <div className="flex items-center justify-start">
                <button
                  type="button"
                  onClick={() => navigate('/test-assistant')}
                  className="inline-flex items-center gap-2 rounded-xl border border-brand-primary/30 bg-white/80 px-4 py-2 text-xs font-semibold text-brand-primary shadow-sm transition hover:bg-brand-primary/10"
                >
                  <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor" className="h-4 w-4">
                    <path
                      fillRule="evenodd"
                      d="M7.22 4.22a.75.75 0 0 1 1.06 0l4.5 4.5a.75.75 0 0 1 0 1.06l-4.5 4.5a.75.75 0 0 1-1.06-1.06L10.94 10l-3.72-3.72a.75.75 0 0 1 0-1.06Z"
                      clipRule="evenodd"
                    />
                  </svg>
                  {t('testAssistant.backToList', 'Ver todas las simulaciones')}
                </button>
            </div>
            <div className="flex flex-col gap-2 text-center md:flex-1">
                <p className="text-xs font-semibold uppercase tracking-[0.3em] text-brand-muted">
                  {t('testAssistant.simulationLabel', 'Simulación')}
                </p>
              <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-center sm:gap-3">
                  <p className="text-lg font-semibold text-brand-dark">
                    {contactDisplayName ?? t('testAssistant.clientLabel', 'Cliente de prueba')}
                  </p>
                  <div className="flex items-center gap-3 rounded-full bg-brand-primary/10 px-4 py-1 text-xs font-semibold text-brand-primary">
                    <span className="h-2 w-2 rounded-full bg-emerald-500" />
                    {isAssistantTyping
                      ? t('testAssistant.typing', 'El asistente está respondiendo...')
                      : t('testAssistant.ready', 'Listo para probar')}
                  </div>
              </div>
            </div>
            <div className="flex items-center justify-end">
                <button
                  type="button"
                  onClick={handleDeleteChat}
                  disabled={
                    isDeletingChat ||
                    isLoadingHistory ||
                    (!contactId && !currentChatId && !activeChatId)
                  }
                  aria-label={t('testAssistant.deleteSimulation', 'Eliminar simulación')}
                  className="inline-flex h-10 w-10 items-center justify-center rounded-full border border-red-200 bg-white text-red-500 shadow-sm transition hover:bg-red-50 disabled:cursor-not-allowed disabled:opacity-60"
                >
                  {isDeletingChat ? (
                    <Spinner small />
                  ) : (
                    <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor" className="h-5 w-5">
                      <path
                        fillRule="evenodd"
                        d="M8.5 3a1 1 0 0 0-.894.553L7.382 4.5H5a.75.75 0 0 0 0 1.5h10a.75.75 0 0 0 0-1.5h-2.382l-.224-.447A1 1 0 0 0 11.5 3h-3Zm-2.958 4.5a.75.75 0 0 0-.742.651l-.75 6.75A2.25 2.25 0 0 0 6.29 17.5h7.42a2.25 2.25 0 0 0 2.24-2.599l-.75-6.75a.75.75 0 0 0-.742-.651H5.542Z"
                        clipRule="evenodd"
                      />
                    </svg>
                  )}
                </button>
            </div>
          </div>
        </header>

          {(!isKnownSimulation || deleteError) && (
            <div className="space-y-3 border-b border-brand-border/40 bg-white/80 px-6 py-4 text-xs">
              {!isKnownSimulation && (
                <div className="rounded-xl border border-amber-200 bg-amber-50 px-4 py-3 text-amber-700">
                  {t(
                    'testAssistant.unknownSimulation',
                    'Este chat no está en la lista local. Puedes volver a la lista para sincronizarlo.',
                  )}
                </div>
              )}
              {deleteError && (
                <div className="rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-red-600">
                  {deleteError}
                </div>
              )}
            </div>
          )}

          <div className="flex-1 min-h-0 space-y-4 overflow-y-auto bg-brand-background/70 px-4 py-6 sm:px-8 lg:px-12">
            {messages.length > 0 ? (
              messages.map((msg) => {
                const isUser = msg.role === 'user';
                const isPendingAssistant = msg.id === assistantPlaceholderId && isAssistantTyping;
                const label = isUser
                  ? t('testAssistant.clientLabel', 'Cliente de prueba')
                  : t('testAssistant.botLabel', 'Asistente');
                return (
                  <div key={msg.id} className={`flex ${isUser ? 'justify-start' : 'justify-end'}`}>
                    <div
                      className={`max-w-xl space-y-1 rounded-2xl px-4 py-3 shadow-sm ${
                        isUser
                          ? 'bg-brand-primary text-white'
                          : 'border border-brand-border/40 bg-white text-brand-dark'
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
                {t('testAssistant.noMessages', 'Todavía no hay mensajes de prueba.')}
              </div>
            )}
            <div ref={chatEndRef} />
            {historyError && (
              <div className="rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-600">{historyError}</div>
            )}
          </div>

          <div className="flex-shrink-0 border-t border-brand-border/50 bg-white/90 px-6 py-5 sm:px-10">
            <form onSubmit={handleSendClientMessage} className="flex flex-col gap-4">
              <div className="flex flex-col gap-1">
                <label className="text-xs font-semibold uppercase tracking-[0.25em] text-brand-muted">
                  {t('testAssistant.clientInputTitle', 'Mensaje de prueba')}
                </label>
                <p className="text-sm text-brand-muted">
                  {t('testAssistant.clientHelper', 'Redacta tal como lo haría un cliente real.')}
                </p>
              </div>

              <textarea
                className="w-full resize-none rounded-2xl border border-brand-border/50 bg-white px-4 py-3 text-sm text-brand-dark placeholder-brand-muted transition focus:border-brand-primary focus:outline-none focus:ring-2 focus:ring-brand-primary/30"
                rows={3}
                value={clientMessage}
                onChange={(e) => setClientMessage(e.target.value)}
                onKeyDown={handleClientMessageKeyDown}
                placeholder={t('testAssistant.clientPlaceholder', 'Escribe un mensaje para probar...')}
                disabled={isSendingClient}
              />

              <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
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
      </section>
    </div>
  );
};

export default TestAssistant;
