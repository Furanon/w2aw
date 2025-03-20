import { ReactNode } from "react";

interface ActivitiesLayoutProps {
  header?: ReactNode;
  sidebar?: ReactNode;
  children: ReactNode;
}

export function ActivitiesLayout({
  header,
  sidebar,
  children,
}: ActivitiesLayoutProps) {
  return (
    <div className="w-full h-full flex flex-col">
      {header && (
        <div className="w-full border-b border-gray-200 dark:border-gray-800 py-4">
          {header}
        </div>
      )}
      
      <div className="flex flex-col md:flex-row flex-1 w-full">
        {sidebar && (
          <div className="w-full md:w-80 border-r border-gray-200 dark:border-gray-800 p-4">
            {sidebar}
          </div>
        )}
        
        <div className="flex-1 p-4 md:p-6">
          {children}
        </div>
      </div>
    </div>
  );
}
