import { Container } from "@/components/ui/container";
import { ActivityFilters } from "@/components/activities/ActivityFilters";
import { ActivityResults } from "@/components/activities/ActivityResults";
import { Suspense } from "react";

export const metadata = {
  title: "Explore Activities | Where2Go",
  description: "Discover the best activities and attractions around you",
};

export default function ExplorePage({
  searchParams,
}: {
  searchParams: { [key: string]: string | string[] | undefined };
}) {
  // Extract search parameters (defaulting to empty values if not present)
  const location = typeof searchParams.location === "string" ? searchParams.location : "";
  const radius = typeof searchParams.radius === "string" ? parseInt(searchParams.radius) : 5000;
  const query = typeof searchParams.query === "string" ? searchParams.query : undefined;
  const type = typeof searchParams.type === "string" ? searchParams.type : undefined;

  // Check if we have any filters applied
  const hasFilters = Boolean(location);

  return (
    <main>
      <Container className="py-8">
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
          {/* Sidebar with filters */}
          <div className="lg:col-span-3">
            <div className="sticky top-24 bg-white dark:bg-gray-950 p-6 rounded-lg border border-gray-200 dark:border-gray-800">
              <h2 className="text-xl font-bold mb-4">Discover Places</h2>
              <ActivityFilters
                onFilterChange={(filters) => {
                  // In a real app, this would update the URL params
                  // and trigger a navigation/refresh
                  const params = new URLSearchParams();
                  params.set("location", filters.location);
                  params.set("radius", filters.radius.toString());
                  if (filters.query) params.set("query", filters.query);
                  if (filters.type) params.set("type", filters.type);
                  
                  // Update URL without refresh
                  window.history.pushState(
                    {},
                    "",
                    `?${params.toString()}`
                  );
                  
                  // Force page refresh to apply new filters
                  window.location.reload();
                }}
                initialLocation={location}
              />
            </div>
          </div>

          {/* Main content area */}
          <div className="lg:col-span-9">
            {hasFilters ? (
              <Suspense fallback={<p>Loading results...</p>}>
                <ActivityResults
                  location={location}
                  radius={radius}
                  query={query}
                  type={type}
                />
              </Suspense>
            ) : (
              <div className="bg-gray-50 dark:bg-gray-800 p-8 text-center rounded-lg">
                <h3 className="text-lg font-medium mb-2">
                  Start by selecting a location
                </h3>
                <p className="text-gray-500 dark:text-gray-400">
                  Use the filters on the left to find activities in your area.
                </p>
              </div>
            )}
          </div>
        </div>
      </Container>
    </main>
  );
}
