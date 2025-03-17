import { Metadata } from "next";
import { Container } from "@/components/layout/Container";
import { ActivitiesClient } from "./client";

export const metadata: Metadata = {
  title: "Activities Near You | When2Away",
  description: "Discover things to do near you or your travel destination",
};

export default function ActivitiesPage() {
  return (
    <main className="py-12">
      <Container>
        <div className="mb-8">
          <h1 className="text-3xl sm:text-4xl font-bold mb-2">
            Find Activities
          </h1>
          <p className="text-lg text-gray-600 dark:text-gray-400">
            Discover interesting places and things to do nearby or at your travel destination.
          </p>
        </div>
        
        <ActivitiesClient />
      </Container>
    </main>
  );
}
