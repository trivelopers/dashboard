import React, { useState, useEffect, useRef, FormEvent, KeyboardEvent, useMemo } from 'react';
import { useParams, Link } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { Message, Role } from '../types';
import Spinner from '../components/Spinner';
import GradientSection from '../components/GradientSection';
import ChatImageMessage from '../components/ChatImageMessage';
import ImageUploadButton from '../components/ImageUploadButton';
import ImagePreviewModal from '../components/ImagePreviewModal';
import { ArrowLeftIcon } from '@heroicons/react/24/outline';
import { ExclamationTriangleIcon } from '@heroicons/react/24/solid';
import api, { uploadContactImage } from '../services/api';
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
    // Campos multimedia
    type: message.type || 'text',
    mediaUrl: message.mediaUrl || null,
    mediaType: message.mediaType || null,
    fileName: message.fileName || null,
    fileSize: message.fileSize || null,
  };
};

const CONTACT_PHONE_KEYS = [
  'phoneNumber',
  'phone',
  'phone_number',
  'telefono',
  'tel',
  'mobile',
  'mobileNumber',
  'whatsapp',
  'whatsappNumber',
  'whatsapp_number',
  'username',
  'userName',
  'platformChatId',
  'platform_chat_id',
  'chatId',
];

const resolveContactPhone = (contact: unknown): string | null => {
  const extractPhone = (record: unknown): string | null => {
    if (record == null) {
      return null;
    }

    if (typeof record === 'string' || typeof record === 'number') {
      const normalized = String(record).trim();
      if (!normalized) {
        return null;
      }

      const digits = normalized.replace(/[^\d]/g, '');
      return digits || null;
    }

    if (Array.isArray(record)) {
      for (const entry of record) {
        const result = extractPhone(entry);
        if (result) {
          return result;
        }
      }
      return null;
    }

    if (typeof record === 'object') {
      const source = record as Record<string, unknown>;
      for (const key of CONTACT_PHONE_KEYS) {
        if (key in source) {
          const result = extractPhone(source[key]);
          if (result) {
            return result;
          }
        }
      }
    }

    return null;
  };

  if (contact && typeof contact === 'object') {
    const source = contact as Record<string, unknown>;
    const candidates: Array<unknown> = [
      source,
      source['phoneNumber'],
      source['phone'],
      source['platformChatId'],
      source['metadata'],
      source['lastChannel'],
      source['latestChannel'],
    ];

    for (const candidate of candidates) {
      const result = extractPhone(candidate);
      if (result) {
        return result;
      }
    }
  }

  return extractPhone(contact);
};

type FormattedPart = {
  type: 'text' | 'bold' | 'italic';
  content: string;
};

const parseFormattedText = (input: string): FormattedPart[] => {
  const parts: FormattedPart[] = [];
  const regex = /(\*[^*]+\*|_[^_]+_)/g;
  let lastIndex = 0;
  let match: RegExpExecArray | null;

  while ((match = regex.exec(input)) !== null) {
    if (match.index > lastIndex) {
      parts.push({
        type: 'text',
        content: input.slice(lastIndex, match.index),
      });
    }

    const raw = match[0];
    const content = raw.slice(1, -1);
    parts.push({
      type: raw.startsWith('*') ? 'bold' : 'italic',
      content,
    });

    lastIndex = regex.lastIndex;
  }

  if (lastIndex < input.length) {
    parts.push({
      type: 'text',
      content: input.slice(lastIndex),
    });
  }

  return parts;
};

const renderFormattedText = (text: string) => {
  const parts = parseFormattedText(text);

  const renderWithLineBreaks = (value: string) =>
    value.split('\n').map((segment, index) =>
      index === 0 ? (
        segment
      ) : (
        <React.Fragment key={`br-${index}`}>
          <br />
          {segment}
        </React.Fragment>
      )
    );

  return parts.map((part, index) => {
    const content = renderWithLineBreaks(part.content);

    if (part.type === 'bold') {
      return (
        <strong key={`bold-${index}`} className="font-semibold">
          {content}
        </strong>
      );
    }

    if (part.type === 'italic') {
      return (
        <em key={`italic-${index}`} className="italic">
          {content}
        </em>
      );
    }

    return <React.Fragment key={`text-${index}`}>{content}</React.Fragment>;
  });
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
  const [contactPhone, setContactPhone] = useState<string | null>(null);
  const chatEndRef = useRef<HTMLDivElement>(null);
  const { user } = useAuth();

  // Estados para manejo de imágenes
  const [selectedImage, setSelectedImage] = useState<File | null>(null);
  const [imagePreview, setImagePreview] = useState<string | null>(null);
  const [isUploading, setIsUploading] = useState(false);

  // ✅ Todos los roles pueden responder
  const canRespond = true;

  useEffect(() => {
    const fetchChatHistory = async () => {
      if (contactId) {
        try {
          setIsLoading(true);
          const [messagesResult, contactResult] = await Promise.allSettled([
            api.get(`/dashboard/contacts/${contactId}/messages`),
            api.get(`/dashboard/contacts/${contactId}`),
          ]);

          if (messagesResult.status === 'fulfilled') {
            const apiMessages = messagesResult.value?.data?.messages || [];
            const formattedMessages: Message[] = apiMessages
              .map(formatApiMessage)
              .filter((message): message is Message => Boolean(message))
              .sort((a, b) => {
                const timeA = a.timestamp ? new Date(a.timestamp).getTime() : 0;
                const timeB = b.timestamp ? new Date(b.timestamp).getTime() : 0;
                return timeA - timeB;
              });
            setMessages(formattedMessages);
          } else {
            console.error('Error fetching chat history:', messagesResult.reason);
            setMessages([]);
          }

          if (contactResult.status === 'fulfilled') {
            const contactData = contactResult.value?.data?.contact;
            setContactPhone(resolveContactPhone(contactData));
          } else {
            console.error('Error fetching contact details:', contactResult.reason);
            setContactPhone(null);
          }
        } catch (error) {
          console.error('Error fetching chat history:', error);
          setMessages([]);
          setContactPhone(null);
        } finally {
          setIsLoading(false);
        }
      } else {
        setMessages([]);
        setContactPhone(null);
      }
    };

    fetchChatHistory();
  }, [contactId]);

  useEffect(() => {
    chatEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  const lastMessageDate = useMemo(() => {
    const contactMessages = messages.filter(
      (message) => message.role === 'user' && Boolean(message.timestamp),
    );
    if (!contactMessages.length) return null;

    return contactMessages.reduce<Date | null>((latest, message) => {
      if (!message.timestamp) return latest;
      const current = new Date(message.timestamp);
      if (Number.isNaN(current.getTime())) return latest;
      return !latest || current > latest ? current : latest;
    }, null);
  }, [messages]);

  const isOutside24Hours = useMemo(() => {
    if (!lastMessageDate) return false;
    return Date.now() - lastMessageDate.getTime() > 24 * 60 * 60 * 1000;
  }, [lastMessageDate]);

  const whatsappLink = useMemo(() => {
    if (!contactPhone) return null;
    const sanitized = contactPhone.replace(/[^\d]/g, '');
    return sanitized ? `https://wa.me/${sanitized}` : null;
  }, [contactPhone]);

  const isManualReplyBlocked = useMemo(() => {
    if (messages.length === 0) return true;
    return isOutside24Hours;
  }, [isOutside24Hours, messages.length]);

  // Handlers para manejo de imágenes
  const handleImageSelect = (file: File) => {
    setSelectedImage(file);
    setImagePreview(URL.createObjectURL(file));
  };

  const handleCancelImage = () => {
    if (imagePreview) {
      URL.revokeObjectURL(imagePreview);
    }
    setSelectedImage(null);
    setImagePreview(null);
  };

  const handleSendImage = async () => {
    if (!selectedImage || !contactId) return;

    try {
      setIsUploading(true);
      setSendError(null);
      setSendWarning(null);

      // 1. Subir imagen
      const uploadResult = await uploadContactImage(contactId, selectedImage);

      // 2. Enviar mensaje con imagen
      const response = await api.post(`/dashboard/contacts/${contactId}/respond`, {
        message: newMessage.trim(),
        imageUrl: uploadResult.url,
        imageKey: uploadResult.key,
        fileName: uploadResult.fileName,
        fileSize: uploadResult.fileSize,
        mimeType: uploadResult.mimeType,
      });

      const formatted = formatApiMessage(response.data?.message);
      if (formatted) setMessages((prev) => [...prev, formatted]);

      setNewMessage('');
      handleCancelImage();

      const webhookDetails = response.data?.webhookError;
      if (webhookDetails?.message) {
        setSendWarning(webhookDetails.message);
      }
    } catch (error: any) {
      setSendError(error?.response?.data?.message || 'Error al enviar la imagen');
    } finally {
      setIsUploading(false);
    }
  };

  const handleSendMessage = async (
    event: FormEvent<HTMLFormElement> | KeyboardEvent<HTMLTextAreaElement>
  ) => {
    event.preventDefault();
    if (!contactId || !newMessage.trim() || isSending || isManualReplyBlocked) return;

    try {
      setIsSending(true);
      setSendError(null);
      setSendWarning(null);

      const response = await api.post(`/dashboard/contacts/${contactId}/respond`, {
        message: newMessage.trim(),
      });

      const formatted = formatApiMessage(response.data?.message);
      if (formatted) setMessages((prev) => [...prev, formatted]);
      setNewMessage('');

      const webhookDetails = response.data?.webhookError;
      const webhookErrorMessage =
        webhookDetails?.message ||
        webhookDetails?.details?.hint ||
        webhookDetails?.details?.message ||
        null;
      if (webhookErrorMessage) setSendWarning(webhookErrorMessage);
    } catch (error: any) {
      const defaultMessage = t(
        'chatHistory.sendError',
        'No se pudo enviar el mensaje. Intenta nuevamente.'
      );
      const apiMessage = error?.response?.data?.message;
      setSendError(apiMessage || defaultMessage);
      console.error('Error sending response:', error);
    } finally {
      setIsSending(false);
    }
  };

  const handleMessageKeyDown = (event: KeyboardEvent<HTMLTextAreaElement>) => {
    if (
      event.key === 'Enter' &&
      !event.shiftKey &&
      !event.ctrlKey &&
      !event.altKey &&
      !event.metaKey &&
      !(event.nativeEvent as any).isComposing &&
      newMessage.trim() &&
      !isSending &&
      !isManualReplyBlocked
    ) {
      handleSendMessage(event);
    }
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
              const isAssistant = msg.role === 'assistant';
              const labelText = isAssistant
                ? t('chatHistory.botLabel', 'Bot')
                : t('chatHistory.contactLabel', 'Contacto');

              const timestamp = msg.timestamp ? new Date(msg.timestamp) : null;
              const formattedTime = timestamp
                ? `${timestamp.toLocaleDateString()} ${timestamp.toLocaleTimeString([], {
                    hour: '2-digit',
                    minute: '2-digit',
                  })}`
                : '--:--';

              return (
                <div key={msg.id} className={`flex ${isUserMessage ? 'justify-start' : 'justify-end'}`}>
                  <div
                    className={`max-w-xl space-y-1 rounded-xl px-4 py-3 shadow-sm ${
                      isUserMessage
                        ? 'bg-brand-primary text-white'
                        : 'border border-brand-border/50 bg-white text-brand-dark'
                    }`}
                  >
                    <p className="text-xs font-semibold uppercase tracking-wide text-brand-muted">
                      {labelText}
                    </p>
                    {/* Renderizar imagen si existe */}
                    {msg.type === 'image' && msg.mediaUrl ? (
                      <ChatImageMessage
                        url={msg.mediaUrl}
                        fileName={msg.fileName || undefined}
                        text={msg.text || undefined}
                      />
                    ) : (
                      <p className="text-sm leading-relaxed">{renderFormattedText(msg.text)}</p>
                    )}
                    <p className="mt-1 text-right text-xs text-brand-muted">{formattedTime}</p>
                  </div>
                </div>
              );
            })
          ) : (
            <p className="text-center text-brand-muted">{t('chatHistory.noMessages')}</p>
          )}
          <div ref={chatEndRef} />
        </div>

        <div className="border-t border-brand-border/60 bg-white/90 px-6 py-4">
          {isManualReplyBlocked ? (
            <div className="rounded-xl bg-yellow-50 p-4 text-gray-700">
              <div className="flex items-start gap-3">
                <ExclamationTriangleIcon className="mt-1 h-6 w-6 flex-shrink-0 text-amber-500" />
                <div className="space-y-3 text-sm leading-relaxed">
                  <p className="font-medium">
                    ⚠️ No podés responder desde el sistema porque pasaron más de 24 horas desde el último mensaje del cliente.
                  </p>
                  <p>
                    WhatsApp solo permite contestar dentro de ese plazo. Si necesitás contactarlo igual, podés hacerlo directamente desde WhatsApp:
                  </p>
                  {whatsappLink ? (
                    <a
                      href={whatsappLink}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="inline-flex items-center gap-2 font-semibold text-brand-primary transition hover:text-brand-primary-hover"
                    >
                      <span aria-hidden="true">👉</span>
                      Abrir chat en WhatsApp
                    </a>
                  ) : (
                    <span className="inline-flex items-center gap-2 font-semibold text-brand-muted">
                      <span aria-hidden="true">👉</span>
                      Abrir chat en WhatsApp
                    </span>
                  )}
                </div>
              </div>
            </div>
          ) : (
            <form onSubmit={handleSendMessage}>
              <label
                htmlFor="manual-response"
                className="mb-2 block text-xs font-semibold uppercase tracking-wide text-brand-muted"
              >
                {t('chatHistory.reply', 'Responder manualmente')}
              </label>
              <div className="flex flex-col gap-3 sm:flex-row sm:items-end">
                {/* Botón para adjuntar imagen */}
                <ImageUploadButton
                  onSelect={handleImageSelect}
                  disabled={isManualReplyBlocked || isSending}
                  isUploading={isUploading}
                />
                <textarea
                  id="manual-response"
                  value={newMessage}
                  onChange={(event) => setNewMessage(event.target.value)}
                  onKeyDown={handleMessageKeyDown}
                  placeholder={t('chatHistory.writeMessage', 'Escribe tu mensaje...')}
                  className="min-h-[3rem] flex-1 resize-none rounded-xl border border-brand-border/60 bg-white/80 px-4 py-3 text-sm text-brand-dark shadow-sm transition focus:border-brand-primary focus:outline-none focus:ring-2 focus:ring-brand-primary/20"
                  rows={2}
                />
                <button
                  type="submit"
                  disabled={isSending || !newMessage.trim()}
                  className="inline-flex items-center justify-center rounded-xl bg-brand-primary px-6 py-3 text-sm font-semibold text-white shadow-md transition hover:bg-brand-primary-hover disabled:cursor-not-allowed disabled:bg-brand-border disabled:text-brand-muted"
                >
                  {isSending
                    ? t('chatHistory.sending', 'Enviando...')
                    : t('chatHistory.send', 'Enviar')}
                </button>
              </div>
              {sendError && <p className="mt-2 text-sm text-red-500">{sendError}</p>}
              {!sendError && sendWarning && (
                <p className="mt-2 text-sm text-amber-600">{sendWarning}</p>
              )}
            </form>
          )}
        </div>
      </div>

      {/* Modal de preview de imagen */}
      {selectedImage && imagePreview && (
        <ImagePreviewModal
          file={selectedImage}
          previewUrl={imagePreview}
          onConfirm={handleSendImage}
          onCancel={handleCancelImage}
          isUploading={isUploading}
        />
      )}
    </GradientSection>
  );
};


export default ChatHistory;
