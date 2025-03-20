import { NextResponse } from "next/server";
import { consumerHealthMonitor } from "./health";

export async function GET(request: Request) {
    const url = new URL(request.url);
    const consumerId = url.searchParams.get("consumerId");

    try {
        // If requesting a specific consumer, check if it exists in the monitor
        if (consumerId) {
            const allHealth = consumerHealthMonitor.getHealth() as Map<string, any>;
            if (!allHealth.has(consumerId)) {
                return NextResponse.json(
                    { error: "Consumer not found" },
                    { status: 404 }
                );
            }
            return NextResponse.json(consumerHealthMonitor.getHealth(consumerId));
        }

        // Convert Map to Object if returning all consumers
        const health = consumerHealthMonitor.getHealth();
        const response = Object.fromEntries(health as Map<string, any>);
        return NextResponse.json(response);
    } catch (error) {
        console.error("Error fetching consumer health:", error);
        return NextResponse.json(
            { error: "Internal server error" },
            { status: 500 }
        );
    }
}
