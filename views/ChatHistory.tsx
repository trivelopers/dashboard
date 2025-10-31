
import React, { useState, useEffect, useRef } from 'react';
import { useParams, Link } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { Message } from '../types';
import Spinner from '../components/Spinner';
import GradientSection from '../components/GradientSection';
import { ArrowLeftIcon } from '@heroicons/react/24/outline';
import api from '../services/api';

const ChatHistory: React.FC = () => {
  const { contactId } = useParams<{ contactId: string }>();
  const { t } = useTranslation();
  const [messages, setMessages] = useState<Message[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const chatEndRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const fetchChatHistory = async () => {
      if (contactId) {
        try {
          setIsLoading(true);
          const response = await api.get(`/dashboard/contacts/${contactId}/messages`);
          const apiMessages = response.data.messages || [];

          const formattedMessages: Message[] = apiMessages
            .map((message: any): Message | null => {
              const timestamp =
                message.timestamp || message.createdAt || message.updatedAt || null;
              const id = message.id || message._id;

              if (!id) {
                return null;
              }

              return {
                id,
                role: message.sender === 'user' ? 'user' : 'assistant',
                text: message.text || '',
                timestamp,
              };
            })
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
            messages.map((msg) => (
              <div key={msg.id} className={`flex ${msg.role === 'user' ? 'justify-start' : 'justify-end'}`}>
                <div
                  className={`max-w-xl rounded-xl px-4 py-3 shadow-sm ${
                    msg.role === 'user'
                      ? 'bg-brand-primary text-white'
                      : 'border border-brand-border/50 bg-white text-brand-dark'
                  }`}
                >
                  <p className="text-sm leading-relaxed">{msg.text}</p>
                  <p
                    className={`mt-1 text-right text-xs ${
                      msg.role === 'user' ? 'text-white/80' : 'text-brand-muted'
                    }`}
                  >
                    {msg.timestamp ? new Date(msg.timestamp).toLocaleTimeString() : '--:--'}
                  </p>
                </div>
              </div>
            ))
          ) : (
            <p className="text-center text-brand-muted">{t('chatHistory.noMessages')}</p>
          )}
          <div ref={chatEndRef} />
        </div>
      </div>
    </GradientSection>
  );
};

export default ChatHistory;





