'use client';

import { useState, useEffect } from 'react';

interface PageState {
  error: string | null;
  isLoading: boolean;
}

export default function GlobePage() {
  const [state, setState] = useState<PageState>({
    isLoading: false,
    error: null,
  });

  useEffect(() => {
    // Page initialization logic can go here
  }, []);

  if (state.isLoading) {
    return (
      <div className="flex flex-col items-center justify-center h-[70vh] w-full">
        <div className="w-24 h-24 rounded-full border-t-4 border-b-4 border-blue-500 animate-spin"></div>
        <p className="mt-4 text-lg font-medium text-gray-700">Loading...</p>
      </div>
    );
  }

  return (
    <div className="relative w-full min-h-screen bg-gray-100 dark:bg-gray-900">
      <div className="container mx-auto px-4 py-8">
        <h1 className="text-3xl font-bold mb-6 text-center">Globe Page</h1>
        
        <div className="w-full bg-white dark:bg-gray-800 rounded-lg shadow-md p-6">
          <p className="text-center text-lg">Welcome to the Globe Page</p>
        </div>
      </div>
    </div>
  );
}

