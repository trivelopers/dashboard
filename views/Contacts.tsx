
import React, { useState, useEffect, useMemo } from 'react';
import { Link } from 'react-router-dom';
import { Contact, Role } from '../types';
import { useAuth } from '../hooks/useAuth';
import { useTranslation } from 'react-i18next';
import Spinner from '../components/Spinner';
import api from '../services/api';

const Contacts: React.FC = () => {
  const { user } = useAuth();
  const { t } = useTranslation();
  const [contacts, setContacts] = useState<Contact[]>([]);
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
  
  const filteredContacts = useMemo(() => {
    return contacts.filter(contact => 
      (contact.name?.toLowerCase() || '').includes(filter.toLowerCase()) || 
      (contact.phoneNumber || '').includes(filter) ||
      (contact.userName || '').includes(filter)
    );
  }, [contacts, filter]);

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
            <thead className="bg-brand-background">
              <tr>
                <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-brand-muted uppercase tracking-wider">{t('contacts.name')}</th>
                <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-brand-muted uppercase tracking-wider">{t('contacts.phone')}</th>
                <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-brand-muted uppercase tracking-wider">{t('contacts.requiresAdmin')}</th>
                <th scope="col" className="relative px-6 py-3"><span className="sr-only">Actions</span></th>
              </tr>
            </thead>
            <tbody className="bg-brand-surface divide-y divide-brand-border/70">
              {filteredContacts.map((contact) => (
                <tr key={contact.id}>
                  <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-brand-dark">
                    {contact.username || 'Sin nombre'}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-brand-muted">
                    {contact.platformChatId || 'N/A'}
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
                    <Link to={`/chats/${contact.id}`} className="text-brand-primary hover:text-brand-primary-hover">View Chat</Link>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
        {filteredContacts.length === 0 && !isLoading && <p className="text-center text-brand-muted py-10">No contacts found.</p>}
      </div>
    </div>
  );
};

export default Contacts;
