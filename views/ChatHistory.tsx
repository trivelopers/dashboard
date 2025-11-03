import React, { useState, useEffect, useRef, FormEvent, KeyboardEvent } from 'react';
import { useParams, Link } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { Message, Role } from '../types';
import Spinner from '../components/Spinner';
import GradientSection from '../components/GradientSection';
import { ArrowLeftIcon } from '@heroicons/react/24/outline';
import api from '../services/api';
import { useAuth } from '../hooks/useAuth';

const formatApiMessage = (message: any): Message | null => {
  if (!message) {
    return null;
  }

  const timestamp =
    message.timestamp || message.createdAt || message.updatedAt || null;
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

const ChatHistory: React.FC = () => {
  const { contactId } = useParams<{ contactId: string }>();
  const { t } = useTranslation();
  const [messages, setMessages] = useState<Message[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [newMessage, setNewMessage] = useState('');
  const [isSending, setIsSending] = useState(false);
  const [sendError, setSendError] = useState<string | null>(null);
  const [sendWarning, setSendWarning] = useState<string | null>(null);
  const chatEndRef = useRef<HTMLDivElement>(null);
  const { user } = useAuth();
  const canRespond = user?.role === Role.ADMIN;

  useEffect(() => {
    const fetchChatHistory = async () => {
      if (contactId) {
        try {
          setIsLoading(true);
          const response = await api.get(`/dashboard/contacts/${contactId}/messages`);
          const apiMessages = response.data.messages || [];

          const formattedMessages: Message[] = apiMessages
            .map(formatApiMessage)
            .filter((message): message is Message => Boolean(message));

          formattedMessages.sort((a, b) => {
            const timeA = a.timestamp ? new Date(a.timestamp).getTime() : 0;
            const timeB = b.timestamp ? new Date(b.timestamp).getTime() : 0;
            return timeA - timeB;
          });

          setMessages(formattedMessages);
        } catch (error) {
          console.error('Error fetching chat history:', error);
          setMessages([]);
        } finally {
          setIsLoading(false);
        }
      }
    };
    fetchChatHistory();
  }, [contactId]);

  useEffect(() => {
    chatEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  const handleSendMessage = async (
    event: FormEvent<HTMLFormElement> | KeyboardEvent<HTMLTextAreaElement>
  ) => {
    event.preventDefault();

    if (!contactId || !newMessage.trim() || isSending || !canRespond) {
      return;
    }

    try {
      setIsSending(true);
      setSendError(null);
      setSendWarning(null);

      const response = await api.post(`/dashboard/contacts/${contactId}/respond`, {
        message: newMessage.trim(),
      });

      const formatted = formatApiMessage(response.data?.message);
      if (formatted) {
        setMessages((prev) => [...prev, formatted]);
      }
      setNewMessage('');

      const webhookDetails = response.data?.webhookError;
      const webhookErrorMessage =
        webhookDetails?.message ||
        webhookDetails?.details?.hint ||
        webhookDetails?.details?.message ||
        null;
      if (webhookErrorMessage) {
        setSendWarning(webhookErrorMessage);
      }
    } catch (error: any) {
      const defaultMessage = t('chatHistory.sendError', 'No se pudo enviar el mensaje. Intenta nuevamente.');
      const apiMessage = error?.response?.data?.message;
      setSendError(apiMessage || defaultMessage);
      console.error('Error sending admin response:', error);
    } finally {
      setIsSending(false);
    }
  };

  const handleAdminMessageKeyDown = (event: KeyboardEvent<HTMLTextAreaElement>) => {
    if (
      event.key !== 'Enter' ||
      event.shiftKey ||
      event.ctrlKey ||
      event.altKey ||
      event.metaKey ||
      event.isComposing
    ) {
      return;
    }

    if (!newMessage.trim() || isSending || !canRespond) {
      return;
    }

    handleSendMessage(event);
  };

  if (isLoading) {
    return (
      <div className="flex justify-center items-center h-64">
        <div className="text-center">
          <Spinner />
          <p className="mt-2 text-brand-muted">{t('chatHistory.loading')}</p>
        </div>
      </div>
    );
  }
  return (
    <GradientSection
      title={t('chatHistory.title')}
      description={`ID de contacto: ${contactId}`}
      actions={
        <Link
          to="/contacts"
          className="inline-flex items-center gap-2 rounded-full border border-brand-border/60 bg-white/60 px-3 py-1 text-sm font-semibold text-brand-dark transition hover:border-brand-primary/60 hover:text-brand-primary"
        >
          <ArrowLeftIcon className="h-4 w-4" />
          {t('chatHistory.backToContacts', 'Volver a contactos')}
        </Link>
      }
      contentClassName="space-y-4"
    >
      <div className="flex h-[calc(100vh-12rem)] flex-col rounded-2xl border border-brand-border/60 bg-white/85 shadow-brand-soft backdrop-blur">
        <div className="flex-1 space-y-4 overflow-y-auto bg-brand-background/80 p-6">
          {messages.length > 0 ? (
            messages.map((msg) => {
              const isUserMessage = msg.role === 'user';
              const isAdminMessage = msg.role === 'admin';
              const labelText =
                msg.role === 'admin'
                  ? t('chatHistory.adminLabel', 'Admin')
                  : msg.role === 'assistant'
                  ? t('chatHistory.botLabel', 'Bot')
                  : t('chatHistory.contactLabel', 'Contacto');

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
                  <p className="text-sm leading-relaxed">{msg.text}</p>
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
            <p className="text-center text-brand-muted">{t('chatHistory.noMessages')}</p>
          )}
          <div ref={chatEndRef} />
        </div>
        {canRespond ? (
          <form
            onSubmit={handleSendMessage}
            className="border-t border-brand-border/60 bg-white/90 px-6 py-4"
          >
            <label htmlFor="admin-response" className="mb-2 block text-xs font-semibold uppercase tracking-wide text-brand-muted">
              {t('chatHistory.replyAsAdmin', 'Responder manualmente')}
            </label>
            <div className="flex flex-col gap-3 sm:flex-row sm:items-end">
              <textarea
                id="admin-response"
                value={newMessage}
                onChange={(event) => setNewMessage(event.target.value)}
                onKeyDown={handleAdminMessageKeyDown}
                placeholder={t('chatHistory.writeMessage', 'Escribe tu mensaje...')}
                className="min-h-[3rem] flex-1 resize-none rounded-xl border border-brand-border/60 bg-white/80 px-4 py-3 text-sm text-brand-dark shadow-sm transition focus:border-brand-primary focus:outline-none focus:ring-2 focus:ring-brand-primary/20"
                rows={2}
              />
              <button
                type="submit"
                disabled={isSending || !newMessage.trim()}
                className="inline-flex items-center justify-center rounded-xl bg-brand-primary px-6 py-3 text-sm font-semibold text-white shadow-md transition hover:bg-brand-primary-hover disabled:cursor-not-allowed disabled:bg-brand-border"
              >
                {isSending ? t('chatHistory.sending', 'Enviando...') : t('chatHistory.send', 'Enviar')}
              </button>
            </div>
            {sendError && (
              <p className="mt-2 text-sm text-red-500">{sendError}</p>
            )}
            {!sendError && sendWarning && (
              <p className="mt-2 text-sm text-amber-600">{sendWarning}</p>
            )}
          </form>
        ) : (
          <div className="border-t border-brand-border/60 bg-white/80 px-6 py-4 text-sm text-brand-muted">
            {t('chatHistory.onlyAdminsCanReply', 'Solo los administradores pueden enviar respuestas desde aquí.')}
          </div>
        )}
      </div>
    </GradientSection>
  );
};

export default ChatHistory;
