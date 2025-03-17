import { NextRequest, NextResponse } from "next/server";
import { query } from "../../../../lib/db";
import { generateEmbedding } from "../../../../lib/embeddings";
import { authOptions } from "../../auth/[...nextauth]/route";
import { getServerSession } from "next-auth/next";

export async function POST(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    const body = await request.json();
    const { searchText } = body;

    if (!searchText || typeof searchText !== "string") {
      return NextResponse.json(
        { error: "Search text is required" },
        { status: 400 }
      );
    }

    // Generate embedding for search text
    const searchEmbedding = await generateEmbedding(searchText);
    
    if (!searchEmbedding) {
      return NextResponse.json(
        { error: "Failed to generate embedding for search text" },
        { status: 500 }
      );
    }

    // Convert embedding array to PostgreSQL vector format
    const embeddingString = `[${searchEmbedding.join(",")}]`;

    // Search for listings by vector similarity
    const result = await query(`
      SELECT 
        l.id,
        l.title,
        l.description,
        l.images,
        l.property_type,
        l.price,
        l.created_at,
        l.location_name,
        l.address,
        u.name as owner_name,
        u.image as owner_image,
        1 - (l.embedding <=> $1::vector) as similarity
      FROM 
        listings l
      JOIN 
        users u ON l.user_id = u.id
      WHERE 
        l.is_published = true
      ORDER BY 
        l.embedding <=> $1::vector
      LIMIT 20
    `, [embeddingString]);

    return NextResponse.json({
      listings: result.rows,
      count: result.rowCount
    });
  } catch (error) {
    console.error("[LISTINGS_SEARCH]", error);
    return NextResponse.json(
      { error: "Internal error" },
      { status: 500 }
    );
  }
}

export async function GET(request: NextRequest) {
  const searchParams = request.nextUrl.searchParams;
  const query = searchParams.get("q");
  
  if (!query) {
    return NextResponse.json(
      { error: "Search query is required" },
      { status: 400 }
    );
  }
  
  try {
    // Generate embedding for search query
    const searchEmbedding = await generateEmbedding(query);
    
    if (!searchEmbedding) {
      return NextResponse.json(
        { error: "Failed to generate embedding for search query" },
        { status: 500 }
      );
    }
    
    // Convert embedding array to PostgreSQL vector format
    const embeddingString = `[${searchEmbedding.join(",")}]`;
    
    // Search for listings by vector similarity
    const result = await query(`
      SELECT 
        l.id,
        l.title,
        l.description,
        l.images,
        l.property_type,
        l.price,
        l.created_at,
        l.location_name,
        l.address,
        u.name as owner_name,
        u.image as owner_image,
        1 - (l.embedding <=> $1::vector) as similarity
      FROM 
        listings l
      JOIN 
        users u ON l.user_id = u.id
      WHERE 
        l.is_published = true
      ORDER BY 
        l.embedding <=> $1::vector
      LIMIT 20
    `, [embeddingString]);
    
    return NextResponse.json({
      listings: result.rows,
      count: result.rowCount
    });
  } catch (error) {
    console.error("[LISTINGS_SEARCH]", error);
    return NextResponse.json(
      { error: "Internal error" },
      { status: 500 }
    );
  }
}

