import { query } from '/lib/db.ts';
import { NextApiRequest, NextApiResponse } from 'next';

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
    try {
        const {
            page = 1,
            limit = 10,
            price_min,
            price_max,
            location,
            property_type,
            sort_by = 'created_at',
            sort_order = 'desc'
        } = req.query;

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

        res.status(200).json({
            listings,
            pagination: {
                totalRecords,
                totalPages,
                currentPage: page
            }
        });
    } catch (error) {
        console.error('Error retrieving listings:', error);
        res.status(500).json({ error: 'Internal server error' });
    }
}

