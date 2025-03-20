'use client';

import { useState, useEffect } from 'react';
import { useSearchParams, useRouter } from 'next/navigation';
import Link from 'next/link';
import Image from 'next/image';
import FilterBar, { FilterState } from '@/components/FilterBar';
import SearchBar from '@/components/SearchBar';
import { FiArrowUp, FiArrowDown, FiHome, FiDollarSign, FiCalendar, FiMap } from 'react-icons/fi';

// Types
interface Listing {
  id: number;
  title: string;
  description: string;
  price: number;
  location_name: string;
  property_type: string;
  bedrooms?: number;
  bathrooms?: number;
  square_feet?: number;
  created_at: string;
  image_url?: string;
}

interface PaginationInfo {
  totalRecords: number;
  totalPages: number;
  currentPage: number;
}

interface ListingsResponse {
  listings: Listing[];
  pagination: PaginationInfo;
}

const buildQueryString = (params: Record<string, string | number | null | undefined>) => {
  const query = new URLSearchParams();
  Object.entries(params).forEach(([key, value]) => {
    if (value !== undefined && value !== null && value !== '') {
      query.append(key, String(value));
    }
  });
  return query.toString();
};

export default function ListingsPage() {
  const [listings, setListings] = useState<Listing[]>([]);
  const [pagination, setPagination] = useState<PaginationInfo>({
    totalRecords: 0,
    totalPages: 0,
    currentPage: 1
  });
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [location, setLocation] = useState('');
  const [sortBy, setSortBy] = useState('created_at');
  const [sortOrder, setSortOrder] = useState('desc');
  const [priceMin, setPriceMin] = useState<string | null>(null);
  const [priceMax, setPriceMax] = useState<string | null>(null);
  const [propertyType, setPropertyType] = useState<string | null>(null);

  const searchParams = useSearchParams();
  const router = useRouter();

  useEffect(() => {
    const page = searchParams.get('page') || '1';
    const location = searchParams.get('location') || '';
    const sort_by = searchParams.get('sort_by') || 'created_at';
    const sort_order = searchParams.get('sort_order') || 'desc';
    const price_min = searchParams.get('price_min');
    const price_max = searchParams.get('price_max');
    const property_type = searchParams.get('property_type');

    setPagination(prev => ({ ...prev, currentPage: parseInt(page, 10) }));
    setLocation(location);
    setSortBy(sort_by);
    setSortOrder(sort_order);
    setPriceMin(price_min);
    setPriceMax(price_max);
    setPropertyType(property_type);
  }, [searchParams]);

  const handleFilterChange = (filters: FilterState) => {
    let newPriceMin = null;
    let newPriceMax = null;
    let newPropertyType = null;

    if (filters.propertyTypes.length > 0) {
      newPropertyType = filters.propertyTypes[0];
    }

    if (filters.priceRanges.length > 0) {
      const priceRange = filters.priceRanges[0];
      if (priceRange === 'price_0_500') {
        newPriceMax = '500';
      } else if (priceRange === 'price_500_1500') {
        newPriceMin = '500';
        newPriceMax = '1500';
      } else if (priceRange === 'price_1500_3000') {
        newPriceMin = '1500';
        newPriceMax = '3000';
      } else if (priceRange === 'price_3000_5000') {
        newPriceMin = '3000';
        newPriceMax = '5000';
      } else if (priceRange === 'price_5000_plus') {
        newPriceMin = '5000';
      }
    }

    setPriceMin(newPriceMin);
    setPriceMax(newPriceMax);
    setPropertyType(newPropertyType);
    setPagination(prev => ({ ...prev, currentPage: 1 }));

    updateUrlAndFetch(1, location, sortBy, sortOrder, newPriceMin, newPriceMax, newPropertyType);
  };

  const handleLocationChange = (newLocation: string) => {
    setLocation(newLocation);
    setPagination(prev => ({ ...prev, currentPage: 1 }));
    updateUrlAndFetch(1, newLocation, sortBy, sortOrder, priceMin, priceMax, propertyType);
  };

  const handleSortChange = (newSortBy: string) => {
    const newSortOrder = newSortBy === sortBy && sortOrder === 'asc' ? 'desc' : 'asc';
    setSortBy(newSortBy);
    setSortOrder(newSortOrder);
    updateUrlAndFetch(
      pagination.currentPage,
      location,
      newSortBy,
      newSortOrder,
      priceMin,
      priceMax,
      propertyType
    );
  };

  const handlePageChange = (newPage: number) => {
    if (newPage < 1 || newPage > pagination.totalPages) return;
    setPagination(prev => ({ ...prev, currentPage: newPage }));
    updateUrlAndFetch(newPage, location, sortBy, sortOrder, priceMin, priceMax, propertyType);
  };

  const updateUrlAndFetch = (
    page: number,
    location: string,
    sort_by: string,
    sort_order: string,
    price_min: string | null,
    price_max: string | null,
    property_type: string | null,
  ) => {
    const queryParams = buildQueryString({
      page,
      location: location || undefined,
      sort_by,
      sort_order,
      price_min,
      price_max,
      property_type,
      limit: 12
    });

    router.push(`/listings?${queryParams}`);
    fetchListings(queryParams);
  };

  const fetchListings = async (queryString: string) => {
    setIsLoading(true);
    setError(null);

    try {
      const response = await fetch(`/api/listings?${queryString}`);
      if (!response.ok) {
        throw new Error(`Error fetching listings: ${response.status}`);
      }
      const data: ListingsResponse = await response.json();
      setListings(data.listings);
      setPagination(data.pagination);
    } catch (err) {
      console.error('Error fetching listings:', err);
      setError('Failed to load listings. Please try again later.');
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    const queryParams = buildQueryString({
      page: pagination.currentPage,
      location: location || undefined,
      sort_by: sortBy,
      sort_order: sortOrder,
      price_min: priceMin,
      price_max: priceMax,
      property_type: propertyType,
      limit: 12
    });

    fetchListings(queryParams);
  }, []);

  const formatPrice = (price: number) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD',
      maximumFractionDigits: 0
    }).format(price);
  };

  const renderPaginationItems = () => {
    const items = [];
    const { currentPage, totalPages } = pagination;

    items.push(
      <button
        key="first"
        className={`px-3 py-1 rounded-md ${currentPage === 1 ? 'bg-primary text-white' : 'bg-gray-100 hover:bg-gray-200'}`}
        onClick={() => handlePageChange(1)}
        disabled={currentPage === 1}
      >
        1
      </button>
    );

    if (currentPage > 3) {
      items.push(
        <span key="ellipsis1" className="px-2">
          ...
        </span>
      );
    }

    for (let i = Math.max(2, currentPage - 1); i <= Math.min(totalPages - 1, currentPage + 1); i++) {
      if (i <= 1 || i >= totalPages) continue;
      items.push(
        <button
          key={i}
          className={`px-3 py-1 rounded-md ${currentPage === i ? 'bg-primary text-white' : 'bg-gray-100 hover:bg-gray-200'}`}
          onClick={() => handlePageChange(i)}
        >
          {i}
        </button>
      );
    }

    if (currentPage < totalPages - 2) {
      items.push(
        <span key="ellipsis2" className="px-2">
          ...
        </span>
      );
    }

    if (totalPages > 1) {
      items.push(
        <button
          key="last"
          className={`px-3 py-1 rounded-md ${currentPage === totalPages ? 'bg-primary text-white' : 'bg-gray-100 hover:bg-gray-200'}`}
          onClick={() => handlePageChange(totalPages)}
          disabled={currentPage === totalPages}
        >
          {totalPages}
        </button>
      );
    }

    return items;
  };

  const placeholderImage = "https://via.placeholder.com/500x300?text=No+Image+Available";

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="container mx-auto px-4 py-8">
        <h1 className="text-3xl font-bold text-gray-900 mb-8">Property Listings</h1>

        <div className="mb-8">
          <div className="bg-white rounded-lg shadow-sm p-4 mb-4">
            <div className="flex flex-col md:flex-row gap-4">
              <div className="w-full md:w-1/3">
                <SearchBar
                  placeholder="Search by location"
                  onLocationChange={handleLocationChange}
                  initialValue={location}
                  className="w-full"
                />
              </div>
            </div>
          </div>

          <FilterBar onFilterChange={handleFilterChange} />
        </div>

        <div className="bg-white rounded-lg shadow-sm p-4 mb-6">
          <div className="flex flex-wrap items-center justify-between">
            <div className="mb-2 md:mb-0">
              <span className="text-gray-700 mr-2">Sort by:</span>
              <div className="inline-flex shadow-sm rounded-md">
                <button
                  className={`px-4 py-2 text-sm font-medium rounded-l-lg flex items-center ${
                    sortBy === 'price' ? 'bg-primary text-white' : 'bg-white text-gray-700 hover:bg-gray-50'
                  } border border-gray-200`}
                  onClick={() => handleSortChange('price')}
                >
                  <FiDollarSign className="mr-1" />
                  Price
                  {sortBy === 'price' && (
                    sortOrder === 'asc' ? <FiArrowUp className="ml-1" /> : <FiArrowDown className="ml-1" />
                  )}
                </button>
                <button
                  className={`px-4 py-2 text-sm font-medium flex items-center ${
                    sortBy === 'created_at' ? 'bg-primary text-white' : 'bg-white text-gray-700 hover:bg-gray-50'
                  } border-t border-b border-r border-gray-200`}
                  onClick={() => handleSortChange('created_at')}
                >
                  <FiCalendar className="mr-1" />
                  Date
                  {sortBy === 'created_at' && (
                    sortOrder === 'asc' ? <FiArrowUp className="ml-1" /> : <FiArrowDown className="ml-1" />
                  )}
                </button>
                <button
                  className={`px-4 py-2 text-sm font-medium rounded-r-lg flex items-center ${
                    sortBy === 'location_name' ? 'bg-primary text-white' : 'bg-white text-gray-700 hover:bg-gray-50'
                  } border-t border-b border-r border-gray-200`}
                  onClick={() => handleSortChange('location_name')}
                >
                  <FiMap className="mr-1" />
                  Location
                  {sortBy === 'location_name' && (
                    sortOrder === 'asc' ? <FiArrowUp className="ml-1" /> : <FiArrowDown className="ml-1" />
                  )}
                </button>
              </div>
            </div>

            <div className="ml-auto text-sm text-gray-600 font-medium">
              {!isLoading && !error && (
                <p>Showing {pagination.totalRecords} listings</p>
              )}
            </div>
          </div>
        </div>

        {error && (
          <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded mb-6">
            <p>{error}</p>
          </div>
        )}

        {isLoading && (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
            {[...Array(8)].map((_, index) => (
              <div key={index} className="bg-white rounded-lg shadow-sm overflow-hidden animate-pulse">
                <div className="h-48 bg-gray-200" />
                <div className="p-4">
                  <div className="h-4 bg-gray-200 rounded w-3/4 mb-2" />
                  <div className="h-4 bg-gray-200 rounded w-1/2 mb-4" />
                  <div className="h-4 bg-gray-200 rounded w-4/5" />
                </div>
              </div>
            ))}
          </div>
        )}

        {!isLoading && !error && (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
            {listings.map((listing) => (
              <Link 
                href={`/listings/${listing.id}`} 
                key={listing.id} 
                className="bg-white rounded-lg shadow-sm overflow-hidden hover:shadow-md transition-shadow duration-200"
              >
                <div className="relative h-48 w-full">
                  <Image
                    src={listing.image_url || placeholderImage}
                    alt={listing.title}
                    fill
                    sizes="(max-width: 768px) 100vw, (max-width: 1200px) 50vw, 25vw"
                    className="object-cover"
                    priority={false}
                  />
                </div>
                <div className="p-4">
                  <div className="flex justify-between items-start mb-2">
                    <h3 className="text-lg font-semibold text-gray-900 line-clamp-1">{listing.title}</h3>
                  </div>
                  <p className="text-xl font-bold text-primary mb-2">
                    {formatPrice(listing.price)}
                  </p>
                  <div className="flex items-center text-gray-600 mb-1">
                    <FiMap className="mr-2 h-4 w-4 flex-shrink-0" />
                    <span className="text-sm line-clamp-1">{listing.location_name}</span>
                  </div>
                  <div className="flex items-center text-gray-600">
                    <FiHome className="mr-2 h-4 w-4 flex-shrink-0" />
                    <span className="text-sm">{listing.property_type}</span>
                  </div>
                </div>
              </Link>
            ))}
          </div>
        )}

        {!isLoading && !error && listings.length > 0 && (
          <div className="flex justify-center gap-2 mt-8">
            {renderPaginationItems()}
          </div>
        )}
      </div>
    </div>
  );
}
