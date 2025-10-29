import React, { useMemo } from 'react';

export interface ExpandableTextareaProps extends React.TextareaHTMLAttributes<HTMLTextAreaElement> {
  minRows?: number;
  maxRows?: number;
}

const ExpandableTextarea: React.FC<ExpandableTextareaProps> = ({
  minRows = 1,
  maxRows = 10,
  value = '',
  className = '',
  ...rest
}) => {
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

  const displayRows = Math.min(maxRows, Math.max(minRows, estimatedLines));
  const shouldAllowScroll = estimatedLines > maxRows;

  return (
    <textarea
      {...rest}
      value={textValue}
      rows={displayRows}
      className={`resize-none ${shouldAllowScroll ? 'overflow-y-auto' : 'overflow-hidden'} ${className}`}
    />
  );
};

export default ExpandableTextarea;
