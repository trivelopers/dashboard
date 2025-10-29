import React, { useState, useEffect, useMemo } from 'react';
import { useAuth } from '../hooks/useAuth';
import { useTranslation } from 'react-i18next';
import { Contact } from '../types';
import { UserGroupIcon, ClockIcon, InformationCircleIcon } from '@heroicons/react/24/outline';
import api from '../services/api';
import GradientSection from '../components/GradientSection';

const Dashboard: React.FC = () => {
  const { user } = useAuth();
  const { t } = useTranslation();
  const [contactCount, setContactCount] = useState(0);
  const [lastUpdate, setLastUpdate] = useState('');
  const [isLoading, setIsLoading] = useState(true);
  const [companyName, setCompanyName] = useState<string | null>(null);

  useEffect(() => {
    const fetchCompanyName = async () => {
      try {
        if (!user?.clientId) return;
        const response = await fetch(`/api/v1/companies/${user.clientId}`);
        if (!response.ok) throw new Error('Error al obtener la empresa');
        const data = await response.json();
        setCompanyName(data?.name || 'Empresa desconocida');
      } catch (error) {
        console.error(error);
        setCompanyName('Empresa no encontrada');
      }
    };

    fetchCompanyName();
  }, [user?.clientId]);

  useEffect(() => {
    const getDashboardData = async () => {
      try {
        setIsLoading(true);
        // Fetch contacts for statistics
        const contactsResponse = await api.get('/dashboard/contacts');
        const contacts = contactsResponse.data.contacts || [];
        setContactCount(contacts.length);

        // Get latest interaction for last update
        const interactionsResponse = await api.get('/dashboard/interactions');
        const interactions = interactionsResponse.data.interactions || [];
        
        if (interactions.length > 0) {
          const latestInteraction = interactions.reduce((latest: any, interaction: any) => {
            const interactionDate = new Date(interaction.createdAt || interaction.timestamp);
            const latestDate = new Date(latest.createdAt || latest.timestamp);
            return interactionDate > latestDate ? interaction : latest;
          });
          setLastUpdate(new Date(latestInteraction.createdAt || latestInteraction.timestamp).toLocaleString());
        } else {
          setLastUpdate('N/A');
        }
      } catch (error) {
        console.error('Error fetching dashboard data:', error);
        setContactCount(0);
        setLastUpdate('N/A');
      } finally {
        setIsLoading(false);
      }
    };
    getDashboardData();
  }, []);

  const heroDescription = useMemo(() => {
    if (companyName) {
      return t('dashboard.companySummary', {
        company: companyName,
        defaultValue: `Información general de ${companyName}`
      });
    }
    return t('dashboard.heroDescription', 'Monitorea el pulso general del asistente.');
  }, [companyName, t]);
  return (
    <div className="space-y-6">
      <GradientSection
        title={t('dashboard.welcome', { name: user?.name })}
        description={heroDescription}
        
      >
        <div className="grid grid-cols-1 gap-6 md:grid-cols-2 lg:grid-cols-3">
          <div className="flex items-center rounded-2xl border border-brand-border/60 bg-white/85 p-6 shadow-brand-soft backdrop-blur">
            <div className="mr-4 rounded-full bg-brand-primary/10 p-3 text-brand-primary">
              <InformationCircleIcon className="h-8 w-8" />
            </div>
            <div>
              <p className="text-sm text-brand-muted">Empresa</p>
              <p className="text-2xl font-bold text-brand-dark">{companyName || 'Cargando...'}</p>
            </div>
          </div>
          <div className="flex items-center rounded-2xl border border-brand-border/60 bg-white/85 p-6 shadow-brand-soft backdrop-blur">
            <div className="mr-4 rounded-full bg-brand-accent/10 p-3 text-brand-accent">
              <UserGroupIcon className="h-8 w-8" />
            </div>
            <div>
              <p className="text-sm text-brand-muted">{t('dashboard.totalContacts')}</p>
              <p className="text-2xl font-bold text-brand-dark">{isLoading ? '...' : contactCount}</p>
            </div>
          </div>
          <div className="flex items-center rounded-2xl border border-brand-border/60 bg-white/85 p-6 shadow-brand-soft backdrop-blur">
            <div className="mr-4 rounded-full bg-brand-info/10 p-3 text-brand-info">
              <ClockIcon className="h-8 w-8" />
            </div>
            <div>
              <p className="text-sm text-brand-muted">{t('dashboard.lastInteraction')}</p>
              <p className="text-2xl font-bold text-brand-dark">{isLoading ? '...' : lastUpdate}</p>
            </div>
          </div>
        </div>
      </GradientSection>

      <GradientSection
        title={t('dashboard.botStatus')}
        description={t('dashboard.botStatusDescription')}
      />
    </div>
  );
};

export default Dashboard;






