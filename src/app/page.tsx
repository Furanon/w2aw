"use client";

import { useState } from "react";
import Link from "next/link";
export default function Home() {
  const [location, setLocation] = useState("");
  const [filters, setFilters] = useState({});
  
  const handleLocationChange = (newLocation: string) => {
    setLocation(newLocation);
  };
  
  const handleFilterChange = (newFilters: Record<string, any>) => {
    setFilters(newFilters);
  };
  
  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-900 to-gray-800">
      {/* Header Section */}
      <div className="sticky top-0 z-50 bg-white shadow-md">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4">
          {/* Search functionality moved to header */}
          <div className="mt-4">
            {/* Filter functionality moved to header */}
          </div>
        </div>
      </div>
      
      {/* Welcome Section */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
        <div className="text-center mb-10">
          <h1 className="text-5xl font-bold text-white mb-4">
            Welcome to Where to App
          </h1>
          <p className="text-gray-300 text-xl">
            Discover, explore, and connect with local activities near you.
          </p>
        </div>
      </div>
      
      {/* Visualization Section - Removed GeoNetworkGlobe */}
      <div className="relative w-full mb-12 bg-gray-800 rounded-xl overflow-hidden">
        {/* Globe visualization content will be handled elsewhere */}
      </div>
      
      {/* Featured Content */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
        <h2 className="text-3xl font-bold text-white mb-8 text-center">Featured Destinations</h2>
        
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
          <div className="bg-white rounded-xl shadow-lg overflow-hidden transform hover:scale-105 transition-transform duration-300">
            <div className="h-48 bg-blue-600"></div>
            <div className="p-6">
              <h3 className="text-xl font-bold mb-2">Find Activities</h3>
              <p className="text-gray-600 mb-4">
                Discover new and exciting activities in your area
              </p>
              <Link
                href="/activities"
                className="inline-block bg-blue-600 text-white px-4 py-2 rounded-md hover:bg-blue-700 transition-colors"
              >
                Explore
              </Link>
            </div>
          </div>

          <div className="bg-white rounded-xl shadow-lg overflow-hidden transform hover:scale-105 transition-transform duration-300">
            <div className="h-48 bg-purple-600"></div>
            <div className="p-6">
              <h3 className="text-xl font-bold mb-2">Discover Places</h3>
              <p className="text-gray-600 mb-4">
                Find the perfect spots for your next adventure
              </p>
              <Link
                href="/maps"
                className="inline-block bg-purple-600 text-white px-4 py-2 rounded-md hover:bg-purple-700 transition-colors"
              >
                View Map
              </Link>
            </div>
          </div>

          <div className="bg-white rounded-xl shadow-lg overflow-hidden transform hover:scale-105 transition-transform duration-300">
            <div className="h-48 bg-green-600"></div>
            <div className="p-6">
              <h3 className="text-xl font-bold mb-2">Connect</h3>
              <p className="text-gray-600 mb-4">
                Join local events and meet like-minded people
              </p>
              <Link
                href="/events"
                className="inline-block bg-green-600 text-white px-4 py-2 rounded-md hover:bg-green-700 transition-colors"
              >
                Join Now
              </Link>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
