'use client';

import React from 'react';

interface ProvidersProps {
  children: React.ReactNode;
}

/**
 * Providers component
 * 
 * A central component for wrapping the application with various context providers.
 * Currently serves as a placeholder for future context providers.
 */
export default function Providers({ children }: ProvidersProps) {
  return <>{children}</>;
}

