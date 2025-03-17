import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';

export const config = {
  matcher: [
    '/api/edge/:path*',
    '/((?!_next/static|_next/image|favicon.ico).*)',
  ],
};

export default function middleware(request: NextRequest) {
  const requestHeaders = new Headers(request.headers);
  const response = NextResponse.next({
    request: {
      headers: requestHeaders,
    },
  });

  // Add security headers
  response.headers.set('X-Frame-Options', 'DENY');
  response.headers.set('X-Content-Type-Options', 'nosniff');
  response.headers.set('Referrer-Policy', 'origin-when-cross-origin');
  response.headers.set(
    'Strict-Transport-Security',
    'max-age=31536000; includeSubDomains'
  );
  response.headers.set(
    'Content-Security-Policy',
    "default-src 'self'; script-src 'self' 'unsafe-eval' 'unsafe-inline'; style-src 'self' 'unsafe-inline'; img-src 'self' blob: data: https:; font-src 'self' data:;"
  );

  // Handle CORS for API routes
  if (request.nextUrl.pathname.startsWith('/api/')) {
    response.headers.set('Access-Control-Allow-Origin', '*');
    response.headers.set(
      'Access-Control-Allow-Methods',
      'GET, POST, PUT, DELETE, OPTIONS'
    );
    response.headers.set(
      'Access-Control-Allow-Headers',
      'Content-Type, Authorization'
    );

    // Handle preflight requests
    if (request.method === 'OPTIONS') {
      return new NextResponse(null, {
        status: 200,
        headers: response.headers,
      });
    }
  }

  // Forward client IP and geo information
  if (request.ip) {
    requestHeaders.set('x-real-ip', request.ip);
    requestHeaders.set('x-forwarded-for', request.ip);
  }

  // Forward Vercel geo information if available
  const geo = request.geo;
  if (geo?.country) {
    requestHeaders.set('x-vercel-ip-country', geo.country);
  }
  if (geo?.region) {
    requestHeaders.set('x-vercel-ip-country-region', geo.region);
  }
  if (geo?.city) {
    requestHeaders.set('x-vercel-ip-city', geo.city);
  }

  return response;
}

