import React, { useCallback, useEffect, useMemo, useState } from 'react';
import ExpandableTextarea from '../components/ExpandableTextarea';



import GradientSection from '../components/GradientSection';



import Spinner from '../components/Spinner';



import api from '../services/api';



import { useAuth } from '../hooks/useAuth';



import { PromptHistoryEntry, Role } from '../types';



import {



  ExampleItem,



  PromptData,



  RuleItem,



  createEmptyPromptData,



  createId,



  generateXMLPrompt,



  parseXMLPrompt



} from '../utils/promptHelpers';







interface ToolFunctionEntry {
  id: string;
  name: string;
  when: string;
  notes: string;
  args: string;
}

const extractTagContent = (source: string, tag: string): string => {
  const match = source.match(new RegExp(`<${tag}>([\\s\\S]*?)<\\/${tag}>`, 'i'));
  return match ? match[1].trim() : '';
};

const parseToolsContent = (
  toolsText: string
): { functions: ToolFunctionEntry[]; extra: string } => {
  if (!toolsText.trim()) {
    return { functions: [], extra: '' };
  }

  const matches = Array.from(
    toolsText.matchAll(/<function\s+name="([^"]+)">([\s\S]*?)<\/function>/gi)
  );

  if (!matches.length) {
    return { functions: [], extra: toolsText };
  }

  const functions: ToolFunctionEntry[] = matches.map((match, index) => {
    const fullBlock = match[0];
    const name = match[1]?.trim() || `tool_${index + 1}`;
    const content = fullBlock.replace(/<function\s+name="[^"]+">([\s\S]*?)<\/function>/i, '$1');
    const when = extractTagContent(content, 'when');
    const notes = extractTagContent(content, 'notes');
    const args = extractTagContent(content, 'args');

    return {
      id: `tool-${createId()}`,
      name: sanitizeToolName(name),
      when: stripSharedIndent(when),
      notes: stripSharedIndent(notes),
      args: stripSharedIndent(args)
    };
  });

  const extra = toolsText
    .replace(/<function\s+name="[^"]+">[\s\S]*?<\/function>/gi, '')
    .trim();

  return { functions, extra };
};

const indentMultiline = (value: string, indent = '    '): string => {
  if (!value.trim()) return '';
  return value
    .split('\n')
    .map((line) => `${indent}${line}`)
    .join('\n');
};

const serializeToolFunctions = (functions: ToolFunctionEntry[], extra: string): string => {
  const blocks = functions.map((tool) => {
    const name = tool.name.trim() || 'tool';
    const when = tool.when.trim();
    const notes = tool.notes.trim();
    const args = tool.args.trim();

    let block = `<function name="${name}">`;
    if (when) {
      block += `\n  <when>\n${indentMultiline(when)}\n  </when>`;
    }
    if (notes) {
      block += `\n  <notes>\n${indentMultiline(notes)}\n  </notes>`;
    }
    if (args) {
      block += `\n  <args>\n${indentMultiline(args)}\n  </args>`;
    }
    block += `\n</function>`;
    return block;
  });

  const cleanedExtra = extra.trim();
  const parts = blocks.filter(Boolean);
  if (cleanedExtra) {
    parts.push(cleanedExtra);
  }

  return parts.join('\n\n').trim();
};

const stripSharedIndent = (value: string): string => {
  const lines = value.split('\n');
  const nonEmpty = lines.filter((line) => line.trim().length > 0);
  if (!nonEmpty.length) return value.trim();
  const minIndent = nonEmpty.reduce((min, line) => {
    const current = (line.match(/^[ \t]*/) || [''])[0].length;
    return Math.min(min, current);
  }, Number.POSITIVE_INFINITY);
  return lines
    .map((line) => line.slice(minIndent))
    .join('\n')
    .trim();
};

const sanitizeToolName = (value: string): string => value.replace(/[^a-zA-Z0-9]/g, '');

const CHANGE_TYPE_LABELS: Record<string, string> = {
  manual: 'Actualización general',
  'rule-added': 'Agregó una regla',
  'rule-modified': 'Modificó una regla',
  'rule-deleted': 'Eliminó una regla',
  revert: 'Restauración de versión',
};


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



  const [historyEntries, setHistoryEntries] = useState<PromptHistoryEntry[]>([]);
  const [currentVersion, setCurrentVersion] = useState<number | null>(null);



  const [changeType, setChangeType] = useState('manual');



  const [changeDetail, setChangeDetail] = useState('');
  const [toolFunctions, setToolFunctions] = useState<ToolFunctionEntry[]>([]);
  const [toolsExtraContent, setToolsExtraContent] = useState('');
  const [lastSerializedTools, setLastSerializedTools] = useState('');
  const [isSummaryModalOpen, setIsSummaryModalOpen] = useState(false);



  const [isHistoryLoading, setIsHistoryLoading] = useState(true);



  const [historyError, setHistoryError] = useState<string | null>(null);



  const [historySuccess, setHistorySuccess] = useState<string | null>(null);



  const [revertingTo, setRevertingTo] = useState<string | null>(null);



  const currentPromptSnapshot = useMemo(() => JSON.stringify(promptData), [promptData]);



  const hasChanges = currentPromptSnapshot !== initialPromptSnapshot;



  const hasStructuredTools = toolFunctions.length > 0;







  const getChangeTypeLabel = (type?: string) =>
    CHANGE_TYPE_LABELS[type || 'manual'] || CHANGE_TYPE_LABELS.manual;



  const changeTypeOptions = Object.entries(CHANGE_TYPE_LABELS);



  const fetchSettings = useCallback(async () => {



    try {



      setIsLoading(true);



      setError(null);



      const response = await api.get('/dashboard/bot-settings');



      const xmlPrompt: string = response.data.botSettings?.prompt || '';



      const parsed = parseXMLPrompt(xmlPrompt);



      setPromptData(parsed);



      setInitialPromptSnapshot(JSON.stringify(parsed));







      const behaviorRulesMap = parsed.behaviorRules.reduce<Record<string, string>>((acc, rule) => {



        acc[rule.id] = rule.texto;



        return acc;



      }, {});







      setBehaviorRuleDrafts(behaviorRulesMap);



      setInitialBehaviorRules(behaviorRulesMap);



    } catch (err) {



      setError('No se pudo cargar el prompt del sistema.');



    } finally {



      setIsLoading(false);



    }



  }, []);







  const fetchHistory = useCallback(async () => {

    try {

      setIsHistoryLoading(true);

      setHistoryError(null);

      setHistorySuccess(null);

      const { data } = await api.get('/dashboard/bot-settings/prompt/history');

      const entries = data.history || [];

      setHistoryEntries(entries);

      setCurrentVersion(entries[0]?.version ?? null);

    } catch (err) {

      setHistoryEntries([]);

      setHistoryError('No se pudo cargar el historial del prompt.');

    } finally {

      setIsHistoryLoading(false);

    }

  }, []);





  useEffect(() => {



    fetchSettings();



    fetchHistory();



  }, [fetchSettings, fetchHistory]);



  useEffect(() => {



    if (!promptData.tools.trim()) {
      setToolFunctions([]);
      setToolsExtraContent('');
      setLastSerializedTools('');
      return;
    }

    if (promptData.tools === lastSerializedTools) {
      return;
    }

    const parsedTools = parseToolsContent(promptData.tools);



    setToolFunctions(parsedTools.functions);



    setToolsExtraContent(parsedTools.extra);

    setLastSerializedTools(promptData.tools);



  }, [promptData.tools, lastSerializedTools]);







  const performSave = async (detail: string) => {


    setIsSaving(true);


    setError(null);


    setSuccess(false);


    try {


      const xmlPrompt = generateXMLPrompt(promptData);


      const payload = {
        prompt: xmlPrompt,
        changeType,
        changeDetail: detail || undefined,
      };


      await api.patch('/dashboard/bot-settings/prompt', payload);


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


      setChangeType('manual');


      setChangeDetail('');


      await fetchHistory();


      setTimeout(() => setSuccess(false), 3000);


    } catch (err) {


      setError('No se pudo guardar el prompt del sistema.');


    } finally {


      setIsSaving(false);


    }


  };


  const handleSave = () => {


    setIsSummaryModalOpen(true);


  };


  const confirmSummary = async () => {


    const detail = changeDetail.trim();


    setIsSummaryModalOpen(false);


    await performSave(detail);


  };


  const cancelSummary = () => {


    setIsSummaryModalOpen(false);


  };


  const handleRevertVersion = async (entry: PromptHistoryEntry) => {



    setHistoryError(null);



    setHistorySuccess(null);



    setRevertingTo(entry.id);



    try {



      await api.post(`/dashboard/bot-settings/prompt/history/${entry.id}/revert`);



      await fetchSettings();



      await fetchHistory();



      setHistorySuccess(`Se restauró la versión ${entry.version ?? entry.id.slice(-5)} del prompt.`);



    } catch (err) {



      setHistoryError('No se pudo restaurar esa versión del prompt.');



    } finally {



      setRevertingTo(null);



    }



  };







  const previewRule = (texto: string) => {



    const trimmed = texto.trim();



    if (trimmed.length <= 180) {



      return trimmed;



    }



    return `${trimmed.slice(0, 180).trimEnd()}...`;



  };







  const formatHistoryDate = (value: string) => {



    const date = new Date(value);



    if (Number.isNaN(date.getTime())) {



      return value;



    }



    return date.toLocaleString('es-ES', { dateStyle: 'short', timeStyle: 'short' });



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















  const updateToolsPromptData = (



    nextFunctions: ToolFunctionEntry[],



    extraContent: string = toolsExtraContent



  ) => {



    const serialized = serializeToolFunctions(nextFunctions, extraContent);



    setLastSerializedTools(serialized);



    setPromptData((prev) => ({



      ...prev,



      tools: serialized



    }));



  };






  const handleToolFieldChange = (



    id: string,



    field: 'name' | 'when' | 'notes' | 'args',



    value: string



  ) => {



    if (userRole !== 'admin') return;



    const nextValue = field === 'name' ? sanitizeToolName(value) : value;

    setToolFunctions((prev) => {
      const updated = prev.map((tool) =>
        tool.id === id ? { ...tool, [field]: nextValue } : tool
      );
      updateToolsPromptData(updated);
      return updated;
    });



  };






  const handleAddToolFunction = () => {



    if (userRole !== 'admin') return;



    const newTool: ToolFunctionEntry = {
      id: `tool-${createId()}`,
      name: '',
      when: '',
      notes: '',
      args: '{}'
    };

    setToolFunctions((prev) => {
      const next = [...prev, newTool];
      updateToolsPromptData(next);
      return next;
    });



  };






  const handleRemoveToolFunction = (id: string) => {



    if (userRole !== 'admin') return;



    setToolFunctions((prev) => {
      const next = prev.filter((tool) => tool.id !== id);
      updateToolsPromptData(next);
      return next;
    });



  };






  const handleToolsExtraChange = (value: string) => {



    if (userRole !== 'admin') return;



    setToolsExtraContent(value);



    updateToolsPromptData(toolFunctions, value);



  };



  const handleNegativePromptChange = (value: string) => {

    if (userRole !== 'admin') return;

    setPromptData((prev) => ({
      ...prev,
      negativePrompt: value
    }));
  };


  const handleToolsChange = (value: string) => {
    if (userRole !== 'admin') return;

    const parsed = parseToolsContent(value);
    setToolFunctions(parsed.functions);
    setToolsExtraContent(parsed.extra);
    setLastSerializedTools('');

    setPromptData((prev) => ({
      ...prev,
      tools: value
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



    <div className="mx-auto max-w-6xl space-y-6 px-4 py-6 sm:space-y-8 sm:px-6 sm:py-8 md:p-10">



      <GradientSection



        eyebrow="Centro de control"



        title="Ajustes del asistente"



        description="Configura la voz del asistente con indicaciones sencillas. Ajusta cada bloque a tu ritmo y mantén la esencia de tu marca en cada conversación."



        as="h1"



      >



        <div className="grid gap-6 md:grid-cols-[minmax(0,1fr)_minmax(0,1.2fr)]">



          <label className="flex flex-col gap-2">



            <span className="text-sm font-medium text-brand-dark/90">Cómo se presenta el asistente</span>



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



              placeholder="Describe en pocas palabras cómo quieres que se presente el asistente."



            />



          </label>







          <label className="flex flex-col gap-2">



            <span className="text-sm font-medium text-brand-dark/90">Qué debe lograr el asistente</span>



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



              placeholder="Cuenta qué objetivo debe cumplir el asistente en cada conversación."



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



        <div className="rounded-2xl border border-brand-primary/40 bg-brand-primary/10 px-4 py-3 text-sm text-brand-primary shadow-sm">



          Cambios guardados correctamente.



        </div>



      )}



      <GradientSection



        title="Ejemplos de interacciones"



        description="Suma ejemplos reales de conversaciones para mostrar cómo esperas que responda el asistente."



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



                  Quitar este ejemplo



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



                    placeholder="Escribe la pregunta del cliente tal como la recibes."



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



                    placeholder="Describe la respuesta que consideras ideal para el asistente."



                  />



                </label>



              </div>



            </article>



          ))}



          {!promptData.examples.length && (



            <p className="rounded-2xl border border-dashed border-brand-primary/40 bg-brand-primary/10 p-5 text-center text-sm text-brand-primary">



              Todavía no agregaste ejemplos de conversación.



            </p>



          )}



        </div>



        <div className="flex justify-end">



          <button



            type="button"



            onClick={handleAddExample}



            className="inline-flex items-center gap-2 rounded-full border border-brand-primary/40 bg-brand-primary/5 px-5 py-2 text-sm font-semibold text-brand-primary transition hover:border-brand-primary/70 hover:bg-brand-primary/10"



          >



            Agregar otro ejemplo



          </button>



        </div>



      </GradientSection>



      <GradientSection



        title="Reglas de comportamiento"



        description="Redacta instrucciones simples para orientar cómo debe reaccionar el asistente en cada interacción."



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



                      Quitar



                    </button>



                  </div>



                </div>



                <ExpandableTextarea



                  value={draftValue}



                  onChange={(event) => handleBehaviorRuleChange(rule.id, event.target.value)}



                  onBlur={() => handleCommitBehaviorRule(rule.id)}



                  minRows={3}



                  className="mt-3 w-full rounded-2xl border border-brand-info/40 bg-white/90 px-4 py-3 text-sm leading-relaxed text-brand-dark shadow-sm transition focus:border-brand-info focus:outline-none focus:ring-2 focus:ring-brand-info/25"



                  placeholder="Escribe la instrucción que debe seguir el asistente en este caso."



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



              Todavía no definiste reglas de comportamiento.



            </div>



          )}



        </div>







        <div className="flex justify-end">



          <button



            type="button"



            onClick={handleAddBehaviorRule}



            className="rounded-full border border-brand-primary/40 px-4 py-2 text-sm font-medium text-brand-primary transition hover:border-brand-primary/70 hover:bg-brand-primary/10"



          >



            Agregar regla de comportamiento



          </button>



        </div>



      </GradientSection>



      {userRole === 'admin' && (



        <>



        <GradientSection



          tone="warm"



          eyebrow="Solo administradores"



          title="Indicaciones técnicas"



          description="Solo el equipo técnico modifica este bloque. Aquí detallamos la estructura y el formato que debe respetar el asistente."



        >



          <div className="space-y-4">



            {promptData.coreRules.map((rule, index) => {



              const expanded = expandedCoreRules[rule.id] || false;



              return (



                <article



                  key={rule.id}



                  className="rounded-xl border border-brand-warm/40 bg-brand-warm/10 p-4 shadow-brand-soft"



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



                        className="text-sm font-medium text-brand-warm underline-offset-4 hover:underline"



                      >



                        {expanded ? 'Contraer regla' : 'Expandir regla'}



                      </button>



                      <button



                        type="button"



                        onClick={() => handleDeleteCoreRule(rule.id)}



                        className="text-sm font-medium text-brand-warm underline-offset-4 hover:underline"



                      >



                        Eliminar



                      </button>



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



                      className={`mt-4 w-full rounded-lg border px-3 py-2 text-sm leading-relaxed ${userRole === 'admin' ? 'border-brand-warm/60 bg-brand-surface text-brand-dark focus:border-brand-warm focus:outline-none focus:ring-2 focus:ring-brand-warm/30' : 'border-brand-warm/40 bg-brand-warm/10 text-brand-dark'}`}



                      placeholder="Escribe el detalle de esta indicación técnica."



                    />



                  )}



                </article>



              );



            })}



            {!promptData.coreRules.length && (



              <div className="rounded-xl border border-dashed border-brand-warm/60 bg-brand-warm/10 p-6 text-center text-sm text-brand-warm">



                Todavía no cargamos indicaciones técnicas.



              </div>



            )}



          </div>







          <div className="flex justify-end">



            <button



              type="button"



              onClick={handleAddCoreRule}



              className="rounded-full border border-brand-warm/60 px-4 py-2 text-sm font-medium text-brand-warm transition hover:border-brand-warm/80 hover:bg-brand-warm/15"



            >



              Agregar indicación técnica



            </button>



          </div>



        </GradientSection>



        <GradientSection



          tone="warm"



          eyebrow="Solo administradores"



          title="Prompt negativo"



          description="Define lo que el asistente no debe hacer o decir para mantener el foco."



        >



          <label className="flex flex-col gap-2">



            <span className="text-sm font-medium text-brand-dark/90">Bloque negativo</span>



            <ExpandableTextarea



              value={promptData.negativePrompt}



              onChange={(event) => handleNegativePromptChange(event.target.value)}



              readOnly={userRole !== 'admin'}



              minRows={4}



              maxRows={14}



              className="w-full rounded-2xl border border-brand-warm/50 bg-white/90 px-4 py-3 text-sm leading-relaxed text-brand-dark shadow-sm transition focus:border-brand-warm focus:outline-none focus:ring-2 focus:ring-brand-warm/30"



              placeholder="Define las indicaciones que el asistente debe evitar."



            />



          </label>



        </GradientSection>



        <GradientSection



          tone="warm"



          eyebrow="Solo administradores"



          title="Herramientas / funciones"



          description="Documenta las funciones disponibles y sus parámetros para guiar al asistente."



        >



          <div className="space-y-4">



            <div className="flex flex-wrap items-start justify-between gap-3">



              <div className="space-y-1">



                <span className="text-sm font-medium text-brand-dark/90">Listado de tools</span>



                <p className="text-xs text-brand-muted">



                  Este bloque se muestra solo a administradores para documentar las funciones disponibles.



                </p>



              </div>



              {userRole === 'admin' && (



                <button



                  type="button"



                  onClick={handleAddToolFunction}



                  className="rounded-full border border-brand-warm/60 px-4 py-2 text-xs font-semibold text-brand-warm transition hover:border-brand-warm/80 hover:bg-brand-warm/15"



                >



                  Agregar tool



                </button>



              )}



            </div>



            {hasStructuredTools ? (



              <div className="space-y-3">



                {toolFunctions.map((tool, index) => (



                  <article



                    key={tool.id}



                    className="rounded-2xl border border-brand-warm/50 bg-white/95 p-4 shadow-sm"



                  >



                    <div className="flex flex-wrap items-center justify-between gap-3">



                      <div className="space-y-1">



                        <p className="text-xs font-semibold uppercase tracking-wide text-brand-dark/80">



                          Tool #{index + 1}



                        </p>



                        <input



                          type="text"



                          value={tool.name}



                          onChange={(event) =>



                            handleToolFieldChange(tool.id, 'name', event.target.value)



                          }



                          readOnly={userRole !== 'admin'}



                          className="w-full rounded-xl border border-brand-warm/50 bg-white px-3 py-2 text-sm text-brand-dark shadow-inner transition focus:border-brand-warm focus:outline-none focus:ring-2 focus:ring-brand-warm/30 disabled:cursor-not-allowed disabled:bg-brand-background"



                          placeholder='Nombre de la función (ej: "getCategories")'



                        />



                      </div>



                      {userRole === 'admin' && (



                        <button



                          type="button"



                          onClick={() => handleRemoveToolFunction(tool.id)}



                          className="text-xs font-semibold text-brand-warm underline-offset-4 hover:underline"



                        >



                          Quitar



                        </button>



                      )}



                    </div>



                    <div className="mt-3 grid gap-3 md:grid-cols-2">



                      <label className="flex flex-col gap-2">



                        <span className="text-xs font-semibold uppercase tracking-wide text-brand-dark/70">



                          &lt;when&gt; Cuándo usarla



                        </span>



                        <ExpandableTextarea



                          value={tool.when}



                          onChange={(event) =>



                            handleToolFieldChange(tool.id, 'when', event.target.value)



                          }



                          readOnly={userRole !== 'admin'}



                          minRows={3}



                          className="w-full rounded-2xl border border-brand-warm/40 bg-white/90 px-4 py-3 text-sm leading-relaxed text-brand-dark shadow-sm transition focus:border-brand-warm focus:outline-none focus:ring-2 focus:ring-brand-warm/25 disabled:cursor-not-allowed disabled:bg-brand-background"



                          placeholder="Describe en qué situaciones se debe llamar esta función."



                        />



                      </label>



                      <label className="flex flex-col gap-2">



                        <span className="text-xs font-semibold uppercase tracking-wide text-brand-dark/70">



                          &lt;notes&gt; Detalles clave



                        </span>



                        <ExpandableTextarea



                          value={tool.notes}



                          onChange={(event) =>



                            handleToolFieldChange(tool.id, 'notes', event.target.value)



                          }



                          readOnly={userRole !== 'admin'}



                          minRows={3}



                          className="w-full rounded-2xl border border-brand-warm/40 bg-white/90 px-4 py-3 text-sm leading-relaxed text-brand-dark shadow-sm transition focus:border-brand-warm focus:outline-none focus:ring-2 focus:ring-brand-warm/25 disabled:cursor-not-allowed disabled:bg-brand-background"



                          placeholder="Notas finales (ej: Listar nombres sin IDs.)"



                        />



                      </label>



                    </div>



                    <label className="mt-3 flex flex-col gap-2">



                      <span className="text-xs font-semibold uppercase tracking-wide text-brand-dark/70">



                        &lt;args&gt; Esquema de parámetros



                      </span>



                      <textarea



                        value={tool.args}



                        onChange={(event) =>



                          handleToolFieldChange(tool.id, 'args', event.target.value)



                        }



                        readOnly={userRole !== 'admin'}



                        spellCheck={false}



                        className="min-h-[140px] w-full rounded-2xl border border-brand-warm/60 bg-amber-50/90 px-4 py-3 font-mono text-xs leading-relaxed text-slate-900 transition focus:border-brand-warm focus:outline-none focus:ring-2 focus:ring-brand-warm/30 disabled:cursor-not-allowed disabled:border-brand-border disabled:bg-brand-background disabled:text-brand-muted"



                        placeholder="Pega solo el contenido de la etiqueta <args> con el esquema en JSON."



                      />



                    </label>



                  </article>



                ))}



                {userRole === 'admin' && (



                  <div className="flex justify-end">



                    <button



                      type="button"



                      onClick={handleAddToolFunction}



                      className="inline-flex items-center gap-2 rounded-full border border-brand-warm/60 px-4 py-2 text-xs font-semibold text-brand-warm transition hover:border-brand-warm/80 hover:bg-brand-warm/15"



                    >



                      Agregar otra tool



                    </button>



                  </div>



                )}



                {toolsExtraContent.trim() ? (



                  <label className="flex flex-col gap-2 rounded-2xl border border-dashed border-brand-warm/50 bg-brand-warm/5 p-4">



                    <span className="text-xs font-semibold uppercase tracking-wide text-brand-warm">



                      Contenido adicional sin etiquetar



                    </span>



                    <ExpandableTextarea



                      value={toolsExtraContent}



                      onChange={(event) => handleToolsExtraChange(event.target.value)}



                      readOnly={userRole !== 'admin'}



                      minRows={3}



                      className="w-full rounded-2xl border border-brand-warm/40 bg-white/90 px-4 py-3 text-sm leading-relaxed text-brand-dark shadow-sm transition focus:border-brand-warm focus:outline-none focus:ring-2 focus:ring-brand-warm/25 disabled:cursor-not-allowed disabled:bg-brand-background"



                      placeholder="Texto adicional que acompaña a las funciones."



                    />



                  </label>



                ) : null}



              </div>



            ) : (



              <label className="flex flex-col gap-2">



                <span className="text-sm font-medium text-brand-dark/90">Editar en texto plano</span>



                <ExpandableTextarea



                  value={promptData.tools}



                  onChange={(event) => handleToolsChange(event.target.value)}



                  readOnly={userRole !== 'admin'}



                  minRows={8}



                  className="w-full rounded-2xl border border-brand-warm/40 bg-white/90 px-4 py-3 text-sm leading-relaxed text-brand-dark shadow-sm transition focus:border-brand-warm focus:outline-none focus:ring-2 focus:ring-brand-warm/25 disabled:cursor-not-allowed disabled:bg-brand-background"



                  placeholder="Pega el bloque de tools en XML. Las etiquetas <function>, <when> y <notes> se mostrarán en tarjetas, y solo <args> conservará el estilo de código."



                />



              </label>



            )}



          </div>



        </GradientSection>



        </>



      )}



















      <GradientSection



        tone="primary"



        eyebrow="Historial"



        title="Control de cambios"



        description="Consulta quién actualizó el prompt, cuándo lo hizo y vuelve a una versión anterior si algo no cuadra."



      >



        <div className="space-y-4">



          {historySuccess && (



            <div className="rounded-2xl border border-brand-primary/40 bg-brand-primary/10 px-4 py-2 text-sm font-semibold text-brand-primary shadow-sm">



              {historySuccess}



            </div>



          )}



          {historyError && (



            <div className="rounded-2xl border border-rose-400/40 bg-rose-400/10 px-4 py-2 text-sm font-semibold text-rose-600 shadow-sm">



              {historyError}



            </div>



          )}



          {isHistoryLoading ? (



            <div className="flex justify-center py-8">



              <Spinner />



            </div>



          ) : historyEntries.length ? (



            <div className="space-y-3">



              {historyEntries.map((entry) => (



                <article
                  key={entry.id}
                  className="rounded-2xl border border-brand-surface/60 bg-white/80 p-4 shadow-sm">
                  <div className="flex flex-col gap-2 sm:flex-row sm:items-start sm:justify-between">
                    <div className="space-y-1">
                      <p className="text-sm font-semibold text-brand-dark">
                        Versión {entry.version || entry.id.slice(-5)} · {getChangeTypeLabel(entry.changeType)}
                      </p>
                      <p className="text-xs text-brand-dark/70">
                        {entry.changeDetail || 'No se detalló el cambio específico.'}
                      </p>
                      <p className="text-xs text-brand-dark/60">
                        {entry.changedBy.name || entry.changedBy.email} · {formatHistoryDate(entry.createdAt)}
                      </p>
                    </div>
                    {(!currentVersion || entry.version !== currentVersion) ? (
                      <button
                        type="button"
                        disabled={revertingTo === entry.id}
                        onClick={() => handleRevertVersion(entry)}
                        className="inline-flex items-center justify-center rounded-full border border-brand-primary/40 px-3 py-1 text-xs font-semibold uppercase tracking-wide text-brand-primary transition hover:border-brand-primary hover:bg-brand-primary/10 disabled:cursor-not-allowed disabled:border-brand-primary/30 disabled:text-brand-primary/50">
                        {revertingTo === entry.id ? 'Restaurando...' : 'Restaurar esta versión'}
                      </button>
                    ) : (
                      <p className="text-xs font-semibold text-brand-primary">Versión actual</p>
                    )}
                  </div>
                </article>



              ))}



            </div>



          ) : (



            <div className="rounded-2xl border border-dashed border-brand-primary/40 bg-brand-primary/5 p-4 text-sm text-brand-muted">



              Todavía no hay versiones registradas para este prompt.



            </div>



          )}



        </div>



      </GradientSection>







      {isSummaryModalOpen && (
        <div className="fixed inset-0 z-30 flex items-center justify-center bg-black/30 backdrop-blur-sm">
          <div className="w-full max-w-md rounded-2xl bg-slate-50 p-6 shadow-xl">
            <h3 className="text-base font-semibold text-brand-dark">Registro de cambios</h3>
            <p className="mt-2 text-xs text-brand-dark/70">
              Selecciona el tipo de cambio y describe brevemente que modificaste antes de guardar.
            </p>
            <div className="mt-4 grid gap-3 sm:grid-cols-[minmax(0,1fr)_minmax(0,1fr)]">
              <label className="flex flex-col gap-2 text-xs font-semibold uppercase tracking-[0.2em] text-brand-dark">
                Tipo de cambio
                <select
                  value={changeType}
                  onChange={(event) => setChangeType(event.target.value)}
                  className="mt-1 rounded-lg border border-brand-primary/40 bg-white px-3 py-2 text-xs text-brand-dark focus:border-brand-primary focus:outline-none focus:ring-2 focus:ring-brand-primary/30"
                >
                  {changeTypeOptions.map(([value, label]) => (
                    <option key={value} value={value}>
                      {label}
                    </option>
                  ))}
                </select>
              </label>
              <label className="sm:col-span-2 flex flex-col gap-2 text-xs font-semibold uppercase tracking-[0.2em] text-brand-dark">
                Detalle del cambio (opcional)
                <textarea
                  rows={2}
                  value={changeDetail}
                  onChange={(event) => setChangeDetail(event.target.value)}
                  placeholder="Se elimino/agrega una regla de comportamiento"
                  className="mt-1 rounded-lg border border-brand-primary/40 bg-white px-3 py-2 text-sm text-brand-dark focus:border-brand-primary focus:outline-none focus:ring-2 focus:ring-brand-primary/30"
                />
              </label>
            </div>
            <div className="mt-4 flex justify-end gap-3">
              <button
                type="button"
                onClick={cancelSummary}
                className="rounded-full border border-brand-dark/30 px-4 py-2 text-xs font-semibold text-brand-dark"
              >
                Cancelar
              </button>
              <button
                type="button"
                onClick={confirmSummary}
                className="rounded-full bg-brand-primary px-4 py-2 text-xs font-semibold text-white"
              >
                Confirmar y guardar
              </button>
            </div>
          </div>
        </div>
      )}

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








































































