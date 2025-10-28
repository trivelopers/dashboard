import React, { useEffect, useMemo, useState } from 'react';
import Spinner from '../components/Spinner';
import api from '../services/api';
import { useAuth } from '../hooks/useAuth';
import { Role } from '../types';

interface RuleItem {
  id: string;
  texto: string;
}

interface BranchInfo {
  id: string;
  tag: string;
  etiqueta: string;
  responsable: string;
  telefono: string;
  email: string;
  sitio: string;
  direccion: string;
}

interface CompanyInfo {
  acerca: string;
  servicios: string[];
}

interface ExampleItem {
  id: string;
  pregunta: string;
  respuesta: string;
}

interface PromptData {
  role: string;
  purpose: string;
  coreRules: RuleItem[];
  behaviorRules: RuleItem[];
  company: CompanyInfo;
  branches: BranchInfo[];
  examples: ExampleItem[];
}

const createId = (): string => Math.random().toString(36).slice(2, 11);

const createEmptyPromptData = (): PromptData => ({
  role: '',
  purpose: '',
  coreRules: [],
  behaviorRules: [],
  company: {
    acerca: '',
    servicios: []
  },
  branches: [],
  examples: []
});

interface ExpandableTextareaProps extends React.TextareaHTMLAttributes<HTMLTextAreaElement> {
  minRows?: number;
  collapsedRows?: number;
}

const ExpandableTextarea: React.FC<ExpandableTextareaProps> = ({
  minRows = 1,
  collapsedRows = 3,
  value = '',
  className = '',
  ...rest
}) => {
  const [isExpanded, setIsExpanded] = useState(false);
  const textValue =
    typeof value === 'string' ? value : value === undefined || value === null ? '' : String(value);

  const estimatedLines = useMemo(() => {
    if (!textValue) return 1;
    return textValue.split('\n').reduce((total, line) => {
      const sanitized = line || '';
      const lineLength = sanitized.length || 0;
      const wrappedLength = Math.max(1, Math.ceil(lineLength / 90));
      return total + wrappedLength;
    }, 0);
  }, [textValue]);

  const collapsedRowCount = Math.max(minRows, Math.min(collapsedRows, estimatedLines));
  const expandedRowCount = Math.max(collapsedRows, estimatedLines);
  const displayRows = isExpanded ? expandedRowCount : collapsedRowCount;
  const shouldShowToggle = expandedRowCount > collapsedRows;

  return (
    <div>
      <textarea
        {...rest}
        value={textValue}
        rows={displayRows}
        className={`resize-none ${!isExpanded && shouldShowToggle ? 'overflow-hidden' : 'overflow-y-auto'} ${className}`}
      />
      {shouldShowToggle && (
        <div className="mt-2 flex justify-end">
          <button
            type="button"
            onClick={() => setIsExpanded((prev) => !prev)}
            className="text-xs font-medium text-brand-muted transition hover:text-brand-muted"
          >
            {isExpanded ? 'Ver menos' : 'Ver mas'}
          </button>
        </div>
      )}
    </div>
  );
};

const slugify = (value: string, fallback: string): string => {
  const normalized = value
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[^a-z0-9]+/g, '_')
    .replace(/^_|_$/g, '');
  if (normalized) {
    return normalized;
  }
  return fallback;
};

const formatLabel = (value: string): string => {
  if (!value) return '';
  const withSpaces = value.replace(/[_-]+/g, ' ');
  return withSpaces.charAt(0).toUpperCase() + withSpaces.slice(1);
};

const parseRuleSection = (content: string | undefined): RuleItem[] => {
  if (!content) return [];
  const matchedRules = content.match(/<rule>([\s\S]*?)<\/rule>/g);
  if (matchedRules && matchedRules.length > 0) {
    return matchedRules
      .map((rule) => rule.replace(/<rule>([\s\S]*?)<\/rule>/, '$1').trim())
      .filter(Boolean)
      .map((texto) => ({ id: createId(), texto }));
  }

  const fallback = content
    .split(/\n{2,}/)
    .map((item) => item.trim())
    .filter(Boolean);

  return fallback.map((texto) => ({ id: createId(), texto }));
};

const parseXMLPrompt = (xmlString: string): PromptData => {
  const data: PromptData = createEmptyPromptData();

  if (!xmlString) {
    return data;
  }

  try {
    const roleMatch = xmlString.match(/<role>([\s\S]*?)<\/role>/);
    if (roleMatch) {
      data.role = roleMatch[1].trim();
    }

    const purposeMatch = xmlString.match(/<purpose>([\s\S]*?)<\/purpose>/);
    if (purposeMatch) {
      data.purpose = purposeMatch[1].trim();
    }

    const coreRulesMatch = xmlString.match(/<core_rules>([\s\S]*?)<\/core_rules>/);
    if (coreRulesMatch) {
      data.coreRules = parseRuleSection(coreRulesMatch[1]);
    }

    if (!data.coreRules.length) {
      const legacyRulesMatch = xmlString.match(/<rules>([\s\S]*?)<\/rules>/);
      if (legacyRulesMatch) {
        data.coreRules = parseRuleSection(legacyRulesMatch[1]);
      }
    }

    const behaviorRulesMatch = xmlString.match(/<behavior_rules>([\s\S]*?)<\/behavior_rules>/);
    if (behaviorRulesMatch) {
      data.behaviorRules = parseRuleSection(behaviorRulesMatch[1]);
    }

    const branches: BranchInfo[] = [];
    const contactsMatch = xmlString.match(/<contacts>([\s\S]*?)<\/contacts>/);
    if (contactsMatch) {
      const contactsContent = contactsMatch[1];
      const contactRegex = /<(\w+)>([\s\S]*?)<\/\1>/g;
      let match;
      while ((match = contactRegex.exec(contactsContent)) !== null) {
        const tag = match[1];
        const body = match[2];
        const responsable = body.match(/<name>([\s\S]*?)<\/name>/)?.[1]?.trim() || '';
        const telefono = body.match(/<phone>([\s\S]*?)<\/phone>/)?.[1]?.trim() || '';
        const email = body.match(/<email>([\s\S]*?)<\/email>/)?.[1]?.trim() || '';
        const sitio = body.match(/<website>([\s\S]*?)<\/website>/)?.[1]?.trim() || '';

        branches.push({
          id: createId(),
          tag,
          etiqueta: formatLabel(tag),
          responsable,
          telefono,
          email,
          sitio,
          direccion: ''
        });
      }
    }

    const companyMatch = xmlString.match(/<company>([\s\S]*?)<\/company>/);
    if (companyMatch) {
      const companyContent = companyMatch[1];
      const about = companyContent.match(/<about>([\s\S]*?)<\/about>/)?.[1]?.trim() || '';
      data.company.acerca = about;

      const servicesMatch = companyContent.match(/<services>([\s\S]*?)<\/services>/);
      if (servicesMatch) {
        const services = servicesMatch[1].match(/<service>([\s\S]*?)<\/service>/g) || [];
        data.company.servicios = services
          .map((service) => service.replace(/<service>([\s\S]*?)<\/service>/, '$1').trim())
          .filter(Boolean);
      }

      const locationsMatch = companyContent.match(/<locations>([\s\S]*?)<\/locations>/);
      if (locationsMatch) {
        const locations = locationsMatch[1].match(/<location>([\s\S]*?)<\/location>/g) || [];
        locations.forEach((location, index) => {
          const texto = location.replace(/<location>([\s\S]*?)<\/location>/, '$1').trim();
          if (!texto) {
            return;
          }

          if (branches[index]) {
            branches[index].direccion = texto;
          } else {
            branches.push({
              id: createId(),
              tag: slugify(texto, `sucursal_${index + 1}`),
              etiqueta: texto,
              responsable: '',
              telefono: '',
              email: '',
              sitio: '',
              direccion: texto
            });
          }
        });
      }
    }

    data.branches = branches;

    const examplesMatch = xmlString.match(/<examples>([\s\S]*?)<\/examples>/);
    if (examplesMatch) {
      const examplesContent = examplesMatch[1];
      const exampleItems = examplesContent.match(/<example>([\s\S]*?)<\/example>/g) || [];
      data.examples = exampleItems
        .map((example) => {
          const pregunta = example.match(/<question>([\s\S]*?)<\/question>/)?.[1]?.trim() || '';
          const respuesta = example.match(/<answer>([\s\S]*?)<\/answer>/)?.[1]?.trim() || '';

          if (!pregunta && !respuesta) {
            return null;
          }

          return {
            id: createId(),
            pregunta,
            respuesta
          } as ExampleItem;
        })
        .filter((item): item is ExampleItem => Boolean(item));
    }
  } catch (error) {
    console.error('Error al interpretar el prompt en XML:', error);
  }

  return data;
};

const generateXMLPrompt = (data: PromptData): string => {
  let xmlString = '<assistant>\n';

  if (data.role.trim()) {
    xmlString += `  <role>${data.role.trim()}</role>\n`;
  }

  if (data.purpose.trim()) {
    xmlString += `  <purpose>${data.purpose.trim()}</purpose>\n`;
  }

  const coreRules = data.coreRules.map((rule) => rule.texto.trim()).filter(Boolean);
  if (coreRules.length) {
    xmlString += '  <core_rules>\n';
    coreRules.forEach((rule) => {
      xmlString += `    <rule>${rule}</rule>\n`;
    });
    xmlString += '  </core_rules>\n';
  }

  const behaviorRules = data.behaviorRules.map((rule) => rule.texto.trim()).filter(Boolean);
  if (behaviorRules.length) {
    xmlString += '  <behavior_rules>\n';
    behaviorRules.forEach((rule) => {
      xmlString += `    <rule>${rule}</rule>\n`;
    });
    xmlString += '  </behavior_rules>\n';
  }

  const contactBranches = data.branches.filter(
    (branch) =>
      branch.responsable.trim() ||
      branch.telefono.trim() ||
      branch.email.trim() ||
      branch.sitio.trim()
  );

  if (contactBranches.length) {
    xmlString += '  <contacts>\n';
    contactBranches.forEach((branch, index) => {
      const fallback = `sucursal_${index + 1}`;
      const baseTag = branch.tag.trim() || branch.etiqueta.trim();
      const tag = slugify(baseTag, fallback);
      xmlString += `    <${tag}>\n`;
      if (branch.responsable.trim()) {
        xmlString += `      <name>${branch.responsable.trim()}</name>\n`;
      }
      if (branch.telefono.trim()) {
        xmlString += `      <phone>${branch.telefono.trim()}</phone>\n`;
      }
      if (branch.email.trim()) {
        xmlString += `      <email>${branch.email.trim()}</email>\n`;
      }
      if (branch.sitio.trim()) {
        xmlString += `      <website>${branch.sitio.trim()}</website>\n`;
      }
      xmlString += `    </${tag}>\n`;
    });
    xmlString += '  </contacts>\n';
  }

  const about = data.company.acerca.trim();
  const services = data.company.servicios.map((service) => service.trim()).filter(Boolean);
  const locations = data.branches
    .map((branch) => branch.direccion.trim() || branch.etiqueta.trim())
    .filter(Boolean);

  if (about || services.length || locations.length) {
    xmlString += '  <company>\n';
    if (about) {
      xmlString += `    <about>${about}</about>\n`;
    }
    if (services.length) {
      xmlString += '    <services>\n';
      services.forEach((service) => {
        xmlString += `      <service>${service}</service>\n`;
      });
      xmlString += '    </services>\n';
    }
    if (locations.length) {
      xmlString += '    <locations>\n';
      locations.forEach((location) => {
        xmlString += `      <location>${location}</location>\n`;
      });
      xmlString += '    </locations>\n';
    }
    xmlString += '  </company>\n';
  }

  const examples = data.examples.filter(
    (example) => example.pregunta.trim() || example.respuesta.trim()
  );
  if (examples.length) {
    xmlString += '  <examples>\n';
    examples.forEach((example) => {
      if (!example.pregunta.trim() && !example.respuesta.trim()) {
        return;
      }
      xmlString += '    <example>\n';
      if (example.pregunta.trim()) {
        xmlString += `      <question>${example.pregunta.trim()}</question>\n`;
      }
      if (example.respuesta.trim()) {
        xmlString += `      <answer>${example.respuesta.trim()}</answer>\n`;
      }
      xmlString += '    </example>\n';
    });
    xmlString += '  </examples>\n';
  }

  xmlString += '</assistant>';
  return xmlString;
};

type BranchEditableField = 'etiqueta' | 'responsable' | 'telefono' | 'email' | 'sitio' | 'direccion';

const Prompt: React.FC = () => {
  const { user } = useAuth();
  const userRole: 'admin' | 'editor' = user?.role === Role.ADMIN ? 'admin' : 'editor';

  const [promptData, setPromptData] = useState<PromptData>(() => createEmptyPromptData());
  const [expandedCoreRules, setExpandedCoreRules] = useState<Record<string, boolean>>({});
  const [initialBehaviorRules, setInitialBehaviorRules] = useState<Record<string, string>>({});
  const [behaviorRuleDrafts, setBehaviorRuleDrafts] = useState<Record<string, string>>({});
  const [initialPromptSnapshot, setInitialPromptSnapshot] = useState<string>(() =>
    JSON.stringify(createEmptyPromptData())
  );
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);
  const currentPromptSnapshot = useMemo(() => JSON.stringify(promptData), [promptData]);
  const hasChanges = currentPromptSnapshot !== initialPromptSnapshot;

  useEffect(() => {
    const fetchSettings = async () => {
      try {
        setIsLoading(true);
        const response = await api.get('/dashboard/bot-settings');
        const xmlPrompt: string = response.data.botSettings?.prompt || '';
        const parsed = parseXMLPrompt(xmlPrompt);
        setPromptData(parsed);
        setInitialPromptSnapshot(JSON.stringify(parsed));
        setBehaviorRuleDrafts(
          parsed.behaviorRules.reduce<Record<string, string>>((acc, rule) => {
            acc[rule.id] = rule.texto;
            return acc;
          }, {})
        );
        setInitialBehaviorRules(
          parsed.behaviorRules.reduce<Record<string, string>>((acc, rule) => {
            acc[rule.id] = rule.texto;
            return acc;
          }, {})
        );
      } catch (err) {
        setError('No se pudo cargar el prompt del sistema.');
      } finally {
        setIsLoading(false);
      }
    };

    fetchSettings();
  }, []);

  const handleSave = async () => {
    setIsSaving(true);
    setError(null);
    setSuccess(false);
    try {
      const xmlPrompt = generateXMLPrompt(promptData);
      await api.put('/dashboard/bot-settings', { prompt: xmlPrompt });
      setSuccess(true);
      setInitialPromptSnapshot(JSON.stringify(promptData));
      setInitialBehaviorRules(
        promptData.behaviorRules.reduce<Record<string, string>>((acc, rule) => {
          acc[rule.id] = rule.texto;
          return acc;
        }, {})
      );
      setBehaviorRuleDrafts(
        promptData.behaviorRules.reduce<Record<string, string>>((acc, rule) => {
          acc[rule.id] = rule.texto;
          return acc;
        }, {})
      );
      setTimeout(() => setSuccess(false), 3000);
    } catch (err) {
      setError('No se pudo guardar el prompt del sistema.');
    } finally {
      setIsSaving(false);
    }
  };

  const previewRule = (texto: string) => {
    const trimmed = texto.trim();
    if (trimmed.length <= 180) {
      return trimmed;
    }
    return `${trimmed.slice(0, 180).trimEnd()}...`;
  };

  const toggleCoreRule = (id: string) => {
    setExpandedCoreRules((prev) => ({
      ...prev,
      [id]: !prev[id]
    }));
  };

  const handleCoreRuleChange = (id: string, value: string) => {
    if (userRole !== 'admin') return;
    setPromptData((prev) => ({
      ...prev,
      coreRules: prev.coreRules.map((rule) => (rule.id === id ? { ...rule, texto: value } : rule))
    }));
  };

  const handleAddCoreRule = () => {
    if (userRole !== 'admin') return;
    const newRule: RuleItem = {
      id: createId(),
      texto: ''
    };
    setPromptData((prev) => ({
      ...prev,
      coreRules: [...prev.coreRules, newRule]
    }));
  };

  const handleDeleteCoreRule = (id: string) => {
    if (userRole !== 'admin') return;
    setPromptData((prev) => ({
      ...prev,
      coreRules: prev.coreRules.filter((rule) => rule.id !== id)
    }));
    setExpandedCoreRules((prev) => {
      const nextState = { ...prev };
      delete nextState[id];
      return nextState;
    });
  };

  const handleBehaviorRuleChange = (id: string, value: string) => {
    setBehaviorRuleDrafts((prev) => ({
      ...prev,
      [id]: value
    }));
  };

  const handleRestoreBehaviorRule = (id: string) => {
    const initialValue = initialBehaviorRules[id] ?? '';
    setBehaviorRuleDrafts((prev) => ({
      ...prev,
      [id]: initialValue
    }));
    setPromptData((prev) => ({
      ...prev,
      behaviorRules: prev.behaviorRules.map((rule) =>
        rule.id === id ? { ...rule, texto: initialValue } : rule
      )
    }));
  };

  const handleDeleteBehaviorRule = (id: string) => {
    setPromptData((prev) => ({
      ...prev,
      behaviorRules: prev.behaviorRules.filter((rule) => rule.id !== id)
    }));
    setInitialBehaviorRules((prev) => {
      const nextState = { ...prev };
      delete nextState[id];
      return nextState;
    });
    setBehaviorRuleDrafts((prev) => {
      const nextState = { ...prev };
      delete nextState[id];
      return nextState;
    });
  };

  const handleAddBehaviorRule = () => {
    const newRule: RuleItem = {
      id: createId(),
      texto: ''
    };
    setPromptData((prev) => ({
      ...prev,
      behaviorRules: [...prev.behaviorRules, newRule]
    }));
    setBehaviorRuleDrafts((prev) => ({
      ...prev,
      [newRule.id]: ''
    }));
  };
  const handleCommitBehaviorRule = (id: string) => {
    const nextValue = behaviorRuleDrafts[id] ?? '';
    setPromptData((prev) => ({
      ...prev,
      behaviorRules: prev.behaviorRules.map((rule) =>
        rule.id === id ? { ...rule, texto: nextValue } : rule
      )
    }));
    setBehaviorRuleDrafts((prev) => ({
      ...prev,
      [id]: nextValue
    }));
  };

  const handleServiceChange = (index: number, value: string) => {
    setPromptData((prev) => {
      const servicios = [...prev.company.servicios];
      servicios[index] = value;
      return {
        ...prev,
        company: {
          ...prev.company,
          servicios
        }
      };
    });
  };

  const handleAddService = () => {
    setPromptData((prev) => ({
      ...prev,
      company: {
        ...prev.company,
        servicios: [...prev.company.servicios, '']
      }
    }));
  };

  const handleRemoveService = (index: number) => {
    setPromptData((prev) => {
      const servicios = prev.company.servicios.filter((_, i) => i !== index);
      return {
        ...prev,
        company: {
          ...prev.company,
          servicios
        }
      };
    });
  };

  const handleBranchChange = (id: string, field: BranchEditableField, value: string) => {
    setPromptData((prev) => ({
      ...prev,
      branches: prev.branches.map((branch, index) => {
        if (branch.id !== id) return branch;
        if (field === 'etiqueta') {
          const etiqueta = value;
          const fallback = `sucursal_${index + 1}`;
          const tag = slugify(etiqueta || branch.tag, fallback);
          return { ...branch, etiqueta, tag };
        }
        return { ...branch, [field]: value } as BranchInfo;
      })
    }));
  };

  const handleAddBranch = () => {
    setPromptData((prev) => {
      const index = prev.branches.length + 1;
      const etiqueta = `Sucursal ${index}`;
      const newBranch: BranchInfo = {
        id: createId(),
        tag: slugify(etiqueta, `sucursal_${index}`),
        etiqueta,
        responsable: '',
        telefono: '',
        email: '',
        sitio: '',
        direccion: ''
      };
      return {
        ...prev,
        branches: [...prev.branches, newBranch]
      };
    });
  };

  const handleRemoveBranch = (id: string) => {
    setPromptData((prev) => ({
      ...prev,
      branches: prev.branches.filter((branch) => branch.id !== id)
    }));
  };

  const handleExampleChange = (id: string, field: 'pregunta' | 'respuesta', value: string) => {
    setPromptData((prev) => ({
      ...prev,
      examples: prev.examples.map((example) =>
        example.id === id ? { ...example, [field]: value } : example
      )
    }));
  };

  const handleAddExample = () => {
    const newExample: ExampleItem = {
      id: createId(),
      pregunta: '',
      respuesta: ''
    };
    setPromptData((prev) => ({
      ...prev,
      examples: [...prev.examples, newExample]
    }));
  };

  const handleRemoveExample = (id: string) => {
    setPromptData((prev) => ({
      ...prev,
      examples: prev.examples.filter((example) => example.id !== id)
    }));
  };

  if (isLoading) {
    return (
      <div className="mt-10 flex justify-center">
        <Spinner />
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-5xl space-y-6 p-4 sm:p-6">
      <header className="rounded-2xl bg-brand-surface p-6 shadow-brand-soft border border-brand-border/60">
        <h1 className="mt-2 text-3xl font-bold text-brand-dark">Configuración del asistente</h1>
        <p className="mt-3 max-w-3xl text-sm text-brand-muted">
          Administra el contenido que define el rol, las reglas y los ejemplos del asistente. Cada
          bloque es independiente para facilitar los ajustes sin arriesgar la estructura técnica.
        </p>
      </header>

      {error && (
        <div className="rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
          {error}
        </div>
      )}

      {success && (
        <div className="rounded-xl border border-brand-warm bg-brand-warm/10 px-4 py-3 text-sm text-brand-warm">
          Cambios guardados correctamente.
        </div>
      )}

      <section className="space-y-6 rounded-2xl bg-brand-surface p-6 shadow-brand-soft border border-brand-border/60">
  <div className="flex flex-wrap items-center justify-between gap-3">
    <h2 className="text-2xl font-semibold text-brand-dark">Encabezado general</h2>
    <span className="text-xs font-medium uppercase tracking-wide text-brand-muted">
      {userRole === 'admin'
        ? '✏️ Contenido editable'
        : '🧱 Estructura interna (solo lectura)'}
    </span>
  </div>

  {/* Cambié a grid fluido con columnas proporcionales y altura controlada */}
  <div className="grid gap-6 md:grid-cols-[1fr_2fr]">
    {/* Rol */}
    <label className="flex flex-col gap-2">
      <span className="text-sm font-medium text-brand-dark">
        Rol del agente
      </span>
      <ExpandableTextarea
        value={promptData.role}
        onChange={(event) => {
          if (userRole !== 'admin') return;
          setPromptData((prev) => ({ ...prev, role: event.target.value }));
        }}
        readOnly={userRole !== 'admin'}
        minRows={1}
        collapsedRows={8}
        className={`w-full rounded-xl border px-4 py-3 text-sm leading-relaxed ${
          userRole === 'admin'
            ? 'border-brand-border bg-brand-surface text-brand-dark focus:border-brand-primary focus:outline-none focus:ring-2 focus:ring-brand-primary/25'
            : 'border-brand-border/60 bg-brand-background text-brand-muted'
        }`}
        placeholder="Describe el rol principal del agente."
      />
    </label>

    {/* Propósito */}
    <label className="flex flex-col gap-2">
      <span className="text-sm font-medium text-brand-dark">
        Propósito del agente
      </span>
      <ExpandableTextarea
        value={promptData.purpose}
        onChange={(event) => {
          if (userRole !== 'admin') return;
          setPromptData((prev) => ({ ...prev, purpose: event.target.value }));
        }}
        readOnly={userRole !== 'admin'}
        minRows={3}
        collapsedRows={10}
        className={`w-full rounded-xl border px-4 py-3 text-sm leading-relaxed ${
          userRole === 'admin'
            ? 'border-brand-border bg-brand-surface text-brand-dark focus:border-brand-primary focus:outline-none focus:ring-2 focus:ring-brand-primary/25'
            : 'border-brand-border/60 bg-brand-background text-brand-muted'
        }`}
        placeholder="Explica la meta del asistente en esta organización."
      />
    </label>
  </div>
</section>

<section className="space-y-6 rounded-2xl bg-brand-surface p-6 shadow-brand-soft border border-brand-border/60">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <h2 className="text-2xl font-semibold text-brand-dark">Reglas de comportamiento</h2>
            <p className="mt-1 text-sm text-brand-muted">
              Cambiar solo el texto visible al cliente. No modificar estructura interna.
            </p>
          </div>
          <span className="text-xs font-medium uppercase tracking-wide text-brand-primary">
            ✏️ Contenido editable
          </span>
        </div>

        <div className="space-y-4">
          {promptData.behaviorRules.map((rule, index) => {
            const draftValue = behaviorRuleDrafts[rule.id] ?? rule.texto;
            const initialValue = initialBehaviorRules[rule.id] ?? '';
            const isDirty = draftValue !== rule.texto;
            const hasCommittedDifference = rule.texto !== initialValue;
            const showRestore = isDirty || hasCommittedDifference;

            return (
              <article
                key={rule.id}
                className="rounded-xl border border-brand-primary/40 bg-brand-primary/10 p-4 shadow-brand-soft"
              >
                <div className="flex flex-wrap items-center justify-between gap-3">
                  <h3 className="text-base font-semibold text-brand-dark">Regla {index + 1}</h3>
                </div>
                <ExpandableTextarea
                  value={draftValue}
                  onChange={(event) => handleBehaviorRuleChange(rule.id, event.target.value)}
                  minRows={1}
                  className="mt-3 w-full rounded-lg border border-brand-primary/40 bg-brand-surface px-3 py-2 text-sm leading-relaxed text-brand-dark focus:border-brand-primary focus:outline-none focus:ring-2 focus:ring-brand-primary/25"
                  placeholder="Describe el comportamiento esperado para esta regla."
                />
                <div className="mt-4 flex flex-wrap gap-2">
                  {isDirty && (
                    <button
                      type="button"
                      onClick={() => handleCommitBehaviorRule(rule.id)}
                      className="rounded-full bg-brand-primary px-4 py-2 text-sm font-medium text-white transition hover:bg-brand-primary-hover"
                    >
                      Guardar
                    </button>
                  )}
                  {showRestore && (
                    <button
                      type="button"
                      onClick={() => handleRestoreBehaviorRule(rule.id)}
                      className="rounded-full border border-brand-primary/40 px-4 py-2 text-sm font-medium text-brand-primary transition hover:border-brand-primary/70 hover:bg-brand-primary/10"
                    >
                      Restaurar
                    </button>
                  )}
                  <button
                    type="button"
                    onClick={() => handleDeleteBehaviorRule(rule.id)}
                    className="rounded-full border border-brand-primary/40 px-4 py-2 text-sm font-medium text-brand-primary transition hover:border-brand-primary/70 hover:bg-brand-primary/10"
                  >
                    Eliminar
                  </button>
                </div>
              </article>
            );
          })}
          {!promptData.behaviorRules.length && (
            <div className="rounded-xl border border-dashed border-brand-primary/40 bg-brand-primary/10 p-6 text-center text-sm text-brand-primary">
              No hay reglas de comportamiento registradas.
            </div>
          )}
        </div>

        <div className="flex justify-end">
          <button
            type="button"
            onClick={handleAddBehaviorRule}
            className="rounded-full border border-brand-primary/40 px-4 py-2 text-sm font-medium text-brand-primary transition hover:border-brand-primary/70 hover:bg-brand-primary/10"
          >
            Agregar nueva regla
          </button>
        </div>
      </section>

      <section className="space-y-6 rounded-2xl bg-brand-surface p-6 shadow-brand-soft border border-brand-border/60">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <h2 className="text-2xl font-semibold text-brand-dark">Reglas técnicas</h2>
            <p className="mt-1 text-sm text-brand-muted">
              ⚠️ No modificar sin validar con el equipo de desarrollo.
            </p>
          </div>
          <span className="text-xs font-medium uppercase tracking-wide text-brand-info">
            🧱 Estructura interna (solo lectura)
          </span>
        </div>

        <div className="space-y-4">
          {promptData.coreRules.map((rule, index) => {
            const expanded = expandedCoreRules[rule.id] || false;
            return (
              <article
                key={rule.id}
                className="rounded-xl border border-brand-info/60 bg-brand-info/15 p-4 shadow-brand-soft"
              >
                <div className="flex flex-wrap items-start justify-between gap-3">
                  <div>
                    <p className="text-xs font-semibold uppercase tracking-wide text-brand-info">
                      Regla técnica
                    </p>
                    <h3 className="mt-1 text-base font-semibold text-brand-dark">
                      Regla {index + 1}
                    </h3>
                  </div>
                  <div className="flex items-center gap-2">
                    <button
                      type="button"
                      onClick={() => toggleCoreRule(rule.id)}
                      className="text-sm font-medium text-brand-info underline-offset-4 hover:underline"
                    >
                      {expanded ? 'Ver menos' : 'Ver mas'}
                    </button>
                    {userRole === 'admin' && (
                      <button
                        type="button"
                        onClick={() => handleDeleteCoreRule(rule.id)}
                        className="text-sm font-medium text-brand-info underline-offset-4 hover:underline"
                      >
                        Eliminar
                      </button>
                    )}
                  </div>
                </div>
                {!expanded && (
                  <p className="mt-3 whitespace-pre-line text-sm text-brand-dark">
                    {previewRule(rule.texto)}
                  </p>
                )}
                {expanded && (
                  <ExpandableTextarea
                    value={rule.texto}
                    onChange={(event) => handleCoreRuleChange(rule.id, event.target.value)}
                    readOnly={userRole !== 'admin'}
                    minRows={1}
                    className={`mt-4 w-full rounded-lg border px-3 py-2 text-sm leading-relaxed ${
                      userRole === 'admin'
                        ? 'border-brand-info/60 bg-brand-surface text-brand-dark focus:border-brand-info focus:outline-none focus:ring-2 focus:ring-brand-info/25'
                        : 'border-brand-info/40 bg-brand-info/10 text-brand-dark'
                    }`}
                    placeholder="Contenido de la regla técnica."
                  />
                )}
              </article>
            );
          })}
          {!promptData.coreRules.length && (
            <div className="rounded-xl border border-dashed border-brand-info/60 bg-brand-info/10/40 p-6 text-center text-sm text-brand-info">
              No hay reglas principales registradas.
            </div>
          )}
        </div>

        {userRole === 'admin' && (
          <div className="flex justify-end">
            <button
              type="button"
              onClick={handleAddCoreRule}
              className="rounded-full border border-brand-info/60 px-4 py-2 text-sm font-medium text-brand-info transition hover:border-brand-info/70 hover:bg-brand-info/10"
            >
              Agregar nueva regla técnica
            </button>
          </div>
        )}
      </section>

      

      <section className="space-y-6 rounded-2xl bg-brand-surface p-6 shadow-brand-soft border border-brand-border/60">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <h2 className="text-2xl font-semibold text-brand-dark">Informacion de la empresa</h2>
            <p className="mt-1 text-sm text-brand-muted">
              Manten actualizada la descripción, los servicios y las sucursales para reflejar la
              oferta vigente.
            </p>
          </div>
          <span className="text-xs font-medium uppercase tracking-wide text-brand-muted">
            ✏️ Contenido editable
          </span>
        </div>

        <div className="space-y-4">
          <label className="flex flex-col gap-2">
            <span className="text-sm font-medium text-brand-dark">Acerca de</span>
            <ExpandableTextarea
              value={promptData.company.acerca}
              onChange={(event) =>
                setPromptData((prev) => ({
                  ...prev,
                  company: { ...prev.company, acerca: event.target.value }
                }))
              }
              minRows={1}
              className="w-full rounded-lg border border-brand-border bg-brand-surface px-3 py-2 text-sm leading-relaxed text-brand-dark focus:border-brand-primary focus:outline-none focus:ring-2 focus:ring-brand-primary/25"
              placeholder="Resumen breve de la empresa, historia o propuesta de valor."
            />
          </label>

          <div className="space-y-3">
            <div className="flex flex-wrap items-center justify-between gap-3">
              <span className="text-sm font-medium text-brand-dark">Servicios</span>
              <button
                type="button"
                onClick={handleAddService}
                className="rounded-full border border-brand-border px-3 py-1.5 text-xs font-medium text-brand-muted transition hover:border-brand-border hover:bg-brand-background"
              >
                Agregar servicio
              </button>
            </div>
            <div className="space-y-3">
              {promptData.company.servicios.map((servicio, index) => (
                <div key={`servicio-${index}`} className="flex items-center gap-3">
                  <input
                    type="text"
                    value={servicio}
                    onChange={(event) => handleServiceChange(index, event.target.value)}
                    className="flex-1 rounded-lg border border-brand-border bg-brand-surface px-3 py-2 text-sm text-brand-dark focus:border-brand-primary focus:outline-none focus:ring-2 focus:ring-brand-primary/25"
                    placeholder={`Servicio ${index + 1}`}
                  />
                  <button
                    type="button"
                    onClick={() => handleRemoveService(index)}
                    className="rounded-full border border-brand-border px-3 py-1.5 text-xs font-medium text-brand-muted transition hover:border-brand-border hover:bg-brand-background"
                  >
                    Eliminar
                  </button>
                </div>
              ))}
              {!promptData.company.servicios.length && (
                <p className="rounded-lg border border-dashed border-brand-border bg-brand-background p-4 text-center text-sm text-brand-muted">
                  Aun no se registraron servicios.
                </p>
              )}
            </div>
          </div>

          <div className="space-y-3">
            <div className="flex flex-wrap items-center justify-between gap-3">
              <span className="text-sm font-medium text-brand-dark">Sucursales</span>
              <button
                type="button"
                onClick={handleAddBranch}
                className="rounded-full border border-brand-border px-3 py-1.5 text-xs font-medium text-brand-muted transition hover:border-brand-border hover:bg-brand-background"
              >
                Agregar sucursal
              </button>
            </div>
            <div className="space-y-4">
              {promptData.branches.map((branch, index) => (
                <article
                  key={branch.id}
                  className="rounded-xl border border-brand-border bg-brand-background/70 p-4 shadow-brand-soft"
                >
                  <div className="flex flex-wrap items-start justify-between gap-3">
                    <div>
                      <h3 className="text-base font-semibold text-brand-dark">
                        Sucursal {index + 1}
                      </h3>
                      <p className="text-xs text-brand-muted">
                        🧱 Etiqueta interna: <span className="font-mono">{branch.tag}</span>
                      </p>
                    </div>
                    <button
                      type="button"
                      onClick={() => handleRemoveBranch(branch.id)}
                      className="text-sm font-medium text-brand-muted underline-offset-4 hover:underline"
                    >
                      Eliminar
                    </button>
                  </div>
                  <div className="mt-4 grid gap-3 md:grid-cols-2">
                    <label className="flex flex-col gap-1.5">
                      <span className="text-xs font-medium text-brand-muted">
                        Nombre visible de la sucursal
                      </span>
                      <input
                        type="text"
                        value={branch.etiqueta}
                        onChange={(event) =>
                          handleBranchChange(branch.id, 'etiqueta', event.target.value)
                        }
                        className="rounded-lg border border-brand-border bg-brand-surface px-3 py-2 text-sm text-brand-dark focus:border-brand-primary focus:outline-none focus:ring-2 focus:ring-brand-primary/25"
                        placeholder="Ej.: Casa Central"
                      />
                    </label>
                    <label className="flex flex-col gap-1.5">
                      <span className="text-xs font-medium text-brand-muted">
                        Responsable / Contacto
                      </span>
                      <input
                        type="text"
                        value={branch.responsable}
                        onChange={(event) =>
                          handleBranchChange(branch.id, 'responsable', event.target.value)
                        }
                        className="rounded-lg border border-brand-border bg-brand-surface px-3 py-2 text-sm text-brand-dark focus:border-brand-primary focus:outline-none focus:ring-2 focus:ring-brand-primary/25"
                        placeholder="Nombre de la persona de contacto"
                      />
                    </label>
                    <label className="flex flex-col gap-1.5">
                      <span className="text-xs font-medium text-brand-muted">Telefono</span>
                      <input
                        type="text"
                        value={branch.telefono}
                        onChange={(event) =>
                          handleBranchChange(branch.id, 'telefono', event.target.value)
                        }
                        className="rounded-lg border border-brand-border bg-brand-surface px-3 py-2 text-sm text-brand-dark focus:border-brand-primary focus:outline-none focus:ring-2 focus:ring-brand-primary/25"
                        placeholder="+54 11 0000 0000"
                      />
                    </label>
                    <label className="flex flex-col gap-1.5">
                      <span className="text-xs font-medium text-brand-muted">Correo</span>
                      <input
                        type="email"
                        value={branch.email}
                        onChange={(event) =>
                          handleBranchChange(branch.id, 'email', event.target.value)
                        }
                        className="rounded-lg border border-brand-border bg-brand-surface px-3 py-2 text-sm text-brand-dark focus:border-brand-primary focus:outline-none focus:ring-2 focus:ring-brand-primary/25"
                        placeholder="contacto@empresa.com"
                      />
                    </label>
                  </div>
                  <div className="mt-3 grid gap-3 md:grid-cols-2">
                    <label className="flex flex-col gap-1.5">
                      <span className="text-xs font-medium text-brand-muted">Sitio web</span>
                      <input
                        type="text"
                        value={branch.sitio}
                        onChange={(event) =>
                          handleBranchChange(branch.id, 'sitio', event.target.value)
                        }
                        className="rounded-lg border border-brand-border bg-brand-surface px-3 py-2 text-sm text-brand-dark focus:border-brand-primary focus:outline-none focus:ring-2 focus:ring-brand-primary/25"
                        placeholder="https://empresa.com/sucursal"
                      />
                    </label>
                    <label className="flex flex-col gap-1.5">
                      <span className="text-xs font-medium text-brand-muted">
                        Direccion y notas
                      </span>
                      <ExpandableTextarea
                        value={branch.direccion}
                        onChange={(event) =>
                          handleBranchChange(branch.id, 'direccion', event.target.value)
                        }
                        minRows={1}
                        className="rounded-lg border border-brand-border bg-brand-surface px-3 py-2 text-sm leading-relaxed text-brand-dark focus:border-brand-primary focus:outline-none focus:ring-2 focus:ring-brand-primary/25"
                        placeholder="Direccion fisica, horarios o notas clave."
                      />
                    </label>
                  </div>
                </article>
              ))}
              {!promptData.branches.length && (
                <p className="rounded-lg border border-dashed border-brand-border bg-brand-background p-4 text-center text-sm text-brand-muted">
                  No hay sucursales registradas.
                </p>
              )}
            </div>
          </div>
        </div>
      </section>

      <section className="space-y-6 rounded-2xl bg-brand-surface p-6 shadow-brand-soft border border-brand-border/60">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <h2 className="text-2xl font-semibold text-brand-dark">Ejemplos</h2>
          <span className="text-xs font-medium uppercase tracking-wide text-brand-primary">
            ✏️ Contenido editable
          </span>
        </div>
        <div className="space-y-4">
          {promptData.examples.map((example, index) => (
            <article
              key={example.id}
              className="rounded-xl border border-brand-primary/40 bg-brand-primary/10 p-4 shadow-brand-soft"
            >
              <div className="flex flex-wrap items-center justify-between gap-3">
                <h3 className="text-base font-semibold text-brand-dark">Ejemplo {index + 1}</h3>
                <button
                  type="button"
                  onClick={() => handleRemoveExample(example.id)}
                  className="text-sm font-medium text-brand-primary underline-offset-4 hover:underline"
                >
                  Eliminar ejemplo
                </button>
              </div>
              <div className="mt-3 space-y-3">
                <label className="flex flex-col gap-1.5">
                  <span className="text-xs font-medium text-brand-muted">Consulta de cliente</span>
                  <ExpandableTextarea
                    value={example.pregunta}
                    onChange={(event) =>
                      handleExampleChange(example.id, 'pregunta', event.target.value)
                    }
                    minRows={1}
                    className="w-full rounded-lg border border-brand-primary/40 bg-brand-surface px-3 py-2 text-sm leading-relaxed text-brand-dark focus:border-brand-primary focus:outline-none focus:ring-2 focus:ring-brand-primary/25"
                    placeholder="Consulta del cliente que quieres cubrir con este ejemplo."
                  />
                </label>
                <label className="flex flex-col gap-1.5">
                  <span className="text-xs font-medium text-brand-muted">Comportamiento / Respuesta esperada</span>
                  <ExpandableTextarea
                    value={example.respuesta}
                    onChange={(event) =>
                      handleExampleChange(example.id, 'respuesta', event.target.value)
                    }
                    minRows={1}
                    className="w-full rounded-lg border border-brand-primary/40 bg-brand-surface px-3 py-2 text-sm leading-relaxed text-brand-dark focus:border-brand-primary focus:outline-none focus:ring-2 focus:ring-brand-primary/25"
                    placeholder="Respuesta ideal del asistente para este caso."
                  />
                </label>
              </div>
            </article>
          ))}
          {!promptData.examples.length && (
            <p className="rounded-lg border border-dashed border-brand-primary/40 bg-brand-primary/10 p-4 text-center text-sm text-brand-primary">
              Aun no se registraron ejemplos de conversacion.
            </p>
          )}
        </div>
        <div className="flex justify-end">
          <button
            type="button"
            onClick={handleAddExample}
            className="rounded-full border border-brand-primary/40 px-4 py-2 text-sm font-medium text-brand-primary transition hover:border-brand-primary/70 hover:bg-brand-primary/10"
          >
            Agregar ejemplo nuevo
          </button>
        </div>
      </section>

      {hasChanges && (
        <div className="pointer-events-none fixed bottom-6 right-6 z-20 flex justify-end">
          <button
            type="button"
            onClick={handleSave}
            disabled={isSaving}
            className="pointer-events-auto inline-flex items-center gap-2 rounded-full bg-brand-primary px-6 py-2.5 text-sm font-semibold text-white shadow-lg transition hover:bg-brand-primary-hover focus:outline-none focus:ring-2 focus:ring-brand-primary/40 disabled:cursor-not-allowed disabled:bg-brand-disabled"
          >
            {isSaving && <Spinner />}
            {isSaving ? 'Guardando...' : 'Guardar cambios'}
          </button>
        </div>
      )}
    </div>
  );
};

export default Prompt;
