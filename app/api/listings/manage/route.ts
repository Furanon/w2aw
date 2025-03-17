import { NextResponse } from 'next/server';
import Clarifai from 'clarifai';
import { Client } from '@googlemaps/google-maps-services-js';
import { produceMessage } from '../../../../lib/kafka';
import { query } from '../../../../lib/db';
import { generateListingEmbedding, formatEmbeddingForPgvector } from '../../../../lib/embeddings';

// Initialize Clarifai API client
const clarifaiApp = new Clarifai.App({
    apiKey: process.env.CLARIFAI_API_KEY,
});

// Initialize Google Places API client
const googleMapsClient = new Client({});

export async function POST(request: Request) {
    try {
        // Parse the incoming request data
        const { title, description, price, location, image } = await request.json();

        // Clarifai API Call for moderation
        const clarifaiResponse = await clarifaiApp.models.predict(Clarifai.GENERAL_MODEL, image);
        const moderationResult = clarifaiResponse.outputs[0].data.concepts;

        // If content moderation fails, send an error response
        if (!moderationResult.some(concept => concept.name === 'safe' && concept.value > 0.9)) {
            return NextResponse.json({ message: 'Image content is not allowed' }, { status: 400 });
        }

        // Google Places API Call to validate location
        const placesResponse = await googleMapsClient.geocode({
            params: {
                address: location,
                key: process.env.GOOGLE_PLACES_API_KEY,
            },
        });

        // If location check fails
        if (!placesResponse.data.results.length) {
            return NextResponse.json({ message: 'Invalid location' }, { status: 400 });
        }

        // Extract enriched location details
        const enhancedLocation = placesResponse.data.results[0].formatted_address;

        // Generate embeddings for the listing
        const embedding = await generateListingEmbedding(title, description);
        const formattedEmbedding = formatEmbeddingForPgvector(embedding);

        // Insert listing in Neon database with embedding
        const insertQuery = `INSERT INTO listings(title, description, price, location, image, embedding) 
                            VALUES($1, $2, $3, $4, $5, $6) RETURNING *`;
        const result = await query(insertQuery, [
            title, 
            description, 
            price, 
            enhancedLocation, 
            image, 
            formattedEmbedding
        ]);

        // Create a Kafka message for the new listing
        try {
            const newListing = result.rows[0];
            await produceMessage('new-listing', {
                listingId: newListing.id,
                title: newListing.title,
                userId: newListing.user_id || 'anonymous', // Assuming user_id is part of the listing data
                timestamp: new Date().toISOString(),
                action: 'created'
            });
            console.log('Kafka message produced for new listing');
        } catch (kafkaError) {
            // Log Kafka error but don't fail the request
            console.error('Failed to produce Kafka message:', kafkaError);
        }

        return NextResponse.json(result.rows[0], { status: 201 });
    } catch (error) {
        console.error('Error in POST handler:', error);
        return NextResponse.json({ message: 'Internal Server Error', error: (error as Error).message }, { status: 500 });
    }
}

// Function to handle listing updates
export async function PUT(request: Request) {
    try {
        const { id, title, description, price, location, image } = await request.json();

        // Generate new embeddings for the updated listing
        const embedding = await generateListingEmbedding(title, description);
        const formattedEmbedding = formatEmbeddingForPgvector(embedding);

        // Update listing in Neon database including embedding
        const updateQuery = `UPDATE listings SET title=$1, description=$2, price=$3, location=$4, image=$5, embedding=$6 WHERE id=$7 RETURNING *`;
        const result = await query(updateQuery, [title, description, price, location, image, formattedEmbedding, id]);

        if (result.rowCount === 0) {
            return NextResponse.json({ message: 'Listing not found' }, { status: 404 });
        }

        return NextResponse.json(result.rows[0], { status: 200 });
    } catch (error) {
        console.error('Error in PUT handler:', error);
        return NextResponse.json({ message: 'Internal Server Error', error: (error as Error).message }, { status: 500 });
    }
}

// Function to handle listing deletion
export async function DELETE(request: Request) {
    try {
        const { id } = await request.json();

        // Delete listing from Neon database
        const deleteQuery = `DELETE FROM listings WHERE id=$1 RETURNING *`;
        const result = await query(deleteQuery, [id]);

        if (result.rowCount === 0) {
            return NextResponse.json({ message: 'Listing not found' }, { status: 404 });
        }

        return NextResponse.json({ message: 'Listing deleted successfully' }, { status: 200 });
    } catch (error) {
        console.error('Error in DELETE handler:', error);
        return NextResponse.json({ message: 'Internal Server Error', error: (error as Error).message }, { status: 500 });
    }
}
