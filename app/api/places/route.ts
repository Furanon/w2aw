import { NextRequest, NextResponse } from "next/server";

// Mock data for places - in a real app this would call Google Places API
const mockPlaces = [
  {
    place_id: "ChIJN1t_tDeuEmsRUsoyG83frY4",
    name: "Sydney Opera House",
    vicinity: "Bennelong Point, Sydney",
    geometry: {
      location: {
        lat: -33.8567844,
        lng: 151.2152967,
      },
    },
    rating: 4.7,
    types: ["tourist_attraction", "performing_arts_theater"],
    photos: [
      {
        photo_reference: "sydney_opera_house_1",
        width: 800,
        height: 600,
      },
    ],
  },
  {
    place_id: "ChIJP3Sa8ziYEmsRUKgyFmh9AQM",
    name: "Hyde Park",
    vicinity: "Elizabeth St, Sydney",
    geometry: {
      location: {
        lat: -33.8731,
        lng: 151.2111,
      },
    },
    rating: 4.5,
    types: ["park", "tourist_attraction"],
    photos: [
      {
        photo_reference: "hyde_park_1",
        width: 800,
        height: 600,
      },
    ],
  },
  {
    place_id: "ChIJP3Sa8ziYEmsRUKgyFmh9AQ3",
    name: "Sydney Harbour Bridge",
    vicinity: "Sydney Harbour Bridge, Sydney",
    geometry: {
      location: {
        lat: -33.8523,
        lng: 151.2108,
      },
    },
    rating: 4.8,
    types: ["tourist_attraction", "point_of_interest"],
    photos: [
      {
        photo_reference: "sydney_harbour_bridge_1",
        width: 800,
        height: 600,
      },
    ],
  },
  {
    place_id: "ChIJP3Sa8ziYEmsRUKgyFmh9AQ4",
    name: "Bondi Beach",
    vicinity: "Bondi Beach, Sydney",
    geometry: {
      location: {
        lat: -33.8915,
        lng: 151.2767,
      },
    },
    rating: 4.6,
    types: ["natural_feature", "tourist_attraction"],
    photos: [
      {
        photo_reference: "bondi_beach_1",
        width: 800,
        height: 600,
      },
    ],
  },
  {
    place_id: "ChIJP3Sa8ziYEmsRUKgyFmh9AQ5",
    name: "The Rocks",
    vicinity: "The Rocks, Sydney",
    geometry: {
      location: {
        lat: -33.8599,
        lng: 151.2090,
      },
    },
    rating: 4.4,
    types: ["tourist_attraction", "shopping_mall"],
    photos: [
      {
        photo_reference: "the_rocks_1",
        width: 800,
        height: 600,
      },
    ],
  },
  {
    place_id: "ChIJP3Sa8ziYEmsRUKgyFmh9AQ6",
    name: "Darling Harbour",
    vicinity: "Darling Harbour, Sydney",
    geometry: {
      location: {
        lat: -33.8736,
        lng: 151.2008,
      },
    },
    rating: 4.5,
    types: ["tourist_attraction", "restaurant"],
    photos: [
      {
        photo_reference: "darling_harbour_1",
        width: 800,
        height: 600,
      },
    ],
  },
  {
    place_id: "ChIJP3Sa8ziYEmsRUKgyFmh9AQ7",
    name: "Museum of Contemporary Art Australia",
    vicinity: "140 George St, The Rocks, Sydney",
    geometry: {
      location: {
        lat: -33.8599,
        lng: 151.2090,
      },
    },
    rating: 4.3,
    types: ["museum", "tourist_attraction"],
    photos: [
      {
        photo_reference: "mca_1",
        width: 800,
        height: 600,
      },
    ],
  },
  {
    place_id: "ChIJP3Sa8ziYEmsRUKgyFmh9AQ8",
    name: "Royal Botanic Garden",
    vicinity: "Mrs Macquaries Rd, Sydney",
    geometry: {
      location: {
        lat: -33.8643,
        lng: 151.2168,
      },
    },
    rating: 4.7,
    types: ["park", "tourist_attraction"],
    photos: [
      {
        photo_reference: "botanic_garden_1",
        width: 800,
        height: 600,
      },
    ],
  },
];

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    
    // Get parameters from the request
    const location = searchParams.get("location");
    const radiusParam = searchParams.get("radius");
    const query = searchParams.get("query");
    const type = searchParams.get("type");
    
    // Validate required parameters
    if (!location) {
      return NextResponse.json(
        { error: "Location parameter is required" },
        { status: 400 }
      );
    }
    
    const radius = radiusParam ? parseInt(radiusParam, 10) : 5000;
    
    // In a real app, we would call the Google Places API here
    // For this demo, we'll return mock data filtered by the parameters
    
    // Parse the location coordinates
    const [lat, lng] = location.split(",").map(parseFloat);
    
    if (isNaN(lat) || isNaN(lng)) {
      return NextResponse.json(
        { error: "Invalid location format. Expected format: lat,lng" },
        { status: 400 }
      );
    }
    
    // Filter places based on type (if provided)
    let filteredPlaces = [...mockPlaces];
    
    if (type) {
      filteredPlaces = filteredPlaces.filter((place) =>
        place.types.includes(type)
      );
    }
    
    // Filter places based on query (if provided)
    if (query) {
      const queryLower = query.toLowerCase();
      filteredPlaces = filteredPlaces.filter(
        (place) =>
          place.name.toLowerCase().includes(queryLower) ||
          place.vicinity.toLowerCase().includes(queryLower) ||
          place.types.some((t) => t.includes(queryLower))
      );
    }
    
    // Calculate distance from search location (simplified for demo)
    // In a real app, we would use the haversine formula or similar
    const calculateDistance = (
      lat1: number,
      lng1: number,
      lat2: number,
      lng2: number
    ) => {
      // Simple Euclidean distance for demonstration
      // This is not accurate for geographic coordinates but works for the demo
      const latDiff = lat1 - lat2;
      const lngDiff = lng1 - lng2;
      return Math.sqrt(latDiff * latDiff + lngDiff * lngDiff) * 111000; // Rough conversion to meters
    };
    
    // Filter by radius
    filteredPlaces = filteredPlaces.filter((place) => {
      const distance = calculateDistance(
        lat,
        lng,
        place.geometry.location.lat,
        place.geometry.location.lng
      );
      return distance <= radius;
    });
    
    // Return the filtered results
    return NextResponse.json({
      results: filteredPlaces,
      status: "OK",
    });
  } catch (error) {
    console.error("Error in places API:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}
