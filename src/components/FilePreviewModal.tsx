import React from 'react';
import { useLockBodyScroll } from '../hooks/useLockBodyScroll';
import { motion, AnimatePresence } from 'motion/react';
import { createPortal } from 'react-dom';
import { X, ExternalLink, Download } from 'lucide-react';

interface Props {
  isOpen: boolean;
  onClose: () => void;
  fileUrl: string | null;
  fileName?: string;
}

export function FilePreviewModal({ isOpen, onClose, fileUrl, fileName = 'Documento Adjunto' }: Props) {
  useLockBodyScroll(Boolean(isOpen && fileUrl));
  if (!isOpen || !fileUrl) return null;

  const isImage = fileUrl.startsWith('data:image/') || fileUrl.match(/\.(jpeg|jpg|gif|png)$/i);
  const isPdf = fileUrl.startsWith('data:application/pdf') || fileUrl.match(/\.pdf$/i);

  const modalContent = (
    <AnimatePresence>
      <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 sm:p-6" style={{ zIndex: 9999 }}>
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          className="absolute inset-0 bg-black/80 backdrop-blur-sm"
          onClick={onClose}
        />
        
        <motion.div
          initial={{ opacity: 0, scale: 0.95, y: 10 }}
          animate={{ opacity: 1, scale: 1, y: 0 }}
          exit={{ opacity: 0, scale: 0.95, y: 10 }}
          className="relative w-full max-w-5xl max-h-[90vh] bg-zinc-900/90 rounded-2xl shadow-2xl flex flex-col overflow-hidden border border-zinc-700"
        >
          {/* Header */}
          <div className="flex items-center justify-between p-4 border-b border-zinc-800 bg-zinc-950/50">
            <h3 className="text-sm font-bold text-white truncate pr-4">
              {fileName}
            </h3>
            <div className="flex items-center gap-2 shrink-0">
              <a 
                href={fileUrl} 
                download={fileName}
                className="p-2 bg-zinc-800 hover:bg-zinc-700 text-zinc-300 hover:text-white rounded-full transition-colors"
                title="Descargar"
              >
                <Download className="w-4 h-4" />
              </a>
              <a 
                href={fileUrl} 
                target="_blank" 
                rel="noopener noreferrer"
                className="p-2 bg-zinc-800 hover:bg-zinc-700 text-zinc-300 hover:text-white rounded-full transition-colors"
                title="Abrir en nueva pestaña"
              >
                <ExternalLink className="w-4 h-4" />
              </a>
              <div className="w-px h-4 bg-zinc-700 mx-1" />
              <button 
                onClick={onClose}
                className="p-2 bg-red-500/10 hover:bg-red-500/20 text-red-400 hover:text-red-300 rounded-full transition-colors"
              >
                <X className="w-4 h-4" />
              </button>
            </div>
          </div>

          {/* Content */}
          <div className="flex-1 overflow-auto bg-black/40 flex items-center justify-center p-4 min-h-[50vh]">
            {isImage ? (
              <img 
                src={fileUrl} 
                alt={fileName} 
                className="max-w-full max-h-[75vh] object-contain rounded-lg"
              />
            ) : isPdf ? (
              <iframe 
                src={fileUrl} 
                className="w-full h-[75vh] rounded-lg bg-white"
                title={fileName}
              />
            ) : (
              <div className="text-center text-zinc-400 p-8">
                <p className="mb-4">La previsualización no está disponible para este tipo de archivo.</p>
                <a 
                  href={fileUrl} 
                  target="_blank" 
                  rel="noopener noreferrer"
                  className="inline-flex items-center gap-2 px-4 py-2 bg-primary text-white rounded-full text-sm font-bold hover:opacity-90"
                >
                  <ExternalLink className="w-4 h-4" />
                  Abrir Archivo
                </a>
              </div>
            )}
          </div>
        </motion.div>
      </div>
    </AnimatePresence>
  );

  return createPortal(modalContent, document.body);
}
