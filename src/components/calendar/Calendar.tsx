'use client';

import { useState, useCallback, useEffect } from 'react';
import { Calendar as BigCalendar, momentLocalizer, Views } from 'react-big-calendar';
import moment from 'moment';
import 'react-big-calendar/lib/css/react-big-calendar.css';
import TimeSlotModal from './TimeSlotModal';

// Initialize the localizer
const localizer = momentLocalizer(moment);

// Event types with corresponding colors
export const EVENT_TYPES = [
  { id: 1, name: 'Relax and Wellness', color: '#4CAF50' },
  { id: 2, name: 'Outdoor and Active', color: '#2196F3' },
  { id: 3, name: 'Beach and Sun', color: '#FF9800' },
  { id: 4, name: 'Drinks and Nightlife', color: '#9C27B0' },
  { id: 5, name: 'Food and Family', color: '#F44336' },
  { id: 6, name: 'Accommodation', color: '#795548' },
];

// Special status colors
const TEACHER_COLOR = '#3F51B5';
const HIGHLY_ACKNOWLEDGED_TEACHER_COLOR = '#1A237E';
const USER_JOINED_COLOR = '#8BC34A';

// TypeScript interfaces
export interface TimeSlot {
  id: string;
  title: string;
  start: Date;
  end: Date;
  typeId: number;
  location: string;
  isPaid: boolean;
  isTeacher: boolean;
  isHighlyAcknowledged?: boolean;
  userJoined?: boolean;
  description?: string;
  recurringId?: string;
  price?: number;
}

export interface FilterState {
  typeIds: number[];
  locations: string[];
  showPaidOnly: boolean;
  showFreeOnly: boolean;
  showJoinedOnly: boolean;
}

interface CalendarProps {
  onTimeSlotCreated?: (timeSlot: TimeSlot) => void;
  onTimeSlotUpdated?: (timeSlot: TimeSlot) => void;
  onTimeSlotDeleted?: (timeSlotId: string) => void;
  onUserJoinTimeSlot?: (timeSlotId: string) => void;
  initialTimeSlots?: TimeSlot[];
}

const Calendar: React.FC<CalendarProps> = ({
  onTimeSlotCreated,
  onTimeSlotUpdated,
  onTimeSlotDeleted,
  onUserJoinTimeSlot,
  initialTimeSlots = [],
}) => {
  // State
  const [timeSlots, setTimeSlots] = useState<TimeSlot[]>(initialTimeSlots);
  const [selectedTimeSlot, setSelectedTimeSlot] = useState<TimeSlot | null>(null);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isCreating, setIsCreating] = useState(false);
  const [filters, setFilters] = useState<FilterState>({
    typeIds: EVENT_TYPES.map(type => type.id),
    locations: ['Location 1', 'Location 2', 'Location 3', 'Location 4', 'Location 5'],
    showPaidOnly: false,
    showFreeOnly: false,
    showJoinedOnly: false,
  });

  // Apply filters to time slots
  const filteredTimeSlots = timeSlots.filter(timeSlot => {
    // Filter by type
    if (!filters.typeIds.includes(timeSlot.typeId)) return false;
    
    // Filter by location
    if (!filters.locations.includes(timeSlot.location)) return false;
    
    // Filter by paid status
    if (filters.showPaidOnly && !timeSlot.isPaid) return false;
    if (filters.showFreeOnly && timeSlot.isPaid) return false;
    
    // Filter by joined status
    if (filters.showJoinedOnly && !timeSlot.userJoined) return false;
    
    return true;
  });

  // Get event color based on properties
  const getEventColor = useCallback((timeSlot: TimeSlot) => {
    if (timeSlot.userJoined) return USER_JOINED_COLOR;
    if (timeSlot.isTeacher) {
      return timeSlot.isHighlyAcknowledged ? HIGHLY_ACKNOWLEDGED_TEACHER_COLOR : TEACHER_COLOR;
    }
    const eventType = EVENT_TYPES.find(type => type.id === timeSlot.typeId);
    return eventType ? eventType.color : '#CCCCCC';
  }, []);

  // Event styling
  const eventStyleGetter = useCallback((event: TimeSlot) => {
    const backgroundColor = getEventColor(event);
    return {
      style: {
        backgroundColor,
        borderRadius: '5px',
        color: 'white',
        border: 'none',
        display: 'block',
        opacity: 0.8,
      },
    };
  }, [getEventColor]);

  // Handle time slot selection
  const handleSelectEvent = useCallback((timeSlot: TimeSlot) => {
    setSelectedTimeSlot(timeSlot);
    setIsCreating(false);
    setIsModalOpen(true);
  }, []);

  // Handle creating a new time slot
  const handleSelectSlot = useCallback(({ start, end }: { start: Date; end: Date }) => {
    const newTimeSlot: TimeSlot = {
      id: '',
      title: '',
      start,
      end,
      typeId: 1,
      location: 'Location 1',
      isPaid: false,
      isTeacher: false,
    };
    
    setSelectedTimeSlot(newTimeSlot);
    setIsCreating(true);
    setIsModalOpen(true);
  }, []);

  // Handle saving a time slot (create or update)
  const handleSaveTimeSlot = useCallback((timeSlot: TimeSlot) => {
    if (isCreating) {
      // Generate a new ID
      const newTimeSlot = {
        ...timeSlot,
        id: Date.now().toString(),
      };
      
      setTimeSlots(prev => [...prev, newTimeSlot]);
      onTimeSlotCreated?.(newTimeSlot);
    } else {
      // Update existing time slot
      setTimeSlots(prev => 
        prev.map(slot => (slot.id === timeSlot.id ? timeSlot : slot))
      );
      onTimeSlotUpdated?.(timeSlot);
    }
    
    // Close the modal
    setIsModalOpen(false);
  }, [isCreating, onTimeSlotCreated, onTimeSlotUpdated]);

  // Handle deleting a time slot
  const handleDeleteTimeSlot = useCallback((timeSlotId: string) => {
    setTimeSlots(prev => prev.filter(slot => slot.id !== timeSlotId));
    onTimeSlotDeleted?.(timeSlotId);
    setIsModalOpen(false);
  }, [onTimeSlotDeleted]);

  // Handle joining a time slot
  const handleJoinTimeSlot = useCallback((timeSlotId: string) => {
    setTimeSlots(prev => 
      prev.map(slot => {
        if (slot.id === timeSlotId) {
          return { ...slot, userJoined: true };
        }
        return slot;
      })
    );
    onUserJoinTimeSlot?.(timeSlotId);
    setIsModalOpen(false);
  }, [onUserJoinTimeSlot]);

  // Handle filter changes
  const handleFilterChange = useCallback((newFilters: Partial<FilterState>) => {
    setFilters(prev => ({ ...prev, ...newFilters }));
  }, []);

  // Toggle type filter
  const toggleTypeFilter = useCallback((typeId: number) => {
    setFilters(prev => {
      if (prev.typeIds.includes(typeId)) {
        return {
          ...prev,
          typeIds: prev.typeIds.filter(id => id !== typeId),
        };
      } else {
        return {
          ...prev,
          typeIds: [...prev.typeIds, typeId],
        };
      }
    });
  }, []);

  // Toggle location filter
  const toggleLocationFilter = useCallback((location: string) => {
    setFilters(prev => {
      if (prev.locations.includes(location)) {
        return {
          ...prev,
          locations: prev.locations.filter(loc => loc !== location),
        };
      } else {
        return {
          ...prev,
          locations: [...prev.locations, location],
        };
      }
    });
  }, []);

  // Integrate with ONNX for event recommendations (stubbed)
  useEffect(() => {
    const fetchRecommendedEvents = async () => {
      try {
        // This would be replaced with actual ONNX integration
        console.log('Fetching event recommendations with ONNX...');
        // const recommended = await callOnnxModel(timeSlots, userPreferences);
        // Handle recommended events...
      } catch (error) {
        console.error('Error fetching recommendations:', error);
      }
    };

    // Call on initial load and when events change
    fetchRecommendedEvents();
  }, [timeSlots]);

  // Render filter bar
  const renderFilterBar = () => (
    <div className="mb-4 p-4 bg-white rounded-lg shadow">
      <h3 className="text-lg font-semibold mb-2">Filters</h3>
      
      <div className="mb-3">
        <h4 className="font-medium mb-1">Event Types</h4>
        <div className="flex flex-wrap gap-2">
          {EVENT_TYPES.map(type => (
            <button
              key={type.id}
              className={`px-3 py-1 rounded-full text-sm ${
                filters.typeIds.includes(type.id)
                  ? 'bg-blue-600 text-white'
                  : 'bg-gray-200 text-gray-700'
              }`}
              onClick={() => toggleTypeFilter(type.id)}
              style={{ borderLeft: `4px solid ${type.color}` }}
            >
              {type.name}
            </button>
          ))}
        </div>
      </div>
      
      <div className="mb-3">
        <h4 className="font-medium mb-1">Locations</h4>
        <div className="flex flex-wrap gap-2">
          {['Location 1', 'Location 2', 'Location 3', 'Location 4', 'Location 5'].map(location => (
            <button
              key={location}
              className={`px-3 py-1 rounded-full text-sm ${
                filters.locations.includes(location)
                  ? 'bg-blue-600 text-white'
                  : 'bg-gray-200 text-gray-700'
              }`}
              onClick={() => toggleLocationFilter(location)}
            >
              {location}
            </button>
          ))}
        </div>
      </div>
      
      <div className="flex flex-wrap gap-4">
        <label className="flex items-center">
          <input
            type="checkbox"
            checked={filters.showPaidOnly}
            onChange={() => 
              handleFilterChange({ 
                showPaidOnly: !filters.showPaidOnly,
                showFreeOnly: false 
              })
            }
            className="mr-2"
          />
          Paid Only
        </label>
        
        <label className="flex items-center">
          <input
            type="checkbox"
            checked={filters.showFreeOnly}
            onChange={() => 
              handleFilterChange({ 
                showFreeOnly: !filters.showFreeOnly,
                showPaidOnly: false 
              })
            }
            className="mr-2"
          />
          Free Only
        </label>
        
        <label className="flex items-center">
          <input
            type="checkbox"
            checked={filters.showJoinedOnly}
            onChange={() => 
              handleFilterChange({ 
                showJoinedOnly: !filters.showJoinedOnly 
              })
            }
            className="mr-2"
          />
          Joined Events
        </label>
      </div>
    </div>
  );

  return (
    <div className="h-full flex flex-col">
      {renderFilterBar()}
      
      <div className="flex-grow">
        <BigCalendar
          localizer={localizer}
          events={filteredTimeSlots}
          startAccessor="start"
          endAccessor="end"
          style={{ height: 700 }}
          selectable
          onSelectEvent={handleSelectEvent}
          onSelectSlot={handleSelectSlot}
          eventPropGetter={eventStyleGetter}
          views={[Views.MONTH, Views.WEEK, Views.DAY, Views.AGENDA]}
          defaultView={Views.WEEK}
          defaultDate={new Date()}
          popup
          components={{
            event: (props) => (
              <div>
                <div className="font-semibold">{props.event.title}</div>
                <div className="text-xs">{props.event.location}</div>
                {props.event.isPaid && (
                  <div className="text-xs font-medium">Paid Event</div>
                )}
              </div>
            ),
          }}
        />
      </div>
      
      {isModalOpen && selectedTimeSlot && (
        <TimeSlotModal
          timeSlot={selectedTimeSlot}
          isOpen={isModalOpen}
          onClose={() => setIsModalOpen(false)}
          onSave={handleSaveTimeSlot}
          onDelete={handleDeleteTimeSlot}
          onJoin={handleJoinTimeSlot}
          isCreating={isCreating}
        />
      )}
      
      <div className="mt-4 p-3 bg-gray-100 rounded-lg">
        <h3 className="font-medium mb-2">Legend</h3>
        <div className="grid grid-cols-3 gap-2">
          {EVENT_TYPES.map(type => (
            <div key={type.id} className="flex items-center">
              <div
                className="w-4 h-4 rounded mr-2"
                style={{ backgroundColor: type.color }}
              ></div>
              <span className="text-sm">{type.name}</span>
            </div>
          ))}
          <div className="flex items-center">
            <div
              className="w-4 h-4 rounded mr-2"
              style={{ backgroundColor: TEACHER_COLOR }}
            ></div>
            <span className="text-sm">Teacher</span>
          </div>
          <div className="flex items-center">
            <div
              className="w-4 h-4 rounded mr-2"
              style={{ backgroundColor: HIGHLY_ACKNOWLEDGED_TEACHER_COLOR }}
            ></div>
            <span className="text-sm">Highly Acknowledged Teacher</span>
          </div>
          <div className="flex items-center">
            <div
              className="w-4 h-4 rounded mr-2"
              style={{ backgroundColor: USER_JOINED_COLOR }}
            ></div>
            <span className="text-sm">Joined Event</span>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Calendar;

