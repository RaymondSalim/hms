'use client';

import React from 'react';
import { SessionProvider } from 'next-auth/react';
import ChangelogProvider from './ChangelogProvider';

export default function ClientProviders({ 
  children,
  session 
}: { 
  children: React.ReactNode;
  session: any;
}) {
  return (
    <SessionProvider session={session}>
      <ChangelogProvider>
        {children}
      </ChangelogProvider>
    </SessionProvider>
  );
}