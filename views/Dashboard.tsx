import React, { useEffect, useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import {
  ChatBubbleBottomCenterTextIcon,
  ClockIcon,
  InformationCircleIcon,
  SignalIcon,
  UserGroupIcon,
} from '@heroicons/react/24/outline';
import GradientSection from '../components/GradientSection';
import { useAuth } from '../hooks/useAuth';
import api from '../services/api';
import { Contact, Role } from '../types';
import { parseXMLPrompt } from '../utils/promptHelpers';

type ApiContact = Contact & {
  username?: string | null;
  userName?: string | null;
  platform?: string | null;
  platforms?: Array<string | null> | null;
  channel?: string | null;
  originPlatform?: string | null;
  metadata?: Record<string, any> | null;
  lastChannel?: Record<string, any> | string | null;
  latestChannel?: Record<string, any> | string | null;
  clientId?: string | null;
  updatedAt?: string | null;
  createdAt?: string | null;
  lastInteractionAt?: string | null;
  lastActivityAt?: string | null;
};

interface EnrichedContact extends ApiContact {
  lastInteractionDate: Date | null;
  createdDate: Date | null;
}

interface InteractionsPoint {
  date: string;
  count: number;
}

interface MetricCardProps {
  label: string;
  value: React.ReactNode;
  helper?: string;
  icon: React.ElementType;
  tone?: 'primary' | 'accent' | 'info';
  isLoading?: boolean;
}

const toneMap: Record<NonNullable<MetricCardProps['tone']>, string> = {
  primary: 'bg-brand-primary/10 text-brand-primary',
  accent: 'bg-brand-accent/10 text-brand-accent',
  info: 'bg-brand-info/10 text-brand-info',
};

const MetricCard: React.FC<MetricCardProps> = ({ label, value, helper, icon: Icon, tone = 'primary', isLoading }) => (
  <div className="group flex flex-col justify-between rounded-2xl border border-brand-border/60 bg-white/85 p-6 shadow-brand-soft backdrop-blur transition-all hover:-translate-y-0.5 hover:shadow-lg">
    <div className="flex items-start justify-between gap-4">
      <div>
        <p className="text-sm text-brand-muted">{label}</p>
        <div className="mt-1 text-2xl font-semibold text-brand-dark">{isLoading ? '...' : value}</div>
      </div>
      <span className={`flex h-10 w-10 items-center justify-center rounded-full ${toneMap[tone]}`}>
        <Icon className="h-5 w-5" />
      </span>
    </div>
    {helper && <p className="mt-4 text-xs text-brand-muted">{helper}</p>}
  </div>
);

const InteractionsChart: React.FC<{ data: InteractionsPoint[]; isLoading?: boolean }> = ({ data, isLoading }) => {
  const chartData = data.slice(-7);
  const maxValue = Math.max(...chartData.map((item) => item.count), 1);

  return (
    <div className="group rounded-2xl border border-brand-border/60 bg-white/90 p-6 shadow-brand-soft backdrop-blur">
      <div className="flex items-center justify-between">
        <div>
          <p className="text-sm text-brand-muted">Interacciones recientes</p>
          <p className="text-lg font-semibold text-brand-dark">Últimos 7 días</p>
        </div>
        <div className="flex items-center gap-2 text-xs text-brand-muted">
          <span className="flex h-2 w-2 rounded-full bg-brand-primary" />
          Total de interacciones
        </div>
      </div>
      {isLoading ? (
        <div className="mt-8 h-32 animate-pulse rounded-xl bg-brand-border/40" />
      ) : chartData.length ? (
        <div className="mt-6 flex h-40 items-end gap-3">
          {chartData.map((point) => {
            const hasActivity = point.count > 0;
            const normalizedHeight = hasActivity
              ? Math.max((point.count / maxValue) * 100, 18)
              : 0;

            return (
              <div key={point.date} className="flex h-full w-full flex-col items-center justify-end gap-2">
                <div
                  className={`flex w-full ${hasActivity ? 'items-end' : 'items-center'} justify-center rounded-t-xl text-xs font-medium transition-all ${
                    hasActivity
                      ? 'bg-gradient-to-t from-brand-primary/20 to-brand-primary/70 text-brand-dark group-hover:from-brand-primary/30 group-hover:to-brand-primary/80'
                      : 'bg-brand-border/40 text-brand-muted'
                  }`}
                  style={hasActivity ? { height: `${normalizedHeight}%` } : { height: '8px' }}
                >
                  {hasActivity && <span className="mb-2 text-[11px] text-brand-dark/80">{point.count}</span>}
                </div>
                {!hasActivity && <span className="text-xs font-medium text-brand-muted">{point.count}</span>}
                <span className="text-xs text-brand-muted">
                  {new Date(point.date).toLocaleDateString(undefined, { weekday: 'short' })}
                </span>
              </div>
            );
          })}
        </div>
      ) : (
        <div className="mt-6 flex h-40 items-center justify-center rounded-xl border border-brand-border/40 bg-brand-background/40 text-sm text-brand-muted">
          Sin actividad registrada en los últimos días.
        </div>
      )}
    </div>
  );
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

const resolveDateField = (record: Record<string, any>, keys: string[]): Date | null => {
  for (const key of keys) {
    const candidate = asDate(record?.[key]);
    if (candidate) {
      return candidate;
    }
  }

  return null;
};

const formatRelativeTime = (date: Date | null): string => {
  if (!date) {
    return 'Sin actividad';
  }

  const diffMs = Date.now() - date.getTime();
  if (diffMs < 60_000) {
    return 'Hace instantes';
  }
  if (diffMs < 3_600_000) {
    const minutes = Math.round(diffMs / 60_000);
    return minutes === 1 ? 'Hace 1 minuto' : `Hace ${minutes} minutos`;
  }
  if (diffMs < 86_400_000) {
    const hours = Math.round(diffMs / 3_600_000);
    return hours === 1 ? 'Hace 1 hora' : `Hace ${hours} horas`;
  }
  const days = Math.round(diffMs / 86_400_000);
  return days === 1 ? 'Hace 1 dia' : `Hace ${days} días`;
};

const formatDateTime = (date: Date | null): string => {
  if (!date) {
    return 'Sin fecha';
  }
  return date.toLocaleString(undefined, {
    day: '2-digit',
    month: 'short',
    hour: '2-digit',
    minute: '2-digit',
  });
};

const buildDisplayName = (contact: ApiContact): string => {
  return (
    contact.name ||
    contact.username ||
    contact.userName ||
    contact.platformChatId ||
    contact.phoneNumber ||
    contact.id
  );
};

const buildChannelLabel = (contact: ApiContact): string | null => {
  const phone = contact.phoneNumber || contact.platformChatId;
  if (phone) {
    return phone;
  }

  if (contact.email) {
    return contact.email;
  }

  return null;
};

const getPlatformValue = (record: unknown): string | null => {
  if (!record) {
    return null;
  }

  if (typeof record === 'string') {
    const trimmed = record.trim();
    return trimmed ? trimmed.toLowerCase() : null;
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

    const candidateKeys = [
      'platform',
      'channel',
      'source',
      'origin',
      'platformName',
      'originPlatform',
    ];

    for (const key of candidateKeys) {
      const value = source[key];
      if (typeof value === 'string' && value.trim()) {
        return value.trim().toLowerCase();
      }
    }
  }

  return null;
};

const shouldHideContact = (contact: ApiContact): boolean => {
  const candidates: Array<unknown> = [
    contact,
    contact.platforms,
    (contact as Record<string, unknown>).channel,
    (contact as Record<string, unknown>).originPlatform,
    (contact as Record<string, unknown>).source,
    contact.lastChannel ?? contact.latestChannel,
    contact.metadata,
  ];

  return candidates.some((candidate) => getPlatformValue(candidate) === 'web');
};

const Dashboard: React.FC = () => {
  const { user } = useAuth();
  const { t } = useTranslation();
  const [companyData, setCompanyData] = useState<Record<string, any> | null>(null);
  const [contacts, setContacts] = useState<ApiContact[]>([]);
  const [botSettings, setBotSettings] = useState<Record<string, any> | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [hasError, setHasError] = useState(false);
  const [reloadKey, setReloadKey] = useState(0);

  useEffect(() => {
    let isCancelled = false;

    const fetchData = async () => {
      setIsLoading(true);
      let errorDetected = false;

      const [companyResult, contactsResult, botSettingsResult] = await Promise.allSettled([
        api.get('dashboard/clients/current'),
        api.get('/dashboard/contacts'),
        api.get('/dashboard/bot-settings'),
      ]);

      if (isCancelled) {
        return;
      }

      if (companyResult.status === 'fulfilled') {
        setCompanyData(companyResult.value.data ?? null);
      } else {
        errorDetected = true;
        setCompanyData(null);
      }

      if (contactsResult.status === 'fulfilled') {
        const apiContacts = (contactsResult.value.data?.contacts ?? []) as ApiContact[];
        setContacts(apiContacts.filter((contact) => !shouldHideContact(contact)));
      } else {
        errorDetected = true;
        setContacts([]);
      }

      if (botSettingsResult.status === 'fulfilled') {
        setBotSettings(botSettingsResult.value.data?.botSettings ?? null);
      } else {
        errorDetected = true;
        setBotSettings(null);
      }

      setHasError(errorDetected);
      setIsLoading(false);
    };

    fetchData();

    return () => {
      isCancelled = true;
    };
  }, [reloadKey]);

  const enrichedContacts = useMemo<EnrichedContact[]>(() => {
    return contacts.map((contact) => ({
      ...contact,
      lastInteractionDate: resolveDateField(contact, [
        'lastMessageAt',
        'lastInteractionAt',
        'updatedAt',
        'updated_at',
        'latestMessageAt',
        'lastActivityAt',
      ]),
      createdDate: resolveDateField(contact, [
        'createdAt',
        'created_at',
        'firstMessageAt',
        'firstConversationAt',
        'firstInteractionAt',
      ]),
    }));
  }, [contacts]);

  const {
    totalContacts,
    activeToday,
    activeWeek,
    requireAdminCount,
    newContactsWeek,
    interactionsByDay,
    recentContacts,
    pendingContacts,
  } = useMemo(() => {
    const now = new Date();
    const dayMs = 86_400_000;

    const stats = {
      totalContacts: enrichedContacts.length,
      activeToday: 0,
      activeWeek: 0,
      requireAdminCount: 0,
      newContactsWeek: 0,
      interactionsByDay: [] as InteractionsPoint[],
      recentContacts: [] as EnrichedContact[],
      pendingContacts: [] as EnrichedContact[],
    };

    const buckets = new Map<string, number>();
    for (let offset = 6; offset >= 0; offset -= 1) {
      const bucketDate = new Date(now);
      bucketDate.setDate(now.getDate() - offset);
      const bucketKey = bucketDate.toISOString().slice(0, 10);
      buckets.set(bucketKey, 0);
    }

    const sortedByInteraction = [...enrichedContacts].sort((a, b) => {
      const timeA = a.lastInteractionDate ? a.lastInteractionDate.getTime() : 0;
      const timeB = b.lastInteractionDate ? b.lastInteractionDate.getTime() : 0;
      return timeB - timeA;
    });

    sortedByInteraction.forEach((contact) => {
      if (contact.requireAdmin) {
        stats.requireAdminCount += 1;
      }

      if (contact.lastInteractionDate) {
        const diff = now.getTime() - contact.lastInteractionDate.getTime();
        if (diff <= dayMs) {
          stats.activeToday += 1;
        }
        if (diff <= dayMs * 7) {
          stats.activeWeek += 1;
        }

        const bucketKey = contact.lastInteractionDate.toISOString().slice(0, 10);
        if (buckets.has(bucketKey)) {
          buckets.set(bucketKey, (buckets.get(bucketKey) ?? 0) + 1);
        }
      }

      if (contact.createdDate) {
        const diff = now.getTime() - contact.createdDate.getTime();
        if (diff <= dayMs * 7) {
          stats.newContactsWeek += 1;
        }
      }
    });

    stats.recentContacts = sortedByInteraction.slice(0, 6);
    stats.pendingContacts = sortedByInteraction.filter((contact) => contact.requireAdmin).slice(0, 5);
    stats.interactionsByDay = Array.from(buckets.entries()).map(([date, count]) => ({ date, count }));

    return stats;
  }, [enrichedContacts]);

  const promptData = useMemo(() => {
    if (!botSettings?.prompt) {
      return null;
    }
    try {
      return parseXMLPrompt(botSettings.prompt);
    } catch (error) {
      console.error('No se pudo interpretar el prompt almacenado', error);
      return null;
    }
  }, [botSettings]);

  const promptUpdatedAt = useMemo(() => {
    if (!botSettings) {
      return null;
    }
    return resolveDateField(botSettings, ['updatedAt', 'updated_at', 'lastUpdatedAt']);
  }, [botSettings]);

  const assistantRole = useMemo(() => {
    const role = promptData?.role?.trim();
    return role ? role : null;
  }, [promptData]);

  const assistantPurpose = useMemo(() => {
    const purpose = promptData?.purpose?.trim();
    return purpose ? purpose : null;
  }, [promptData]);

  const companyName = companyData?.name ?? t('dashboard.companyFallback', 'Tu empresa');
  const timezone = companyData?.timezone || companyData?.timeZone || null;
  const canRefineAssistant = user?.role === Role.ADMIN || user?.role === Role.EDITOR;

  const handleRefresh = () => {
    setReloadKey((value) => value + 1);
  };

  return (
    <div className="space-y-6">
      <GradientSection
        title={t('dashboard.welcome', { name: user?.name })}
        description={t(
          'dashboard.summaryDescription',
          'Este panel muestra la actividad real del asistente y la base de contactos.',
        )}
        actions={
          <button
            type="button"
            onClick={handleRefresh}
            disabled={isLoading}
            className="inline-flex items-center rounded-full border border-brand-border/60 bg-white px-4 py-2 text-sm font-semibold text-brand-dark shadow-sm transition hover:border-brand-primary hover:text-brand-primary disabled:cursor-not-allowed disabled:text-brand-muted"
          >
            {isLoading ? t('dashboard.refreshing', 'Actualizando...') : t('dashboard.refresh', 'Actualizar')}
          </button>
        }
      >
        {hasError && (
          <div className="mb-4 rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-600">
            {t(
              'dashboard.partialError',
              'No pudimos obtener toda la informacion. Intenta actualizar nuevamente.',
            )}
          </div>
        )}
        <div className="grid grid-cols-1 gap-6 md:grid-cols-2 xl:grid-cols-4">
          <MetricCard
            label={t('dashboard.companyLabel', 'Empresa')}
            value={companyName}
            helper={timezone ? `Zona horaria: ${timezone}` : undefined}
            icon={InformationCircleIcon}
            tone="primary"
            isLoading={isLoading && !companyData}
          />
          <MetricCard
            label={t('dashboard.totalContacts', 'Contactos totales')}
            value={totalContacts.toLocaleString()}
            helper={t('dashboard.activeWeek', 'Activos en los últimos 7 días: {{count}}', {
              count: activeWeek.toLocaleString(),
            })}
            icon={UserGroupIcon}
            tone="accent"
            isLoading={isLoading}
          />
          <MetricCard
            label={t('dashboard.activeToday', 'Conversaciones activas hoy')}
            value={activeToday.toLocaleString()}
            helper={t('dashboard.activeTodayHelper', 'Últimas 24 horas')}
            icon={ChatBubbleBottomCenterTextIcon}
            tone="info"
            isLoading={isLoading}
          />
          <MetricCard
            label={t('dashboard.newContacts', 'Nuevos contactos (7 días)')}
            value={newContactsWeek.toLocaleString()}
            helper={t('dashboard.pendingAttention', 'Pendientes: {{count}}', {
              count: requireAdminCount.toLocaleString(),
            })}
            icon={SignalIcon}
            tone="primary"
            isLoading={isLoading}
          />
        </div>
      </GradientSection>

      <div className="grid grid-cols-1 gap-6 xl:grid-cols-3">
        <div className="space-y-6 xl:col-span-2">
          <GradientSection
            title={t('dashboard.activityTitle', 'Actividad de conversaciones')}
            description={t(
              'dashboard.activityDescription',
              'Seguimiento diario de los contactos que interactuaron con el asistente.',
            )}
          >
            <InteractionsChart data={interactionsByDay} isLoading={isLoading} />
          </GradientSection>

          <GradientSection
            title={t('dashboard.recentContactsTitle', 'Contactos recientes')}
            description={t(
              'dashboard.recentContactsDescription',
              'Últimas conversaciones ordenadas por actividad. Accede rápido al detalle de cada chat.',
            )}
          >
            {isLoading ? (
              <div className="space-y-3">
                {Array.from({ length: 4 }).map((_, index) => (
                  <div
                    // eslint-disable-next-line react/no-array-index-key
                    key={index}
                    className="h-20 w-full animate-pulse rounded-2xl bg-brand-border/40"
                  />
                ))}
              </div>
            ) : recentContacts.length ? (
              <ul className="space-y-3">
                {recentContacts.map((contact) => {
                  const channel = buildChannelLabel(contact);
                  return (
                    <li
                      key={contact.id}
                      className="flex items-center justify-between rounded-2xl border border-brand-border/60 bg-white/85 px-5 py-4 shadow-brand-soft transition hover:border-brand-primary/60"
                    >
                      <div className="space-y-1">
                        <p className="text-sm font-semibold text-brand-dark">{buildDisplayName(contact)}</p>
                        <p className="text-xs text-brand-muted">
                          {t('dashboard.lastInteraction', 'Ultimo mensaje')}: {formatRelativeTime(contact.lastInteractionDate)}
                          {' | '}
                          {formatDateTime(contact.lastInteractionDate)}
                        </p>
                      </div>
                      <Link
                        to={`/chats/${contact.id}`}
                        className="inline-flex items-center rounded-full border border-brand-primary/40 px-3 py-1 text-xs font-semibold text-brand-primary transition hover:bg-brand-primary/10"
                      >
                        {t('dashboard.viewConversation', 'Ver conversación')}
                      </Link>
                    </li>
                  );
                })}
              </ul>
            ) : (
              <p className="text-sm text-brand-muted">
                {t('dashboard.noRecentContacts', 'Todavia no hay conversaciones registradas.')}
              </p>
            )}
          </GradientSection>
        </div>

        <div className="space-y-6">
          <GradientSection
            title={t('dashboard.pendingContactsTitle', 'Seguimiento prioritario')}
            description={t(
              'dashboard.pendingContactsDescription',
              'Contactos que solicitaron asistencia humana y requieren una respuesta manual.',
            )}
            tone="warm"
          >
            {isLoading ? (
              <div className="space-y-3">
                {Array.from({ length: 3 }).map((_, index) => (
                  <div
                    // eslint-disable-next-line react/no-array-index-key
                    key={index}
                    className="h-16 w-full animate-pulse rounded-2xl bg-brand-border/40"
                  />
                ))}
              </div>
            ) : pendingContacts.length ? (
              <ul className="space-y-3">
                {pendingContacts.map((contact) => (
                  <li
                    key={contact.id}
                    className="flex items-center justify-between rounded-2xl border border-amber-200 bg-white px-4 py-3 text-sm shadow-brand-soft transition hover:border-brand-accent/60"
                  >
                    <div>
                      <p className="font-semibold text-brand-dark">{buildDisplayName(contact)}</p>
                      <p className="mt-1 flex items-center gap-2 text-xs text-brand-muted">
                        <ClockIcon className="h-4 w-4 text-brand-accent" />
                        {formatRelativeTime(contact.lastInteractionDate)}
                      </p>
                    </div>
                    <Link
                      to={`/chats/${contact.id}`}
                      className="text-xs font-semibold text-brand-accent transition hover:text-brand-primary"
                    >
                      {t('dashboard.openChat', 'Abrir chat')}
                    </Link>
                  </li>
                ))}
              </ul>
            ) : (
              <p className="text-sm text-brand-muted">
                {t('dashboard.noPendingContacts', 'Ningun contacto requiere aprobacion manual por el momento.')}
              </p>
            )}
          </GradientSection>

          <GradientSection
            title={t('dashboard.assistantContextTitle', 'Contexto del asistente')}
            description={t(
              'dashboard.assistantContextDescription',
              'Datos cargados en la configuracion actual del prompt para guiar al asistente.',
            )}
          >
            <div className="max-w-2xl space-y-5 text-sm text-brand-muted">
              <div className="space-y-3">
                <article className="rounded-2xl border border-brand-border/60 bg-white/85 p-4 shadow-brand-soft">
                  <p className="text-xs font-semibold uppercase tracking-wide text-brand-dark/70">
                    {t('dashboard.assistantPresentation', 'Como se presenta el asistente')}
                  </p>
                  <p className="mt-2 leading-relaxed text-brand-dark/80">
                    {assistantRole ||
                      t(
                        'dashboard.assistantPresentationEmpty',
                        'Todavia no definiste una presentacion para el asistente.',
                      )}
                  </p>
                </article>

                <article className="rounded-2xl border border-brand-border/60 bg-white/85 p-4 shadow-brand-soft">
                  <p className="text-xs font-semibold uppercase tracking-wide text-brand-dark/70">
                    {t('dashboard.assistantGoal', 'Que debe lograr')}
                  </p>
                  <p className="mt-2 leading-relaxed text-brand-dark/80">
                    {assistantPurpose ||
                      t(
                        'dashboard.assistantGoalEmpty',
                        'Todavia no definiste el objetivo principal del asistente.',
                      )}
                  </p>
                </article>
              </div>

              {promptUpdatedAt && (
                <p className="text-xs text-brand-muted">
                  {t('dashboard.promptUpdatedAt', 'Última actualización del prompt')}: {formatDateTime(promptUpdatedAt)}
                </p>
              )}

              {canRefineAssistant && (
                <div className="mt-3 flex justify-end">
                  <Link
                    to="/prompt"
                    className="inline-flex items-center rounded-full border border-brand-primary/60 bg-brand-primary/10 px-4 py-2 text-xs font-semibold text-brand-primary transition hover:border-brand-primary hover:bg-brand-primary/20"
                  >
                    {t('dashboard.openPrompt', 'Refinar asistente')}
                  </Link>
                </div>
              )}
            </div>
          </GradientSection>
        </div>
      </div>
    </div>
  );
};

export default Dashboard;
