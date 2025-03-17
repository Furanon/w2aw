"use client";

import { useState } from "react";
import Image from "next/image";
import { useRouter } from "next/navigation";

type Listing = {
  id: string;
  title: string;
  description: string;
  price: number;
  images: string[];
  property_type: string;
  location_name: string;
  address: string;
  similarity: number;
};

const VectorSearch = () => {
  const [searchQuery, setSearchQuery] = useState("");
  const [searchResults, setSearchResults] = useState<Listing[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const router = useRouter();

  const handleSearch = async () => {
    if (!searchQuery.trim()) return;

    setIsLoading(true);
    setError(null);

    try {
      const response = await fetch("/api/listings/search", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ searchText: searchQuery }),
      });

      if (!response.ok) {
        throw new Error(`Search failed: ${response.statusText}`);
      }

      const data = await response.json();
      setSearchResults(data.listings || []);
    } catch (err) {
      console.error("Search error:", err);
      setError(err instanceof Error ? err.message : "An error occurred during search");
      setSearchResults([]);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="w-full max-w-4xl mx-auto p-4">
      <div className="mb-8">
        <h2 className="text-2xl font-bold mb-4">Semantic Search</h2>
        <p className="text-gray-600 mb-4">
          Search for listings using natural language. Our AI will find the most relevant results
          based on your description.
        </p>
        
        <div className="flex gap-2">
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Describe what you're looking for..."
            className="flex-1 p-3 border rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
            onKeyDown={(e) => e.key === "Enter" && handleSearch()}
          />
          <button
            onClick={handleSearch}
            disabled={isLoading}
            className="bg-blue-600 hover:bg-blue-700 text-white px-6 py-3 rounded-md transition-colors disabled:bg-gray-400"
          >
            {isLoading ? "Searching..." : "Search"}
          </button>
        </div>

        {error && (
          <div className="mt-4 p-4 bg-red-50 text-red-700 rounded-md">
            {error}
          </div>
        )}
      </div>

      {searchResults.length > 0 ? (
        <div className="space-y-6">
          <h3 className="text-xl font-semibold">
            Found {searchResults.length} matching listings
          </h3>
          
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {searchResults.map((listing) => (
              <div
                key={listing.id}
                className="border rounded-lg overflow-hidden shadow-sm hover:shadow-md transition-shadow cursor-pointer"
                onClick={() => router.push(`/listings/${listing.id}`)}
              >
                <div className="relative h-48 w-full">
                  {listing.images && listing.images[0] ? (
                    <Image
                      src={listing.images[0]}
                      alt={listing.title}
                      fill
                      style={{ objectFit: "cover" }}
                    />
                  ) : (
                    <div className="w-full h-full bg-gray-200 flex items-center justify-center">
                      <span className="text-gray-400">No image</span>
                    </div>
                  )}
                </div>
                
                <div className="p-4">
                  <div className="flex justify-between items-start mb-2">
                    <h3 className="font-semibold text-lg">{listing.title}</h3>
                    <div className="text-emerald-600 font-bold">${listing.price}</div>
                  </div>
                  
                  <div className="text-sm text-gray-500 mb-2">
                    {listing.location_name || listing.address}
                  </div>
                  
                  <div className="text-xs text-gray-400 mb-3">
                    {listing.property_type}
                  </div>
                  
                  <p className="text-sm text-gray-600 line-clamp-2">
                    {listing.description}
                  </p>
                  
                  <div className="mt-3 text-xs text-gray-400">
                    Match score: {Math.round(listing.similarity * 100)}%
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      ) : (
        !isLoading && searchQuery && (
          <div className="text-center p-8 bg-gray-50 rounded-md">
            <p className="text-gray-600">
              No matching listings found. Try a different search term.
            </p>
          </div>
        )
      )}
    </div>
  );
};

export default VectorSearch;

