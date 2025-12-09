import React, { useState } from 'react';

interface ChatImageMessageProps {
  url: string;
  fileName?: string;
  text?: string;
}

const ChatImageMessage: React.FC<ChatImageMessageProps> = ({ url, fileName, text }) => {
  const [isLoading, setIsLoading] = useState(true);
  const [hasError, setHasError] = useState(false);
  const [isModalOpen, setIsModalOpen] = useState(false);

  const handleImageLoad = () => {
    setIsLoading(false);
  };

  const handleImageError = () => {
    setIsLoading(false);
    setHasError(true);
  };

  return (
    <>
      <div className="max-w-xs">
        {isLoading && (
          <div className="flex h-32 w-32 items-center justify-center rounded-lg bg-gray-100">
            <div className="h-6 w-6 animate-spin rounded-full border-2 border-brand-primary border-t-transparent" />
          </div>
        )}
        
        {hasError ? (
          <div className="flex h-32 w-32 items-center justify-center rounded-lg bg-gray-100 text-gray-400">
            <span className="text-sm">Error al cargar</span>
          </div>
        ) : (
          <img
            src={url}
            alt={fileName || 'Imagen'}
            className={`cursor-pointer rounded-lg transition-opacity hover:opacity-90 ${
              isLoading ? 'hidden' : 'block'
            }`}
            style={{ maxWidth: '250px', maxHeight: '250px' }}
            onClick={() => setIsModalOpen(true)}
            onLoad={handleImageLoad}
            onError={handleImageError}
          />
        )}
        
        {text && (
          <p className="mt-2 text-sm whitespace-pre-wrap">{text}</p>
        )}
      </div>

      {/* Modal para imagen en tamaño completo */}
      {isModalOpen && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 p-4"
          onClick={() => setIsModalOpen(false)}
        >
          <div className="relative max-h-[90vh] max-w-[90vw]">
            <button
              className="absolute -right-2 -top-2 flex h-8 w-8 items-center justify-center rounded-full bg-white text-gray-800 shadow-lg hover:bg-gray-100"
              onClick={() => setIsModalOpen(false)}
            >
              ✕
            </button>
            <img
              src={url}
              alt={fileName || 'Imagen'}
              className="max-h-[85vh] max-w-[85vw] rounded-lg object-contain"
            />
          </div>
        </div>
      )}
    </>
  );
};

export default ChatImageMessage;
