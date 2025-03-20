import React from 'react';
import { useVisualization } from '@context/VisualizationContext';
import GeoNetworkGlobe from './GeoNetworkGlobe';
import MapView from './MapView';

const VisualizationDemo: React.FC = () => {
  const { state, dispatch } = useVisualization();
  const { view, loading, error } = state;

  const toggleView = (newView: 'globe' | 'map') => {
    dispatch({
      type: 'SET_VIEW',
      payload: newView
    });
  };

  return (
    <div className="visualization-demo p-4" data-testid="visualization-demo">
      <div className="view-controls mb-6 flex justify-center">
        <div className="inline-flex rounded-md shadow-sm">
          <button
            className={`px-4 py-2 text-sm font-medium rounded-l-lg ${
              view === 'globe'
                ? 'bg-blue-600 text-white'
                : 'bg-white text-gray-700 hover:bg-gray-50 dark:bg-gray-700 dark:text-white dark:hover:bg-gray-600'
            } border border-gray-200 dark:border-gray-600`}
            onClick={() => view !== 'globe' && toggleView('globe')}
          >
            Globe View
          </button>
          <button
            className={`px-4 py-2 text-sm font-medium rounded-r-lg ${
              view === 'map'
                ? 'bg-blue-600 text-white'
                : 'bg-white text-gray-700 hover:bg-gray-50 dark:bg-gray-700 dark:text-white dark:hover:bg-gray-600'
            } border border-gray-200 dark:border-gray-600 border-l-0`}
            onClick={() => view !== 'map' && toggleView('map')}
          >
            Map View
          </button>
        </div>
      </div>

      <div className="visualization-container relative bg-gray-50 dark:bg-gray-800 rounded-lg shadow-md overflow-hidden">
        {loading && (
          <div
            className="absolute inset-0 flex items-center justify-center bg-gray-900/50 z-10"
            data-testid="loading-spinner"
            role="status"
          >
            <div className="animate-spin rounded-full h-12 w-12 border-4 border-white border-t-transparent"></div>
            <span className="ml-3 text-white">Loading visualization data...</span>
          </div>
        )}

        {error && (
          <div
            className="absolute inset-0 flex items-center justify-center bg-red-500/10 z-10"
            data-testid="error-message"
            role="alert"
          >
            <div className="bg-red-50 dark:bg-red-900/50 p-4 rounded-lg shadow-lg border-2 border-red-600">
              <p className="text-red-800 dark:text-red-200">{error}</p>
            </div>
          </div>
        )}

        {view === 'globe' ? <GeoNetworkGlobe /> : <MapView />}
      </div>
    </div>
  );
};

export default VisualizationDemo;
