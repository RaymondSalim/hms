'use client';

import React, { useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { RiCloseLine, RiCheckLine, RiEyeOffLine } from 'react-icons/ri';

interface ChangelogModalProps {
  isOpen: boolean;
  content: string;
  metadata: {
    version: string;
    date: string;
    importance: 'major' | 'minor' | 'patch';
  } | null;
  onClose: () => void;
  onDismiss: () => void;
}

export default function ChangelogModal({
  isOpen,
  content,
  metadata,
  onClose,
  onDismiss,
}: ChangelogModalProps) {
  // Close on escape key
  useEffect(() => {
    const handleEscape = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        onClose();
      }
    };

    if (isOpen) {
      document.addEventListener('keydown', handleEscape);
      document.body.style.overflow = 'hidden';
    }

    return () => {
      document.removeEventListener('keydown', handleEscape);
      document.body.style.overflow = 'unset';
    };
  }, [isOpen, onClose]);

  // Parse markdown to HTML (basic implementation - consider using a library like react-markdown for production)
  const parseMarkdown = (markdown: string) => {
    let html = markdown;

    // Headers
    html = html.replace(/^### (.*$)/gim, '<h3 class="text-lg font-semibold mt-4 mb-2">$1</h3>');
    html = html.replace(/^## (.*$)/gim, '<h2 class="text-xl font-bold mt-6 mb-3">$1</h2>');
    html = html.replace(/^# (.*$)/gim, '<h1 class="text-2xl font-bold mb-4">$1</h1>');

    // Bold
    html = html.replace(/\*\*(.+?)\*\*/g, '<strong class="font-semibold">$1</strong>');

    // Lists
    html = html.replace(/^\* (.+)/gim, '<li class="ml-4 mb-1">• $1</li>');
    html = html.replace(/^- (.+)/gim, '<li class="ml-4 mb-1">• $1</li>');

    // Images
    html = html.replace(/!\[([^\]]*)\]\(([^)]+)\)/g, '<img src="$2" alt="$1" class="rounded-lg shadow-md my-4 max-w-full" />');

    // Links
    html = html.replace(/\[([^\]]+)\]\(([^)]+)\)/g, '<a href="$2" class="text-blue-600 hover:underline" target="_blank" rel="noopener noreferrer">$1</a>');

    // Line breaks
    html = html.replace(/\n\n/g, '</p><p class="mb-4">');
    html = `<p class="mb-4">${html}</p>`;

    // Horizontal rules
    html = html.replace(/^---$/gim, '<hr class="my-6 border-gray-300" />');

    return html;
  };

  return (
    <AnimatePresence>
      {isOpen && (
        <>
          {/* Backdrop */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={onClose}
            className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50"
          />

          {/* Modal */}
          <motion.div
            initial={{ opacity: 0, scale: 0.95, y: 20 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.95, y: 20 }}
            transition={{ type: 'spring', duration: 0.5 }}
            className="fixed inset-x-4 top-[10%] md:inset-x-auto md:left-1/2 md:-translate-x-1/2 md:w-full md:max-w-2xl bg-white rounded-2xl shadow-2xl z-50 max-h-[80vh] overflow-hidden flex flex-col"
          >
            {/* Header */}
            <div className="px-6 py-4 border-b border-gray-200 flex items-center justify-between">
              <div>
                <h2 className="text-2xl font-bold text-gray-900">
                  What's New {metadata?.version && `in ${metadata.version}`}
                </h2>
                {metadata?.date && (
                  <p className="text-sm text-gray-500 mt-1">
                    Released on {new Date(metadata.date).toLocaleDateString()}
                  </p>
                )}
              </div>
              <button
                onClick={onClose}
                className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
                aria-label="Close changelog"
              >
                <RiCloseLine className="w-6 h-6 text-gray-500" />
              </button>
            </div>

            {/* Content */}
            <div 
              className="px-6 py-4 overflow-y-auto flex-1 prose prose-sm max-w-none"
              dangerouslySetInnerHTML={{ __html: parseMarkdown(content) }}
            />

            {/* Footer */}
            <div className="px-6 py-4 border-t border-gray-200 flex items-center justify-between bg-gray-50">
              <button
                onClick={onDismiss}
                className="text-sm text-gray-500 hover:text-gray-700 flex items-center gap-2"
              >
                <RiEyeOffLine className="w-4 h-4" />
                Don't show again for this version
              </button>
              <button
                onClick={onClose}
                className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors flex items-center gap-2"
              >
                <RiCheckLine className="w-5 h-5" />
                Got it!
              </button>
            </div>
          </motion.div>
        </>
      )}
    </AnimatePresence>
  );
}