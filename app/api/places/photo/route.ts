import { NextRequest, NextResponse } from "next/server";

const GOOGLE_PLACES_API_KEY = process.env.GOOGLE_PLACES_API_KEY;

export async function GET(request: NextRequest) {
  try {
    if (!GOOGLE_PLACES_API_KEY) {
      return NextResponse.json(
        { error: "Google Places API key not configured" },
        { status: 500 }
      );
    }

    // Get photo reference from URL
    const { searchParams } = new URL(request.url);
    const photoReference = searchParams.get("reference");
    const maxWidth = searchParams.get("maxwidth") || "400";
    const maxHeight = searchParams.get("maxheight");

    if (!photoReference) {
      return NextResponse.json(
        { error: "Photo reference is required" },
        { status: 400 }
      );
    }

    // Build Google Places Photo API URL
    const apiUrl = new URL("https://maps.googleapis.com/maps/api/place/photo");
    apiUrl.searchParams.append("key", GOOGLE_PLACES_API_KEY);
    apiUrl.searchParams.append("photoreference", photoReference);
    apiUrl.searchParams.append("maxwidth", maxWidth);
    if (maxHeight) apiUrl.searchParams.append("maxheight", maxHeight);

    // Fetch the photo from Google Places API
    const response = await fetch(apiUrl.toString());

    // If the response is a redirect, return the redirect URL
    if (response.redirected) {
      return NextResponse.redirect(response.url);
    }

    // Otherwise stream the photo data
    const blob = await response.blob();
    return new NextResponse(blob, {
      headers: {
        "Content-Type": response.headers.get("Content-Type") || "image/jpeg",
        "Cache-Control": "public, max-age=86400",
      },
    });
  } catch (error) {
    console.error("Error fetching place photo:", error);
    return NextResponse.json(
      { error: "Failed to fetch place photo" },
      { status: 500 }
    );
  }
}
