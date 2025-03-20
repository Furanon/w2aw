import { z } from "zod";
import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { KafkaProducer, KAFKA_TOPICS } from "../../../../lib/kafka";

// Notification Types
export type NotificationType = "alert" | "message" | "update" | "system";

export interface Notification {
  id: string;
  type: NotificationType;
  userId: string;
  content: string;
  read: boolean;
  createdAt: Date;
  metadata?: Record<string, any>;
}

// Validation Schemas
const createNotificationSchema = z.object({
  type: z.enum(["alert", "message", "update", "system"]),
  content: z.string().min(1),
  metadata: z.record(z.any()).optional(),
});

const updateNotificationSchema = z.object({
  read: z.boolean(),
});

// GET /api/notifications - Fetch user notifications
export async function GET() {
  try {
    const session = await getServerSession();
    if (!session) {
      return NextResponse.json(
        { error: "Unauthorized" },
        { status: 401 }
      );
    }

    // TODO: Implement database query to fetch notifications
    // For now, return dummy data
    const notifications: Notification[] = [
      {
        id: "1",
        type: "alert",
        userId: session.user.id,
        content: "Test notification",
        read: false,
        createdAt: new Date(),
      },
    ];

    return NextResponse.json({ notifications });
  } catch (error) {
    console.error("Error fetching notifications:", error);
    return NextResponse.json(
      { error: "Internal Server Error" },
      { status: 500 }
    );
  }
}

// POST /api/notifications - Create new notification
export async function POST(request: Request) {
  try {
    const session = await getServerSession();
    if (!session) {
      return NextResponse.json(
        { error: "Unauthorized" },
        { status: 401 }
      );
    }

    const json = await request.json();
    const validatedData = createNotificationSchema.parse(json);

    const notification: Notification = {
      id: `notif_${Date.now()}`,
      ...validatedData,
      userId: session.user.id,
      read: false,
      createdAt: new Date(),
    };

    // Produce Kafka message for notification creation
    const producer = await KafkaProducer.getInstance();
    await producer.produceMessage(KAFKA_TOPICS.NOTIFICATIONS, {
      type: "NOTIFICATION_CREATED",
      payload: notification,
    });

    return NextResponse.json({ notification });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { error: "Invalid notification data", details: error.errors },
        { status: 400 }
      );
    }
    console.error("Error creating notification:", error);
    return NextResponse.json(
      { error: "Internal Server Error" },
      { status: 500 }
    );
  }
}

// PATCH /api/notifications/[id] - Update notification (mark as read)
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
    const validatedData = updateNotificationSchema.parse(json);

    // TODO: Implement database update
    // For now, just acknowledge the update

    // Produce Kafka message for notification update
    const producer = await KafkaProducer.getInstance();
    await producer.produceMessage(KAFKA_TOPICS.NOTIFICATIONS, {
      type: "NOTIFICATION_UPDATED",
      payload: {
        id: params.id,
        userId: session.user.id,
        ...validatedData,
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
    console.error("Error updating notification:", error);
    return NextResponse.json(
      { error: "Internal Server Error" },
      { status: 500 }
    );
  }
}

// DELETE /api/notifications/[id] - Delete notification
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

    // TODO: Implement database deletion
    // For now, just acknowledge the deletion

    // Produce Kafka message for notification deletion
    const producer = await KafkaProducer.getInstance();
    await producer.produceMessage(KAFKA_TOPICS.NOTIFICATIONS, {
      type: "NOTIFICATION_DELETED",
      payload: {
        id: params.id,
        userId: session.user.id,
      },
    });

    return NextResponse.json({
      message: "Notification deleted successfully",
    });
  } catch (error) {
    console.error("Error deleting notification:", error);
    return NextResponse.json(
      { error: "Internal Server Error" },
      { status: 500 }
    );
  }
}
