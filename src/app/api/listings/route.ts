import { query } from '../../../lib/db';
import { NextRequest, NextResponse } from 'next/server';

export async function GET(request: NextRequest) {
    try {
        const url = new URL(request.url);
        const searchParams = url.searchParams;
        
        const page = parseInt(searchParams.get('page') || '1', 10);
        const limit = parseInt(searchParams.get('limit') || '10', 10);
        const price_min = searchParams.get('price_min');
        const price_max = searchParams.get('price_max');
        const location = searchParams.get('location');
        const property_type = searchParams.get('property_type');
        const sort_by = searchParams.get('sort_by') || 'created_at';
        const sort_order = searchParams.get('sort_order') || 'desc';

        let sqlQuery = 'SELECT * FROM listings';
        let whereClauses = [];
        let offset = (page - 1) * limit;

        if (price_min) {
            whereClauses.push(`price >= ${price_min}`);
        }
        if (price_max) {
            whereClauses.push(`price <= ${price_max}`);
        }
        if (location) {
            whereClauses.push(`location_name = '${location}'`);
        }
        if (property_type) {
            whereClauses.push(`property_type = '${property_type}'`);
        }

        if (whereClauses.length > 0) {
            sqlQuery += ' WHERE ' + whereClauses.join(' AND ');
        }

        sqlQuery += ` ORDER BY ${sort_by} ${sort_order}`;
        sqlQuery += ` LIMIT ${limit} OFFSET ${offset}`;

        const listings = await query(sqlQuery);

        const countResult = await query(`SELECT COUNT(*) FROM listings`);
        const totalRecords = parseInt(countResult[0].count, 10);
        const totalPages = Math.ceil(totalRecords / limit);

        return NextResponse.json({
            listings,
            pagination: {
                totalRecords,
                totalPages,
                currentPage: page
            }
        }, { status: 200 });
    } catch (error) {
        console.error('Error retrieving listings:', error);
        return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
    }
}

export async function POST(request: NextRequest) {
    try {
        const body = await request.json();
        
        // Validate required fields
        if (!body.title || !body.price) {
            return NextResponse.json({ error: 'Missing required fields' }, { status: 400 });
        }
        
        // Here you would insert the new listing into the database
        // Example query (customize as needed):
        // const result = await query(
        //   'INSERT INTO listings (title, price, description, location_name, property_type) VALUES (?, ?, ?, ?, ?)',
        //   [body.title, body.price, body.description, body.location_name, body.property_type]
        // );
        
        return NextResponse.json({ message: 'Listing created successfully' }, { status: 201 });
    } catch (error) {
        console.error('Error creating listing:', error);
        return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
    }
}
