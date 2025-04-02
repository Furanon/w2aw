import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth/next';
import { z } from 'zod';
import { authOptions } from '../auth/[...nextauth]/route';
import { query, transaction } from '@/lib/db';
import { CalendarProducer, CalendarEventType } from '@/lib/kafka/producers/calendar';

// Define Zod schema for preference validation
const PreferenceSchema = z.object({
  sourceEventId: z.number(),
  instructorId: z.string().uuid().optional(),
  preferredTimeStart: z.string().optional(),
  preferredTimeEnd: z.string().optional(),
  preferredDays: z.array(z.number().min(1).max(7)).optional(),
  locationId: z.number().optional(),
  activityType: z.string().optional(),
  maxPrice: z.number().optional(),
  socialData: z.record(z.unknown()).optional(),
});

// Define preference event type for Kafka messages
enum PreferenceEventType {
  LIKE = 'LIKE',
  UNLIKE = 'UNLIKE',
  UPDATE = 'UPDATE',
}

/**
 * GET handler for fetching user preferences
 */
export async function GET(request: NextRequest) {
  try {
    // Check authentication
    const session = await getServerSession(authOptions);
    if (!session || !session.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const userId = session.user.id;
    
    // Parse query parameters
    const { searchParams } = new URL(request.url);
    const sourceEventId = searchParams.get('sourceEventId');
    const instructorId = searchParams.get('instructorId');
    const activityType = searchParams.get('activityType');
    const locationId = searchParams.get('locationId');
    
    // Build SQL query based on provided filters
    let sql = `
      SELECT 
        ucp.id,
        ucp.source_event_id as "sourceEventId",
        ucp.instructor_id as "instructorId",
        ucp.preferred_time_start as "preferredTimeStart",
        ucp.preferred_time_end as "preferredTimeEnd",
        ucp.preferred_days as "preferredDays",
        ucp.location_id as "locationId",
        ucp.activity_type as "activityType",
        ucp.max_price as "maxPrice",
        ucp.social_data as "socialData",
        ucp.created_at as "createdAt",
        ucp.updated_at as "updatedAt",
        ce.title as "eventTitle",
        ce.description as "eventDescription",
        l.name as "locationName",
        u.name as "instructorName"
      FROM user_course_preferences ucp
      LEFT JOIN calendar_events ce ON ucp.source_event_id = ce.id
      LEFT JOIN locations l ON ucp.location_id = l.id
      LEFT JOIN users u ON ucp.instructor_id = u.id
      WHERE ucp.user_id = $1
    `;
    
    const queryParams = [userId];
    let paramIndex = 2;
    
    if (sourceEventId) {
      sql += ` AND ucp.source_event_id = $${paramIndex++}`;
      queryParams.push(parseInt(sourceEventId));
    }
    
    if (instructorId) {
      sql += ` AND ucp.instructor_id = $${paramIndex++}`;
      queryParams.push(instructorId);
    }
    
    if (activityType) {
      sql += ` AND ucp.activity_type = $${paramIndex++}`;
      queryParams.push(activityType);
    }
    
    if (locationId) {
      sql += ` AND ucp.location_id = $${paramIndex++}`;
      queryParams.push(parseInt(locationId));
    }
    
    sql += ` ORDER BY ucp.created_at DESC`;
    
    // Execute query
    const result = await query(sql, queryParams);
    
    return NextResponse.json({ 
      preferences: result.rows,
      count: result.rows.length
    });
  } catch (error) {
    console.error('Error fetching preferences:', error);
    return NextResponse.json(
      { error: 'Failed to fetch preferences' },
      { status: 500 }
    );
  }
}

/**
 * POST handler for creating or updating user preferences (like/unlike)
 */
export async function POST(request: NextRequest) {
  try {
    // Check authentication
    const session = await getServerSession(authOptions);
    if (!session || !session.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const userId = session.user.id;
    
    // Parse and validate request body
    const body = await request.json();
    const { action, ...preferenceData } = body;
    
    // Validate the action
    if (!action || !['like', 'unlike', 'update'].includes(action)) {
      return NextResponse.json(
        { error: 'Invalid action. Must be one of: like, unlike, update' },
        { status: 400 }
      );
    }
    
    if (action === 'like' || action === 'update') {
      // Validate preference data
      try {
        PreferenceSchema.parse(preferenceData);
      } catch (validationError) {
        return NextResponse.json(
          { error: 'Invalid preference data', details: validationError },
          { status: 400 }
        );
      }
    }
    
    let result;
    
    if (action === 'like') {
      // Get event details for enrichment
      const eventDetails = await query(
        `SELECT 
          ce.title, ce.description, ce.price, ce.capacity, 
          l.name as location_name, l.address as location_address
        FROM calendar_events ce
        LEFT JOIN locations l ON ce.location_id = l.id
        WHERE ce.id = $1`,
        [preferenceData.sourceEventId]
      );
      
      // Extract activity type from event if not provided
      if (!preferenceData.activityType && eventDetails.rows[0]?.title) {
        const title = eventDetails.rows[0].title.toLowerCase();
        // Simple keyword extraction - in a real implementation, use more sophisticated categorization
        if (title.includes('yoga')) preferenceData.activityType = 'yoga';
        else if (title.includes('dance')) preferenceData.activityType = 'dance';
        else if (title.includes('fitness')) preferenceData.activityType = 'fitness';
        else if (title.includes('aerial')) preferenceData.activityType = 'aerial';
        else preferenceData.activityType = 'other';
      }
      
      // Create preference record
      result = await transaction(async (client) => {
        // First check if preference already exists
        const existingPreference = await client.query(
          `SELECT id FROM user_course_preferences 
           WHERE user_id = $1 AND source_event_id = $2`,
          [userId, preferenceData.sourceEventId]
        );
        
        if (existingPreference.rows.length > 0) {
          // Update existing preference
          const updatedPreference = await client.query(
            `UPDATE user_course_preferences
             SET 
               instructor_id = $3,
               preferred_time_start = $4,
               preferred_time_end = $5,
               preferred_days = $6,
               location_id = $7,
               activity_type = $8,
               max_price = $9,
               social_data = $10,
               updated_at = NOW()
             WHERE user_id = $1 AND source_event_id = $2
             RETURNING 
               id, source_event_id as "sourceEventId", instructor_id as "instructorId", 
               preferred_time_start as "preferredTimeStart", preferred_time_end as "preferredTimeEnd",
               preferred_days as "preferredDays", location_id as "locationId", 
               activity_type as "activityType", max_price as "maxPrice", 
               social_data as "socialData", created_at as "createdAt", updated_at as "updatedAt"`,
            [
              userId, 
              preferenceData.sourceEventId,
              preferenceData.instructorId,
              preferenceData.preferredTimeStart,
              preferenceData.preferredTimeEnd,
              preferenceData.preferredDays,
              preferenceData.locationId,
              preferenceData.activityType,
              preferenceData.maxPrice,
              preferenceData.socialData || {},
            ]
          );
          return {
            preference: updatedPreference.rows[0],
            action: 'updated'
          };
        } else {
          // Create new preference
          const newPreference = await client.query(
            `INSERT INTO user_course_preferences
             (user_id, source_event_id, instructor_id, preferred_time_start, 
              preferred_time_end, preferred_days, location_id, activity_type, 
              max_price, social_data, created_at, updated_at)
             VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, NOW(), NOW())
             RETURNING 
               id, source_event_id as "sourceEventId", instructor_id as "instructorId", 
               preferred_time_start as "preferredTimeStart", preferred_time_end as "preferredTimeEnd",
               preferred_days as "preferredDays", location_id as "locationId", 
               activity_type as "activityType", max_price as "maxPrice", 
               social_data as "socialData", created_at as "createdAt", updated_at as "updatedAt"`,
            [
              userId, 
              preferenceData.sourceEventId,
              preferenceData.instructorId,
              preferenceData.preferredTimeStart,
              preferenceData.preferredTimeEnd,
              preferenceData.preferredDays,
              preferenceData.locationId,
              preferenceData.activityType,
              preferenceData.maxPrice,
              preferenceData.socialData || {},
            ]
          );
          
          // Also create an entry in preference_features for ML
          await client.query(
            `INSERT INTO preference_features
             (user_id, feature_metadata, last_updated, created_at)
             VALUES ($1, $2, NOW(), NOW())
             ON CONFLICT (user_id) 
             DO UPDATE SET 
               feature_metadata = preference_features.feature_metadata || $2::jsonb,
               last_updated = NOW()`,
            [
              userId,
              JSON.stringify({
                latest_like: {
                  event_id: preferenceData.sourceEventId,
                  activity_type: preferenceData.activityType,
                  timestamp: new Date().toISOString()
                }
              })
            ]
          );
          
          return {
            preference: newPreference.rows[0],
            action: 'created'
          };
        }
      });
      
      // Publish event to Kafka
      try {
        const producer = CalendarProducer.getInstance();
        await producer.publishEventUpdate(
          preferenceData.sourceEventId.toString(),
          userId,
          { 
            preferenceId: result.preference.id,
            eventId: preferenceData.sourceEventId,
            activityType: preferenceData.activityType
          },
          { 
            type: 'preference',
            action: 'like'
          }
        );
      } catch (kafkaError) {
        console.error('Failed to publish preference event to Kafka:', kafkaError);
        // Continue despite Kafka error - we've already saved to the database
      }
    } else if (action === 'unlike') {
      // Validate required fields for unlike
      if (!preferenceData.sourceEventId) {
        return NextResponse.json(
          { error: 'sourceEventId is required for unlike action' },
          { status: 400 }
        );
      }
      
      // Delete preference
      result = await transaction(async (client) => {
        const deletedPreference = await client.query(
          `DELETE FROM user_course_preferences
           WHERE user_id = $1 AND source_event_id = $2
           RETURNING 
             id, source_event_id as "sourceEventId", activity_type as "activityType"`,
          [userId, preferenceData.sourceEventId]
        );
        
        if (deletedPreference.rows.length === 0) {
          return {
            success: false,
            message: 'Preference not found'
          };
        }
        
        return {
          preference: deletedPreference.rows[0],
          action: 'deleted'
        };
      });
      
      // Publish event to Kafka if deletion was successful
      if (result.preference) {
        try {
          const producer = CalendarProducer.getInstance();
          await producer.publishEventUpdate(
            preferenceData.sourceEventId.toString(),
            userId,
            { 
              preferenceId: result.preference.id,
              eventId: preferenceData.sourceEventId,
              activityType: result.preference.activityType
            },
            { 
              type: 'preference',
              action: 'unlike'
            }
          );
        } catch (kafkaError) {
          console.error('Failed to publish preference event to Kafka:', kafkaError);
          // Continue despite Kafka error - we've already processed the database operation
        }
      }
    } else if (action === 'update') {
      // Validate required fields for update
      if (!preferenceData.sourceEventId) {
        return NextResponse.json(
          { error: 'sourceEventId is required for update action' },
          { status: 400 }
        );
      }
      
      // Update existing preference
      result = await transaction(async (client) => {
        const updatedPreference = await client.query(
          `UPDATE user_course_preferences
           SET 
             instructor_id = COALESCE($3, instructor_id),
             preferred_time_start = COALESCE($4, preferred_time_start),
             preferred_time_end = COALESCE($5, preferred_time_end),
             preferred_days = COALESCE($6, preferred_days),
             location_id = COALESCE($7, location_id),
             activity_type = COALESCE($8, activity_type),
             max_price = COALESCE($9, max_price),
             social_data = COALESCE($10, social_data),
             updated_at = NOW()
           WHERE user_id = $1 AND source_event_id = $2
           RETURNING 
             id, source_event_id as "sourceEventId", instructor_id as "instructorId", 
             preferred_time_start as "preferredTimeStart", preferred_time_end as "preferredTimeEnd",
             preferred_days as "preferredDays", location_id as "locationId", 
             activity_type as "activityType", max_price as "maxPrice", 
             social_data as "socialData", created_at as "createdAt", updated_at as "updatedAt"`,
          [
            userId, 
            preferenceData.sourceEventId,
            preferenceData.instructorId,
            preferenceData.preferredTimeStart,
            preferenceData.preferredTimeEnd,
            preferenceData.preferredDays,
            preferenceData.locationId,
            preferenceData.activityType,
            preferenceData.maxPrice,
            preferenceData.socialData || {}
          ]
        );
        
        if (updatedPreference.rows.length === 0) {
          return {
            success: false,
            message: 'Preference not found'
          };
        }
        
        // Update ML features data
        await client.query(
          `UPDATE preference_features
           SET 
             feature_metadata = preference_features.feature_metadata || $2::jsonb,
             last_updated = NOW()
           WHERE user_id = $1`,
          [
            userId,
            JSON.stringify({
              latest_update: {
                event_id: preferenceData.sourceEventId,
                activity_type: preferenceData.activityType,
                timestamp: new Date().toISOString(),
                changes: Object.keys(preferenceData).filter(k => k !== 'sourceEventId')
              }
            })
          ]
        );
        
        return {
          preference: updatedPreference.rows[0],
          action: 'updated'
        };
      });
      
      // Publish event to Kafka if update was successful
      if (result.preference) {
        try {
          const producer = CalendarProducer.getInstance();
          await producer.publishEventUpdate(
            preferenceData.sourceEventId.toString(),
            userId,
            { 
              preferenceId: result.preference.id,
              eventId: preferenceData.sourceEventId,
              activityType: result.preference.activityType
            },
            { 
              type: 'preference',
              action: 'update'
            }
          );
        } catch (kafkaError) {
          console.error('Failed to publish preference update event to Kafka:', kafkaError);
          // Continue despite Kafka error - we've already processed the database operation
        }
      }
    }
    
    // Return appropriate response based on the action
    return NextResponse.json({
      success: true,
      action: result.action,
      preference: result.preference,
      message: `Preference ${result.action} successfully`
    });
  } catch (error) {
    console.error('Error managing preferences:', error);
    return NextResponse.json(
      { error: 'Failed to process preference action', details: error instanceof Error ? error.message : 'Unknown error' },
      { status: 500 }
    );
  }
}
/**
 * DELETE handler for removing user preferences
 */
export async function DELETE(request: NextRequest) {
  try {
    // Check authentication
    const session = await getServerSession(authOptions);
    if (!session || !session.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }
    const userId = session.user.id;
    
    // Parse the event ID from the URL
    const { searchParams } = new URL(request.url);
    const sourceEventId = searchParams.get('sourceEventId');
    
    if (!sourceEventId) {
      return NextResponse.json(
        { error: 'sourceEventId is required' },
        { status: 400 }
      );
    }
    
    // Delete the preference
    const result = await query(
      `DELETE FROM user_course_preferences
       WHERE user_id = $1 AND source_event_id = $2
       RETURNING id, source_event_id as "sourceEventId", activity_type as "activityType"`,
      [userId, parseInt(sourceEventId)]
    );
    
    if (result.rows.length === 0) {
      return NextResponse.json(
        { error: 'Preference not found' },
        { status: 404 }
      );
    }
    
    // Publish an unlike event to Kafka
    try {
      const producer = CalendarProducer.getInstance();
      await producer.publishEventUpdate(
        sourceEventId,
        userId,
        { 
          preferenceId: result.rows[0].id,
          eventId: parseInt(sourceEventId),
          activityType: result.rows[0].activityType
        },
        { 
          type: 'preference',
          action: 'unlike'
        }
      );
    } catch (kafkaError) {
      console.error('Failed to publish preference deletion event to Kafka:', kafkaError);
      // Continue despite Kafka error
    }
    
    return NextResponse.json({
      success: true,
      message: 'Preference deleted successfully'
    });
  } catch (error) {
    console.error('Error deleting preference:', error);
    return NextResponse.json(
      { error: 'Failed to delete preference', details: error instanceof Error ? error.message : 'Unknown error' },
      { status: 500 }
    );
  }
}
