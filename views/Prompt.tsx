
import React, { useState, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import { BotSettings } from '../types';
import Spinner from '../components/Spinner';
import api from '../services/api';

interface PromptData {
  role: string;
  purpose: string;
  rules: string;
  behaviorRules: string;
  contacts: string;
  companyInfo: string;
  examples: string;
}

const parseXMLPrompt = (xmlString: string): PromptData => {
  const data: PromptData = {
    role: '',
    purpose: '',
    rules: '',
    behaviorRules: '',
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

    // Extract and format core rules
    const coreRulesMatch = xmlString.match(/<core_rules>([\s\S]*?)<\/core_rules>/);
    if (coreRulesMatch) {
      const coreRulesContent = coreRulesMatch[1];
      const coreRuleItems = coreRulesContent.match(/<rule>([\s\S]*?)<\/rule>/g);
      if (coreRuleItems) {
        data.rules = coreRuleItems
          .map(rule => rule.replace(/<rule>([\s\S]*?)<\/rule>/, '$1').trim())
          .join('\n\n');
      } else {
        data.rules = coreRulesContent.trim();
      }
    }

    if (!data.rules) {
      const legacyRulesMatch = xmlString.match(/<rules>([\s\S]*?)<\/rules>/);
      if (legacyRulesMatch) {
        const legacyRulesContent = legacyRulesMatch[1];
        const legacyRuleItems = legacyRulesContent.match(/<rule>([\s\S]*?)<\/rule>/g);
        if (legacyRuleItems) {
          data.rules = legacyRuleItems
            .map(rule => rule.replace(/<rule>([\s\S]*?)<\/rule>/, '$1').trim())
            .join('\n\n');
        } else {
          data.rules = legacyRulesContent.trim();
        }
      }
    }

    // Extract and format behavior rules
    const behaviorRulesMatch = xmlString.match(/<behavior_rules>([\s\S]*?)<\/behavior_rules>/);
    if (behaviorRulesMatch) {
      const behaviorRulesContent = behaviorRulesMatch[1];
      const behaviorRuleItems = behaviorRulesContent.match(/<rule>([\s\S]*?)<\/rule>/g);
      if (behaviorRuleItems) {
        data.behaviorRules = behaviorRuleItems
          .map(rule => rule.replace(/<rule>([\s\S]*?)<\/rule>/, '$1').trim())
          .join('\n\n');
      } else {
        data.behaviorRules = behaviorRulesContent.trim();
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

  // Add core rules
  if (data.rules) {
    xmlString += '  <core_rules>\n';
    const rules = data.rules.split('\n\n').filter(rule => rule.trim());
    rules.forEach(rule => {
      xmlString += `    <rule>${rule.trim()}</rule>\n`;
    });
    xmlString += '  </core_rules>\n';
  }

  // Add behavior rules
  if (data.behaviorRules) {
    xmlString += '  <behavior_rules>\n';
    const behaviorRules = data.behaviorRules.split('\n\n').filter(rule => rule.trim());
    behaviorRules.forEach(rule => {
      xmlString += `    <rule>${rule.trim()}</rule>\n`;
    });
    xmlString += '  </behavior_rules>\n';
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
  const userRole = 'admin';
  const [promptData, setPromptData] = useState<PromptData>({
    role: '',
    purpose: '',
    rules: '',
    behaviorRules: '',
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
    <div className="max-w-3xl mx-auto space-y-6 p-4 sm:p-6">
      <header className="space-y-2 bg-white rounded-xl shadow-sm p-6">
        <h1 className="text-2xl font-semibold text-gray-800">{t('prompt.title')}</h1>
        <p className="text-sm text-gray-600">{t('prompt.description')}</p>
      </header>

      {error && (
        <div className="rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700" role="alert">
          {error}
        </div>
      )}
      {success && (
        <div className="rounded-lg border border-green-200 bg-green-50 px-4 py-3 text-sm text-green-700" role="alert">
          {t('prompt.successMessage')}
        </div>
      )}

      <section className="space-y-5 bg-white rounded-xl shadow-sm p-6">
        <h2 className="text-lg font-semibold text-gray-800">{t('prompt.general')}</h2>
        <label className="block space-y-2">
          <span className="text-sm text-gray-700">{t('prompt.role')}</span>
          <textarea
            value={promptData.role}
            onChange={(e) => updateField('role', e.target.value)}
            className="w-full rounded-lg border border-gray-200 bg-white p-3 text-sm text-gray-800 focus:border-blue-400 focus:outline-none focus:ring-2 focus:ring-blue-100"
            rows={3}
            placeholder={t('prompt.rolePlaceholder')}
          />
        </label>
        <label className="block space-y-2">
          <span className="text-sm text-gray-700">{t('prompt.purpose')}</span>
          <textarea
            value={promptData.purpose}
            onChange={(e) => updateField('purpose', e.target.value)}
            className="w-full rounded-lg border border-gray-200 bg-white p-3 text-sm text-gray-800 focus:border-blue-400 focus:outline-none focus:ring-2 focus:ring-blue-100"
            rows={3}
            placeholder={t('prompt.purposePlaceholder')}
          />
        </label>
      </section>

      <section className="space-y-3 bg-white rounded-xl shadow-sm p-6">
        <h2 className="text-lg font-semibold text-gray-800">
          {t('prompt.coreRules', { defaultValue: 'Core rules' })}
        </h2>
        <p className="text-sm text-gray-600">{t('prompt.rulesDescription')}</p>
        <textarea
          value={promptData.rules}
          onChange={(e) => {
            if (userRole === "admin") {
              updateField('rules', e.target.value);
            }
          }}
          className="w-full rounded-lg border border-gray-200 bg-white p-3 text-sm text-gray-800 focus:border-blue-400 focus:outline-none focus:ring-2 focus:ring-blue-100"
          rows={8}
          placeholder={t('prompt.rulesPlaceholder')}
          readOnly={userRole !== 'admin'}
        />
        {userRole !== 'admin' && (
          <p className="text-xs text-gray-500">{t('prompt.rulesReadOnlyNotice', { defaultValue: 'Solo un administrador puede editar estas reglas.' })}</p>
        )}
      </section>

      {userRole === 'admin' && (
        <section className="space-y-3 bg-white rounded-xl shadow-sm p-6">
          <h2 className="text-lg font-semibold text-gray-800">
            {t('prompt.behaviorRules', { defaultValue: 'Behavior rules' })}
          </h2>
          <p className="text-sm text-gray-600">
            {t('prompt.behaviorRulesDescription', { defaultValue: t('prompt.rulesDescription') })}
          </p>
          <textarea
            value={promptData.behaviorRules}
            onChange={(e) => updateField('behaviorRules', e.target.value)}
            className="w-full rounded-lg border border-gray-200 bg-white p-3 text-sm text-gray-800 focus:border-blue-400 focus:outline-none focus:ring-2 focus:ring-blue-100"
            rows={8}
            placeholder={t('prompt.behaviorRulesPlaceholder', { defaultValue: t('prompt.rulesPlaceholder') })}
          />
        </section>
      )}

      <section className="space-y-3 bg-white rounded-xl shadow-sm p-6">
        <h2 className="text-lg font-semibold text-gray-800">{t('prompt.contacts')}</h2>
        <p className="text-sm text-gray-600">{t('prompt.contactsDescription')}</p>
        <textarea
          value={promptData.contacts}
          onChange={(e) => updateField('contacts', e.target.value)}
          className="w-full rounded-lg border border-gray-200 bg-white p-3 text-sm text-gray-800 focus:border-blue-400 focus:outline-none focus:ring-2 focus:ring-blue-100"
          rows={8}
          placeholder={t('prompt.contactsPlaceholder')}
        />
      </section>

      <section className="space-y-3 bg-white rounded-xl shadow-sm p-6">
        <h2 className="text-lg font-semibold text-gray-800">{t('prompt.company')}</h2>
        <p className="text-sm text-gray-600">{t('prompt.companyDescription')}</p>
        <textarea
          value={promptData.companyInfo}
          onChange={(e) => updateField('companyInfo', e.target.value)}
          className="w-full rounded-lg border border-gray-200 bg-white p-3 text-sm text-gray-800 focus:border-blue-400 focus:outline-none focus:ring-2 focus:ring-blue-100"
          rows={8}
          placeholder={t('prompt.companyPlaceholder')}
        />
      </section>

      <section className="space-y-3 bg-white rounded-xl shadow-sm p-6">
        <h2 className="text-lg font-semibold text-gray-800">{t('prompt.examples')}</h2>
        <p className="text-sm text-gray-600">{t('prompt.examplesDescription')}</p>
        <textarea
          value={promptData.examples}
          onChange={(e) => updateField('examples', e.target.value)}
          className="w-full rounded-lg border border-gray-200 bg-white p-3 text-sm text-gray-800 focus:border-blue-400 focus:outline-none focus:ring-2 focus:ring-blue-100"
          rows={10}
          placeholder={t('prompt.examplesPlaceholder')}
        />
      </section>

      <div className="flex justify-end">
        <button
          onClick={handleSave}
          disabled={isSaving}
          className="inline-flex items-center gap-2 rounded-lg bg-blue-600 px-5 py-2.5 text-sm font-medium text-white transition hover:bg-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-200 disabled:cursor-not-allowed disabled:bg-blue-300"
        >
          {isSaving && <Spinner />}
          {isSaving ? t('prompt.saving') : t('prompt.save')}
        </button>
      </div>
    </div>
  );
};

export default Prompt;
