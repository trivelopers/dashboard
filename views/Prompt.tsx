import React, { useEffect, useMemo, useState } from 'react';
import ExpandableTextarea from '../components/ExpandableTextarea';
import GradientSection from '../components/GradientSection';
import Spinner from '../components/Spinner';
import api from '../services/api';
import { useAuth } from '../hooks/useAuth';
import { Role } from '../types';
import {
  ExampleItem,
  PromptData,
  RuleItem,
  createEmptyPromptData,
  createId,
  generateXMLPrompt,
  parseXMLPrompt
} from '../utils/promptHelpers';

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
    <div className="mx-auto max-w-6xl space-y-8 p-6 sm:p-10">
      <GradientSection
        eyebrow="Centro de control"
        title="Configuración del asistente"
        description="Ajusta el ADN del agente sin perder el hilo. Cada bloque está pensado para editar rápido, validar cambios y mantener una narrativa consistente con tu marca."
        as="h1"
      >
        <div className="grid gap-6 md:grid-cols-[minmax(0,1fr)_minmax(0,1.2fr)]">
          <label className="flex flex-col gap-2">
            <span className="text-sm font-medium text-brand-dark/90">Rol del agente</span>
            <ExpandableTextarea
              value={promptData.role}
              onChange={(event) => {
                if (userRole !== 'admin') return;
                setPromptData((prev) => ({ ...prev, role: event.target.value }));
              }}
              readOnly={userRole !== 'admin'}
              minRows={3}
              maxRows={8}
              className={`w-full rounded-2xl border px-4 py-3 text-sm leading-relaxed transition focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-offset-brand-surface ${userRole === 'admin'
                  ? 'border-brand-primary/30 bg-white/80 text-brand-dark shadow-sm focus:border-brand-primary focus:ring-brand-primary/30'
                  : 'cursor-not-allowed border-brand-border/60 bg-brand-background/80 text-brand-muted'
                }`}
              placeholder="Describe el rol principal del agente."
            />
          </label>

          <label className="flex flex-col gap-2">
            <span className="text-sm font-medium text-brand-dark/90">Propósito del agente</span>
            <ExpandableTextarea
              value={promptData.purpose}
              onChange={(event) => {
                if (userRole !== 'admin') return;
                setPromptData((prev) => ({ ...prev, purpose: event.target.value }));
              }}
              readOnly={userRole !== 'admin'}
              minRows={3}
              maxRows={10}
              className={`w-full rounded-2xl border px-4 py-3 text-sm leading-relaxed transition focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-offset-brand-surface ${userRole === 'admin'
                  ? 'border-brand-primary/30 bg-white/80 text-brand-dark shadow-sm focus:border-brand-primary focus:ring-brand-primary/30'
                  : 'cursor-not-allowed border-brand-border/60 bg-brand-background/80 text-brand-muted'
                }`}
              placeholder="Explica el objetivo general del agente."
            />
          </label>
        </div>
      </GradientSection>

      {error && (
        <div className="rounded-2xl border border-red-200/70 bg-red-50/80 px-4 py-3 text-sm text-red-700 shadow-sm">
          {error}
        </div>
      )}

      {success && (
        <div className="rounded-2xl border border-brand-warm/40 bg-brand-warm/10 px-4 py-3 text-sm text-brand-warm shadow-sm">
          Cambios guardados correctamente.
        </div>
      )}
      <GradientSection
        title="Ejemplos de interacciones"
        description="Proporciona ejemplos claros de preguntas y respuestas para guiar el comportamiento del asistente."
      >
        <div className="space-y-4">
          {promptData.examples.map((example, index) => (
            <article
              key={example.id}
              className="rounded-2xl border border-brand-primary/40 bg-brand-primary/10 p-5 shadow-sm"
            >
              <div className="flex flex-wrap items-center justify-between gap-3">
                <p className="text-xs font-semibold uppercase tracking-wide text-brand-dark/80">Ejemplo #{index + 1}</p>
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
                    className="w-full rounded-2xl border border-brand-primary/40 bg-white/90 px-4 py-3 text-sm leading-relaxed text-brand-dark shadow-sm transition focus:border-brand-primary focus:outline-none focus:ring-2 focus:ring-brand-primary/25"
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
                    className="w-full rounded-2xl border border-brand-primary/40 bg-white/90 px-4 py-3 text-sm leading-relaxed text-brand-dark shadow-sm transition focus:border-brand-primary focus:outline-none focus:ring-2 focus:ring-brand-primary/25"
                    placeholder="Respuesta ideal del asistente para este caso."
                  />
                </label>
              </div>
            </article>
          ))}
          {!promptData.examples.length && (
            <p className="rounded-2xl border border-dashed border-brand-primary/40 bg-brand-primary/10 p-5 text-center text-sm text-brand-primary">
              Aún no se registraron ejemplos de conversación.
            </p>
          )}
        </div>
        <div className="flex justify-end">
          <button
            type="button"
            onClick={handleAddExample}
            className="inline-flex items-center gap-2 rounded-full border border-brand-primary/40 bg-brand-primary/5 px-5 py-2 text-sm font-semibold text-brand-primary transition hover:border-brand-primary/70 hover:bg-brand-primary/10"
          >
            Agregar ejemplo nuevo
          </button>
        </div>
      </GradientSection>
      <GradientSection
        title="Reglas de comportamiento"
        description="Define las reglas que guían el comportamiento del asistente durante las interacciones."
      >
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
                className="rounded-xl border border-brand-info/40 bg-brand-info/10 p-4 shadow-brand-soft"
              >
                <div className="flex flex-wrap items-center justify-between gap-3">
                  <p className="text-xs font-semibold uppercase tracking-wide text-brand-dark">
                    Regla de comportamiento #{index + 1}
                  </p>
                  <div className="flex flex-wrap items-center gap-2">
                    {showRestore && (
                      <button
                        type="button"
                        onClick={() => handleRestoreBehaviorRule(rule.id)}
                        className="text-xs font-semibold text-brand-dark underline-offset-4 hover:underline"
                      >
                        Restaurar
                      </button>
                    )}
                    <button
                      type="button"
                      onClick={() => handleDeleteBehaviorRule(rule.id)}
                      className="text-xs font-semibold text-brand-primary underline-offset-4 hover:underline"
                    >
                      Eliminar
                    </button>
                  </div>
                </div>
                <ExpandableTextarea
                  value={draftValue}
                  onChange={(event) => handleBehaviorRuleChange(rule.id, event.target.value)}
                  onBlur={() => handleCommitBehaviorRule(rule.id)}
                  minRows={3}
                  className="mt-3 w-full rounded-2xl border border-brand-info/40 bg-white/90 px-4 py-3 text-sm leading-relaxed text-brand-dark shadow-sm transition focus:border-brand-info focus:outline-none focus:ring-2 focus:ring-brand-info/25"
                  placeholder="Describe el comportamiento deseado del asistente."
                />
                <div className="mt-3 flex flex-wrap items-center gap-3 text-xs text-brand-muted">
                  {isDirty && <span className="font-semibold text-brand-info">Cambios sin guardar</span>}
                  {hasCommittedDifference && !isDirty && (
                    <span className="font-semibold text-brand-dark">Modificado</span>
                  )}
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
      </GradientSection>
      <GradientSection
        title="Reglas técnicas"
        description="Modificables solo por el equipo técnico. Estas reglas definen la estructura y el formato de las respuestas del asistente."
      >
        <div className="space-y-4">
          {promptData.coreRules.map((rule, index) => {
            const expanded = expandedCoreRules[rule.id] || false;
            return (
              <article
                key={rule.id}
                className="rounded-xl border border-brand-info/30 bg-white/85 p-4 shadow-brand-soft"
              >
                <div className="flex flex-wrap items-start justify-between gap-3">
                  <div>
                    <p className="text-xs font-semibold uppercase tracking-wide text-brand-dark">
                      Regla técnica #{index + 1}
                    </p>
                  </div>
                  <div className="flex items-center gap-2">
                    <button
                      type="button"
                      onClick={() => toggleCoreRule(rule.id)}
                      className="text-sm font-medium text-brand-info underline-offset-4 hover:underline"
                    >
                      {expanded ? 'Contraer regla' : 'Expandir regla'}
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
                    className={`mt-4 w-full rounded-lg border px-3 py-2 text-sm leading-relaxed ${userRole === 'admin' ? 'border-brand-info/60 bg-brand-surface text-brand-dark focus:border-brand-info focus:outline-none focus:ring-2 focus:ring-brand-info/25' : 'border-brand-info/40 bg-brand-info/10 text-brand-dark'}`}
                    placeholder="Contenido de la regla técnica."
                  />
                )}
              </article>
            );
          })}
          {!promptData.coreRules.length && (
            <div className="rounded-xl border border-dashed border-brand-info/60 bg-brand-info/10 p-6 text-center text-sm text-brand-info">
              No hay reglas principales registradas.
            </div>
          )}
        </div>

        {userRole === 'admin' && (
          <div className="flex justify-end">
            <button
              type="button"
              onClick={handleAddCoreRule}
              className="rounded-full border border-brand-info/60 px-4 py-2 text-sm font-medium text-brand-info transición hover:border-brand-info/70 hover:bg-brand-info/10"
            >
              Agregar nueva regla técnica
            </button>
          </div>
        )}
      </GradientSection>




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


















