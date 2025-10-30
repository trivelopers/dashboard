import React, { useEffect, useMemo, useState } from 'react';
import { useTranslation } from 'react-i18next';
import {
  BoltIcon,
  ChatBubbleBottomCenterTextIcon,
  ClockIcon,
  InformationCircleIcon,
  PlayPauseIcon,
  SignalIcon,
  UserGroupIcon,
} from '@heroicons/react/24/outline';
import GradientSection from '../components/GradientSection';
import { useAuth } from '../hooks/useAuth';
import api from '../services/api';

type BotStatus = 'active' | 'paused' | 'needs_attention' | 'error' | 'unknown';

interface DashboardSummary {
  companyName?: string;
  totalContacts: number;
  lastInteractionAt?: string | null;
  activeConversationsToday: number;
  activeConversationsWeek: number;
  autoResponseRate: number;
  botAvgResponseSeconds: number;
  humanAvgResponseSeconds: number;
  newLeads: number;
  botStatus: BotStatus;
  interactionsByDay: Array<{ date: string; count: number }>;
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

const statusTone: Record<BotStatus, { tone: MetricCardProps['tone']; label: string }> = {
  active: { tone: 'primary', label: 'Activo' },
  paused: { tone: 'info', label: 'Pausado' },
  needs_attention: { tone: 'accent', label: 'Requiere atencion' },
  error: { tone: 'accent', label: 'Con incidencias' },
  unknown: { tone: 'info', label: 'Sin datos' },
};

const secondsToReadable = (seconds: number) => {
  if (!seconds || Number.isNaN(seconds)) {
    return 'N/D';
  }
  if (seconds < 60) {
    return `${Math.round(seconds)}s`;
  }
  const minutes = seconds / 60;
  if (minutes < 60) {
    return `${minutes.toFixed(1)}m`;
  }
  const hours = minutes / 60;
  return `${hours.toFixed(1)}h`;
};

const MetricCard: React.FC<MetricCardProps> = ({ label, value, helper, icon: Icon, tone = 'primary', isLoading }) => (
  <div className="group flex flex-col justify-between rounded-2xl border border-brand-border/60 bg-white/85 p-6 shadow-brand-soft backdrop-blur transition-all hover:-translate-y-0.5 hover:shadow-lg">
    <div className="flex items-start justify-between gap-4">
      <div>
        <p className="text-sm text-brand-muted">{label}</p>
        <div className="mt-1 text-2xl font-semibold text-brand-dark">{isLoading ? '…' : value}</div>
      </div>
      <span className={`flex h-10 w-10 items-center justify-center rounded-full ${toneMap[tone]}`}>
        <Icon className="h-5 w-5" />
      </span>
    </div>
    {helper && <p className="mt-4 text-xs text-brand-muted">{helper}</p>}
  </div>
);

const InteractionsChart: React.FC<{ data: Array<{ date: string; count: number }>; isLoading?: boolean }> = ({
  data,
  isLoading,
}) => {
  const chartData = data.slice(-7);
  const maxValue = Math.max(...chartData.map((item) => item.count), 1);

  return (
    <div className="group rounded-2xl border border-brand-border/60 bg-white/90 p-6 shadow-brand-soft backdrop-blur">
      <div className="flex items-center justify-between">
        <div>
          <p className="text-sm text-brand-muted">Interacciones recientes</p>
          <p className="text-lg font-semibold text-brand-dark">Ultimos 7 dias</p>
        </div>
        <div className="flex items-center gap-2 text-xs text-brand-muted">
          <span className="flex h-2 w-2 rounded-full bg-brand-primary" />
          Total de interacciones
        </div>
      </div>
      {isLoading ? (
        <div className="mt-8 h-32 animate-pulse rounded-xl bg-brand-border/40" />
      ) : (
        <div className="mt-6 flex h-40 items-end gap-3">
          {chartData.map((point) => (
            <div key={point.date} className="flex w-full flex-col items-center gap-2">
              <div
                className="flex w-full items-end justify-center rounded-t-xl bg-gradient-to-t from-brand-primary/20 to-brand-primary/70 text-xs font-medium text-brand-dark transition-all group-hover:from-brand-primary/30 group-hover:to-brand-primary/80"
                style={{ height: `${(point.count / maxValue) * 100}%` }}
              >
                <span className="mb-2 text-[11px] text-brand-dark/80">{point.count}</span>
              </div>
              <span className="text-xs text-brand-muted">
                {new Date(point.date).toLocaleDateString(undefined, { weekday: 'short' })}
              </span>
            </div>
          ))}
        </div>
      )}
    </div>
  );
};

const Dashboard: React.FC = () => {
  const { user } = useAuth();
  const { t } = useTranslation();
  const [summary, setSummary] = useState<DashboardSummary | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
  const fetchSummary = async () => {
    try {
      setIsLoading(true);
      const [{ data: companyData }] = await Promise.all([
        api.get('dashboard/clients/current'),
      ]);

      setSummary({
        companyName: companyData?.name || 'Empresa desconocida',
        totalContacts: 0,
        activeConversationsToday: 0,
        activeConversationsWeek: 0,
        autoResponseRate: 0,
        botAvgResponseSeconds: 0,
        humanAvgResponseSeconds: 0,
        newLeads: 0,
        botStatus: 'unknown',
        interactionsByDay: [],
      });
    } catch (error) {
      console.error('Error obteniendo métricas del dashboard', error);
      setSummary({
        companyName: 'Empresa no disponible',
        totalContacts: 0,
        activeConversationsToday: 0,
        activeConversationsWeek: 0,
        autoResponseRate: 0,
        botAvgResponseSeconds: 0,
        humanAvgResponseSeconds: 0,
        newLeads: 0,
        botStatus: 'unknown',
        interactionsByDay: [],
      });
    } finally {
      setIsLoading(false);
    }
  };

  fetchSummary();
}, []);

  const heroDescription = useMemo(() => {
    if (summary?.companyName) {
      return t('dashboard.companySummary', {
        company: summary.companyName,
        defaultValue: `Informacion general de ${summary.companyName}`,
      });
    }
    return t('dashboard.heroDescription', 'Monitorea el pulso general del asistente.');
  }, [summary?.companyName, t]);

  const status = summary ? statusTone[summary.botStatus] ?? statusTone.unknown : statusTone.unknown;
  const lastInteraction = summary?.lastInteractionAt
    ? new Date(summary.lastInteractionAt).toLocaleString()
    : 'Sin interacciones recientes';

  return (
    <div className="space-y-6">
      <GradientSection title={t('dashboard.welcome', { name: user?.name })} description={heroDescription}>
        <div className="grid grid-cols-1 gap-6 md:grid-cols-2 xl:grid-cols-4">
          <MetricCard
            label="Empresa"
            value={summary?.companyName ?? 'Cargando…'}
            icon={InformationCircleIcon}
            tone="primary"
            helper={lastInteraction ? `Ultimo contacto: ${lastInteraction}` : undefined}
            isLoading={isLoading}
          />
          <MetricCard
            label={t('dashboard.totalContacts', 'Contactos totales')}
            value={summary?.totalContacts.toLocaleString() ?? '0'}
            icon={UserGroupIcon}
            tone="accent"
            helper="Base de contactos sincronizada con el CRM"
            isLoading={isLoading}
          />
          <MetricCard
            label="Conversaciones activas (hoy)"
            value={summary?.activeConversationsToday.toLocaleString() ?? '0'}
            helper={`Esta semana: ${summary?.activeConversationsWeek.toLocaleString() ?? 0}`}
            icon={ChatBubbleBottomCenterTextIcon}
            tone="info"
            isLoading={isLoading}
          />
          <MetricCard
            label="Leads nuevos"
            value={summary?.newLeads.toLocaleString() ?? '0'}
            helper="Filtrados por intencionalidad alta"
            icon={SignalIcon}
            tone="primary"
            isLoading={isLoading}
          />
        </div>
      </GradientSection>

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
        <div className="space-y-6 lg:col-span-2">
          <GradientSection
            title="Performance del asistente"
            description="Indicadores rapidos del bot y el equipo humano."
          >
            <div className="grid grid-cols-1 gap-6 sm:grid-cols-2">
              <MetricCard
                label="Tasa de respuesta automatica"
                value={`${Math.round((summary?.autoResponseRate ?? 0) * 100)}%`}
                helper="Mensajes atendidos por el asistente virtual"
                icon={BoltIcon}
                tone="primary"
                isLoading={isLoading}
              />
              <MetricCard
                label="Tiempo medio de respuesta (bot)"
                value={secondsToReadable(summary?.botAvgResponseSeconds ?? 0)}
                helper="Basado en conversaciones resueltas por el bot"
                icon={ClockIcon}
                tone="info"
                isLoading={isLoading}
              />
              <MetricCard
                label="Tiempo medio de respuesta (humano)"
                value={secondsToReadable(summary?.humanAvgResponseSeconds ?? 0)}
                helper="Desde reasignacion hasta respuesta del agente"
                icon={ClockIcon}
                tone="accent"
                isLoading={isLoading}
              />
              <MetricCard
                label="Estado del asistente"
                value={status.label}
                helper="Actualizado en tiempo real"
                icon={PlayPauseIcon}
                tone={status.tone}
                isLoading={isLoading}
              />
            </div>
          </GradientSection>
          <InteractionsChart data={summary?.interactionsByDay ?? []} isLoading={isLoading} />
        </div>
        <GradientSection
          title="Sugerencias rapidas"
          description="Acciones recomendadas para mantener el asistente siempre optimizado."
          className="h-full"
        >
          <ul className="space-y-4 text-sm text-brand-muted">
            <li>- Revisa los flujos que presentan mayor tiempo de respuesta humana.</li>
            <li>- Activa alertas cuando una conversacion supere el SLA definido.</li>
            <li>- Sincroniza tu CRM para asegurar que los leads se actualicen al instante.</li>
            <li>- Programa una prueba A/B en el saludo inicial del bot.</li>
          </ul>
        </GradientSection>
      </div>
    </div>
  );
};

export default Dashboard;






