
import React, { useState, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import { BotSettings } from '../types';
import Spinner from '../components/Spinner';
import api from '../services/api';

interface PromptData {
  role: string;
  purpose: string;
  rules: string;
  contacts: string;
  companyInfo: string;
  examples: string;
}

const parseXMLPrompt = (xmlString: string): PromptData => {
  const data: PromptData = {
    role: '',
    purpose: '',
    rules: '',
    contacts: '',
    companyInfo: '',
    examples: ''
  };

  if (!xmlString) return data;

  try {
    // Extract role
    const roleMatch = xmlString.match(/<role>([\s\S]*?)<\/role>/);
    if (roleMatch) data.role = roleMatch[1].trim();

    // Extract purpose
    const purposeMatch = xmlString.match(/<purpose>([\s\S]*?)<\/purpose>/);
    if (purposeMatch) data.purpose = purposeMatch[1].trim();

    // Extract and format rules
    const rulesMatch = xmlString.match(/<rules>([\s\S]*?)<\/rules>/);
    if (rulesMatch) {
      const rulesContent = rulesMatch[1];
      const ruleItems = rulesContent.match(/<rule>([\s\S]*?)<\/rule>/g);
      if (ruleItems) {
        data.rules = ruleItems.map(rule => 
          rule.replace(/<rule>([\s\S]*?)<\/rule>/, '$1').trim()
        ).join('\n\n');
      } else {
        data.rules = rulesContent.trim();
      }
    }

    // Extract and format contacts
    const contactsMatch = xmlString.match(/<contacts>([\s\S]*?)<\/contacts>/);
    if (contactsMatch) {
      const contactsContent = contactsMatch[1];
      let formattedContacts = '';
      
      // Extract different contact types
      const contactTypes = ['principal', 'soporte', 'ventas', 'rural', 'urbano', 'alquileres', 'ingenieria'];
      
      contactTypes.forEach(type => {
        const contactMatch = contactsContent.match(new RegExp(`<${type}>([\s\S]*?)<\/${type}>`, 'i'));
        if (contactMatch) {
          const contactInfo = contactMatch[1];
          const name = contactInfo.match(/<name>([\s\S]*?)<\/name>/)?.[1]?.trim();
          const phone = contactInfo.match(/<phone>([\s\S]*?)<\/phone>/)?.[1]?.trim();
          const email = contactInfo.match(/<email>([\s\S]*?)<\/email>/)?.[1]?.trim();
          const website = contactInfo.match(/<website>([\s\S]*?)<\/website>/)?.[1]?.trim();
          
          if (name || phone || email || website) {
            formattedContacts += `${type.charAt(0).toUpperCase() + type.slice(1)}:\n`;
            if (name) formattedContacts += `  Nombre: ${name}\n`;
            if (phone) formattedContacts += `  Teléfono: ${phone}\n`;
            if (email) formattedContacts += `  Email: ${email}\n`;
            if (website) formattedContacts += `  Sitio web: ${website}\n`;
            formattedContacts += '\n';
          }
        }
      });
      
      data.contacts = formattedContacts.trim() || contactsContent.trim();
    }

    // Extract and format company info
    const companyMatch = xmlString.match(/<company>([\s\S]*?)<\/company>/);
    if (companyMatch) {
      const companyContent = companyMatch[1];
      let formattedCompany = '';
      
      const about = companyContent.match(/<about>([\s\S]*?)<\/about>/)?.[1]?.trim();
      if (about) formattedCompany += `Acerca de:\n${about}\n\n`;
      
      const servicesMatch = companyContent.match(/<services>([\s\S]*?)<\/services>/);
      if (servicesMatch) {
        const services = servicesMatch[1].match(/<service>([\s\S]*?)<\/service>/g);
        if (services) {
          formattedCompany += 'Servicios:\n';
          services.forEach(service => {
            const serviceText = service.replace(/<service>([\s\S]*?)<\/service>/, '$1').trim();
            formattedCompany += `• ${serviceText}\n`;
          });
          formattedCompany += '\n';
        }
      }
      
      const locationsMatch = companyContent.match(/<locations>([\s\S]*?)<\/locations>/);
      if (locationsMatch) {
        const locations = locationsMatch[1].match(/<location>([\s\S]*?)<\/location>/g);
        if (locations) {
          formattedCompany += 'Ubicaciones:\n';
          locations.forEach(location => {
            const locationText = location.replace(/<location>([\s\S]*?)<\/location>/, '$1').trim();
            formattedCompany += `• ${locationText}\n`;
          });
        }
      }
      
      data.companyInfo = formattedCompany.trim() || companyContent.trim();
    }

    // Extract and format examples
    const examplesMatch = xmlString.match(/<examples>([\s\S]*?)<\/examples>/);
    if (examplesMatch) {
      const examplesContent = examplesMatch[1];
      const exampleItems = examplesContent.match(/<example>([\s\S]*?)<\/example>/g);
      if (exampleItems) {
        let formattedExamples = '';
        exampleItems.forEach((example, index) => {
          const question = example.match(/<question>([\s\S]*?)<\/question>/)?.[1]?.trim();
          const answer = example.match(/<answer>([\s\S]*?)<\/answer>/)?.[1]?.trim();
          
          if (question && answer) {
            formattedExamples += `Ejemplo ${index + 1}:\nPregunta: ${question}\nRespuesta: ${answer}\n\n`;
          }
        });
        data.examples = formattedExamples.trim();
      } else {
        data.examples = examplesContent.trim();
      }
    }

  } catch (error) {
    console.error('Error parsing XML prompt:', error);
  }

  return data;
};

const generateXMLPrompt = (data: PromptData): string => {
  let xmlString = '<assistant>\n';

  // Add role
  if (data.role) {
    xmlString += `  <role>${data.role}</role>\n`;
  }

  // Add purpose
  if (data.purpose) {
    xmlString += `  <purpose>${data.purpose}</purpose>\n`;
  }

  // Add rules
  if (data.rules) {
    xmlString += '  <rules>\n';
    // Split by double newlines to get individual rules
    const rules = data.rules.split('\n\n').filter(rule => rule.trim());
    rules.forEach(rule => {
      xmlString += `    <rule>${rule.trim()}</rule>\n`;
    });
    xmlString += '  </rules>\n';
  }

  // Add contacts
  if (data.contacts) {
    xmlString += '  <contacts>\n';
    
    // Parse formatted contact text back to XML
    const contactSections = data.contacts.split('\n\n').filter(section => section.trim());
    contactSections.forEach(section => {
      const lines = section.split('\n');
      const typeMatch = lines[0].match(/^(\w+):/);
      if (typeMatch) {
        const type = typeMatch[1].toLowerCase();
        xmlString += `    <${type}>\n`;
        
        lines.slice(1).forEach(line => {
          const nameMatch = line.match(/^\s*Nombre:\s*(.+)$/);
          const phoneMatch = line.match(/^\s*Teléfono:\s*(.+)$/);
          const emailMatch = line.match(/^\s*Email:\s*(.+)$/);
          const websiteMatch = line.match(/^\s*Sitio web:\s*(.+)$/);
          
          if (nameMatch) xmlString += `      <name>${nameMatch[1]}</name>\n`;
          if (phoneMatch) xmlString += `      <phone>${phoneMatch[1]}</phone>\n`;
          if (emailMatch) xmlString += `      <email>${emailMatch[1]}</email>\n`;
          if (websiteMatch) xmlString += `      <website>${websiteMatch[1]}</website>\n`;
        });
        
        xmlString += `    </${type}>\n`;
      }
    });
    
    xmlString += '  </contacts>\n';
  }

  // Add company info
  if (data.companyInfo) {
    xmlString += '  <company>\n';
    
    const sections = data.companyInfo.split('\n\n').filter(section => section.trim());
    sections.forEach(section => {
      const lines = section.split('\n');
      
      if (lines[0].startsWith('Acerca de:')) {
        const aboutText = lines.slice(1).join('\n').trim();
        if (aboutText) {
          xmlString += `    <about>${aboutText}</about>\n`;
        }
      } else if (lines[0] === 'Servicios:') {
        xmlString += '    <services>\n';
        lines.slice(1).forEach(line => {
          const serviceMatch = line.match(/^• (.+)$/);
          if (serviceMatch) {
            xmlString += `      <service>${serviceMatch[1]}</service>\n`;
          }
        });
        xmlString += '    </services>\n';
      } else if (lines[0] === 'Ubicaciones:') {
        xmlString += '    <locations>\n';
        lines.slice(1).forEach(line => {
          const locationMatch = line.match(/^• (.+)$/);
          if (locationMatch) {
            xmlString += `      <location>${locationMatch[1]}</location>\n`;
          }
        });
        xmlString += '    </locations>\n';
      }
    });
    
    xmlString += '  </company>\n';
  }

  // Add examples
  if (data.examples) {
    xmlString += '  <examples>\n';
    
    // Parse formatted examples back to XML
    const examples = data.examples.split('\n\n').filter(example => example.trim());
    examples.forEach(example => {
      const lines = example.split('\n');
      let question = '';
      let answer = '';
      
      lines.forEach(line => {
        const questionMatch = line.match(/^Pregunta:\s*(.+)$/);
        const answerMatch = line.match(/^Respuesta:\s*(.+)$/);
        
        if (questionMatch) question = questionMatch[1];
        if (answerMatch) answer = answerMatch[1];
      });
      
      if (question && answer) {
        xmlString += '    <example>\n';
        xmlString += `      <question>${question}</question>\n`;
        xmlString += `      <answer>${answer}</answer>\n`;
        xmlString += '    </example>\n';
      }
    });
    
    xmlString += '  </examples>\n';
  }

  xmlString += '</assistant>';
  return xmlString;
};

const Prompt: React.FC = () => {
  const { t } = useTranslation();
  const [promptData, setPromptData] = useState<PromptData>({
    role: '',
    purpose: '',
    rules: '',
    contacts: '',
    companyInfo: '',
    examples: ''
  });
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);

  useEffect(() => {
    const getSettings = async () => {
      try {
        setIsLoading(true);
        const response = await api.get('/dashboard/bot-settings');
        const xmlPrompt = response.data.botSettings?.prompt || '';
        if (xmlPrompt) {
          setPromptData(parseXMLPrompt(xmlPrompt));
        }
      } catch (err) {
        setError('Failed to load system prompt.');
      } finally {
        setIsLoading(false);
      }
    };
    getSettings();
  }, []);

  const handleSave = async () => {
    setIsSaving(true);
    setError(null);
    setSuccess(false);
    try {
      const xmlPrompt = generateXMLPrompt(promptData);
      await api.put('/dashboard/bot-settings', { prompt: xmlPrompt });
      setSuccess(true);
      setTimeout(() => setSuccess(false), 3000);
    } catch (err) {
      setError('Failed to save system prompt.');
    } finally {
      setIsSaving(false);
    }
  };

  const updateField = (field: keyof PromptData, value: string) => {
    setPromptData(prev => ({ ...prev, [field]: value }));
  };

  if (isLoading) {
    return <div className="flex justify-center mt-10"><Spinner /></div>;
  }

  return (
    <div className="bg-white p-8 rounded-lg shadow-md max-w-4xl mx-auto">
      <h1 className="text-3xl font-bold text-gray-800 mb-2">{t('prompt.title')}</h1>
      <p className="text-gray-500 mb-6">{t('prompt.description')}</p>
      
      {error && <div className="bg-red-100 border border-red-400 text-red-700 px-4 py-3 rounded relative mb-4" role="alert">{error}</div>}
      {success && <div className="bg-green-100 border border-green-400 text-green-700 px-4 py-3 rounded relative mb-4" role="alert">{t('prompt.successMessage')}</div>}

      <div className="space-y-6">
        {/* General Section */}
        <div className="border border-gray-200 rounded-lg p-6">
          <h2 className="text-xl font-semibold text-gray-800 mb-4">{t('prompt.general')}</h2>
          
          <div className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">{t('prompt.role')}</label>
              <textarea
                value={promptData.role}
                onChange={(e) => updateField('role', e.target.value)}
                className="w-full p-3 border border-gray-300 rounded-md focus:ring-blue-500 focus:border-blue-500"
                rows={3}
                placeholder={t('prompt.rolePlaceholder')}
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">{t('prompt.purpose')}</label>
              <textarea
                value={promptData.purpose}
                onChange={(e) => updateField('purpose', e.target.value)}
                className="w-full p-3 border border-gray-300 rounded-md focus:ring-blue-500 focus:border-blue-500"
                rows={3}
                placeholder={t('prompt.purposePlaceholder')}
              />
            </div>
          </div>
        </div>

        {/* Rules Section */}
        <div className="border border-gray-200 rounded-lg p-6">
          <h2 className="text-xl font-semibold text-gray-800 mb-4">{t('prompt.rules')}</h2>
          <p className="text-sm text-gray-600 mb-3">{t('prompt.rulesDescription')}</p>
          
          <textarea
            value={promptData.rules}
            onChange={(e) => updateField('rules', e.target.value)}
            className="w-full p-3 border border-gray-300 rounded-md focus:ring-blue-500 focus:border-blue-500"
            rows={8}
            placeholder={t('prompt.rulesPlaceholder')}
          />
        </div>

        {/* Contacts Section */}
        <div className="border border-gray-200 rounded-lg p-6">
          <h2 className="text-xl font-semibold text-gray-800 mb-4">{t('prompt.contacts')}</h2>
          <p className="text-sm text-gray-600 mb-3">{t('prompt.contactsDescription')}</p>
          
          <textarea
            value={promptData.contacts}
            onChange={(e) => updateField('contacts', e.target.value)}
            className="w-full p-3 border border-gray-300 rounded-md focus:ring-blue-500 focus:border-blue-500"
            rows={8}
            placeholder={t('prompt.contactsPlaceholder')}
          />
        </div>

        {/* Company Information Section */}
        <div className="border border-gray-200 rounded-lg p-6">
          <h2 className="text-xl font-semibold text-gray-800 mb-4">{t('prompt.company')}</h2>
          <p className="text-sm text-gray-600 mb-3">{t('prompt.companyDescription')}</p>
          
          <textarea
            value={promptData.companyInfo}
            onChange={(e) => updateField('companyInfo', e.target.value)}
            className="w-full p-3 border border-gray-300 rounded-md focus:ring-blue-500 focus:border-blue-500"
            rows={8}
            placeholder={t('prompt.companyPlaceholder')}
          />
        </div>

        {/* Examples Section */}
        <div className="border border-gray-200 rounded-lg p-6">
          <h2 className="text-xl font-semibold text-gray-800 mb-4">{t('prompt.examples')}</h2>
          <p className="text-sm text-gray-600 mb-3">{t('prompt.examplesDescription')}</p>
          
          <textarea
            value={promptData.examples}
            onChange={(e) => updateField('examples', e.target.value)}
            className="w-full p-3 border border-gray-300 rounded-md focus:ring-blue-500 focus:border-blue-500"
            rows={10}
            placeholder={t('prompt.examplesPlaceholder')}
          />
        </div>
      </div>

      <div className="mt-8 flex justify-end">
        <button
          onClick={handleSave}
          disabled={isSaving}
          className="px-6 py-3 bg-blue-600 text-white font-semibold rounded-md shadow-sm hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 disabled:bg-blue-300 flex items-center"
        >
          {isSaving && <Spinner />}
          {isSaving ? t('prompt.saving') : t('prompt.save')}
        </button>
      </div>
    </div>
  );
};

export default Prompt;
