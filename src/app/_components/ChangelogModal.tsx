'use client';

import React, {useEffect, useState} from 'react';
import {AnimatePresence, motion} from 'framer-motion';
import {RiArrowDownSLine, RiCheckLine, RiCloseLine} from 'react-icons/ri';
import ReactMarkdown from 'react-markdown';
import {ChangelogItem} from '../_hooks/useChangelog';

interface ChangelogModalProps {
  isOpen: boolean;
  changelogItems: ChangelogItem[];
  onClose: () => void;
  onDismiss: () => void;
}

interface AccordionItemProps {
  item: ChangelogItem;
  isOpen: boolean;
  onToggle: () => void;
  isFirst: boolean;
}

function AccordionItem({ item, isOpen, onToggle, isFirst }: AccordionItemProps) {
  // Custom components for react-markdown styling
  const markdownComponents = {
    h1: ({ children, ...props }: any) => (
      <h1 className="text-xl font-bold mb-3 text-gray-900" {...props}>{children}</h1>
    ),
    h2: ({ children, ...props }: any) => (
      <h2 className="text-lg font-bold mt-4 mb-2 text-gray-900" {...props}>{children}</h2>
    ),
    h3: ({ children, ...props }: any) => (
      <h3 className="text-base font-semibold mt-3 mb-2 text-gray-900" {...props}>{children}</h3>
    ),
    p: ({ children, ...props }: any) => (
      <p className="mb-3 text-gray-900" {...props}>{children}</p>
    ),
    strong: ({ children, ...props }: any) => (
      <strong className="font-semibold text-gray-900" {...props}>{children}</strong>
    ),
    ul: ({ children, ...props }: any) => (
      <ul className="list-disc list-inside mb-3 space-y-1" {...props}>{children}</ul>
    ),
    ol: ({ children, ...props }: any) => (
      <ol className="list-decimal list-inside mb-3 space-y-1" {...props}>{children}</ol>
    ),
    li: ({ children, ...props }: any) => (
      <li className="text-gray-900" {...props}>{children}</li>
    ),
    a: ({ href, children, ...props }: any) => (
      <a
        href={href}
        className="text-blue-600 hover:underline"
        target="_blank"
        rel="noopener noreferrer"
        {...props}
      >
        {children}
      </a>
    ),
    img: ({ src, alt, ...props }: any) => (
      <img
        src={src}
        alt={alt}
        className="rounded-lg shadow-md my-3 max-w-full"
        {...props}
      />
    ),
    hr: (props: any) => <hr className="my-4 border-gray-300" {...props} />,
  };

  const getImportanceColor = (importance: string) => {
    switch (importance) {
      case 'major':
        return 'bg-red-100 text-red-800 border-red-200';
      case 'minor':
        return 'bg-blue-100 text-blue-800 border-blue-200';
      case 'patch':
        return 'bg-green-100 text-green-800 border-green-200';
      default:
        return 'bg-gray-100 text-gray-800 border-gray-200';
    }
  };

  const getImportanceText = (importance: string) => {
    return importance;
  };

  return (
    <div className="border border-gray-200 rounded-lg overflow-hidden">
      <button
        onClick={onToggle}
        className="w-full px-4 py-3 bg-gray-50 hover:bg-gray-100 transition-colors flex items-center justify-between text-left"
      >
        <div className="flex items-center gap-3">
          <div className="flex flex-col">
            <span className="font-semibold text-gray-900">Versi {item.metadata.version}</span>
            <span className="text-sm text-gray-500">
              {new Date(item.metadata.date).toLocaleDateString('id-ID', {
                year: 'numeric',
                month: 'long',
                day: 'numeric'
              })}
            </span>
          </div>
          <span className={`px-2 py-1 text-xs font-medium rounded-full border ${getImportanceColor(item.metadata.importance)}`}>
            {getImportanceText(item.metadata.importance)}
          </span>
        </div>
        <motion.div
          animate={{ rotate: isOpen ? 180 : 0 }}
          transition={{ duration: 0.2 }}
        >
          <RiArrowDownSLine className="w-5 h-5 text-gray-500" />
        </motion.div>
      </button>

      <AnimatePresence>
        {isOpen && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: 'auto', opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={{ duration: 0.3, ease: 'easeInOut' }}
            className="overflow-hidden"
          >
            <div className="px-4 py-4 bg-white border-t border-gray-200">
              <div className="prose prose-sm max-w-none">
                <ReactMarkdown components={markdownComponents}>
                  {item.content}
                </ReactMarkdown>
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

export default function ChangelogModal({
  isOpen,
  changelogItems,
  onClose,
  onDismiss,
}: ChangelogModalProps) {
  const [openAccordions, setOpenAccordions] = useState<Set<string>>(new Set());

  // Set first accordion as open by default when modal opens
  useEffect(() => {
    if (isOpen && changelogItems.length > 0) {
      setOpenAccordions(new Set([changelogItems[0].version]));
    } else {
      setOpenAccordions(new Set());
    }
  }, [isOpen, changelogItems]);

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

  const toggleAccordion = (version: string) => {
    const newOpenAccordions = new Set(openAccordions);
    if (newOpenAccordions.has(version)) {
      newOpenAccordions.delete(version);
    } else {
      newOpenAccordions.add(version);
    }
    setOpenAccordions(newOpenAccordions);
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
            className="fixed inset-x-4 top-[5%] md:inset-x-auto md:left-1/2 md:!-translate-x-1/2 md:w-full md:max-w-3xl bg-white rounded-2xl shadow-2xl z-50 max-h-[90vh] overflow-hidden flex flex-col"
          >
            {/* Header */}
            <div className="px-6 py-4 border-b border-gray-200 flex items-center justify-between">
              <div>
                <h2 className="text-2xl font-bold text-gray-900">
                  Riwayat Perubahan
                </h2>
                <p className="text-sm text-gray-500 mt-1">
                  {changelogItems.length} versi terbaru
                </p>
              </div>
              <button
                onClick={onClose}
                className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
                aria-label="Tutup changelog"
              >
                <RiCloseLine className="w-6 h-6 text-gray-500" />
              </button>
            </div>

            {/* Content */}
            <div className="px-6 py-4 overflow-y-auto flex-1 space-y-3">
              {changelogItems.map((item, index) => (
                <AccordionItem
                  key={item.version}
                  item={item}
                  isOpen={openAccordions.has(item.version)}
                  onToggle={() => toggleAccordion(item.version)}
                  isFirst={index === 0}
                />
              ))}
            </div>

            {/* Footer */}
            <div className="px-6 py-4 border-t border-gray-200 flex items-center justify-end bg-gray-50">
              <button
                onClick={onClose}
                className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors flex items-center gap-2"
              >
                <RiCheckLine className="w-5 h-5" />
                Oke!
              </button>
            </div>
          </motion.div>
        </>
      )}
    </AnimatePresence>
  );
}
