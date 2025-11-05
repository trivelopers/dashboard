
import React, { useState, useEffect, useMemo } from 'react';
import { Link } from 'react-router-dom';
import { Contact, Role } from '../types';
import { useAuth } from '../hooks/useAuth';
import { useTranslation } from 'react-i18next';
import Spinner from '../components/Spinner';
import GradientSection from '../components/GradientSection';
import api from '../services/api';

type ExtendedContact = Contact & {
  username?: string | null;
  userName?: string | null;
  phone?: string | null;
  platformChatId?: string | null;
  platform?: string | null;
  platforms?: Array<string | null> | null;
  channel?: string | null;
  originPlatform?: string | null;
  source?: string | null;
  metadata?: Record<string, any> | null;
  lastChannel?: Record<string, any> | string | null;
  latestChannel?: Record<string, any> | string | null;
};

const getPlatformValue = (record: unknown): string | null => {
  if (!record) {
    return null;
  }

  if (typeof record === 'string') {
    return record.trim().toLowerCase() || null;
  }

  if (Array.isArray(record)) {
    for (const entry of record) {
      const candidate = getPlatformValue(entry);
      if (candidate) {
        return candidate;
      }
    }
    return null;
  }

  if (typeof record === 'object') {
    const source = record as Record<string, unknown>;
    const aggregateKeys = ['platforms', 'channels'];
    for (const key of aggregateKeys) {
      if (key in source) {
        const candidate = getPlatformValue(source[key]);
        if (candidate) {
          return candidate;
        }
      }
    }

    const candidateKeys = ['platform', 'channel', 'source', 'origin', 'platformName', 'originPlatform'];
    for (const key of candidateKeys) {
      const value = source[key];
      if (typeof value === 'string' && value.trim()) {
        return value.trim().toLowerCase();
      }
    }
  }

  return null;
};

const shouldHideContact = (contact: ExtendedContact): boolean => {
  const candidates: Array<unknown> = [
    contact,
    contact.platforms,
    contact.channel,
    contact.originPlatform,
    contact.metadata,
    contact.lastChannel ?? contact.latestChannel,
  ];

  return candidates.some((candidate) => getPlatformValue(candidate) === 'web');
};

const resolvePlatformLabel = (contact: ExtendedContact): string => {
  const platformCandidates: Array<unknown> = [
    contact,
    contact.platform,
    contact.platforms,
    contact.channel,
    contact.originPlatform,
    contact.metadata,
    contact.lastChannel ?? contact.latestChannel,
  ];

  const platform = platformCandidates
    .map((candidate) => getPlatformValue(candidate))
    .find((value) => value && value !== 'web');

  if (!platform) {
    return 'Desconocida';
  }

  if (platform === 'whatsapp') {
    return 'WhatsApp';
  }

  if (platform === 'whatsapp_business') {
    return 'WhatsApp Business';
  }

  if (platform === 'whatsapp_cloud') {
    return 'WhatsApp Cloud';
  }

  if (platform === 'messenger') {
    return 'Messenger';
  }

  if (platform === 'instagram') {
    return 'Instagram';
  }

  if (platform === 'sms') {
    return 'SMS';
  }

  if (platform === 'unknown') {
    return 'Desconocida';
  }

  const cleaned = platform.replace(/[_-]+/g, ' ').trim();
  if (!cleaned) {
    return 'Desconocida';
  }
  return cleaned.charAt(0).toUpperCase() + cleaned.slice(1);
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
      const fetchedContacts: ExtendedContact[] = response.data.contacts || [];
      setContacts(fetchedContacts.filter((contact) => !shouldHideContact(contact)));
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

  const resolveContactPhone = (contact: ExtendedContact): string => {
    const phoneKeys = [
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
      'platformChatId',
      'platform_chat_id',
      'chatId',
    ];

    const extractPhone = (record: unknown): string | null => {
      if (!record) {
        return null;
      }

      if (typeof record === 'string') {
        const trimmed = record.trim();
        if (!trimmed) {
          return null;
        }

        const digits = trimmed.replace(/[^\d]/g, '');
        if (!digits) {
          return null;
        }

        return trimmed;
      }

      if (Array.isArray(record)) {
        for (const entry of record) {
          const found = extractPhone(entry);
          if (found) {
            return found;
          }
        }
        return null;
      }

      if (typeof record === 'object') {
        const source = record as Record<string, unknown>;
        for (const key of phoneKeys) {
          if (key in source) {
            const found = extractPhone(source[key]);
            if (found) {
              return found;
            }
          }
        }
      }

      return null;
    };

    const candidates: Array<unknown> = [
      contact.phoneNumber,
      contact.phone,
      contact.platformChatId,
      contact.metadata,
      contact.lastChannel,
      contact.latestChannel,
    ];

    for (const candidate of candidates) {
      const value = extractPhone(candidate);
      if (value) {
        return value;
      }
    }

    return '';
  };

  const buildWhatsappLink = (phone?: string) => {
    if (!phone) {
      return '';
    }

    const sanitized = phone.replace(/[^\d]/g, '');
    return sanitized ? `https://wa.me/${sanitized}` : '';
  };
  
  const filteredContacts = useMemo(() => {
    const loweredFilter = filter.toLowerCase();

    return sortedContacts.filter((contact) => {
      const phone = resolveContactPhone(contact);
      return (
        (contact.name?.toLowerCase() ||
          contact.username?.toLowerCase() ||
          contact.userName?.toLowerCase() ||
          ''
        ).includes(loweredFilter) ||
        phone.includes(filter) ||
        (contact.userName || contact.username || '').includes(filter)
      );
    });
  }, [sortedContacts, filter]);

  return (
    <div className="space-y-6">
      <GradientSection
        title={t('contacts.title')}
        actions={
          <input
            type="text"
            placeholder={`${t('contacts.filterPlaceholder')}...`}
            value={filter}
            onChange={(event) => setFilter(event.target.value)}
            className="w-64 rounded-full border border-brand-border/60 bg-white px-4 py-2 text-sm text-brand-dark shadow-sm transition focus:border-brand-primary focus:outline-none focus:ring-2 focus:ring-brand-primary/30"
          />
        }
      >
        <div className="overflow-x-auto">
          {isLoading ? (
            <div className="flex justify-center p-10">
              <Spinner />
            </div>
          ) : filteredContacts.length === 0 ? (
            <div className="py-10 text-center text-brand-muted">
              {filter ? t('contacts.noContactsFound') : t('contacts.noContacts')}
            </div>
          ) : (
            <table className="min-w-full divide-y divide-brand-border/80 rounded-2xl bg-white/90 shadow-brand-soft backdrop-blur">
              <thead className="bg-brand-muted text-brand-surface">
                <tr>
                  <th scope="col" className="px-6 py-3 text-left text-xs font-semibold uppercase tracking-wider">
                    {t('contacts.name')}
                  </th>
                  <th scope="col" className="px-6 py-3 text-left text-xs font-semibold uppercase tracking-wider">
                    {t('contacts.viewConversation', 'Ver conversación')}
                  </th>
                  <th scope="col" className="px-6 py-3 text-left text-xs font-semibold uppercase tracking-wider">
                    {t('contacts.phone')}
                  </th>
                  <th scope="col" className="px-6 py-3 text-left text-xs font-semibold uppercase tracking-wider">
                    {t('contacts.platform', 'Plataforma')}
                  </th>
                  <th scope="col" className="px-6 py-3 text-left text-xs font-semibold uppercase tracking-wider">
                    {t('contacts.requiresAdmin')}
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y divide-brand-border/60 bg-white/85">
                {filteredContacts.map((contact) => {
                  const phoneValue = resolveContactPhone(contact);
                  const whatsappUrl = buildWhatsappLink(phoneValue);

                  return (
                    <tr key={contact.id} className="transition-colors hover:bg-brand-background/50">
                      <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-brand-dark">
                        {contact.name || contact.username || contact.userName || 'Sin nombre'}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm font-medium">
                        <Link
                          to={`/chats/${contact.id}`}
                          className="inline-flex items-center rounded-full bg-brand-primary px-4 py-2 text-xs font-semibold text-white transition-colors hover:bg-brand-primary-hover"
                        >
                          {t('contacts.viewConversation', 'Ver conversación')}
                        </Link>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-brand-muted">
                        {whatsappUrl ? (
                          <a
                            href={whatsappUrl}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="inline-flex items-center gap-2 text-brand-primary transition-colors hover:text-brand-primary-hover"
                            aria-label="Contactar por WhatsApp"
                          >
                            <span>+{phoneValue}</span>
                            <svg
                              xmlns="http://www.w3.org/2000/svg"
                              viewBox="0 0 24 24"
                              fill="currentColor"
                              className="h-4 w-4"
                            >
                              <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.1-.472-.148-.67.15-.198.297-.767.966-.94 1.164-.173.199-.347.223-.644.074-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.372-.025-.521-.075-.149-.67-1.611-.916-2.204-.242-.579-.487-.5-.67-.51-.173-.007-.372-.009-.571-.009-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.095 3.2 5.076 4.487.709.306 1.262.489 1.694.626.712.226 1.36.194 1.872.118.571-.085 1.758-.718 2.006-1.413.248-.695.248-1.29.173-1.413-.074-.124-.272-.198-.57-.347z" />
                              <path d="M12.004 2.5C6.763 2.5 2.5 6.763 2.5 12.004c0 1.942.512 3.838 1.482 5.49L2 22l4.628-1.938a9.47 9.47 0 0 0 5.376 1.642c5.241 0 9.504-4.263 9.504-9.504S17.245 2.5 12.004 2.5zm0 16.934c-1.705 0-3.358-.454-4.806-1.312l-.344-.204-2.744 1.149 1.152-2.676-.224-.352a8.045 8.045 0 0 1-1.23-4.035c0-4.446 3.617-8.063 8.064-8.063 4.446 0 8.063 3.617 8.063 8.063s-3.617 8.063-8.063 8.063z" />
                            </svg>
                          </a>
                        ) : (
                          <span>{phoneValue || 'N/A'}</span>
                        )}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-brand-muted">
                        {resolvePlatformLabel(contact)}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <label htmlFor={`toggle-${contact.id}`} className="flex cursor-pointer items-center">
                          <div className="relative">
                            <input
                              id={`toggle-${contact.id}`}
                              type="checkbox"
                              className="sr-only"
                              checked={contact.requireAdmin || false}
                              onChange={() => handleToggle(contact.id, contact.requireAdmin || false)}
                              disabled={!canEdit}
                            />
                            <div className={`block h-8 w-14 rounded-full transition ${contact.requireAdmin ? 'bg-brand-primary' : 'bg-brand-border/70'}`} />
                            <div className={`dot absolute left-1 top-1 h-6 w-6 rounded-full bg-white shadow transition ${contact.requireAdmin ? 'translate-x-6' : ''}`} />
                          </div>
                        </label>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          )}
        </div>
      </GradientSection>
    </div>
  );
};

export default Contacts;



