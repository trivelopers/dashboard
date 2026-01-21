
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

type EnrichedContact = ExtendedContact & {
  lastInteractionDate: Date | null;
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

const asDate = (value: unknown): Date | null => {
  if (!value) {
    return null;
  }

  if (value instanceof Date && !Number.isNaN(value.getTime())) {
    return value;
  }

  if (typeof value === 'string' || typeof value === 'number') {
    const parsed = new Date(value);
    if (!Number.isNaN(parsed.getTime())) {
      return parsed;
    }
  }

  return null;
};

const resolveDateField = (record: Record<string, any> | null | undefined, keys: string[]): Date | null => {
  if (!record) {
    return null;
  }

  for (const key of keys) {
    const candidate = asDate(record?.[key]);
    if (candidate) {
      return candidate;
    }
  }

  return null;
};

const resolveLastInteractionDate = (contact: ExtendedContact): Date | null => {
  const direct = resolveDateField(contact as Record<string, any>, [
    'lastMessageAt',
    'lastInteractionAt',
    'updatedAt',
    'updated_at',
    'latestMessageAt',
    'lastActivityAt',
  ]);
  if (direct) {
    return direct;
  }

  const nestedCandidates: Array<unknown> = [contact.lastChannel, contact.latestChannel, contact.metadata];
  for (const candidate of nestedCandidates) {
    if (candidate && typeof candidate === 'object') {
      const nested = resolveDateField(candidate as Record<string, any>, [
        'lastMessageAt',
        'lastInteractionAt',
        'updatedAt',
        'updated_at',
        'latestMessageAt',
        'lastActivityAt',
        'timestamp',
      ]);
      if (nested) {
        return nested;
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

const formatInteractionDate = (date: Date | null): string => {
  if (!date) return '-';

  const now = new Date();
  const diffInMs = now.getTime() - date.getTime();
  const diffInHours = diffInMs / (1000 * 60 * 60);

  if (diffInHours < 25) {
    return date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
  }

  return `${date.toLocaleDateString()} ${date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}`;
};

const Contacts: React.FC = () => {
  const { user } = useAuth();
  const { t } = useTranslation();
  const [contacts, setContacts] = useState<ExtendedContact[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [filter, setFilter] = useState('');

  const [sortConfig, setSortConfig] = useState<{ key: 'date' | 'name' | 'phone' | 'platform' | 'requireAdmin'; direction: 'asc' | 'desc' }>({
    key: 'date',
    direction: 'desc',
  });
  const [editingId, setEditingId] = useState<string | null>(null);
  const [draftName, setDraftName] = useState('');
  const [draftPhone, setDraftPhone] = useState('');

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

  const enrichedContacts = useMemo<EnrichedContact[]>(() => {
    return contacts.map((contact) => ({
      ...contact,
      lastInteractionDate: resolveLastInteractionDate(contact),
    }));
  }, [contacts]);

  const sortedContacts = useMemo(() => {
    return [...enrichedContacts].sort((a, b) => {
      // Priority 1: Require Admin (Always on top)
      const needsAdminA = a.requireAdmin ? 1 : 0;
      const needsAdminB = b.requireAdmin ? 1 : 0;
      if (needsAdminA !== needsAdminB) {
        return needsAdminB - needsAdminA;
      }

      // Priority 2: Selected Sort
      let comparison = 0;

      if (sortConfig.key === 'date') {
        const timeA = a.lastInteractionDate ? a.lastInteractionDate.getTime() : 0;
        const timeB = b.lastInteractionDate ? b.lastInteractionDate.getTime() : 0;
        comparison = timeA - timeB;
      } else if (sortConfig.key === 'name') {
        const nameA = (a.name || a.username || a.userName || '').toLowerCase();
        const nameB = (b.name || b.username || b.userName || '').toLowerCase();
        comparison = nameA.localeCompare(nameB);
      } else if (sortConfig.key === 'phone') {
        const phoneA = resolveContactPhone(a);
        const phoneB = resolveContactPhone(b);
        comparison = phoneA.localeCompare(phoneB);
      } else if (sortConfig.key === 'platform') {
        const platformA = resolvePlatformLabel(a);
        const platformB = resolvePlatformLabel(b);
        comparison = platformA.localeCompare(platformB);
      } else if (sortConfig.key === 'requireAdmin') {
        // Already handled explicitly above, but if we wanted to sort *within* the non-admin group by this flag (all false), it's 0.
        // This block is technically redundant given the priority check, but keeps structure clean if we remove separate priority later.
        comparison = needsAdminA - needsAdminB;
      }

      return sortConfig.direction === 'asc' ? comparison : -comparison;
    });
  }, [enrichedContacts, sortConfig]);

  const handleSort = (key: 'date' | 'name' | 'phone' | 'platform' | 'requireAdmin') => {
    setSortConfig((current) => ({
      key,
      direction: current.key === key && current.direction === 'desc' ? 'asc' : 'desc',
    }));
  };

  const SortIcon = ({ active, direction }: { active: boolean; direction: 'asc' | 'desc' }) => {
    if (!active) return <span className="ml-1 text-brand-muted/40 transition group-hover:text-brand-muted/70">↕</span>;
    return (
      <span className="ml-1 text-brand-primary">
        {direction === 'asc' ? '↑' : '↓'}
      </span>
    );
  };

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

  const startEditing = (contact: ExtendedContact) => {
    if (!canEdit) {
      return;
    }
    setEditingId(contact.id);
    setDraftName(contact.name || contact.username || contact.userName || '');
    setDraftPhone(resolveContactPhone(contact));
  };

  const cancelEditing = () => {
    setEditingId(null);
    setDraftName('');
    setDraftPhone('');
  };

  const saveEditing = async (contact: ExtendedContact) => {
    if (!canEdit) {
      return;
    }
    const originalContacts = [...contacts];
    const updatedName = draftName.trim();
    const updatedPhone = draftPhone.trim();

    setContacts((prev) =>
      prev.map((item) =>
        item.id === contact.id
          ? {
            ...item,
            name: updatedName,
            phoneNumber: updatedPhone,
          }
          : item,
      ),
    );
    setEditingId(null);

    try {
      await api.put(`/dashboard/contacts/${contact.id}`, {
        name: updatedName,
        phoneNumber: updatedPhone,
      });
    } catch (error) {
      console.error('Failed to update contact', error);
      setContacts(originalContacts);
      setEditingId(contact.id);
    }
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
          <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-end">
            <input
              type="text"
              placeholder={`${t('contacts.filterPlaceholder')}...`}
              value={filter}
              onChange={(event) => setFilter(event.target.value)}
              className="w-full rounded-full border border-brand-border/60 bg-white px-4 py-2 text-sm text-brand-dark shadow-sm transition focus:border-brand-primary focus:outline-none focus:ring-2 focus:ring-brand-primary/30 sm:w-64"
            />
            <div className="w-full sm:w-60 h-10" />
          </div>
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
                  <th
                    scope="col"
                    className="group cursor-pointer px-3 py-3 text-left text-xs font-semibold uppercase tracking-wider w-24 whitespace-nowrap hover:bg-brand-muted/80 transition"
                    onClick={() => handleSort('date')}
                  >
                    <div className="flex items-center">
                      Fecha
                      <SortIcon active={sortConfig.key === 'date'} direction={sortConfig.direction} />
                    </div>
                  </th>
                  <th
                    scope="col"
                    className="group cursor-pointer px-6 py-3 text-left text-xs font-semibold uppercase tracking-wider hover:bg-brand-muted/80 transition"
                    onClick={() => handleSort('name')}
                  >
                    <div className="flex items-center">
                      {t('contacts.name')}
                      <SortIcon active={sortConfig.key === 'name'} direction={sortConfig.direction} />
                    </div>
                  </th>
                  <th scope="col" className="px-6 py-3 text-left text-xs font-semibold uppercase tracking-wider">
                    {t('contacts.viewConversation', 'Ver conversación')}
                  </th>
                  <th
                    scope="col"
                    className="group cursor-pointer px-6 py-3 text-left text-xs font-semibold uppercase tracking-wider hover:bg-brand-muted/80 transition"
                    onClick={() => handleSort('phone')}
                  >
                    <div className="flex items-center">
                      {t('contacts.phone')}
                      <SortIcon active={sortConfig.key === 'phone'} direction={sortConfig.direction} />
                    </div>
                  </th>
                  <th
                    scope="col"
                    className="group cursor-pointer px-6 py-3 text-left text-xs font-semibold uppercase tracking-wider hover:bg-brand-muted/80 transition"
                    onClick={() => handleSort('platform')}
                  >
                    <div className="flex items-center">
                      {t('contacts.platform', 'Plataforma')}
                      <SortIcon active={sortConfig.key === 'platform'} direction={sortConfig.direction} />
                    </div>
                  </th>
                  <th scope="col" className="px-6 py-3 text-left text-xs font-semibold uppercase tracking-wider">
                    {t('contacts.requiresAdmin')}
                  </th>
                  <th scope="col" className="px-6 py-3 text-left text-xs font-semibold uppercase tracking-wider">
                    {t('contacts.edit', 'Editar')}
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y divide-brand-border/60 bg-white/85">
                {filteredContacts.map((contact) => {
                  const phoneValue = resolveContactPhone(contact);
                  const whatsappUrl = buildWhatsappLink(phoneValue);
                  const isEditing = editingId === contact.id;

                  return (
                    <tr key={contact.id} className="transition-colors hover:bg-brand-background/50">
                      <td className="px-3 py-4 whitespace-nowrap text-sm text-brand-muted w-24">
                        {formatInteractionDate(contact.lastInteractionDate)}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-brand-dark">
                        {isEditing ? (
                          <input
                            type="text"
                            value={draftName}
                            onChange={(event) => setDraftName(event.target.value)}
                            className="w-full min-w-[160px] rounded-full border border-brand-border/60 bg-white px-3 py-2 text-sm text-brand-dark shadow-sm focus:border-brand-primary focus:outline-none focus:ring-2 focus:ring-brand-primary/30"
                          />
                        ) : (
                          contact.name || contact.username || contact.userName || 'Sin nombre'
                        )}
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
                        {isEditing ? (
                          <input
                            type="text"
                            value={draftPhone}
                            onChange={(event) => setDraftPhone(event.target.value)}
                            className="w-full min-w-[140px] rounded-full border border-brand-border/60 bg-white px-3 py-2 text-sm text-brand-dark shadow-sm focus:border-brand-primary focus:outline-none focus:ring-2 focus:ring-brand-primary/30"
                          />
                        ) : whatsappUrl ? (
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
                      <td className="px-6 py-4 whitespace-nowrap text-sm">
                        {isEditing ? (
                          <div className="flex items-center gap-2">
                            <button
                              type="button"
                              onClick={() => saveEditing(contact)}
                              className="inline-flex h-9 w-9 items-center justify-center rounded-full border border-emerald-200 bg-emerald-50 text-emerald-600 transition hover:border-emerald-300 hover:bg-emerald-100"
                              aria-label="Guardar cambios"
                            >
                              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="h-4 w-4">
                                <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
                              </svg>
                            </button>
                            <button
                              type="button"
                              onClick={cancelEditing}
                              className="inline-flex h-9 w-9 items-center justify-center rounded-full border border-red-200 bg-red-50 text-red-600 transition hover:border-red-300 hover:bg-red-100"
                              aria-label="Descartar cambios"
                            >
                              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="h-4 w-4">
                                <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
                              </svg>
                            </button>
                          </div>
                        ) : (
                          <button
                            type="button"
                            onClick={() => startEditing(contact)}
                            disabled={!canEdit}
                            className="inline-flex items-center rounded-full border border-brand-border/60 bg-white px-4 py-2 text-xs font-semibold text-brand-dark shadow-sm transition hover:border-brand-primary hover:text-brand-primary disabled:cursor-not-allowed disabled:text-brand-muted"
                          >
                            {t('contacts.edit', 'Editar')}
                          </button>
                        )}
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



