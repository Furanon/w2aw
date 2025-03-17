import Image from "next/image";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { StarIcon } from "@/components/ui/icons";

interface Place {
  place_id: string;
  name: string;
  vicinity: string;
  geometry: {
    location: {
      lat: number;
      lng: number;
    };
  };
  rating?: number;
  types: string[];
  photos?: Array<{
    photo_reference: string;
    width: number;
    height: number;
  }>;
}

interface ActivityCardProps {
  place: Place;
}

export function ActivityCard({ place }: ActivityCardProps) {
  // Format the type for display (replace underscores with spaces, capitalize)
  const formatType = (type: string) => {
    return type
      .split("_")
      .map((word) => word.charAt(0).toUpperCase() + word.slice(1))
      .join(" ");
  };

  // Get the main type for the primary badge
  const mainType = place.types[0];

  // Get secondary types for additional badges (limit to 2)
  const secondaryTypes = place.types.slice(1, 3);

  // Get the photo URL
  const photoUrl = place.photos?.[0]
    ? `/api/place/photo?reference=${place.photos[0].photo_reference}`
    : "/images/placeholder.jpg";

  return (
    <Card className="overflow-hidden h-full flex flex-col">
      <div className="relative h-48 w-full">
        <Image
          src={photoUrl}
          alt={place.name}
          fill
          className="object-cover"
          sizes="(max-width: 768px) 100vw, (max-width: 1200px) 50vw, 33vw"
        />
        {place.rating && (
          <div className="absolute top-2 right-2 bg-white dark:bg-gray-900 rounded-full px-2 py-1 flex items-center shadow-sm">
            <StarIcon className="w-4 h-4 text-yellow-400 mr-1" />
            <span className="font-medium text-sm">{place.rating}</span>
          </div>
        )}
      </div>
      <CardContent className="flex-1 flex flex-col p-4">
        <h3 className="font-bold text-lg mb-1">{place.name}</h3>
        <p className="text-gray-500 dark:text-gray-400 text-sm mb-3">
          {place.vicinity}
        </p>
        <div className="flex flex-wrap gap-2 mt-auto">
          {mainType && (
            <Badge variant="default">{formatType(mainType)}</Badge>
          )}
          {secondaryTypes.map((type) => (
            <Badge key={type} variant="outline">
              {formatType(type)}
            </Badge>
          ))}
        </div>
      </CardContent>
    </Card>
  );
}
