import React, { useEffect, useState } from 'react';
import { DevicePhoneMobileIcon, CheckCircleIcon, ExclamationCircleIcon } from '@heroicons/react/24/solid';
import { getWhatsappConfig, updateWhatsappConfig, updateAiConfig } from '../../services/whatsappAgentApi';
import { useAuth } from '../../hooks/useAuth';
import type { WhatsappConfig } from '../../types';

const Field: React.FC<{
  label: string; id: string; value: string; onChange: (v: string) => void;
  type?: string; placeholder?: string; hint?: string; masked?: boolean; hasValue?: boolean;
}> = ({ label, id, value, onChange, type = 'text', placeholder, hint, masked, hasValue }) => (
  <div>
    <label htmlFor={id} className="block text-sm font-medium text-brand-dark mb-1">{label}</label>
    {masked ? (
      <div className="flex gap-2 items-center">
        <input
          id={id} type="password" value={value} onChange={e => onChange(e.target.value)}
          placeholder={hasValue ? '••••••••••••' : placeholder}
          className="flex-1 rounded-xl border border-brand-border/60 bg-white px-4 py-2.5 text-sm text-brand-dark placeholder-brand-muted/50 focus:outline-none focus:ring-2 focus:ring-brand-primary/30"
        />
        {hasValue && !value && (
          <span className="inline-flex items-center gap-1 text-xs text-green-600 font-medium">
            <CheckCircleIcon className="h-4 w-4" /> Configurado
          </span>
        )}
      </div>
    ) : (
      <input
        id={id} type={type} value={value} onChange={e => onChange(e.target.value)}
        placeholder={placeholder}
        className="w-full rounded-xl border border-brand-border/60 bg-white px-4 py-2.5 text-sm text-brand-dark placeholder-brand-muted/50 focus:outline-none focus:ring-2 focus:ring-brand-primary/30"
      />
    )}
    {hint && <p className="mt-1 text-xs text-brand-muted">{hint}</p>}
  </div>
);

const WhatsAppConfig: React.FC = () => {
  const { user } = useAuth();
  const clientId = user?.clientId ?? '';

  const [config, setConfig] = useState<WhatsappConfig | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [feedback, setFeedback] = useState<{ type: 'ok' | 'err'; msg: string } | null>(null);

  // WhatsApp form state
  const [phoneNumberId, setPhoneNumberId] = useState('');
  const [accessToken, setAccessToken] = useState('');
  const [appSecret, setAppSecret] = useState('');
  const [verifyToken, setVerifyToken] = useState('');
  const [wabaId, setWabaId] = useState('');

  // AI form state
  const [aiProvider, setAiProvider] = useState('openai');
  const [aiApiKey, setAiApiKey] = useState('');
  const [historyLimit, setHistoryLimit] = useState('20');

  useEffect(() => {
    if (!clientId) return;
    getWhatsappConfig(clientId)
      .then(data => {
        setConfig(data);
        setPhoneNumberId(data.whatsapp.phoneNumberId ?? '');
        setVerifyToken(data.whatsapp.verifyToken ?? '');
        setWabaId(data.whatsapp.wabaId ?? '');
        setAiProvider(data.ai.provider ?? 'openai');
        setHistoryLimit(String(data.ai.historyLimit ?? 20));
      })
      .catch(console.error)
      .finally(() => setLoading(false));
  }, [clientId]);

  const showFeedback = (type: 'ok' | 'err', msg: string) => {
    setFeedback({ type, msg });
    setTimeout(() => setFeedback(null), 3000);
  };

  const handleSaveWhatsapp = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    try {
      const payload: Record<string, string> = { phoneNumberId, verifyToken, wabaId };
      if (accessToken) payload.accessToken = accessToken;
      if (appSecret) payload.appSecret = appSecret;
      await updateWhatsappConfig(clientId, payload);
      setAccessToken('');
      setAppSecret('');
      showFeedback('ok', 'Configuración WhatsApp guardada correctamente.');
    } catch {
      showFeedback('err', 'Error al guardar la configuración WhatsApp.');
    } finally {
      setSaving(false);
    }
  };

  const handleSaveAi = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    try {
      const payload: Record<string, string | number> = {
        provider: aiProvider,
        historyLimit: Number(historyLimit),
      };
      if (aiApiKey) payload.apiKey = aiApiKey;
      await updateAiConfig(clientId, payload);
      setAiApiKey('');
      showFeedback('ok', 'Configuración IA guardada correctamente.');
    } catch {
      showFeedback('err', 'Error al guardar la configuración IA.');
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <div className="flex h-40 items-center justify-center">
        <div className="h-8 w-8 animate-spin rounded-full border-4 border-brand-primary border-t-transparent" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <section className="rounded-2xl border border-brand-border/60 bg-white/90 p-6 shadow-brand-soft">
        <div className="flex items-center gap-3">
          <DevicePhoneMobileIcon className="h-8 w-8 text-brand-primary" />
          <div>
            <p className="text-xs font-semibold uppercase tracking-wide text-brand-primary">WhatsApp Agents</p>
            <h1 className="text-3xl font-semibold text-brand-dark">Configuración WhatsApp</h1>
            <p className="mt-1 text-sm text-brand-muted">
              Credenciales Meta Business y configuración del proveedor de IA.
            </p>
          </div>
        </div>
      </section>

      {/* Feedback */}
      {feedback && (
        <div className={`flex items-center gap-2 rounded-xl border px-4 py-3 text-sm font-medium ${
          feedback.type === 'ok'
            ? 'border-green-200 bg-green-50 text-green-700'
            : 'border-red-200 bg-red-50 text-red-700'
        }`}>
          {feedback.type === 'ok'
            ? <CheckCircleIcon className="h-5 w-5" />
            : <ExclamationCircleIcon className="h-5 w-5" />}
          {feedback.msg}
        </div>
      )}

      {/* WhatsApp credentials */}
      <section className="rounded-2xl border border-brand-border/60 bg-white/90 p-6 shadow-brand-soft">
        <h2 className="text-lg font-semibold text-brand-dark mb-4">Credenciales Meta</h2>
        <form onSubmit={handleSaveWhatsapp} className="space-y-4">
          <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
            <Field label="Phone Number ID" id="phoneNumberId" value={phoneNumberId}
              onChange={setPhoneNumberId} placeholder="1234567890" />
            <Field label="WABA ID" id="wabaId" value={wabaId}
              onChange={setWabaId} placeholder="9876543210" />
            <Field label="Verify Token" id="verifyToken" value={verifyToken}
              onChange={setVerifyToken} placeholder="mi_token_secreto"
              hint="El token que configurás en el webhook de Meta." />
            <Field label="Access Token (Permanente)" id="accessToken" value={accessToken}
              onChange={setAccessToken} masked hasValue={config?.whatsapp.hasAccessToken}
              placeholder="EAAxxxxx..." hint="Solo completá si querés actualizar el token." />
            <Field label="App Secret" id="appSecret" value={appSecret}
              onChange={setAppSecret} masked hasValue={config?.whatsapp.hasAppSecret}
              placeholder="Tu App Secret de Meta" hint="Requerido para verificar firmas HMAC de webhooks." />
          </div>
          <div className="flex justify-end">
            <button type="submit" disabled={saving}
              className="rounded-full bg-brand-primary px-6 py-2.5 text-sm font-semibold text-white transition hover:opacity-90 disabled:opacity-50">
              {saving ? 'Guardando...' : 'Guardar configuración Meta'}
            </button>
          </div>
        </form>
      </section>

      {/* AI Config */}
      <section className="rounded-2xl border border-brand-border/60 bg-white/90 p-6 shadow-brand-soft">
        <h2 className="text-lg font-semibold text-brand-dark mb-4">Proveedor de IA (defaults del tenant)</h2>
        <p className="mb-4 text-sm text-brand-muted">
          Estos valores son los defaults para todos los agentes. Cada agente puede sobrescribirlos individualmente.
        </p>
        <form onSubmit={handleSaveAi} className="space-y-4">
          <div className="grid grid-cols-1 gap-4 md:grid-cols-3">
            <div>
              <label htmlFor="aiProvider" className="block text-sm font-medium text-brand-dark mb-1">Proveedor</label>
              <select id="aiProvider" value={aiProvider} onChange={e => setAiProvider(e.target.value)}
                className="w-full rounded-xl border border-brand-border/60 bg-white px-4 py-2.5 text-sm text-brand-dark focus:outline-none focus:ring-2 focus:ring-brand-primary/30">
                <option value="openai">OpenAI</option>
                <option value="anthropic">Anthropic</option>
              </select>
            </div>
            <Field label="History Limit (mensajes)" id="historyLimit" value={historyLimit}
              onChange={setHistoryLimit} type="number" placeholder="20"
              hint="Mensajes de historial que se pasan a la IA." />
            <Field label="API Key" id="aiApiKey" value={aiApiKey}
              onChange={setAiApiKey} masked hasValue={config?.ai.hasApiKey}
              placeholder="sk-..." hint="Solo completá si querés actualizar la key." />
          </div>
          <div className="flex justify-end">
            <button type="submit" disabled={saving}
              className="rounded-full bg-brand-primary px-6 py-2.5 text-sm font-semibold text-white transition hover:opacity-90 disabled:opacity-50">
              {saving ? 'Guardando...' : 'Guardar configuración IA'}
            </button>
          </div>
        </form>
      </section>
    </div>
  );
};

export default WhatsAppConfig;
