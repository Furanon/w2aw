'use client';

import Link from 'next/link';
import { useSession, signIn, signOut } from 'next-auth/react';
import NotificationsPanel from '@/components/NotificationsPanel';
import SearchBar from '@/components/SearchBar';
import FilterBar from '@/components/FilterBar';
import { useState } from 'react';
const Header = () => {
  const { data: session } = useSession();
  const [searchLocation, setSearchLocation] = useState("");
  const [filters, setFilters] = useState({
    propertyTypes: [],
    priceRanges: [],
    bedrooms: [],
    bathrooms: []
  });

  const handleLocationChange = (location: string) => {
    setSearchLocation(location);
    // You can add additional logic here if needed
  };

  const handleFilterChange = (newFilters: any) => {
    setFilters(newFilters);
    // You can add additional logic here if needed
  };

  return (
    <header className="bg-white shadow-sm">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        {/* First row: Logo and Navigation */}
        <div className="flex justify-between h-16 items-center">
          <div className="flex items-center">
            <Link href="/" className="text-xl font-bold text-gray-900">
              NextJS Real Estate
            </Link>
          </div>

          <nav className="flex items-center space-x-4">
            <Link href="/" className="text-gray-700 hover:text-gray-900 px-3 py-2 rounded-md text-sm font-medium">
              Home
            </Link>
            <Link href="/listings" className="text-gray-700 hover:text-gray-900 px-3 py-2 rounded-md text-sm font-medium">
              Listings
            </Link>
            {session ? (
              <>
                <Link href="/profile" className="text-gray-700 hover:text-gray-900 px-3 py-2 rounded-md text-sm font-medium">
                  Profile
                </Link>
                <div className="relative">
                  <NotificationsPanel />
                </div>
                <button
                  onClick={() => signOut()}
                  className="text-gray-700 hover:text-gray-900 px-3 py-2 rounded-md text-sm font-medium"
                >
                  Sign Out
                </button>
              </>
            ) : (
              <button
                onClick={() => signIn()}
                className="text-gray-700 hover:text-gray-900 px-3 py-2 rounded-md text-sm font-medium"
              >
                Sign In
              </button>
            )}
          </nav>
        </div>
        
        {/* Second row: Search and Filters */}
        <div className="py-3 pb-4 border-b border-gray-200">
          <div className="flex flex-col md:flex-row gap-4 items-center">
            <div className="w-full md:w-1/3">
              <SearchBar 
                placeholder="Where are you looking?" 
                onLocationChange={handleLocationChange}
                className="w-full"
              />
            </div>
          </div>
        </div>
      </div>
      
      {/* Filter Bar - Full width section */}
      <FilterBar onFilterChange={handleFilterChange} />
    </header>
  );
};

export default Header;
