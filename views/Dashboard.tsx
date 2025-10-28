import React, { useState, useEffect } from 'react';
import { useAuth } from '../hooks/useAuth';
import { useTranslation } from 'react-i18next';
import { Contact } from '../types';
import { UserGroupIcon, ClockIcon, InformationCircleIcon } from '@heroicons/react/24/outline';
import api from '../services/api';

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

  return (
    <div>
      <h1 className="text-3xl font-bold text-brand-dark mb-6">{t('dashboard.welcome', { name: user?.name })}</h1>
      
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        <div className="bg-brand-surface p-6 rounded-xl shadow-brand-soft border border-brand-border/60 flex items-center">
            <div className="p-3 rounded-full bg-brand-primary/10 text-brand-primary mr-4">
                <InformationCircleIcon className="h-8 w-8"/>
            </div>
            <div>
                <p className="text-sm text-brand-muted">Empresa</p>
                <p className="text-2xl font-bold text-brand-dark">
                  {companyName || 'Cargando...'}
                </p>
            </div>
        </div>
        <div className="bg-brand-surface p-6 rounded-xl shadow-brand-soft border border-brand-border/60 flex items-center">
            <div className="p-3 rounded-full bg-brand-accent/10 text-brand-accent mr-4">
                <UserGroupIcon className="h-8 w-8"/>
            </div>
            <div>
                <p className="text-sm text-brand-muted">{t('dashboard.totalContacts')}</p>
                <p className="text-2xl font-bold text-brand-dark">{isLoading ? '...' : contactCount}</p>
            </div>
        </div>
        <div className="bg-brand-surface p-6 rounded-xl shadow-brand-soft border border-brand-border/60 flex items-center">
            <div className="p-3 rounded-full bg-brand-info/10 text-brand-info mr-4">
                <ClockIcon className="h-8 w-8"/>
            </div>
            <div>
                <p className="text-sm text-brand-muted">{t('dashboard.lastInteraction')}</p>
                <p className="text-2xl font-bold text-brand-dark">{isLoading ? '...' : lastUpdate}</p>
            </div>
        </div>
      </div>

      <div className="mt-10 bg-brand-surface p-6 rounded-xl shadow-brand-soft border border-brand-border/60">
        <h2 className="text-2xl font-semibold text-brand-dark mb-4">{t('dashboard.botStatus')}</h2>
        <p className="text-brand-muted">{t('dashboard.botStatusDescription')}</p>
      </div>
    </div>
  );
};

export default Dashboard;
