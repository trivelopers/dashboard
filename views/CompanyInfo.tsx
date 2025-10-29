import React, { useEffect, useMemo, useState } from 'react';
import ExpandableTextarea from '../components/ExpandableTextarea';
import Spinner from '../components/Spinner';
import api from '../services/api';
import { useAuth } from '../hooks/useAuth';
import {
  BranchInfo,
  CompanyInfo,
  PromptData,
  createEmptyPromptData,
  createId,
  formatLabel,
  generateXMLPrompt,
  parseXMLPrompt,
  slugify
} from '../utils/promptHelpers';

type BranchArrayField = 'telefonos' | 'emails';

const normalizeBranch = (branch: BranchInfo, index: number): BranchInfo => ({
  ...branch,
  tag: branch.tag || slugify(branch.etiqueta, `sucursal_${index + 1}`),
  etiqueta: branch.etiqueta || formatLabel(`sucursal_${index + 1}`),
  telefonos: branch.telefonos.length ? branch.telefonos : [''],
  emails: branch.emails.length ? branch.emails : ['']
});

const snapshotCompanyState = (company: CompanyInfo, branches: BranchInfo[]) =>
  JSON.stringify({
    company,
    branches
  });

const CompanyInfo: React.FC = () => {
  const { user } = useAuth();

  const [promptData, setPromptData] = useState<PromptData>(() => createEmptyPromptData());
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);
  const [initialSnapshot, setInitialSnapshot] = useState<string>(() =>
    snapshotCompanyState(createEmptyPromptData().company, [])
  );

  const currentSnapshot = useMemo(
    () => snapshotCompanyState(promptData.company, promptData.branches),
    [promptData.company, promptData.branches]
  );

  const hasChanges = currentSnapshot !== initialSnapshot;

  useEffect(() => {
    const fetchSettings = async () => {
      try {
        setIsLoading(true);
        const response = await api.get('/dashboard/bot-settings');
        const xmlPrompt: string = response.data.botSettings?.prompt || '';
        const parsed = parseXMLPrompt(xmlPrompt);
        const normalizedBranches = parsed.branches.map(normalizeBranch);

        setPromptData({
          ...parsed,
          branches: normalizedBranches
        });
        setInitialSnapshot(snapshotCompanyState(parsed.company, normalizedBranches));
      } catch (err) {
        setError('No se pudo cargar la información de la empresa.');
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
      setInitialSnapshot(snapshotCompanyState(promptData.company, promptData.branches));
      setSuccess(true);
      setTimeout(() => setSuccess(false), 3000);
    } catch (err) {
      setError('No se pudieron guardar los cambios de la empresa.');
    } finally {
      setIsSaving(false);
    }
  };

  const handleCompanyAboutChange = (value: string) => {
    setPromptData((prev) => ({
      ...prev,
      company: {
        ...prev.company,
        acerca: value
      }
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

  const handleBranchChange = (id: string, field: 'etiqueta' | 'horario' | 'direccion' | 'enlace', value: string) => {
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

  const handleBranchArrayChange = (id: string, field: BranchArrayField, itemIndex: number, value: string) => {
    setPromptData((prev) => ({
      ...prev,
      branches: prev.branches.map((branch) => {
        if (branch.id !== id) return branch;
        const currentItems = field === 'telefonos' ? [...branch.telefonos] : [...branch.emails];
        currentItems[itemIndex] = value;
        const normalized = currentItems.length ? currentItems : [''];
        return {
          ...branch,
          [field]: normalized
        } as BranchInfo;
      })
    }));
  };

  const handleAddBranchArrayItem = (id: string, field: BranchArrayField) => {
    setPromptData((prev) => ({
      ...prev,
      branches: prev.branches.map((branch) => {
        if (branch.id !== id) return branch;
        const currentItems = field === 'telefonos' ? branch.telefonos : branch.emails;
        return {
          ...branch,
          [field]: [...currentItems, '']
        } as BranchInfo;
      })
    }));
  };

  const handleRemoveBranchArrayItem = (id: string, field: BranchArrayField, itemIndex: number) => {
    setPromptData((prev) => ({
      ...prev,
      branches: prev.branches.map((branch) => {
        if (branch.id !== id) return branch;
        const currentItems = field === 'telefonos' ? [...branch.telefonos] : [...branch.emails];
        if (currentItems.length <= 1) {
          return {
            ...branch,
            [field]: ['']
          } as BranchInfo;
        }
        const nextItems = currentItems.filter((_, index) => index !== itemIndex);
        return {
          ...branch,
          [field]: nextItems.length ? nextItems : ['']
        } as BranchInfo;
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
        telefonos: [''],
        emails: [''],
        sitio: '',
        direccion: '',
        horario: '',
        enlace: ''
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

  if (!user) {
    return null;
  }

  if (isLoading) {
    return (
      <div className="mt-10 flex justify-center">
        <Spinner />
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-5xl space-y-8 p-6 sm:p-10">
      <header className="rounded-3xl border border-brand-primary/25 bg-gradient-to-br from-brand-background via-brand-surface to-white p-8 shadow-lg">
        <div className="space-y-4">
          <p className="inline-flex rounded-full border border-brand-primary/30 bg-brand-primary/10 px-3 py-1 text-xs font-semibold uppercase tracking-[0.2em] text-brand-primary/80">
            Identidad de marca
          </p>
          <div className="space-y-3">
            <h1 className="text-3xl font-semibold tracking-tight text-brand-dark sm:text-4xl">
              Información de tu empresa
            </h1>
            <p className="text-sm leading-relaxed text-brand-muted">
              Mantén actualizada la descripción, los servicios y las sucursales para alinear cada respuesta del asistente con tu oferta actual.
            </p>
          </div>
        </div>
      </header>

      {error && (
        <div className="rounded-2xl border border-red-200/70 bg-red-50/80 px-4 py-3 text-sm text-red-700 shadow-sm">
          {error}
        </div>
      )}

      {success && (
        <div className="rounded-2xl border border-brand-success/40 bg-brand-success/10 px-4 py-3 text-sm text-brand-success shadow-sm">
          Cambios guardados correctamente.
        </div>
      )}

      <section className="space-y-6 rounded-3xl border border-brand-border/50 bg-brand-surface/95 p-8 shadow-md backdrop-blur">
        <div className="space-y-4">
          <label className="flex flex-col gap-2">
            <span className="text-sm font-medium text-brand-dark/90">Acerca de</span>
            <ExpandableTextarea
              value={promptData.company.acerca}
              onChange={(event) => handleCompanyAboutChange(event.target.value)}
              minRows={1}
              className="w-full rounded-2xl border border-brand-border/40 bg-white/80 px-4 py-3 text-sm leading-relaxed text-brand-dark shadow-sm transition focus:border-brand-primary focus:outline-none focus:ring-2 focus:ring-brand-primary/25"
              placeholder="Resumen breve de la empresa, historia o propuesta de valor."
            />
          </label>

          <div className="space-y-3">
            <div className="flex flex-wrap items-center justify-between gap-3">
              <span className="text-sm font-medium text-brand-dark/90">Servicios</span>
              <button
                type="button"
                onClick={handleAddService}
                className="inline-flex items-center gap-2 rounded-full border border-brand-primary/40 bg-brand-primary/10 px-4 py-1.5 text-xs font-semibold text-brand-primary transition hover:border-brand-primary/60 hover:bg-brand-primary/15"
              >
                Agregar servicio
              </button>
            </div>
            <div className="space-y-3">
              {promptData.company.servicios.map((servicio, index) => (
                <div key={`servicio-${index}`} className="flex items-center gap-3">
                  <ExpandableTextarea
                    value={servicio}
                    onChange={(event) => handleServiceChange(index, event.target.value)}
                    minRows={2}
                    maxRows={8}
                    className="flex-1 rounded-2xl border border-brand-border/40 bg-white/85 px-4 py-3 text-sm leading-relaxed text-brand-dark shadow-sm transition focus:border-brand-primary focus:outline-none focus:ring-2 focus:ring-brand-primary/25"
                    placeholder="Describe un servicio, producto o propuesta clave."
                  />
                  <button
                    type="button"
                    onClick={() => handleRemoveService(index)}
                    className="rounded-full border border-brand-border/60 px-3 py-1 text-xs font-semibold text-brand-muted transition hover:border-red-300 hover:text-red-500"
                  >
                    Eliminar
                  </button>
                </div>
              ))}
              {!promptData.company.servicios.length && (
                <div className="rounded-xl border border-dashed border-brand-border/50 bg-white/60 p-5 text-center text-sm text-brand-muted">
                  Aún no registraste servicios. Agrega tu primera oferta para personalizar las respuestas.
                </div>
              )}
            </div>
          </div>
        </div>
      </section>

      <section className="space-y-6 rounded-3xl border border-brand-border/50 bg-brand-surface/95 p-8 shadow-md backdrop-blur">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <h2 className="text-2xl font-semibold text-brand-dark">Sucursales y puntos de contacto</h2>
            <p className="mt-1 text-sm text-brand-muted">
              Añade formas de contacto, direcciones y horarios para mejorar la precisión de tus respuestas.
            </p>
          </div>
          <button
            type="button"
            onClick={handleAddBranch}
            className="inline-flex items-center gap-2 rounded-full border border-brand-dark/40 bg-brand-dark/10 px-4 py-1.5 text-xs font-semibold text-brand-dark transition hover:border-brand-dark/60 hover:bg-brand-dark/15"
          >
            Nueva sucursal
          </button>
        </div>

        <div className="space-y-5">
          {promptData.branches.map((branch, index) => (
            <article
              key={branch.id}
              className="rounded-2xl border border-brand-border/40 bg-brand-background/90 p-5 shadow-sm"
            >
              <div className="flex flex-wrap items-start justify-between gap-3">
                <div>
                  <p className="text-xs font-semibold uppercase tracking-wide text-brand-dark/80">
                    Sucursal #{index + 1}
                  </p>
                </div>
                <button
                  type="button"
                  onClick={() => handleRemoveBranch(branch.id)}
                  className="text-sm font-medium text-brand-primary underline-offset-4 hover:underline"
                >
                  Eliminar sucursal
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
                    className="rounded-2xl border border-brand-border/40 bg-white/85 px-4 py-2.5 text-sm text-brand-dark shadow-sm transition focus:border-brand-primary focus:outline-none focus:ring-2 focus:ring-brand-primary/25"
                    placeholder="Ej.: Casa Central"
                  />
                </label>
                <label className="flex flex-col gap-1.5">
                  <span className="text-xs font-medium text-brand-muted">Horarios</span>
                  <input
                    type="text"
                    value={branch.horario}
                    onChange={(event) =>
                      handleBranchChange(branch.id, 'horario', event.target.value)
                    }
                    className="rounded-2xl border border-brand-border/40 bg-white/85 px-4 py-2.5 text-sm text-brand-dark shadow-sm transition focus:border-brand-primary focus:outline-none focus:ring-2 focus:ring-brand-primary/25"
                    placeholder="Ej.: Lunes a viernes de 9 a 18 hs"
                  />
                </label>
              </div>
              <label className="mt-3 flex w-full flex-col gap-1.5">
                <span className="text-xs font-medium text-brand-muted">Dirección</span>
                <ExpandableTextarea
                  value={branch.direccion}
                  onChange={(event) =>
                    handleBranchChange(branch.id, 'direccion', event.target.value)
                  }
                  minRows={1}
                  className="w-full rounded-2xl border border-brand-border/40 bg-white/85 px-4 py-3 text-sm leading-relaxed text-brand-dark shadow-sm transition focus:border-brand-primary focus:outline-none focus:ring-2 focus:ring-brand-primary/25"
                  placeholder="Dirección física, referencias o datos clave."
                />
              </label>
              <div className="mt-3 grid gap-3 md:grid-cols-2">
                <div className="flex flex-col gap-1.5">
                  <span className="text-xs font-medium text-brand-muted">Teléfonos</span>
                  <div className="space-y-2">
                    {branch.telefonos.map((telefono, telefonoIndex) => (
                      <div
                        key={`${branch.id}-telefono-${telefonoIndex}`}
                        className="flex items-center gap-2"
                      >
                        <input
                          type="text"
                          value={telefono}
                          onChange={(event) =>
                            handleBranchArrayChange(
                              branch.id,
                              'telefonos',
                              telefonoIndex,
                              event.target.value
                            )
                          }
                          className="flex-1 rounded-2xl border border-brand-border/40 bg-white/85 px-4 py-2.5 text-sm text-brand-dark shadow-sm transition focus:border-brand-primary focus:outline-none focus:ring-2 focus:ring-brand-primary/25"
                          placeholder="+54 9 11 2222-3333"
                        />
                        <button
                          type="button"
                          onClick={() =>
                            handleRemoveBranchArrayItem(branch.id, 'telefonos', telefonoIndex)
                          }
                          className="rounded-full border border-brand-border/60 px-3 py-1 text-xs font-semibold text-brand-muted transition hover:border-red-300 hover:text-red-500"
                        >
                          Quitar
                        </button>
                      </div>
                    ))}
                    <button
                      type="button"
                      onClick={() => handleAddBranchArrayItem(branch.id, 'telefonos')}
                      className="rounded-full border border-brand-border/60 px-3 py-1 text-xs font-semibold text-brand-muted transition hover:border-brand-primary/60 hover:text-brand-primary"
                    >
                      Añadir teléfono
                    </button>
                  </div>
                </div>
                <div className="flex flex-col gap-1.5">
                  <span className="text-xs font-medium text-brand-muted">Correos electrónicos</span>
                  <div className="space-y-2">
                    {branch.emails.map((email, emailIndex) => (
                      <div
                        key={`${branch.id}-email-${emailIndex}`}
                        className="flex items-center gap-2"
                      >
                        <input
                          type="email"
                          value={email}
                          onChange={(event) =>
                            handleBranchArrayChange(branch.id, 'emails', emailIndex, event.target.value)
                          }
                          className="flex-1 rounded-2xl border border-brand-border/40 bg-white/85 px-4 py-2.5 text-sm text-brand-dark shadow-sm transition focus:border-brand-primary focus:outline-none focus:ring-2 focus:ring-brand-primary/25"
                          placeholder="contacto@empresa.com"
                        />
                        <button
                          type="button"
                          onClick={() => handleRemoveBranchArrayItem(branch.id, 'emails', emailIndex)}
                          className="rounded-full border border-brand-border/60 px-3 py-1 text-xs font-semibold text-brand-muted transition hover:border-red-300 hover:text-red-500"
                        >
                          Quitar
                        </button>
                      </div>
                    ))}
                    <button
                      type="button"
                      onClick={() => handleAddBranchArrayItem(branch.id, 'emails')}
                      className="rounded-full border border-brand-border/60 px-3 py-1 text-xs font-semibold text-brand-muted transition hover:border-brand-primary/60 hover:text-brand-primary"
                    >
                      Añadir correo
                    </button>
                  </div>
                </div>
              </div>
              <div className="mt-3 grid gap-3 md:grid-cols-2">
                <label className="flex flex-col gap-1.5">
                  <span className="text-xs font-medium text-brand-muted">Sitio web</span>
                  <input
                    type="text"
                    value={branch.sitio}
                    onChange={(event) =>
                      setPromptData((prev) => ({
                        ...prev,
                        branches: prev.branches.map((innerBranch) =>
                          innerBranch.id === branch.id
                            ? { ...innerBranch, sitio: event.target.value }
                            : innerBranch
                        )
                      }))
                    }
                    className="rounded-2xl border border-brand-border/40 bg-white/85 px-4 py-2.5 text-sm text-brand-dark shadow-sm transition focus:border-brand-primary focus:outline-none focus:ring-2 focus:ring-brand-primary/25"
                    placeholder="https://tu-sitio.com"
                  />
                </label>
                <label className="flex flex-col gap-1.5">
                  <span className="text-xs font-medium text-brand-muted">Enlace destacado</span>
                  <input
                    type="text"
                    value={branch.enlace}
                    onChange={(event) => handleBranchChange(branch.id, 'enlace', event.target.value)}
                    className="rounded-2xl border border-brand-border/40 bg-white/85 px-4 py-2.5 text-sm text-brand-dark shadow-sm transition focus:border-brand-primary focus:outline-none focus:ring-2 focus:ring-brand-primary/25"
                    placeholder="https://enlace-importante.com"
                  />
                </label>
              </div>
            </article>
          ))}
          {!promptData.branches.length && (
            <div className="rounded-xl border border-dashed border-brand-border/50 bg-white/60 p-5 text-center text-sm text-brand-muted">
              Todavía no agregaste sucursales. Crea la primera para facilitar la atención personalizada.
            </div>
          )}
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

export default CompanyInfo;
