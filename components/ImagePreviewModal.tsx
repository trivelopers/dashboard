import React from 'react';
import { XMarkIcon } from '@heroicons/react/24/outline';

interface ImagePreviewModalProps {
  file: File;
  previewUrl: string;
  onConfirm: () => void;
  onCancel: () => void;
  isUploading: boolean;
}

const ImagePreviewModal: React.FC<ImagePreviewModalProps> = ({
  file,
  previewUrl,
  onConfirm,
  onCancel,
  isUploading,
}) => {
  const formatFileSize = (bytes: number) => {
    if (bytes < 1024) return `${bytes} B`;
    if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
    return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4">
      <div className="w-full max-w-md rounded-2xl bg-white p-6 shadow-xl">
        <div className="mb-4 flex items-center justify-between">
          <h3 className="text-lg font-semibold text-brand-dark">
            Vista previa de imagen
          </h3>
          <button
            onClick={onCancel}
            disabled={isUploading}
            className="text-gray-400 hover:text-gray-600 disabled:opacity-50"
          >
            <XMarkIcon className="h-6 w-6" />
          </button>
        </div>

        <div className="mb-4">
          <img
            src={previewUrl}
            alt="Preview"
            className="max-h-64 w-full rounded-lg object-contain"
          />
        </div>

        <div className="mb-4 text-sm text-brand-muted">
          <p><strong>Nombre:</strong> {file.name}</p>
          <p><strong>Tamaño:</strong> {formatFileSize(file.size)}</p>
        </div>

        <div className="flex gap-3">
          <button
            onClick={onCancel}
            disabled={isUploading}
            className="flex-1 rounded-lg border border-brand-border/60 px-4 py-2 font-medium text-brand-dark transition hover:bg-gray-50 disabled:opacity-50"
          >
            Cancelar
          </button>
          <button
            onClick={onConfirm}
            disabled={isUploading}
            className="flex flex-1 items-center justify-center gap-2 rounded-lg bg-brand-primary px-4 py-2 font-medium text-white transition hover:bg-brand-primary/90 disabled:opacity-50"
          >
            {isUploading ? (
              <>
                <div className="h-4 w-4 animate-spin rounded-full border-2 border-white border-t-transparent" />
                Enviando...
              </>
            ) : (
              'Enviar imagen'
            )}
          </button>
        </div>
      </div>
    </div>
  );
};

export default ImagePreviewModal;
