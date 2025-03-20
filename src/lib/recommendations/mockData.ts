import { v4 as uuidv4 } from 'uuid';

// Basic interfaces for recommendation system
export interface User {
  id: string;
  name: string;
  age?: number;
  preferences: {
    categories: string[];
    priceRange: number[];
    preferredLocations: string[];
  };
  joinDate: Date;
}

export interface Activity {
  id: string;
  name: string;
  description: string;
  categories: string[];
  location: {
    name: string;
    coordinates: {
      latitude: number;
      longitude: number;
    };
  };
  price: number;
  rating: number;
  popularityScore: number;
  seasonality: string[];
  images: string[];
  availableTimes?: string[];
}

export interface UserInteraction {
  id: string;
  userId: string;
  activityId: string;
  interactionType: 'view' | 'like' | 'save' | 'book' | 'complete' | 'review';
  timestamp: Date;
  rating?: number; // 1-5 stars
  reviewContent?: string;
  durationInMinutes?: number; // For views
}

// Mock data constants
export const ACTIVITY_CATEGORIES = [
  'Outdoor Adventure',
  'Cultural Experience',
  'Food & Dining',
  'Nightlife',
  'Wellness & Relaxation',
  'Sightseeing',
  'Sports',
  'Shopping',
  'Educational',
  'Entertainment',
  'Water Activities',
  'Nature & Wildlife',
  'Historical Tours',
  'Local Crafts',
  'Photography Spots'
];

export const SEASONALITY_OPTIONS = [
  'All Year',
  'Spring',
  'Summer',
  'Fall',
  'Winter',
  'Rainy Season',
  'Dry Season',
  'Peak Season',
  'Off-Peak Season'
];

export const MOCK_LOCATIONS = [
  { 
    name: 'New York City',
    coordinates: { latitude: 40.7128, longitude: -74.0060 },
    popularCategories: ['Cultural Experience', 'Food & Dining', 'Entertainment']
  },
  { 
    name: 'San Francisco',
    coordinates: { latitude: 37.7749, longitude: -122.4194 },
    popularCategories: ['Outdoor Adventure', 'Food & Dining', 'Technology']
  },
  { 
    name: 'Tokyo',
    coordinates: { latitude: 35.6762, longitude: 139.6503 },
    popularCategories: ['Food & Dining', 'Shopping', 'Cultural Experience']
  },
  { 
    name: 'London',
    coordinates: { latitude: 51.5074, longitude: -0.1278 },
    popularCategories: ['Historical Tours', 'Entertainment', 'Nightlife']
  },
  { 
    name: 'Sydney',
    coordinates: { latitude: -33.8688, longitude: 151.2093 },
    popularCategories: ['Water Activities', 'Outdoor Adventure', 'Food & Dining']
  },
  { 
    name: 'Paris',
    coordinates: { latitude: 48.8566, longitude: 2.3522 },
    popularCategories: ['Cultural Experience', 'Food & Dining', 'Sightseeing']
  },
  { 
    name: 'Bangkok',
    coordinates: { latitude: 13.7563, longitude: 100.5018 },
    popularCategories: ['Food & Dining', 'Cultural Experience', 'Shopping']
  },
  { 
    name: 'Cape Town',
    coordinates: { latitude: -33.9249, longitude: 18.4241 },
    popularCategories: ['Nature & Wildlife', 'Outdoor Adventure', 'Food & Dining']
  }
];

// Random data generation functions
export function generateRandomUser(index: number): User {
  const preferences = {
    categories: getRandomSubset(ACTIVITY_CATEGORIES, Math.floor(Math.random() * 5) + 1),
    priceRange: [
      Math.floor(Math.random() * 100), 
      Math.floor(Math.random() * 400) + 100
    ],
    preferredLocations: getRandomSubset(
      MOCK_LOCATIONS.map(location => location.name), 
      Math.floor(Math.random() * 3) + 1
    )
  };

  return {
    id: uuidv4(),
    name: `User ${index}`,
    age: Math.floor(Math.random() * 50) + 18, // 18-68
    preferences,
    joinDate: new Date(Date.now() - Math.random() * 31536000000) // Random date within past year
  };
}

export function generateRandomActivity(index: number): Activity {
  const location = MOCK_LOCATIONS[Math.floor(Math.random() * MOCK_LOCATIONS.length)];
  const randomizedCoordinates = {
    latitude: location.coordinates.latitude + (Math.random() * 0.1 - 0.05),
    longitude: location.coordinates.longitude + (Math.random() * 0.1 - 0.05)
  };
  
  // Slightly bias categories toward popular ones for this location
  let categories = [];
  if (Math.random() > 0.3) {
    // 70% chance to include at least one popular category
    categories.push(location.popularCategories[Math.floor(Math.random() * location.popularCategories.length)]);
  }
  
  // Add some random categories
  categories = [
    ...categories,
    ...getRandomSubset(
      ACTIVITY_CATEGORIES.filter(cat => !categories.includes(cat)),
      Math.floor(Math.random() * 3)
    )
  ];

  return {
    id: uuidv4(),
    name: `Activity ${index} in ${location.name}`,
    description: `This is a ${categories.join('/')} activity in ${location.name}.`,
    categories,
    location: {
      name: location.name,
      coordinates: randomizedCoordinates
    },
    price: Math.floor(Math.random() * 200) + 10, // $10-$210
    rating: Number((Math.random() * 4 + 1).toFixed(1)), // 1.0-5.0
    popularityScore: Math.floor(Math.random() * 100), // 0-100
    seasonality: getRandomSubset(SEASONALITY_OPTIONS, Math.floor(Math.random() * 3) + 1),
    images: Array(Math.floor(Math.random() * 5) + 1).fill(0).map(
      () => `https://picsum.photos/id/${Math.floor(Math.random() * 1000)}/500/300`
    ),
    availableTimes: Math.random() > 0.5 ? generateRandomTimeSlots() : undefined
  };
}

export function generateUserInteraction(users: User[], activities: Activity[]): UserInteraction {
  const user = users[Math.floor(Math.random() * users.length)];
  const activity = activities[Math.floor(Math.random() * activities.length)];
  const interactionTypes: ('view' | 'like' | 'save' | 'book' | 'complete' | 'review')[] = 
    ['view', 'like', 'save', 'book', 'complete', 'review'];
  const interactionType = interactionTypes[Math.floor(Math.random() * interactionTypes.length)];
  
  const interaction: UserInteraction = {
    id: uuidv4(),
    userId: user.id,
    activityId: activity.id,
    interactionType,
    timestamp: new Date(Date.now() - Math.random() * 2592000000) // Random time in past month
  };
  
  // Add type-specific data
  if (interactionType === 'view') {
    interaction.durationInMinutes = Math.floor(Math.random() * 10) + 1;
  } else if (interactionType === 'review' || interactionType === 'complete') {
    interaction.rating = Math.floor(Math.random() * 5) + 1;
    if (interactionType === 'review') {
      interaction.reviewContent = `Sample review for ${activity.name}. ${Math.random() > 0.5 ? 'Highly recommended!' : 'It was an interesting experience.'}`;
    }
  }
  
  return interaction;
}

export function generateMockDataset(
  userCount: number = 100, 
  activityCount: number = 200,
  interactionCount: number = 1000
): {
  users: User[],
  activities: Activity[],
  interactions: UserInteraction[]
} {
  // Generate users
  const users = Array(userCount).fill(0).map((_, index) => generateRandomUser(index));
  
  // Generate activities
  const activities = Array(activityCount).fill(0).map((_, index) => generateRandomActivity(index));
  
  // Generate interactions
  const interactions = Array(interactionCount).fill(0).map(() => 
    generateUserInteraction(users, activities)
  );
  
  return { users, activities, interactions };
}

// Helper functions
function getRandomSubset<T>(array: T[], size: number): T[] {
  const shuffled = [...array].sort(() => 0.5 - Math.random());
  return shuffled.slice(0, size);
}

function generateRandomTimeSlots(): string[] {
  const timeSlots = [];
  const startHour = Math.floor(Math.random() * 12) + 8; // 8 AM to 8 PM start
  const slotCount = Math.floor(Math.random() * 5) + 1; // 1 to 5 slots
  
  for (let i = 0; i < slotCount; i++) {
    const hour = (startHour + i * 2) % 24;
    timeSlots.push(`${hour}:00`);
  }
  
  return timeSlots;
}

// Usage example:
// const mockData = generateMockDataset();
// console.log(`Generated ${mockData.users.length} users`);
// console.log(`Generated ${mockData.activities.length} activities`);
// console.log(`Generated ${mockData.interactions.length} interactions`);

