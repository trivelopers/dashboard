import React from 'react';

interface GradientSectionProps {
  eyebrow?: string;
  title?: string;
  description?: string;
  actions?: React.ReactNode;
  children?: React.ReactNode;
  className?: string;
  contentClassName?: string;
  titleClassName?: string;
  as?: keyof JSX.IntrinsicElements;
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
  as = 'h2'
}) => {
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
      className={`relative overflow-hidden rounded-3xl border border-brand-primary/20 bg-gradient-to-br from-brand-background via-brand-surface to-white p-8 shadow-lg ${className}`}
    >
      <div
        aria-hidden="true"
        className="pointer-events-none absolute -top-20 -right-16 hidden h-64 w-64 rounded-full bg-brand-primary/15 blur-3xl md:block"
      />
      <div className={contentClasses.join(' ')}>
        {hasHeaderContent && (
          <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
            <div className="max-w-3xl space-y-4">
              {eyebrow && (
                <p className="inline-flex rounded-full border border-brand-primary/30 bg-brand-primary/10 px-3 py-1 text-xs font-semibold uppercase tracking-[0.2em] text-brand-primary/80">
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
                <p className="text-sm leading-relaxed text-brand-muted">
                  {description}
                </p>
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
