import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { z } from "zod";
import { KafkaProducer, KAFKA_TOPICS } from "../../../../../lib/kafka";

// Validation schema for notification updates
const updateSchema = z.object({
  read: z.boolean().optional(),
  content: z.string().min(1).optional(),
  metadata: z.record(z.any()).optional(),
});

// GET /api/notifications/[id] - Get a specific notification
export async function GET(
  request: Request,
  { params }: { params: { id: string } }
) {
  try {
    const session = await getServerSession();
    if (!session) {
      return NextResponse.json(
        { error: "Unauthorized" },
        { status: 401 }
      );
    }

    // TODO: Implement database query to fetch specific notification
    // For now, return dummy data
    const notification = {
      id: params.id,
      type: "alert" as const,
      userId: session.user.id,
      content: "Test notification",
      read: false,
      createdAt: new Date(),
    };

    return NextResponse.json({ notification });
  } catch (error) {
    console.error(`Error fetching notification ${params.id}:`, error);
    return NextResponse.json(
      { error: "Internal Server Error" },
      { status: 500 }
    );
  }
}

// PATCH /api/notifications/[id] - Update a specific notification
export async function PATCH(
  request: Request,
  { params }: { params: { id: string } }
) {
  try {
    const session = await getServerSession();
    if (!session) {
      return NextResponse.json(
        { error: "Unauthorized" },
        { status: 401 }
      );
    }

    const json = await request.json();
    const validatedData = updateSchema.parse(json);

    // Produce Kafka message for notification update
    const producer = await KafkaProducer.getInstance();
    await producer.produceMessage(KAFKA_TOPICS.NOTIFICATIONS, {
      type: "NOTIFICATION_UPDATED",
      payload: {
        id: params.id,
        userId: session.user.id,
        ...validatedData,
        updatedAt: new Date(),
      },
    });

    return NextResponse.json({
      message: "Notification updated successfully",
    });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { error: "Invalid update data", details: error.errors },
        { status: 400 }
      );
    }
    console.error(`Error updating notification ${params.id}:`, error);
    return NextResponse.json(
      { error: "Internal Server Error" },
      { status: 500 }
    );
  }
}

// DELETE /api/notifications/[id] - Delete a specific notification
export async function DELETE(
  request: Request,
  { params }: { params: { id: string } }
) {
  try {
    const session = await getServerSession();
    if (!session) {
      return NextResponse.json(
        { error: "Unauthorized" },
        { status: 401 }
      );
    }

    // Produce Kafka message for notification deletion
    const producer = await KafkaProducer.getInstance();
    await producer.produceMessage(KAFKA_TOPICS.NOTIFICATIONS, {
      type: "NOTIFICATION_DELETED",
      payload: {
        id: params.id,
        userId: session.user.id,
        deletedAt: new Date(),
      },
    });

    return NextResponse.json({
      message: "Notification deleted successfully",
    });
  } catch (error) {
    console.error(`Error deleting notification ${params.id}:`, error);
    return NextResponse.json(
      { error: "Internal Server Error" },
      { status: 500 }
    );
  }
}
