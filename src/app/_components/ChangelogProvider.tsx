'use client';

import React, {createContext, useContext} from 'react';
import {useChangelog} from '@/app/_hooks/useChangelog';
import ChangelogModal from "@/app/_components/ChangelogModal";

// Create a context for the changelog functionality
const ChangelogContext = createContext<ReturnType<typeof useChangelog> | null>(null);

// Hook to use the changelog context
export const useChangelogContext = () => {
  const context = useContext(ChangelogContext);
  if (!context) {
    throw new Error('useChangelogContext must be used within a ChangelogProvider');
  }
  return context;
};

export default function ChangelogProvider({ children }: { children: React.ReactNode }) {
  const changelogHook = useChangelog();

  return (
    <ChangelogContext.Provider value={changelogHook}>
      {children}
      <ChangelogModal
        isOpen={changelogHook.shouldShowChangelog}
        changelogItems={changelogHook.changelogItems}
        onClose={changelogHook.markAsRead}
        onDismiss={changelogHook.dismissChangelog}
      />
    </ChangelogContext.Provider>
  );
}
