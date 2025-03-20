# Next.js App Router Migration - Next Steps

## Current Implementation Status

### Implemented Routes (src/app)
- Authentication: `/auth/login`
- Maps: `/maps`
- Globe: `/globe`
- Listings: `/listings/create`
- Explore: `/explore`
- Search: `/search`
- Profile: `/profile`
- Activities: `/activities/map`

### Implemented API Routes (src/app/api)
- Authentication: `/api/auth/[...nextauth]`
- Places: `/api/places` and `/api/places/photo`
- Listings: `/api/listings`
- Edge routing: `/api/edge`
- Jobs: `/api/jobs`
- Geocoding: `/api/geocode`
- Kafka Consumer: `/api/kafka-consumer`

## Routes To Implement

### 1. Notifications System
```typescript
// Priority: High
// Location: src/app/api/notifications/route.ts
// Required endpoints:
- GET /api/notifications
- POST /api/notifications
- PATCH /api/notifications/:id
- DELETE /api/notifications/:id
```

### 2. Visualization Routes
```typescript
// Location: src/app/api/visualizations/
// Required endpoints for:
- EnhancedViz: /api/visualizations/enhanced
- MapView: /api/visualizations/map
- GlobeView: /api/visualizations/globe
- NetworkVisualization: /api/visualizations/network
```

### 3. Filter System
```typescript
// Location: src/app/api/filters/
// Required endpoints:
- GET /api/filters
- POST /api/filters/apply
- GET /api/filters/presets
```

### 4. Vector Search
```typescript
// Location: src/app/api/vector-search/
// Required endpoints:
- POST /api/vector-search/query
- GET /api/vector-search/suggest
```

## Tech Stack Context
- Next.js with TypeScript
- Neon (PostgreSQL)
- Kafka for real-time events
- TensorFlow with Apache TVM
- Three.js & Leaflet for visualizations
- NextAuth for authentication
- Cloudflare for edge computing
- Google Places API integration

## Next Implementation Steps:
1. Start with notifications system implementation
2. Add visualization route handlers
3. Implement filter system endpoints
4. Set up vector search functionality

## Important Notes:
- Follow Next.js 13+ App Router conventions
- Implement proper error handling
- Add TypeScript types for all API responses
- Consider rate limiting for API routes
- Add Swagger/OpenAPI documentation
- Implement proper validation using zod or similar
