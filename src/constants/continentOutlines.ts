interface ContinentOutline {
  name: string;
  color: number; // Hex color
  paths: [number, number][][]; // Array of line segments, each defined by [latitude, longitude] pairs
  pulseSpeed?: number;  // Speed of the pulsing effect
  thickness?: number;   // Line thickness multiplier
}

export const CONTINENT_OUTLINES: ContinentOutline[] = [
  {
    name: 'North America',
    color: 0xE6B894, // Warm peach
    thickness: 1.2,
    pulseSpeed: 0.8,
    paths: [
      // West Coast
      [[71.5388, -156.7861], [58.5975, -137.0471], [45.5155, -123.8147], [32.7157, -117.1611]],
      // East Coast
      [[58.7984, -94.1651], [44.9778, -79.8431], [38.9072, -77.0369], [25.7617, -80.1918]],
      // Connect coasts
      [[25.7617, -80.1918], [32.7157, -117.1611]]
    ]
  },
  {
    name: 'South America',
    color: 0xE8C3A0, // Warm sand
    thickness: 1.1,
    pulseSpeed: 0.9,
    paths: [
      // Pacific coast
      [[12.4634, -71.5549], [-2.1902, -79.8862], [-33.4489, -70.6483]],
      // Atlantic coast
      [[12.4634, -71.5549], [5.8700, -35.1800], [-22.9068, -43.1729], [-34.6037, -58.3816]],
      // Southern connection
      [[-33.4489, -70.6483], [-34.6037, -58.3816]]
    ]
  },
  {
    name: 'Europe',
    color: 0xD9A78B, // Soft coral
    thickness: 1.15,
    pulseSpeed: 0.85,
    paths: [
      // Northern edge
      [[59.9139, -10.7500], [59.3293, 18.0686], [59.9375, 30.3086]],
      // Mediterranean
      [[41.9028, 12.4964], [37.9838, 23.7275], [41.0082, 28.9784]],
      // Connect
      [[59.9375, 30.3086], [41.0082, 28.9784]]
    ]
  },
  {
    name: 'Africa',
    color: 0xECB683, // Golden wheat
    thickness: 1.25,
    pulseSpeed: 0.7,
    paths: [
      // Northern edge
      [[31.7917, -7.0926], [30.0444, 31.2357], [11.5024, 43.1428]],
      // Southern curve
      [[11.5024, 43.1428], [-1.2921, 36.8219], [-33.9249, 18.4241]],
      // Western edge
      [[-33.9249, 18.4241], [6.5244, 3.3792], [31.7917, -7.0926]]
    ]
  },
  {
    name: 'Asia',
    color: 0xDCB195, // Rich amber
    thickness: 1.3,
    pulseSpeed: 0.75,
    paths: [
      // Northern edge
      [[55.7558, 37.6176], [55.9533, 92.7572], [35.6762, 139.6503]],
      // Southern curve
      [[35.6762, 139.6503], [22.3193, 114.1694], [1.3521, 103.8198]],
      // Western connection
      [[55.7558, 37.6176], [23.8859, 45.0792], [1.3521, 103.8198]]
    ]
  },
  {
    name: 'Oceania',
    color: 0xF0C9A0, // Soft honey
    thickness: 1.1,
    pulseSpeed: 0.95,
    paths: [
      // Australia outline
      [[-12.4634, 130.8456], [-33.8688, 151.2093], [-37.8136, 144.9631], [-31.9505, 115.8605]],
      // Connect to New Zealand
      [[-33.8688, 151.2093], [-41.2865, 174.7762]]
    ]
  }
];

