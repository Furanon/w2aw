import React from 'react';

const LoadingSpinner: React.FC = () => {
  return (
    <div className="animate-spin rounded-full h-8 w-8 border-4 border-blue-500 border-t-transparent" role="status">
      <span className="sr-only">Loading...</span>
    </div>
  );
};

export default LoadingSpinner;

