
import React, { useState, useEffect, useMemo } from 'react';
import { Link } from 'react-router-dom';
import { Contact, Role } from '../types';
import { useAuth } from '../hooks/useAuth';
import { useTranslation } from 'react-i18next';
import Spinner from '../components/Spinner';
import api from '../services/api';

type ExtendedContact = Contact & {
  username?: string;
  userName?: string;
  platformChatId?: string;
};

const Contacts: React.FC = () => {
  const { user } = useAuth();
  const { t } = useTranslation();
  const [contacts, setContacts] = useState<ExtendedContact[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [filter, setFilter] = useState('');
  
  const canEdit = user?.role === Role.ADMIN || user?.role === Role.EDITOR;

  const fetchContacts = async () => {
    try {
      setIsLoading(true);
      const response = await api.get('/dashboard/contacts');
      setContacts(response.data.contacts || []);
    } catch (error) {
      console.error('Error fetching contacts:', error);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchContacts();
  }, []);

  const handleToggle = async (contactId: string, currentValue: boolean) => {
    const originalContacts = [...contacts];
    // Optimistic UI update
    setContacts(prev => prev.map(c => c.id === contactId ? { ...c, requireAdmin: !currentValue } : c));
    
    try {
        await api.put(`/dashboard/contacts/${contactId}/require-admin`, { requireAdmin: !currentValue });
    } catch (error) {
        console.error("Failed to update contact", error);
        // Revert on failure
        setContacts(originalContacts);
    }
  };

  const sortedContacts = useMemo(() => {
    return [...contacts].sort((a, b) => {
      const nameA = (a.name || a.username || a.userName || '').toLocaleLowerCase();
      const nameB = (b.name || b.username || b.userName || '').toLocaleLowerCase();
      return nameA.localeCompare(nameB);
    });
  }, [contacts]);

  const buildWhatsappLink = (phone?: string) => {
    if (!phone) {
      return '';
    }

    const sanitized = phone.replace(/[^\d]/g, '');
    return sanitized ? `https://wa.me/${sanitized}` : '';
  };
  
  const filteredContacts = useMemo(() => {
    const loweredFilter = filter.toLowerCase();

    return sortedContacts.filter(contact => 
      (contact.name?.toLowerCase() || contact.username?.toLowerCase() || contact.userName?.toLowerCase() || '').includes(loweredFilter) || 
      (contact.phoneNumber || contact.platformChatId || '').includes(filter) ||
      (contact.userName || contact.username || '').includes(filter)
    );
  }, [sortedContacts, filter]);

  return (
    <div className="bg-brand-surface p-8 rounded-xl shadow-brand-soft border border-brand-border/60">
      <div className="flex justify-between items-center mb-6">
        <h1 className="text-3xl font-bold text-brand-dark">{t('contacts.title')}</h1>
        <input
          type="text"
          placeholder={`${t('contacts.filterPlaceholder')}...`}
          value={filter}
          onChange={(e) => setFilter(e.target.value)}
          className="px-4 py-2 border border-brand-border rounded-md w-64 bg-white text-brand-dark focus:ring-2 focus:ring-brand-primary/40 focus:border-brand-primary"
        />
      </div>
      
      <div className="overflow-x-auto">
        {isLoading ? <div className="flex justify-center p-10"><Spinner /></div> : filteredContacts.length === 0 ? (
          <div className="text-center text-brand-muted py-10">
            {filter ? t('contacts.noContactsFound') : t('contacts.noContacts')}
          </div>
        ) : (
          <table className="min-w-full divide-y divide-brand-border">
            <thead className="bg-brand-muted">
              <tr>
                <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-brand-surface uppercase tracking-wider">{t('contacts.name')}</th>
                <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-brand-surface uppercase tracking-wider">{t('contacts.phone')}</th>
                <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-brand-surface uppercase tracking-wider">{t('contacts.requiresAdmin')}</th>
                <th scope="col" className="relative px-6 py-3"><span className="sr-only">Actions</span></th>
              </tr>
            </thead>
            <tbody className="bg-brand-surface divide-y divide-brand-border/70">
              {filteredContacts.map((contact) => {
                const phoneValue = contact.phoneNumber || contact.platformChatId || '';
                const whatsappUrl = buildWhatsappLink(phoneValue);

                return (
                  <tr key={contact.id}>
                    <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-brand-dark">
                      {contact.name || contact.username || contact.userName || 'Sin nombre'}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-brand-muted">
                      <div className="flex items-center gap-2">
                        <span>{phoneValue || 'N/A'}</span>
                        {whatsappUrl && (
                          <a
                            href={whatsappUrl}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="text-brand-primary hover:text-brand-primary-hover transition-colors"
                            aria-label="Contactar por WhatsApp"
                          >
                            <svg
                              xmlns="http://www.w3.org/2000/svg"
                              viewBox="0 0 24 24"
                              fill="currentColor"
                              className="w-5 h-5"
                            >
                              <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.1-.472-.148-.67.15-.198.297-.767.966-.94 1.164-.173.199-.347.223-.644.074-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.372-.025-.521-.075-.149-.67-1.611-.916-2.204-.242-.579-.487-.5-.67-.51-.173-.007-.372-.009-.571-.009-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.095 3.2 5.076 4.487.709.306 1.262.489 1.694.626.712.226 1.36.194 1.872.118.571-.085 1.758-.718 2.006-1.413.248-.695.248-1.29.173-1.413-.074-.124-.272-.198-.57-.347z" />
                              <path d="M12.004 2.5C6.763 2.5 2.5 6.763 2.5 12.004c0 1.942.512 3.838 1.482 5.49L2 22l4.628-1.938a9.47 9.47 0 0 0 5.376 1.642c5.241 0 9.504-4.263 9.504-9.504S17.245 2.5 12.004 2.5zm0 16.934c-1.705 0-3.358-.454-4.806-1.312l-.344-.204-2.744 1.149 1.152-2.676-.224-.352a8.045 8.045 0 0 1-1.23-4.035c0-4.446 3.617-8.063 8.064-8.063 4.446 0 8.063 3.617 8.063 8.063s-3.617 8.063-8.063 8.063z" />
                            </svg>
                          </a>
                        )}
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <label htmlFor={`toggle-${contact.id}`} className="flex items-center cursor-pointer">
                        <div className="relative">
                          <input
                            id={`toggle-${contact.id}`}
                            type="checkbox"
                            className="sr-only"
                            checked={contact.requireAdmin || false}
                            onChange={() => handleToggle(contact.id, contact.requireAdmin || false)}
                            disabled={!canEdit}
                          />
                          <div className={`block w-14 h-8 rounded-full transition ${contact.requireAdmin ? 'bg-brand-primary' : 'bg-brand-border'}`}></div>
                          <div className={`dot absolute left-1 top-1 bg-white w-6 h-6 rounded-full transition ${contact.requireAdmin ? 'transform translate-x-6' : ''}`}></div>
                        </div>
                      </label>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                      <Link to={`/chats/${contact.id}`} className="text-brand-primary hover:text-brand-primary-hover">Ver conversación</Link>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        )}
        {filteredContacts.length === 0 && !isLoading && <p className="text-center text-brand-muted py-10">No contacts found.</p>}
      </div>
    </div>
  );
};

export default Contacts;
