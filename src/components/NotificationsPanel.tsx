'use client';

import { useState, useEffect } from 'react';
import { useSession } from 'next-auth/react';
import { BellIcon } from '@heroicons/react/24/outline';

interface Notification {
  id: string;
  message: string;
  readStatus: boolean;
  createdAt: string;
  listingId?: string;
}

const NotificationsPanel = () => {
  const { data: session } = useSession();
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [unreadCount, setUnreadCount] = useState<number>(0);
  const [isOpen, setIsOpen] = useState<boolean>(false);
  const [isLoading, setIsLoading] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);

  // Fetch notifications from the API
  const fetchNotifications = async (): Promise<void> => {
    if (!session?.user) return;
    
    try {
      setIsLoading(true);
      const response = await fetch('/api/notifications');
      
      if (!response.ok) {
        throw new Error('Failed to fetch notifications');
      }
      
      const data = await response.json();
      setNotifications(data.notifications || []);
      
      // Calculate unread count
      const unread = data.notifications.filter(
        (notification: Notification) => !notification.readStatus
      ).length;
      
      setUnreadCount(unread);
    } catch (err) {
      console.error('Error fetching notifications:', err);
      setError(err instanceof Error ? err.message : 'An error occurred');
    } finally {
      setIsLoading(false);
    }
  };

  // Mark a notification as read
  const markAsRead = async (notificationId: string): Promise<void> => {
    if (!session?.user) return;
    
    try {
      const response = await fetch(`/api/notifications`, {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ 
          notificationId, 
          readStatus: true 
        }),
      });

      if (!response.ok) {
        throw new Error('Failed to mark notification as read');
      }

      // Update local state to reflect the change
      setNotifications(prevNotifications => 
        prevNotifications.map(notification => 
          notification.id === notificationId 
            ? { ...notification, readStatus: true } 
            : notification
        )
      );

      // Update unread count
      setUnreadCount(prevCount => Math.max(0, prevCount - 1));
    } catch (err) {
      console.error('Error marking notification as read:', err);
      setError(err instanceof Error ? err.message : 'An error occurred');
    }
  };

  // Mark all notifications as read
  const markAllAsRead = async (): Promise<void> => {
    if (!session?.user || notifications.length === 0) return;
    
    try {
      const response = await fetch(`/api/notifications/mark-all-read`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        }
      });

      if (!response.ok) {
        throw new Error('Failed to mark all notifications as read');
      }

      // Update local state to reflect all notifications are read
      setNotifications(prevNotifications => 
        prevNotifications.map(notification => ({ 
          ...notification, 
          readStatus: true 
        }))
      );

      // Reset unread count
      setUnreadCount(0);
    } catch (err) {
      console.error('Error marking all notifications as read:', err);
      setError(err instanceof Error ? err.message : 'An error occurred');
    }
  };

  // Toggle the notification panel
  const togglePanel = (): void => {
    setIsOpen(!isOpen);
    
    // If opening the panel, mark notifications as seen
    if (!isOpen && unreadCount > 0) {
      // Optional: We could mark notifications as "seen" here
      // without marking them as "read" yet
    }
  };

  // Fetch notifications on initial load and set up periodic refresh
  useEffect(() => {
    if (session?.user) {
      // Initial fetch
      fetchNotifications();
      
      // Set up periodic refresh every 30 seconds
      const intervalId = setInterval(() => {
        fetchNotifications();
      }, 30000);
      
      // Clean up interval on component unmount
      return () => clearInterval(intervalId);
    }
  }, [session]);

  if (!session?.user) {
    return null; // Don't render for unauthenticated users
  }

  return (
    <div className="relative">
      {/* Notification Bell Button */}
      <button 
        onClick={togglePanel}
        className="relative p-2 text-gray-600 hover:text-gray-900 focus:outline-none"
        aria-label="Notifications"
      >
        <BellIcon className="h-6 w-6" />
        
        {/* Notification Badge */}
        {unreadCount > 0 && (
          <span className="absolute top-0 right-0 inline-flex items-center justify-center px-2 py-1 text-xs font-bold leading-none text-white transform translate-x-1/2 -translate-y-1/2 bg-red-600 rounded-full">
            {unreadCount > 99 ? '99+' : unreadCount}
          </span>
        )}
      </button>

      {/* Notifications Panel */}
      {isOpen && (
        <div className="absolute right-0 mt-2 w-80 bg-white rounded-md shadow-lg overflow-hidden z-50 border border-gray-200">
          <div className="p-3 bg-gray-100 border-b border-gray-200 flex justify-between items-center">
            <h3 className="text-sm font-semibold text-gray-700">Notifications</h3>
            {unreadCount > 0 && (
              <button 
                onClick={markAllAsRead}
                className="text-xs text-blue-600 hover:text-blue-800"
              >
                Mark all as read
              </button>
            )}
          </div>

          <div className="max-h-96 overflow-y-auto">
            {isLoading && (
              <div className="p-4 text-center text-gray-500">
                Loading notifications...
              </div>
            )}

            {error && (
              <div className="p-4 text-center text-red-500">
                Error: {error}
              </div>
            )}

            {!isLoading && !error && notifications.length === 0 && (
              <div className="p-4 text-center text-gray-500">
                No notifications yet
              </div>
            )}

            {!isLoading && !error && notifications.length > 0 && (
              <ul className="divide-y divide-gray-200">
                {notifications.map((notification: Notification) => (
                  <li 
                    key={notification.id}
                    className={`p-4 hover:bg-gray-50 transition-colors ${
                      !notification.readStatus ? 'bg-blue-50' : ''
                    }`}
                  >
                    <div className="flex justify-between">
                      <p className="text-sm text-gray-800">
                        {notification.message}
                      </p>
                      {!notification.readStatus && (
                        <button
                          onClick={() => markAsRead(notification.id)}
                          className="ml-2 text-xs text-blue-600 hover:text-blue-800"
                        >
                          Mark as read
                        </button>
                      )}
                    </div>
                    <p className="text-xs text-gray-500 mt-1">
                      {new Date(notification.createdAt).toLocaleString()}
                    </p>
                    {notification.listingId && (
                      <a 
                        href={`/listings/${notification.listingId}`}
                        className="text-xs text-blue-600 hover:underline block mt-2"
                      >
                        View listing
                      </a>
                    )}
                  </li>
                ))}
              </ul>
            )}
          </div>
          
          <div className="p-2 bg-gray-100 border-t border-gray-200 text-center">
            <button 
              onClick={() => setIsOpen(false)}
              className="text-xs text-gray-600 hover:text-gray-800"
            >
              Close
            </button>
          </div>
        </div>
      )}
    </div>
  );
};

export default NotificationsPanel;

