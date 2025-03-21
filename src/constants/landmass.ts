interface LandmassPoint {
  name: string;
  lat: number;
  lng: number;
}

interface ContinentData {
  name: string;
  points: LandmassPoint[];
  connections: [number, number][]; // Pairs of indices representing connected points
}

export const CONTINENT_DATA: ContinentData[] = [
  {
    name: 'North America',
    points: [
      { name: "Alaska", lat: 64.2008, lng: -149.4937 },
      { name: "Canada", lat: 56.1304, lng: -106.3468 },
      { name: "United States (Central)", lat: 39.8283, lng: -98.5795 },
      { name: "Mexico", lat: 23.6345, lng: -102.5528 },
      { name: "Greenland", lat: 71.7069, lng: -42.6043 }
    ],
    connections: [
      [0, 1], // Alaska - Canada
      [1, 2], // Canada - US
      [2, 3], // US - Mexico
      [1, 4]  // Canada - Greenland
    ]
  },
  {
    name: 'South America',
    points: [
      { name: "Colombia", lat: 4.5709, lng: -74.2973 },
      { name: "Peru", lat: -9.1900, lng: -75.0152 },
      { name: "Brazil", lat: -14.2350, lng: -51.9253 },
      { name: "Chile", lat: -35.6751, lng: -71.5430 },
      { name: "Argentina", lat: -38.4161, lng: -63.6167 }
    ],
    connections: [
      [0, 1], // Colombia - Peru
      [0, 2], // Colombia - Brazil
      [1, 2], // Peru - Brazil
      [1, 3], // Peru - Chile
      [2, 4], // Brazil - Argentina
      [3, 4]  // Chile - Argentina
    ]
  },
  {
    name: 'Europe',
    points: [
      { name: "United Kingdom", lat: 55.3781, lng: -3.4360 },
      { name: "Scandinavia", lat: 62.5267, lng: 15.2766 },
      { name: "Germany", lat: 51.1657, lng: 10.4515 },
      { name: "France", lat: 46.2276, lng: 2.2137 },
      { name: "Spain", lat: 40.4637, lng: -3.7492 },
      { name: "Italy", lat: 41.8719, lng: 12.5674 },
      { name: "Russia (European)", lat: 55.7558, lng: 37.6173 }
    ],
    connections: [
      [0, 1], // UK - Scandinavia
      [0, 2], // UK - Germany
      [0, 3], // UK - France
      [1, 2], // Scandinavia - Germany
      [1, 6], // Scandinavia - Russia
      [2, 3], // Germany - France
      [2, 5], // Germany - Italy
      [2, 6], // Germany - Russia
      [3, 4], // France - Spain
      [3, 5], // France - Italy
      [5, 6]  // Italy - Russia
    ]
  },
  {
    name: 'Africa',
    points: [
      { name: "Morocco", lat: 31.7917, lng: -7.0926 },
      { name: "Egypt", lat: 26.8206, lng: 30.8025 },
      { name: "Nigeria", lat: 9.0820, lng: 8.6753 },
      { name: "Kenya", lat: -0.0236, lng: 37.9062 },
      { name: "South Africa", lat: -30.5595, lng: 22.9375 },
      { name: "Madagascar", lat: -18.7669, lng: 46.8691 }
    ],
    connections: [
      [0, 1], // Morocco - Egypt
      [0, 2], // Morocco - Nigeria
      [1, 2], // Egypt - Nigeria
      [1, 3], // Egypt - Kenya
      [2, 3], // Nigeria - Kenya
      [2, 4], // Nigeria - South Africa
      [3, 4], // Kenya - South Africa
      [3, 5], // Kenya - Madagascar
      [4, 5]  // South Africa - Madagascar
    ]
  },
  {
    name: 'Asia',
    points: [
      { name: "Russia (Asian)", lat: 61.5240, lng: 105.3188 },
      { name: "Turkey", lat: 38.9637, lng: 35.2433 },
      { name: "Iran", lat: 32.4279, lng: 53.6880 },
      { name: "Saudi Arabia", lat: 23.8859, lng: 45.0792 },
      { name: "India", lat: 20.5937, lng: 78.9629 },
      { name: "China", lat: 35.8617, lng: 104.1954 },
      { name: "Korea", lat: 35.9078, lng: 127.7669 },
      { name: "Japan", lat: 36.2048, lng: 138.2529 },
      { name: "Vietnam", lat: 14.0583, lng: 108.2772 },
      { name: "Indonesia", lat: -0.7893, lng: 113.9213 }
    ],
    connections: [
      [0, 1], // Russia - Turkey
      [0, 2], // Russia - Iran
      [0, 5], // Russia - China
      [1, 2], // Turkey - Iran
      [1, 3], // Turkey - Saudi Arabia
      [2, 3], // Iran - Saudi Arabia
      [2, 4], // Iran - India
      [3, 4], // Saudi Arabia - India
      [4, 5], // India - China
      [4, 9], // India - Indonesia
      [5, 6], // China - Korea
      [5, 7], // China - Japan
      [5, 8], // China - Vietnam
      [6, 7], // Korea - Japan
      [8, 9]  // Vietnam - Indonesia
    ]
  },
  {
    name: 'Oceania',
    points: [
      { name: "Papua New Guinea", lat: -6.3150, lng: 143.9555 },
      { name: "Australia", lat: -25.2744, lng: 133.7751 },
      { name: "New Zealand", lat: -40.9006, lng: 174.8860 },
      { name: "Fiji", lat: -17.7134, lng: 178.0650 }
    ],
    connections: [
      [0, 1], // Papua New Guinea - Australia
      [0, 3], // Papua New Guinea - Fiji
      [1, 2], // Australia - New Zealand
      [2, 3]  // New Zealand - Fiji
    ]
  }
];

// Keep the old format available for backward compatibility
export const LANDMASS_POINTS: { name: string; lat: number; lng: number; }[] = 
  CONTINENT_DATA.flatMap(continent => continent.points);
