'use client';

import React from 'react';
import {RiSparklingLine} from 'react-icons/ri';
import {useChangelogContext} from './ChangelogProvider';

interface WhatsNewButtonProps {
  className?: string;
  showBadge?: boolean;
}

export default function WhatsNewButton({
  className = '',
  showBadge = false
}: WhatsNewButtonProps) {
  const { showChangelogManually, currentVersion } = useChangelogContext();

  return (
    <button
      onClick={() => showChangelogManually()}
      className={`relative inline-flex items-center gap-2 px-3 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-md hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 ${className}`}
      title={`Lihat daftar perubahan untuk ${currentVersion}`}
    >
      <RiSparklingLine className="w-4 h-4" />
      <span>Apa yang baru</span>
      {showBadge && (
        <span className="absolute -top-1 -right-1 w-2 h-2 bg-blue-600 rounded-full" />
      )}
    </button>
  );
}
