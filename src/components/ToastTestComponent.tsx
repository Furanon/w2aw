'use client';

import { useState } from 'react';
import { toast } from 'sonner';

/**
 * Toast Test Component
 * 
 * A component for testing different toast notification types and configurations
 * using the Sonner toast library.
 */
export default function ToastTestComponent() {
  const [position, setPosition] = useState<'top-right' | 'top-center' | 'top-left' | 'bottom-right' | 'bottom-center' | 'bottom-left'>('top-right');
  const [duration, setDuration] = useState(4000);

  // Function to change toast position globally
  const changePosition = (newPosition: typeof position) => {
    setPosition(newPosition);
    // Apply the position change to all future toasts
    toast.position(newPosition);
  };

  return (
    <div className="p-6 rounded-lg bg-white dark:bg-gray-800">
      <h2 className="text-2xl font-bold mb-6">Toast Notification Testing</h2>
      
      <div className="mb-6">
        <h3 className="text-lg font-semibold mb-3">Global Toast Configuration</h3>
        <div className="flex flex-wrap gap-4 mb-4">
          <div>
            <label className="block text-sm font-medium mb-1">Position</label>
            <select 
              value={position} 
              onChange={(e) => changePosition(e.target.value as typeof position)}
              className="px-3 py-2 bg-white dark:bg-gray-700 border border-gray-300 dark:border-gray-600 rounded-md shadow-sm"
            >
              <option value="top-right">Top Right</option>
              <option value="top-center">Top Center</option>
              <option value="top-left">Top Left</option>
              <option value="bottom-right">Bottom Right</option>
              <option value="bottom-center">Bottom Center</option>
              <option value="bottom-left">Bottom Left</option>
            </select>
          </div>
          
          <div>
            <label className="block text-sm font-medium mb-1">Duration (ms)</label>
            <input 
              type="number" 
              value={duration} 
              onChange={(e) => setDuration(Number(e.target.value))}
              className="px-3 py-2 bg-white dark:bg-gray-700 border border-gray-300 dark:border-gray-600 rounded-md shadow-sm"
              min={1000}
              max={10000}
              step={500}
            />
          </div>
        </div>
      </div>
      
      <div className="mb-6">
        <h3 className="text-lg font-semibold mb-3">Basic Toast Types</h3>
        <div className="grid grid-cols-2 gap-3 md:grid-cols-3 lg:grid-cols-4">
          <button
            onClick={() => toast('Default Toast', { 
              description: 'This is a default toast notification',
              duration
            })}
            className="px-4 py-2 bg-gray-200 dark:bg-gray-700 hover:bg-gray-300 dark:hover:bg-gray-600 rounded-md transition-colors"
          >
            Default
          </button>
          
          <button
            onClick={() => toast.success('Success Toast', { 
              description: 'The operation completed successfully',
              duration
            })}
            className="px-4 py-2 bg-green-500 hover:bg-green-600 text-white rounded-md transition-colors"
          >
            Success
          </button>
          
          <button
            onClick={() => toast.error('Error Toast', { 
              description: 'There was an error completing the operation',
              duration
            })}
            className="px-4 py-2 bg-red-500 hover:bg-red-600 text-white rounded-md transition-colors"
          >
            Error
          </button>
          
          <button
            onClick={() => toast.info('Info Toast', { 
              description: 'Here is some information you might find useful',
              duration
            })}
            className="px-4 py-2 bg-blue-500 hover:bg-blue-600 text-white rounded-md transition-colors"
          >
            Info
          </button>
          
          <button
            onClick={() => toast.warning('Warning Toast', { 
              description: 'This action might cause issues',
              duration
            })}
            className="px-4 py-2 bg-yellow-500 hover:bg-yellow-600 text-white rounded-md transition-colors"
          >
            Warning
          </button>
          
          <button
            onClick={() => {
              const loadingToast = toast.loading('Processing...', { 
                description: 'Please wait while we complete your request',
                duration: 10000 // Longer duration for loading
              });
              
              // Simulate an operation completing after 3 seconds
              setTimeout(() => {
                toast.dismiss(loadingToast);
                toast.success('Completed', {
                  description: 'Your request has been processed successfully'
                });
              }, 3000);
            }}
            className="px-4 py-2 bg-purple-500 hover:bg-purple-600 text-white rounded-md transition-colors"
          >
            Loading
          </button>
        </div>
      </div>
      
      <div className="mb-6">
        <h3 className="text-lg font-semibold mb-3">Advanced Features</h3>
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3">
          <button
            onClick={() => toast('Toast with Action', { 
              description: 'This toast has a clickable action button',
              action: {
                label: 'Undo',
                onClick: () => toast.success('Action clicked!')
              },
              duration
            })}
            className="px-4 py-2 bg-indigo-500 hover:bg-indigo-600 text-white rounded-md transition-colors"
          >
            With Action Button
          </button>
          
          <button
            onClick={() => toast('Cancelable Toast', { 
              description: 'This toast can be canceled',
              cancel: {
                label: 'Cancel',
                onClick: () => toast.info('Toast canceled')
              },
              duration
            })}
            className="px-4 py-2 bg-pink-500 hover:bg-pink-600 text-white rounded-md transition-colors"
          >
            Cancelable
          </button>
          
          <button
            onClick={() => toast('Custom Styled Toast', { 
              description: 'This toast has custom styling applied',
              className: 'bg-gradient-to-r from-green-400 to-blue-500 text-white',
              descriptionClassName: 'text-gray-100',
              duration
            })}
            className="px-4 py-2 bg-gradient-to-r from-green-400 to-blue-500 text-white rounded-md transition-colors"
          >
            Custom Styling
          </button>
          
          <button
            onClick={() => toast('Custom Icon Toast', { 
              description: 'This toast uses a custom emoji icon',
              icon: '🚀',
              duration
            })}
            className="px-4 py-2 bg-teal-500 hover:bg-teal-600 text-white rounded-md transition-colors"
          >
            Custom Icon
          </button>
          
          <button
            onClick={() => {
              toast.promise(
                // This simulates an API request or other async operation
                new Promise((resolve, reject) => {
                  setTimeout(() => {
                    // Randomly succeed or fail for demonstration
                    if (Math.random() > 0.5) {
                      resolve('Success data');
                    } else {
                      reject(new Error('Example error'));
                    }
                  }, 2000);
                }),
                {
                  loading: 'Loading...',
                  success: 'Promise resolved successfully!',
                  error: (err) => `Promise rejected: ${err.message}`
                }
              );
            }}
            className="px-4 py-2 bg-orange-500 hover:bg-orange-600 text-white rounded-md transition-colors"
          >
            Promise Toast
          </button>
          
          <button
            onClick={() => {
              // Create multiple toasts in sequence
              toast.success('First Toast');
              setTimeout(() => toast.info('Second Toast'), 500);
              setTimeout(() => toast.warning('Third Toast'), 1000);
            }}
            className="px-4 py-2 bg-gray-500 hover:bg-gray-600 text-white rounded-md transition-colors"
          >
            Multiple Toasts
          </button>
        </div>
      </div>
      
      <div className="mb-6">
        <h3 className="text-lg font-semibold mb-3">Calendar Event Toasts</h3>
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3">
          <button
            onClick={() => toast.success('Event Added', { 
              description: 'Yoga Class has been added to your calendar.',
              duration
            })}
            className="px-4 py-2 bg-green-500 hover:bg-green-600 text-white rounded-md transition-colors"
          >
            Add Event
          </button>
          
          <button
            onClick={() => toast.success('Event Updated', { 
              description: 'Changes to "Beach Volleyball" have been saved.',
              duration
            })}
            className="px-4 py-2 bg-blue-500 hover:bg-blue-600 text-white rounded-md transition-colors"
          >
            Update Event
          </button>
          
          <button
            onClick={() => toast.success('Event Deleted', { 
              description: '"Dance Workshop" has been removed from your calendar.',
              duration
            })}
            className="px-4 py-2 bg-red-500 hover:bg-red-600 text-white rounded-md transition-colors"
          >
            Delete Event
          </button>
          
          <button
            onClick={() => toast.success('Event Joined', { 
              description: 'You\'ve successfully registered for "Cooking Class".',
              duration
            })}
            className="px-4 py-2 bg-purple-500 hover:bg-purple-600 text-white rounded-md transition-colors"
          >
            Join Event
          </button>
          
          <button
            onClick={() => toast.error('Join Failed', { 
              description: 'Failed to join "Surfing Lesson". The event is at full capacity.',
              duration
            })}
            className="px-4 py-2 bg-orange-500 hover:bg-orange-600 text-white rounded-md transition-colors"
          >
            Join Error
          </button>
          
          <button
            onClick={() => toast('Payment Required', { 
              description: 'This event requires payment to join.',
              action: {
                label: 'Pay Now',
                onClick: () => toast.success('Payment flow initiated')
              },
              duration
            })}
            className="px-4 py-2 bg-yellow-500 hover:bg-yellow-600 text-white rounded-md transition-colors"
          >
            Payment Toast
          </button>
        </div>
      </div>
      
      <div>
        <p className="text-sm text-gray-500 mt-4">
          Note: This component is for testing purposes and should be removed in production.
        </p>
      </div>
    </div>
  );
}

