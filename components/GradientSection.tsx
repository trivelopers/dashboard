import React from 'react';

interface GradientSectionProps {
  eyebrow?: string;
  title?: string;
  description?: React.ReactNode;
  actions?: React.ReactNode;
  children?: React.ReactNode;
  className?: string;
  contentClassName?: string;
  titleClassName?: string;
  headerClassName?: string;
  as?: keyof JSX.IntrinsicElements;
  tone?: 'primary' | 'warm';
}

const GradientSection: React.FC<GradientSectionProps> = ({
  eyebrow,
  title,
  description,
  actions,
  children,
  className = '',
  contentClassName = '',
  titleClassName = '',
  headerClassName = '',
  as = 'h2',
  tone = 'primary'
}) => {
  const toneStyles = {
    primary: {
      border: 'border-brand-primary/20',
      gradient: 'bg-gradient-to-br from-brand-surface via-brand-surface to-white',
      accentGlow: 'bg-brand-primary/15',
      eyebrow: 'border-brand-primary/30 bg-brand-primary/10 text-brand-primary/80'
    },
    warm: {
      border: 'border-brand-warm/40',
      gradient: 'bg-gradient-to-br from-brand-warm/10 via-brand-background to-white',
      accentGlow: 'bg-brand-warm/25',
      eyebrow: 'border-brand-warm/40 bg-brand-warm/10 text-brand-warm/90'
    }
  } as const;

  const currentTone = toneStyles[tone] ?? toneStyles.primary;
  const TitleTag = as;
  const hasHeaderContent = eyebrow || title || description || actions;
  const contentClasses = ['relative'];

  if (hasHeaderContent) {
    contentClasses.push(contentClassName || 'space-y-6');
  } else if (contentClassName) {
    contentClasses.push(contentClassName);
  }

  return (
    <section
      className={`relative overflow-hidden rounded-3xl border ${currentTone.border} ${currentTone.gradient} p-8 shadow-lg ${className}`}
    >
      <div
        aria-hidden="true"
        className={`pointer-events-none absolute -top-20 -right-16 hidden h-64 w-64 rounded-full ${currentTone.accentGlow} blur-3xl md:block`}
      />
      <div className={contentClasses.join(' ')}>
        {hasHeaderContent && (
          <div className={`flex flex-col gap-4 lg:flex-row lg:justify-between ${headerClassName || 'lg:items-center'}`}>
            <div className="max-w-3xl space-y-4">
              {eyebrow && (
                <p
                  className={`inline-flex rounded-full border px-3 py-1 text-xs font-semibold uppercase tracking-[0.2em] ${currentTone.eyebrow}`}
                >
                  {eyebrow}
                </p>
              )}
              {title && (
                <TitleTag
                  className={`text-3xl font-semibold tracking-tight text-brand-dark sm:text-4xl ${titleClassName}`}
                >
                  {title}
                </TitleTag>
              )}
              {description && (
                <div className="text-sm leading-relaxed text-brand-muted">
                  {description}
                </div>
              )}
            </div>
            {actions && <div className="flex flex-wrap items-center gap-3">{actions}</div>}
          </div>
        )}
        {children}
      </div>
    </section>
  );
};

export default GradientSection;
