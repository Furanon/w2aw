import { NextRequest, NextResponse } from "next/server";

// Map of photo references to placeholder image URLs
const photoMap: Record<string, string> = {
  sydney_opera_house_1: "https://images.unsplash.com/photo-1624138784614-87fd1b6528f8?q=80&w=1000",
  hyde_park_1: "https://images.unsplash.com/photo-1494122474412-aeaf73d11dfc?q=80&w=1000",
  sydney_harbour_bridge_1: "https://images.unsplash.com/photo-1506973035872-a4ec16b8e8d9?q=80&w=1000",
  bondi_beach_1: "https://images.unsplash.com/photo-1506973035872-a4ec16b8e8d9?q=80&w=1000",
  the_rocks_1: "https://images.unsplash.com/photo-1516001514644-ff5c6e1580ff?q=80&w=1000",
  darling_harbour_1: "https://images.unsplash.com/photo-1548402439-5ea3fd7d7d97?q=80&w=1000",
  mca_1: "https://images.unsplash.com/photo-1518998053901-5348d3961a04?q=80&w=1000",
  botanic_garden_1: "https://images.unsplash.com/photo-1484807352052-23338990c6c6?q=80&w=1000",
};

// Default fallback image
const fallbackImage = "https://images.unsplash.com/photo-1500835556837-99ac94a94552?q=80&w=1000";

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const reference = searchParams.get("reference");
    
    if (!reference) {
      return NextResponse.json(
        { error: "Photo reference is required" },
        { status: 400 }
      );
    }
    
    // In a real app, this would call the Google Places Photo API
    // For this demo, we'll redirect to placeholder images
    
    const imageUrl = photoMap[reference] || fallbackImage;
    
    // Redirect to the image URL
    return NextResponse.redirect(imageUrl);
  } catch (error) {
    console.error("Error in place photo API:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}
