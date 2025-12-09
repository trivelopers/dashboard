import React, { useRef } from 'react';
import { PhotoIcon } from '@heroicons/react/24/outline';

interface ImageUploadButtonProps {
  onSelect: (file: File) => void;
  disabled?: boolean;
  isUploading?: boolean;
}

const ALLOWED_TYPES = ['image/jpeg', 'image/png', 'image/gif', 'image/webp'];
const MAX_SIZE = 5 * 1024 * 1024; // 5MB

const ImageUploadButton: React.FC<ImageUploadButtonProps> = ({
  onSelect,
  disabled = false,
  isUploading = false,
}) => {
  const inputRef = useRef<HTMLInputElement>(null);

  const handleClick = () => {
    if (!disabled && !isUploading) {
      inputRef.current?.click();
    }
  };

  const handleChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    // Validar tipo
    if (!ALLOWED_TYPES.includes(file.type)) {
      alert('Tipo de archivo no permitido. Use: JPG, PNG, GIF o WebP');
      return;
    }

    // Validar tamaño
    if (file.size > MAX_SIZE) {
      alert('El archivo excede el tamaño máximo permitido (5MB)');
      return;
    }

    onSelect(file);
    
    // Limpiar input para permitir seleccionar el mismo archivo
    if (inputRef.current) {
      inputRef.current.value = '';
    }
  };

  return (
    <>
      <input
        ref={inputRef}
        type="file"
        accept={ALLOWED_TYPES.join(',')}
        onChange={handleChange}
        className="hidden"
      />
      <button
        type="button"
        onClick={handleClick}
        disabled={disabled || isUploading}
        className={`flex h-10 w-10 items-center justify-center rounded-lg border transition-colors ${
          disabled || isUploading
            ? 'cursor-not-allowed border-gray-200 bg-gray-50 text-gray-300'
            : 'border-brand-border/60 bg-white text-brand-muted hover:border-brand-primary/60 hover:text-brand-primary'
        }`}
        title="Adjuntar imagen"
      >
        {isUploading ? (
          <div className="h-5 w-5 animate-spin rounded-full border-2 border-brand-primary border-t-transparent" />
        ) : (
          <PhotoIcon className="h-5 w-5" />
        )}
      </button>
    </>
  );
};

export default ImageUploadButton;
