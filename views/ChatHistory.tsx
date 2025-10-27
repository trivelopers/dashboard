
import React, { useState, useEffect, useRef } from 'react';
import { useParams, Link } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { Message } from '../types';
import Spinner from '../components/Spinner';
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
          const response = await api.get(`/dashboard/interactions?contactId=${contactId}`);
          // Transform interactions to messages format
          const interactions = response.data.interactions || [];
          const formattedMessages = interactions.map((interaction: any) => ({
            id: interaction.id || interaction._id,
            role: interaction.role || 'user',
            text: interaction.message || interaction.text,
            timestamp: interaction.createdAt || interaction.timestamp
          }));
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
    <div className="bg-brand-surface rounded-xl shadow-brand-soft border border-brand-border/60 flex flex-col h-[calc(100vh-10rem)]">
      <div className="p-4 border-b border-brand-border flex items-center">
        <Link 
          to="/contacts" 
          className="mr-4 p-2 text-brand-muted hover:text-brand-primary hover:bg-brand-primary/10 rounded-full transition"
        >
          <ArrowLeftIcon className="h-5 w-5" />
        </Link>
        <div>
          <h1 className="text-xl font-bold text-brand-dark">{t('chatHistory.title')}</h1>
          <p className="text-sm text-brand-muted">Contact ID: {contactId}</p>
        </div>
      </div>
      <div className="flex-1 overflow-y-auto p-6 bg-brand-background space-y-4">
        {messages.length > 0 ? messages.map(msg => (
          <div key={msg.id} className={`flex ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}>
            <div className={`max-w-xl px-4 py-3 rounded-xl shadow-sm ${
              msg.role === 'user'
                ? 'bg-brand-primary text-white'
                : 'bg-brand-surface text-brand-dark border border-brand-border/70'
            }`}>
              <p className="text-sm">{msg.text}</p>
              <p className={`text-xs mt-1 ${msg.role === 'user' ? 'text-white/80' : 'text-brand-muted'} text-right`}>
                {new Date(msg.timestamp).toLocaleTimeString()}
              </p>
            </div>
          </div>
        )) : <p className="text-center text-brand-muted">{t('chatHistory.noMessages')}</p>}
        <div ref={chatEndRef} />
      </div>
    </div>
  );
};

export default ChatHistory;
