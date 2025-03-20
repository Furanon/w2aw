import React, { createContext, useContext, useState } from 'react';

interface PerformanceSettings {
  fetchRadius: number;
  maxMarkers: number;
  updateInterval: number;
}

interface PerformanceContextType {
  settings: PerformanceSettings;
  updateSettings: (newSettings: Partial<PerformanceSettings>) => void;
}

const defaultSettings: PerformanceSettings = {
  fetchRadius: 10000,  // Default radius in meters
  maxMarkers: 100,     // Default max markers
  updateInterval: 5000  // Default update interval in ms
};

const PerformanceContext = createContext<PerformanceContextType | undefined>(undefined);

export const PerformanceProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [settings, setSettings] = useState<PerformanceSettings>(defaultSettings);

  const updateSettings = (newSettings: Partial<PerformanceSettings>) => {
    setSettings(prev => ({ ...prev, ...newSettings }));
  };

  return (
    <PerformanceContext.Provider value={{ settings, updateSettings }}>
      {children}
    </PerformanceContext.Provider>
  );
};

export const usePerformanceSettings = () => {
  const context = useContext(PerformanceContext);
  if (context === undefined) {
    throw new Error('usePerformanceSettings must be used within a PerformanceProvider');
  }
  return context.settings;
};

