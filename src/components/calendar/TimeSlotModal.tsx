'use client';

import { useState, useEffect } from 'react';
import { loadStripe } from '@stripe/stripe-js';
import { useRouter } from 'next/navigation';

// Event type constants
export const EVENT_TYPES = {
  RELAX: 'Relax and Wellness',
  OUTDOOR: 'Outdoor and Active',
  BEACH: 'Beach and Sun',
  NIGHTLIFE: 'Drinks and Nightlife',
  FOOD: 'Food and Family',
  ACCOMMODATION: 'Accommodation',
};

// Location options
export const LOCATIONS = [
  { id: 'main-studio', name: 'Main Studio' },
  { id: 'aerial-dome', name: 'Aerial Dome' },
  { id: 'outdoor-space', name: 'Outdoor Space' },
  { id: 'rehearsal-room', name: 'Rehearsal Room' },
  { id: 'performance-hall', name: 'Performance Hall' },
];

// Recurrence options
export const RECURRENCE_OPTIONS = [
  { id: 'none', name: 'None' },
  { id: 'daily', name: 'Daily' },
  { id: 'weekly', name: 'Weekly' },
  { id: 'biweekly', name: 'Bi-weekly' },
  { id: 'monthly', name: 'Monthly' },
];

// TypeScript interfaces for time slot data
export interface TimeSlot {
  id?: string;
  title: string;
  description: string;
  startTime: Date;
  endTime: Date;
  location: string;
  isPaid: boolean;
  price?: number;
  eventType: string;
  recurrence: string;
  recurrenceEndDate?: Date;
  instructor: string;
  isHighlyAcknowledged?: boolean;
  capacity: number;
  registeredParticipants: string[];
}

// Props interface for the modal component
interface TimeSlotModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSave: (timeSlot: TimeSlot) => void;
  initialData?: Partial<TimeSlot>;
  isEditing?: boolean;
  currentUser?: { id: string; name: string; isInstructor?: boolean };
}

// Initialize Stripe
const stripePromise = loadStripe(process.env.NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY || '');

export default function TimeSlotModal({
  isOpen,
  onClose,
  onSave,
  initialData,
  isEditing = false,
  currentUser,
}: TimeSlotModalProps) {
  const router = useRouter();

  const [formData, setFormData] = useState<Partial<TimeSlot>>({
    title: '',
    description: '',
    startTime: new Date(),
    endTime: new Date(new Date().setHours(new Date().getHours() + 1)),
    location: LOCATIONS[0].id,
    isPaid: false,
    price: 0,
    eventType: Object.values(EVENT_TYPES)[0],
    recurrence: 'none',
    instructor: currentUser?.isInstructor ? currentUser.name : '',
    capacity: 10,
    registeredParticipants: [],
  });

  const [isJoining, setIsJoining] = useState(false);
  const [showRecurrence, setShowRecurrence] = useState(false);
  const [isProcessing, setIsProcessing] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (initialData) {
      setFormData({
        ...formData,
        ...initialData,
      });
      
      if (initialData.recurrence && initialData.recurrence !== 'none') {
        setShowRecurrence(true);
      }
    }
  }, [initialData]);

  const handleInputChange = (
    e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>
  ) => {
    const { name, value, type } = e.target;

    if (type === 'checkbox') {
      const checked = (e.target as HTMLInputElement).checked;
      setFormData({ ...formData, [name]: checked });
      return;
    }

    if (name === 'startTime' || name === 'endTime' || name === 'recurrenceEndDate') {
      setFormData({ ...formData, [name]: new Date(value) });
      return;
    }

    if (name === 'price') {
      setFormData({ ...formData, [name]: parseFloat(value) || 0 });
      return;
    }

    if (name === 'capacity') {
      setFormData({ ...formData, [name]: parseInt(value) || 0 });
      return;
    }

    if (name === 'recurrence') {
      const recurrenceValue = value;
      setFormData({ ...formData, recurrence: recurrenceValue });
      setShowRecurrence(recurrenceValue !== 'none');
      return;
    }

    setFormData({ ...formData, [name]: value });
  };

  const validateForm = (): boolean => {
    if (!formData.title?.trim()) {
      setError('Title is required');
      return false;
    }

    if (!formData.startTime || !formData.endTime) {
      setError('Start and end times are required');
      return false;
    }

    if (formData.startTime && formData.endTime && formData.startTime >= formData.endTime) {
      setError('End time must be after start time');
      return false;
    }

    if (formData.isPaid && (!formData.price || formData.price <= 0)) {
      setError('Price must be greater than 0 for paid courses');
      return false;
    }

    if (showRecurrence && !formData.recurrenceEndDate) {
      setError('Recurrence end date is required for recurring events');
      return false;
    }

    if (parseInt(formData.capacity?.toString() || '0') <= 0) {
      setError('Capacity must be at least 1');
      return false;
    }

    setError(null);
    return true;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!validateForm()) {
      return;
    }

    setIsProcessing(true);

    try {
      // For joining a time slot
      if (isJoining && currentUser) {
        if (formData.isPaid) {
          // Redirect to payment flow for paid courses
          const stripe = await stripePromise;
          if (!stripe) throw new Error('Failed to initialize Stripe');

          // Call your API to create a checkout session
          const response = await fetch('/api/create-checkout-session', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              timeSlotId: formData.id,
              userId: currentUser.id,
              amount: formData.price,
              title: formData.title,
            }),
          });

          if (!response.ok) throw new Error('Failed to create checkout session');
          
          const { sessionId } = await response.json();
          const { error } = await stripe.redirectToCheckout({ sessionId });
          
          if (error) throw new Error(error.message);
          
          // The user will be redirected to Stripe checkout
          return;
        } else {
          // For free courses, register directly
          const updatedParticipants = [
            ...(formData.registeredParticipants || []),
            currentUser.id,
          ];
          
          onSave({
            ...(formData as TimeSlot),
            registeredParticipants: updatedParticipants,
          });
        }
      } else {
        // For creating or editing
        onSave(formData as TimeSlot);
      }
      
      onClose();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'An error occurred');
    } finally {
      setIsProcessing(false);
    }
  };

  const handleCancel = () => {
    onClose();
  };

  if (!isOpen) return null;

  const isRegistered = currentUser && formData.registeredParticipants?.includes(currentUser.id);
  const isCreator = currentUser?.isInstructor;
  const canJoin = !isRegistered && !isEditing && !isCreator;
  const modalTitle = isEditing ? 'Edit Time Slot' : isJoining ? 'Join Course' : 'Create New Time Slot';

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-lg shadow-xl w-full max-w-3xl max-h-[90vh] overflow-y-auto">
        <div className="p-6">
          <h2 className="text-2xl font-bold mb-4 text-gray-800">{modalTitle}</h2>
          
          {error && (
            <div className="mb-4 p-3 bg-red-100 text-red-700 rounded-md">
              {error}
            </div>
          )}
          
          <form onSubmit={handleSubmit}>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
              <div className="col-span-2">
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Title <span className="text-red-500">*</span>
                </label>
                <input
                  type="text"
                  name="title"
                  value={formData.title || ''}
                  onChange={handleInputChange}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                  required
                  disabled={isJoining}
                />
              </div>
              
              <div className="col-span-2">
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Description
                </label>
                <textarea
                  name="description"
                  value={formData.description || ''}
                  onChange={handleInputChange}
                  rows={3}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                  disabled={isJoining}
                />
              </div>
              
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Start Time <span className="text-red-500">*</span>
                </label>
                <input
                  type="datetime-local"
                  name="startTime"
                  value={formData.startTime ? new Date(formData.startTime).toISOString().slice(0, 16) : ''}
                  onChange={handleInputChange}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                  required
                  disabled={isJoining}
                />
              </div>
              
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  End Time <span className="text-red-500">*</span>
                </label>
                <input
                  type="datetime-local"
                  name="endTime"
                  value={formData.endTime ? new Date(formData.endTime).toISOString().slice(0, 16) : ''}
                  onChange={handleInputChange}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                  required
                  disabled={isJoining}
                />
              </div>
              
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Location <span className="text-red-500">*</span>
                </label>
                <select
                  name="location"
                  value={formData.location || ''}
                  onChange={handleInputChange}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                  required
                  disabled={isJoining}
                >
                  {LOCATIONS.map((location) => (
                    <option key={location.id} value={location.id}>
                      {location.name}
                    </option>
                  ))}
                </select>
              </div>
              
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Event Type <span className="text-red-500">*</span>
                </label>
                <select
                  name="eventType"
                  value={formData.eventType || ''}
                  onChange={handleInputChange}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                  required
                  disabled={isJoining}
                >
                  {Object.values(EVENT_TYPES).map((type) => (
                    <option key={type} value={type}>
                      {type}
                    </option>
                  ))}
                </select>
              </div>
              
              <div>
                <div className="flex items-center mb-2">
                  <input
                    type="checkbox"
                    id="isPaid"
                    name="isPaid"
                    checked={formData.isPaid || false}
                    onChange={(e) => handleInputChange({
                      ...e,
                      target: {
                        ...e.target,
                        name: 'isPaid',
                        value: e.target.checked ? 'true' : 'false',
                      },
                    })}
                    className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded"
                    disabled={isJoining}
                  />
                  <label htmlFor="isPaid" className="ml-2 block text-sm font-medium text-gray-700">
                    Paid Course
                  </label>
                </div>
                
                {formData.isPaid && (
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Price ($) <span className="text-red-500">*</span>
                    </label>
                    <input
                      type="number"
                      name="price"
                      value={formData.price || ''}
                      onChange={handleInputChange}
                      min="0"
                      step="0.01"
                      className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                      required={formData.isPaid}
                      disabled={isJoining}
                    />
                  </div>
                )}
              </div>
              
              <div>
                <label className="block text

