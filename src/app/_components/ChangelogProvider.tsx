'use client';

import React from 'react';
import { useChangelog } from '../_hooks/useChangelog';
import ChangelogModal from './ChangelogModal';

export default function ChangelogProvider({ children }: { children: React.ReactNode }) {
  const {
    shouldShowChangelog,
    changelogContent,
    metadata,
    markAsRead,
    dismissChangelog,
  } = useChangelog();

  return (
    <>
      {children}
      <ChangelogModal
        isOpen={shouldShowChangelog}
        content={changelogContent}
        metadata={metadata}
        onClose={markAsRead}
        onDismiss={dismissChangelog}
      />
    </>
  );
}