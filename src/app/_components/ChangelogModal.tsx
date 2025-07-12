'use client';

import React, { useEffect, useState } from 'react';
import { APP_VERSION } from '@/app/_lib/version';
import { getLastSeenVersion, setLastSeenVersion } from '@/app/_lib/changelog';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';

interface ChangelogModalProps {
  className?: string;
}

function Modal({ open, onClose, children }: { open: boolean; onClose: () => void; children: React.ReactNode }) {
  if (!open) return null;
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
      <div className="max-h-full w-full max-w-2xl overflow-y-auto rounded-lg bg-white p-6 shadow-lg">
        <button
          className="mb-4 rounded bg-gray-200 px-3 py-1 text-sm text-gray-700 hover:bg-gray-300"
          onClick={onClose}
        >
          Close
        </button>
        {children}
      </div>
    </div>
  );
}

export default function ChangelogModal({ className }: ChangelogModalProps) {
  const [open, setOpen] = useState(false);
  const [markdown, setMarkdown] = useState<string | null>(null);

  useEffect(() => {
    const lastSeen = getLastSeenVersion();
    if (lastSeen !== APP_VERSION) {
      // Fetch markdown lazily
      fetch(`/changelog/${APP_VERSION}.md`)
        .then((res) => {
          if (!res.ok) throw new Error('Failed to fetch changelog');
          return res.text();
        })
        .then((text) => {
          setMarkdown(text);
          setOpen(true);
        })
        .catch(() => {
          // If fetch fails, do nothing – treat as no changelog available
        });
    }
  }, []);

  const handleClose = () => {
    setLastSeenVersion(APP_VERSION);
    setOpen(false);
  };

  return (
    <Modal open={open} onClose={handleClose}>
      {markdown ? (
        <ReactMarkdown remarkPlugins={[remarkGfm]} className={className}>
          {markdown}
        </ReactMarkdown>
      ) : null}
    </Modal>
  );
}