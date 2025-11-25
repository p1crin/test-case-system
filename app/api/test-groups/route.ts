import { NextRequest, NextResponse } from 'next/server';
import { requireAuth, isAdmin, isTestManager, getAccessibleTestGroups } from '@/app/lib/auth';
import { query, getAllRows, transaction } from '@/app/lib/db';
import { TestGroup, UserRole } from '@/app/types/database';

// GET /api/test-groups - Get all accessible test groups
export async function GET(req: NextRequest) {
  try {
    const user = await requireAuth(req);

    // Get accessible test group IDs
    const accessibleIds = await getAccessibleTestGroups(user.id, user.user_role);

    if (accessibleIds.length === 0) {
      return NextResponse.json({ testGroups: [] });
    }

    // Get search parameters from query string
    const { searchParams } = new URL(req.url);
    const oem = searchParams.get('oem') || '';
    const model = searchParams.get('model') || '';
    const event = searchParams.get('event') || '';
    const variation = searchParams.get('variation') || '';
    const destination = searchParams.get('destination') || '';

    // Get pagination parameters
    const page = parseInt(searchParams.get('page') || '1', 10);
    const limit = parseInt(searchParams.get('limit') || '10', 10);
    const offset = (page - 1) * limit;

    // Build dynamic WHERE clause
    let whereConditions = ['id = ANY($1)', 'is_deleted = FALSE'];
    const params: any[] = [accessibleIds];
    let paramIndex = 2;

    if (oem) {
      whereConditions.push(`oem ILIKE $${paramIndex}`);
      params.push(`%${oem}%`);
      paramIndex++;
    }

    if (model) {
      whereConditions.push(`model ILIKE $${paramIndex}`);
      params.push(`%${model}%`);
      paramIndex++;
    }

    if (event) {
      whereConditions.push(`event ILIKE $${paramIndex}`);
      params.push(`%${event}%`);
      paramIndex++;
    }

    if (variation) {
      whereConditions.push(`variation ILIKE $${paramIndex}`);
      params.push(`%${variation}%`);
      paramIndex++;
    }

    if (destination) {
      whereConditions.push(`destination ILIKE $${paramIndex}`);
      params.push(`%${destination}%`);
      paramIndex++;
    }

    const whereClause = whereConditions.join(' AND ');

    // Fetch total count for pagination
    const countResult = await query<{ count: string | number }>(
      `SELECT COUNT(*) as count
       FROM tt_test_groups
       WHERE ${whereClause}`,
      params
    );
    const totalCount = parseInt(String(countResult.rows[0]?.count || '0'), 10);

    // Fetch test groups with pagination
    const dataParams = [...params, limit, offset];
    const limitParamIndex = params.length + 1;
    const offsetParamIndex = params.length + 2;
    const result = await query<TestGroup>(
      `SELECT id, oem, model, event, variation, destination, specs,
              test_startdate, test_enddate, ng_plan_count, created_by, updated_by,
              created_at, updated_at
       FROM tt_test_groups
       WHERE ${whereClause}
       ORDER BY created_at DESC
       LIMIT $${limitParamIndex} OFFSET $${offsetParamIndex}`,
      dataParams
    );

    const testGroups = getAllRows(result);

    return NextResponse.json({ testGroups, totalCount });
  } catch (error) {
    console.error('GET /api/test-groups error:', error);

    if (error instanceof Error && error.message === 'Unauthorized') {
      return NextResponse.json(
        { error: '認証が必要です' },
        { status: 401 }
      );
    }

    return NextResponse.json(
      { error: 'テストグループの取得に失敗しました' },
      { status: 500 }
    );
  }
}

// POST /api/test-groups - Create new test group
export async function POST(req: NextRequest) {
  try {
    const user = await requireAuth(req);

    // Check if user is admin or test manager
    if (!isAdmin(user) && !isTestManager(user)) {
      return NextResponse.json(
        { error: 'テストグループを作成する権限がありません' },
        { status: 403 }
      );
    }

    const body = await req.json();
    const {
      oem,
      model,
      event,
      variation,
      destination,
      specs,
      test_startdate,
      test_enddate,
      ng_plan_count,
      tags, // Array of { tag_id, test_role }
    } = body;

    // Validate required fields
    if (!oem || !model) {
      return NextResponse.json(
        { error: 'OEMとモデルは必須です' },
        { status: 400 }
      );
    }

    // Create test group in transaction
    const testGroup = await transaction(async (client) => {
      // Insert test group
      const result = await client.query<TestGroup>(
        `INSERT INTO tt_test_groups
         (oem, model, event, variation, destination, specs, test_startdate, test_enddate, ng_plan_count, created_by, updated_by)
         VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $10)
         RETURNING *`,
        [
          oem,
          model,
          event || '',
          variation || '',
          destination || '',
          specs || '',
          test_startdate || null,
          test_enddate || null,
          ng_plan_count || 0,
          user.id.toString(),
        ]
      );

      const newGroup = result.rows[0];

      // Insert test group tags if provided
      if (tags && Array.isArray(tags) && tags.length > 0) {
        for (const tag of tags) {
          await client.query(
            `INSERT INTO tt_test_group_tags (test_group_id, tag_id, test_role)
             VALUES ($1, $2, $3)`,
            [newGroup.id, tag.tag_id, tag.test_role]
          );
        }
      }

      return newGroup;
    });

    return NextResponse.json({ testGroup }, { status: 201 });
  } catch (error) {
    console.error('POST /api/test-groups error:', error);

    if (error instanceof Error && error.message === 'Unauthorized') {
      return NextResponse.json(
        { error: '認証が必要です' },
        { status: 401 }
      );
    }

    return NextResponse.json(
      { error: 'テストグループの作成に失敗しました' },
      { status: 500 }
    );
  }
}
