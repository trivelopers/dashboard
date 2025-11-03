import React, { FormEvent, useCallback, useEffect, useRef, useState } from 'react';
import { useTranslation } from 'react-i18next';
import GradientSection from '../components/GradientSection';
import { Message } from '../types';
import Spinner from '../components/Spinner';
import api from '../services/api';

const TEST_WEBHOOK_URL = 'https://18-116-178-41.nip.io/webhook/test/client-message';
const TEST_CHAT_ID = '6907df7ffc87be11d0fccc3c';

const formatApiMessage = (message: any): Message | null => {
  if (!message) {
    return null;
  }

  const timestamp = message.timestamp || message.createdAt || message.updatedAt || null;
  const id = message.id || message._id;

  if (!id) {
    return null;
  }

  const rawSender =
    typeof message.sender === 'string'
      ? message.sender.toLowerCase()
      : typeof message.role === 'string'
      ? message.role.toLowerCase()
      : typeof message.from === 'string'
      ? message.from.toLowerCase()
      : null;

  let role: Message['role'] = 'assistant';
  if (rawSender === 'user' || rawSender === 'contact') {
    role = 'user';
  } else if (rawSender === 'admin' || rawSender === 'administrator') {
    role = 'admin';
  }

  return {
    id,
    role,
    text: message.text || '',
    timestamp,
    sender: rawSender,
  };
};

const mergeMessageLists = (serverMessages: Message[], pendingMessages: Message[]): Message[] => {
  const combined = [...serverMessages, ...pendingMessages];
  const byId = new Map<string, Message>();

  for (const msg of combined) {
    if (!msg?.id) {
      continue;
    }
    byId.set(msg.id, msg);
  }

  const merged = Array.from(byId.values());
  merged.sort((a, b) => {
    const timeA = a.timestamp ? new Date(a.timestamp).getTime() : 0;
    const timeB = b.timestamp ? new Date(b.timestamp).getTime() : 0;
    return timeA - timeB;
  });

  return merged;
};

const TestAssistant: React.FC = () => {
  const { t } = useTranslation();
  const [messages, setMessages] = useState<Message[]>([]);
  const [pendingMessagesState, setPendingMessagesState] = useState<Message[]>([]);
  const [clientMessage, setClientMessage] = useState('');
  const [isSendingClient, setIsSendingClient] = useState(false);
  const [clientError, setClientError] = useState<string | null>(null);
  const [isLoadingHistory, setIsLoadingHistory] = useState(true);
  const [historyError, setHistoryError] = useState<string | null>(null);
  const [contactDisplayName, setContactDisplayName] = useState<string | null>(null);
  const [contactId, setContactId] = useState<string | null>(null);
  const [assistantPlaceholderId, setAssistantPlaceholderId] = useState<string | null>(null);
  const [assistantPlaceholderMessage, setAssistantPlaceholderMessage] = useState<Message | null>(null);
  const [hasLoadedHistory, setHasLoadedHistory] = useState(false);
  const [isAssistantTyping, setIsAssistantTyping] = useState(false);
  const chatEndRef = useRef<HTMLDivElement>(null);
  const serverMessagesRef = useRef<Message[]>([]);
  const pendingMessagesRef = useRef<Message[]>([]);
  const lastServerMessageIdRef = useRef<string | null>(null);
  const pendingClientMessageIdRef = useRef<string | null>(null);
  const pendingClientMessageSentAtRef = useRef<number | null>(null);
  const sectionDescription = contactId
    ? t(
        'testAssistant.descriptionWithContact',
        'Historial de prueba para {{contactName}} (ID: {{contactId}}). Envía mensajes para validar el flujo.',
        {
          contactName: contactDisplayName ?? contactId,
          contactId,
        }
      )
    : t(
        'testAssistant.description',
        'Envía mensajes de prueba como cliente y visualiza el hilo de la conversación.'
      );

  const applyMergedMessages = useCallback(() => {
    setMessages(mergeMessageLists(serverMessagesRef.current, pendingMessagesRef.current));
  }, []);

  const setServerMessages = useCallback((nextMessages: Message[]) => {
    serverMessagesRef.current = nextMessages;
    applyMergedMessages();
  }, [applyMergedMessages]);

  const setPendingMessages = useCallback(
    (update: Message[] | ((prev: Message[]) => Message[])) => {
      const resolved =
        typeof update === 'function' ? (update as (prev: Message[]) => Message[])(pendingMessagesRef.current) : update;
      pendingMessagesRef.current = resolved;
      setPendingMessagesState(resolved);
      applyMergedMessages();
    },
    [applyMergedMessages]
  );

  const reconcilePendingClientMessage = useCallback(
    (serverMessages: Message[]) => {
      const pendingClientId = pendingClientMessageIdRef.current;
      const sentAt = pendingClientMessageSentAtRef.current;

      if (!pendingClientId || sentAt === null) {
        return;
      }

      const hasSynced = serverMessages.some((msg) => {
        if (msg.role !== 'user' || !msg.timestamp) {
          return false;
        }
        const msgTime = new Date(msg.timestamp).getTime();
        if (Number.isNaN(msgTime)) {
          return false;
        }
        return msgTime >= sentAt;
      });

      if (!hasSynced) {
        return;
      }

      setPendingMessages((prev) => prev.filter((msg) => msg.id !== pendingClientId));
      pendingClientMessageIdRef.current = null;
      pendingClientMessageSentAtRef.current = null;
    },
    [setPendingMessages]
  );

  useEffect(() => {
    const fetchHistory = async () => {
      try {
        if (!hasLoadedHistory) {
          setIsLoadingHistory(true);
        }
        setHistoryError(null);
        const chatResponse = await api.get(`/dashboard/chats/${TEST_CHAT_ID}`);
        const chatData = chatResponse.data?.chat;

        if (!chatData) {
          throw new Error('Chat not found');
        }

        const contactData = chatData.contact ?? null;
        const resolvedContactId =
          (typeof contactData === 'object' && (contactData.id || contactData._id)) ||
          (typeof contactData === 'string' ? contactData : null);

        if (!resolvedContactId) {
          throw new Error('Contact id missing');
        }

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
        } else if (typeof contactData === 'string') {
          displayName = contactData;
        } else {
          displayName = resolvedContactId;
        }
        setContactDisplayName(displayName);

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
        setServerMessages(formattedMessages);

        reconcilePendingClientMessage(formattedMessages);
        lastServerMessageIdRef.current =
          formattedMessages.length > 0 ? formattedMessages[formattedMessages.length - 1].id : null;

        if (assistantPlaceholderId && isAssistantTyping) {
          const latestServerMessage = formattedMessages[formattedMessages.length - 1];
          const pendingClientId = pendingClientMessageIdRef.current;

          if (latestServerMessage && latestServerMessage.role !== 'user') {
            setPendingMessages((prev) => {
              const idsToRemove = new Set<string>();
              idsToRemove.add(assistantPlaceholderId);
              if (pendingClientId) {
                idsToRemove.add(pendingClientId);
              }
              return prev.filter((msg) => !idsToRemove.has(msg.id));
            });
            setAssistantPlaceholderId(null);
            setAssistantPlaceholderMessage(null);
            setIsAssistantTyping(false);
            if (pendingClientId) {
              pendingClientMessageIdRef.current = null;
              pendingClientMessageSentAtRef.current = null;
            }
          }
        }
      } catch (error) {
        console.error('Error fetching test chat history:', error);
        setServerMessages([]);
        setContactId(null);
        setContactDisplayName(null);
        setHistoryError(
          t('testAssistant.historyError', 'No se pudo obtener el historial de prueba.')
        );
        setAssistantPlaceholderId(null);
        setAssistantPlaceholderMessage(null);
        setIsAssistantTyping(false);
        pendingClientMessageIdRef.current = null;
        pendingClientMessageSentAtRef.current = null;
        lastServerMessageIdRef.current = null;
      } finally {
        setHasLoadedHistory(true);
        setIsLoadingHistory(false);
      }
    };

    fetchHistory();
  }, [setPendingMessages, setServerMessages, t, hasLoadedHistory, reconcilePendingClientMessage]);

  useEffect(() => {
    chatEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  const pendingMessages = pendingMessagesState;

  useEffect(() => {
    if (!assistantPlaceholderId || !isAssistantTyping) {
      return;
    }

    const placeholderExists = pendingMessages.some((msg) => msg.id === assistantPlaceholderId);
    if (!placeholderExists) {
      setAssistantPlaceholderId(null);
      setAssistantPlaceholderMessage(null);
      setIsAssistantTyping(false);
      return;
    }

    const lastMessage = messages[messages.length - 1];
    if (lastMessage && lastMessage.id !== assistantPlaceholderId && lastMessage.role !== 'user') {
      setPendingMessages((prev) => prev.filter((msg) => msg.id !== assistantPlaceholderId));
      setAssistantPlaceholderId(null);
      setAssistantPlaceholderMessage(null);
      setIsAssistantTyping(false);
    }
  }, [messages, pendingMessages, assistantPlaceholderId, isAssistantTyping, setPendingMessages]);

  useEffect(() => {
    if (!assistantPlaceholderId || !isAssistantTyping || !contactId) {
      return;
    }

    const interval = window.setInterval(async () => {
      try {
        const response = await api.get(`/dashboard/contacts/${contactId}/messages`);
        const apiMessages = response.data?.messages || [];
        const formattedMessages = apiMessages
          .map(formatApiMessage)
          .filter((message): message is Message => Boolean(message));

        formattedMessages.sort((a, b) => {
          const timeA = a.timestamp ? new Date(a.timestamp).getTime() : 0;
          const timeB = b.timestamp ? new Date(b.timestamp).getTime() : 0;
          return timeA - timeB;
        });

        const prevLatestId = lastServerMessageIdRef.current;
        const latestMessage =
          formattedMessages.length > 0 ? formattedMessages[formattedMessages.length - 1] : null;
        lastServerMessageIdRef.current = latestMessage?.id ?? null;

        const hasNewAssistantResponse =
          Boolean(
            assistantPlaceholderId &&
              isAssistantTyping &&
              latestMessage &&
              latestMessage.id !== prevLatestId &&
              latestMessage.role !== 'user'
          );

        const hasNewUserEcho =
          Boolean(
            pendingClientMessageIdRef.current &&
              latestMessage &&
              latestMessage.id !== prevLatestId &&
              latestMessage.role === 'user'
          );

        setServerMessages(formattedMessages);

        reconcilePendingClientMessage(formattedMessages);
        if (hasNewUserEcho) {
          const pendingClientId = pendingClientMessageIdRef.current;
          if (pendingClientId) {
            setPendingMessages((prev) => prev.filter((msg) => msg.id !== pendingClientId));
            pendingClientMessageIdRef.current = null;
            pendingClientMessageSentAtRef.current = null;
          }
        }

        if (hasNewAssistantResponse) {
          const pendingClientId = pendingClientMessageIdRef.current;
          setPendingMessages((prev) => {
            const idsToRemove = new Set<string>();
            if (assistantPlaceholderId) {
              idsToRemove.add(assistantPlaceholderId);
            }
            if (pendingClientId) {
              idsToRemove.add(pendingClientId);
            }
            return prev.filter((msg) => !idsToRemove.has(msg.id));
          });
          setAssistantPlaceholderId(null);
          setAssistantPlaceholderMessage(null);
          setIsAssistantTyping(false);
          if (pendingClientId) {
            pendingClientMessageIdRef.current = null;
            pendingClientMessageSentAtRef.current = null;
          }
        }
      } catch (error) {
        console.error('Error polling test chat history:', error);
      }
    }, 4000);

    return () => window.clearInterval(interval);
  }, [
    assistantPlaceholderId,
    isAssistantTyping,
    contactId,
    setServerMessages,
    setPendingMessages,
    reconcilePendingClientMessage,
  ]);

  const handleSendClientMessage = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    const trimmed = clientMessage.trim();

    if (!trimmed || isSendingClient) {
      return;
    }

    const previousPlaceholderId = assistantPlaceholderId;
    const now = new Date();
    const userTimestamp = now.toISOString();
    const placeholderTimestamp = new Date(now.getTime() + 1).toISOString();
    const placeholderId = 'assistant-pending-' + now.getTime();
    const placeholderText = t(
      'testAssistant.assistantPlaceholder',
      'El asistente est\u00E1 preparando la respuesta...'
    );

    const userMessage: Message = {
      id: 'client-' + userTimestamp,
      role: 'user',
      text: trimmed,
      timestamp: userTimestamp,
    };

    const placeholderMessage: Message = {
      id: placeholderId,
      role: 'assistant',
      text: placeholderText,
      timestamp: placeholderTimestamp,
    };

    setIsSendingClient(true);
    setClientError(null);

    const currentPendingClientId = pendingClientMessageIdRef.current;

    setPendingMessages((prev) => {
      const withoutExistingPlaceholder = previousPlaceholderId
        ? prev.filter((msg) => msg.id !== previousPlaceholderId)
        : prev;

      const withoutStaleClient = currentPendingClientId
        ? withoutExistingPlaceholder.filter((msg) => msg.id !== currentPendingClientId)
        : withoutExistingPlaceholder;

      const withoutDuplicates = withoutStaleClient.filter(
        (msg) => msg.id !== userMessage.id && msg.id !== placeholderMessage.id
      );

      return [...withoutDuplicates, userMessage, placeholderMessage];
    });

    pendingClientMessageIdRef.current = userMessage.id;
    pendingClientMessageSentAtRef.current = now.getTime();

    setClientMessage('');
    setAssistantPlaceholderId(placeholderId);
    setAssistantPlaceholderMessage(placeholderMessage);
    setIsAssistantTyping(true);

    try {
      const payload = {
        from: '5492222222222',
        text: trimmed,
        name: 'Cliente Falso',
        tipo: 'testing',
      };

      const response = await fetch(TEST_WEBHOOK_URL, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(payload),
      });

      if (!response.ok) {
        throw new Error('Failed webhook response');
      }
    } catch (error) {
      console.error('Error sending client test message:', error);
      setClientError(t('testAssistant.clientError', 'No se pudo enviar el mensaje de prueba.'));
      setAssistantPlaceholderId(null);
      setAssistantPlaceholderMessage(null);
      setIsAssistantTyping(false);
      setClientMessage(trimmed);
      setPendingMessages((prev) =>
        prev.filter((msg) => msg.id !== userMessage.id && msg.id !== placeholderMessage.id)
      );
      pendingClientMessageIdRef.current = null;
      pendingClientMessageSentAtRef.current = null;
    } finally {
      setIsSendingClient(false);
    }
  };
  return (
    <GradientSection
      title={t('testAssistant.title', 'Tester del asistente')}
      description={sectionDescription}
      contentClassName="space-y-6"
    >
      <div className="flex h-[calc(100vh-12rem)] flex-col rounded-2xl border border-brand-border/60 bg-white/85 shadow-brand-soft backdrop-blur">
        <div className="flex-1 space-y-4 overflow-y-auto bg-brand-background/80 p-6">
          {isLoadingHistory ? (
            <div className="flex h-full flex-col items-center justify-center space-y-4 text-sm text-brand-muted">
              <Spinner />
              <span>{t('testAssistant.loadingHistory', 'Cargando historial de prueba...')}</span>
            </div>
          ) : messages.length > 0 ? (
            messages.map((msg) => {
              const isUserMessage = msg.role === 'user';
              const isAdminMessage = msg.role === 'admin';
              const isPendingAssistant = msg.id === assistantPlaceholderId && isAssistantTyping;
              const labelText = isUserMessage
                ? t('testAssistant.clientLabel', 'Cliente de prueba')
                : isAdminMessage
                ? t('testAssistant.adminLabel', 'Administrador')
                : t('testAssistant.botLabel', 'Asistente');

              return (
                <div key={msg.id} className={`flex ${isUserMessage ? 'justify-start' : 'justify-end'}`}>
                  <div
                    className={`max-w-xl space-y-1 rounded-xl px-4 py-3 shadow-sm ${
                      isUserMessage
                        ? 'bg-brand-primary text-white'
                        : isAdminMessage
                        ? 'border border-brand-border/60 bg-brand-primary/10 text-brand-dark'
                        : 'border border-brand-border/50 bg-white text-brand-dark'
                    }`}
                  >
                    <p
                      className={`text-xs font-semibold uppercase tracking-wide ${
                        isUserMessage ? 'text-white/70' : 'text-brand-muted'
                      }`}
                    >
                      {labelText}
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
                    <p
                      className={`mt-1 text-right text-xs ${
                        isUserMessage ? 'text-white/80' : 'text-brand-muted'
                      }`}
                    >
                      {msg.timestamp ? new Date(msg.timestamp).toLocaleTimeString() : '--:--'}
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
            <div className="rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-600">
              {historyError}
            </div>
          )}
        </div>
        <div className="border-t border-brand-border/60 bg-white/80 px-6 py-6">
          <form
            onSubmit={handleSendClientMessage}
            className="grid gap-6 md:grid-cols-2"
          >
            <div className="rounded-2xl border border-brand-border/60 bg-white p-4 shadow-sm">
              <h3 className="text-sm font-semibold text-brand-dark">
                {t('testAssistant.clientInputTitle', 'Mensaje como cliente')}
              </h3>
              <p className="mt-1 text-xs text-brand-muted">
                {t(
                  'testAssistant.clientInputDescription',
                  'Envía un mensaje para probar cómo se recibe desde el lado del cliente.'
                )}
              </p>
              <textarea
                className="mt-4 h-32 w-full rounded-xl border border-brand-border/50 bg-white px-4 py-3 text-sm text-brand-dark shadow-sm focus:border-brand-primary focus:outline-none focus:ring-2 focus:ring-brand-primary/20"
                value={clientMessage}
                onChange={(event) => setClientMessage(event.target.value)}
                placeholder={t('testAssistant.clientPlaceholder', 'Escribe un mensaje de prueba...')}
                disabled={isSendingClient}
              />
              <div className="mt-4 flex justify-end">
                <button
                  type="submit"
                  className="inline-flex items-center justify-center rounded-xl bg-brand-primary px-6 py-3 text-sm font-semibold text-white shadow-md transition hover:bg-brand-primary-hover disabled:cursor-not-allowed disabled:bg-brand-border"
                  disabled={isSendingClient || !clientMessage.trim()}
                >
                  {isSendingClient
                    ? t('testAssistant.clientSending', 'Enviando...')
                    : t('testAssistant.clientSend', 'Enviar como cliente')}
                </button>
              </div>
              {clientError && <p className="mt-2 text-sm text-red-500">{clientError}</p>}
            </div>
            <div className="rounded-2xl border border-dashed border-brand-border/60 bg-brand-background/50 p-4 text-brand-muted opacity-80">
              <h3 className="text-sm font-semibold text-brand-dark/80">
                {t('testAssistant.adminInputTitle', 'Mensaje como admin')}
              </h3>
              <p className="mt-1 text-xs">
                {t('testAssistant.adminInputDescription', 'Temporalmente inhabilitado.')}
              </p>
              <textarea
                className="mt-4 h-32 w-full cursor-not-allowed rounded-xl border border-brand-border/40 bg-brand-background px-4 py-3 text-sm text-brand-muted"
                value=""
                placeholder={t('testAssistant.adminPlaceholder', 'Próximamente podrás enviar respuestas manuales.')}
                disabled
              />
              <div className="mt-4 flex justify-end">
                <button
                  type="button"
                  className="inline-flex cursor-not-allowed items-center justify-center rounded-xl bg-brand-border px-6 py-3 text-sm font-semibold text-brand-muted"
                  disabled
                >
                  {t('testAssistant.adminSend', 'Enviar como admin')}
                </button>
              </div>
            </div>
          </form>
        </div>
      </div>
    </GradientSection>
  );
};

export default TestAssistant;












