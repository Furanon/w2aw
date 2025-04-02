'use client';

import React from 'react';
import { SessionProvider } from 'next-auth/react';
interface ProvidersProps {
  children: React.ReactNode;
}

/**
 * Providers component
 * 
 * A central component for wrapping the application with various context providers.
 * Includes SessionProvider from next-auth for authentication state management.
 */
export default function Providers({ children }: ProvidersProps) {
  return (
    <SessionProvider>
      {children}
    </SessionProvider>
  );
}

