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
      <h1 className="text-3xl font-bold text-gray-800 mb-6">{t('dashboard.welcome', { name: user?.name })}</h1>
      
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        <div className="bg-white p-6 rounded-lg shadow-md flex items-center">
            <div className="p-3 rounded-full bg-blue-100 text-blue-600 mr-4">
                <InformationCircleIcon className="h-8 w-8"/>
            </div>
            <div>
                <p className="text-sm text-gray-500">{t('dashboard.clientId')}</p>
                <p className="text-2xl font-bold text-gray-800">{user?.clientId}</p>
            </div>
        </div>
        <div className="bg-white p-6 rounded-lg shadow-md flex items-center">
            <div className="p-3 rounded-full bg-green-100 text-green-600 mr-4">
                <UserGroupIcon className="h-8 w-8"/>
            </div>
            <div>
                <p className="text-sm text-gray-500">{t('dashboard.totalContacts')}</p>
                <p className="text-2xl font-bold text-gray-800">{isLoading ? '...' : contactCount}</p>
            </div>
        </div>
        <div className="bg-white p-6 rounded-lg shadow-md flex items-center">
            <div className="p-3 rounded-full bg-yellow-100 text-yellow-600 mr-4">
                <ClockIcon className="h-8 w-8"/>
            </div>
            <div>
                <p className="text-sm text-gray-500">{t('dashboard.lastInteraction')}</p>
                <p className="text-2xl font-bold text-gray-800">{isLoading ? '...' : lastUpdate}</p>
            </div>
        </div>
      </div>

      <div className="mt-10 bg-white p-6 rounded-lg shadow-md">
        <h2 className="text-2xl font-semibold text-gray-700 mb-4">{t('dashboard.botStatus')}</h2>
        <p className="text-gray-600">{t('dashboard.botStatusDescription')}</p>
      </div>
    </div>
  );
};

export default Dashboard;