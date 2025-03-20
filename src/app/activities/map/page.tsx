import { Metadata } from 'next';
import { Suspense } from 'react';
import { ActivitiesMap } from '@/components/maps/ActivitiesMap';
import { Skeleton } from '@/components/ui/skeleton';

export const metadata: Metadata = {
  title: 'Discover Activities | Where to Adventure',
  description: 'Find top activities and attractions nearby for your next adventure.',
};

export default function ActivitiesMapPage() {
  return (
    <div className="container mx-auto px-4 py-8">
      <h1 className="text-3xl font-bold mb-2">Discover Activities</h1>
      <p className="text-gray-600 mb-6">Find exciting activities and attractions for your next adventure</p>
      
      <div className="grid grid-cols-1 gap-6">
        <div className="bg-white rounded-lg shadow-md overflow-hidden">
          <div className="p-4 border-b">
            <h2 className="text-xl font-semibold">Nearby Activities Map</h2>
            <p className="text-gray-600">Explore activities and attractions in the area</p>
          </div>
          
          <div className="p-4">
            <Suspense fallback={<MapSkeleton />}>
              <ActivitiesMap 
                location="51.505,-0.09" 
                radius={5000}
                query="attractions" 
                type="tourist_attraction" 
              />
            </Suspense>
          </div>
        </div>
        
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          <InfoCard 
            title="How to Use the Map"
            description="Apply filters to find activities that match your interests. Click on markers to see details about each activity."
            icon="🗺️"
          />
          
          <InfoCard 
            title="Activity Types"
            description="Choose from various activity types like tourist attractions, museums, parks, restaurants, and more to find exactly what interests you."
            icon="🏛️"
          />
          
          <InfoCard 
            title="Location Options"
            description="Enter coordinates manually or use your current location to discover activities nearby or in a specific area you're planning to visit."
            icon="📍"
          />
        </div>
      </div>
    </div>
  );
}

function MapSkeleton() {
  return (
    <div className="space-y-4">
      <Skeleton className="h-[200px] w-full rounded-lg" />
      <Skeleton className="h-[400px] w-full rounded-lg" />
    </div>
  );
}

interface InfoCardProps {
  title: string;
  description: string;
  icon: string;
}

function InfoCard({ title, description, icon }: InfoCardProps) {
  return (
    <div className="bg-white rounded-lg shadow-md p-6">
      <div className="flex items-start gap-4">
        <div className="text-3xl">{icon}</div>
        <div>
          <h3 className="text-lg font-semibold">{title}</h3>
          <p className="text-gray-600 mt-2">{description}</p>
        </div>
      </div>
    </div>
  );
}
