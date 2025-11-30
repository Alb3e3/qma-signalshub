import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';

interface RouteParams {
  params: Promise<{ id: string }>;
}

/**
 * GET /api/v1/keys/[id]
 * Get a specific API key's details (not the key itself)
 */
export async function GET(request: NextRequest, { params }: RouteParams) {
  const { id } = await params;
  const supabase = await createClient();

  const { data: { user }, error: authError } = await supabase.auth.getUser();
  if (authError || !user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const { data: key, error } = await supabase
    .from('api_keys')
    .select('id, name, key_prefix, environment, permissions, last_used_at, created_at, expires_at, is_active')
    .eq('id', id)
    .eq('user_id', user.id)
    .single();

  if (error || !key) {
    return NextResponse.json({ error: 'API key not found' }, { status: 404 });
  }

  return NextResponse.json({ key });
}

/**
 * PATCH /api/v1/keys/[id]
 * Update an API key (name, permissions, active status)
 */
export async function PATCH(request: NextRequest, { params }: RouteParams) {
  const { id } = await params;
  const supabase = await createClient();

  const { data: { user }, error: authError } = await supabase.auth.getUser();
  if (authError || !user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  let body;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: 'Invalid JSON body' }, { status: 400 });
  }

  const { name, permissions, is_active } = body;

  // Build update object
  const updates: Record<string, unknown> = {};

  if (name !== undefined) {
    if (typeof name !== 'string' || name.length < 1 || name.length > 100) {
      return NextResponse.json({ error: 'Name must be 1-100 characters' }, { status: 400 });
    }
    updates.name = name;
  }

  if (permissions !== undefined) {
    const validPermissions = ['signals:read', 'signals:write', 'trades:read', 'trades:write', 'webhooks:manage'];
    if (!Array.isArray(permissions)) {
      return NextResponse.json({ error: 'Permissions must be an array' }, { status: 400 });
    }
    const invalidPerms = permissions.filter((p: string) => !validPermissions.includes(p));
    if (invalidPerms.length > 0) {
      return NextResponse.json({ error: `Invalid permissions: ${invalidPerms.join(', ')}` }, { status: 400 });
    }
    updates.permissions = permissions;
  }

  if (is_active !== undefined) {
    if (typeof is_active !== 'boolean') {
      return NextResponse.json({ error: 'is_active must be a boolean' }, { status: 400 });
    }
    updates.is_active = is_active;
  }

  if (Object.keys(updates).length === 0) {
    return NextResponse.json({ error: 'No valid fields to update' }, { status: 400 });
  }

  const { data: key, error } = await supabase
    .from('api_keys')
    .update(updates)
    .eq('id', id)
    .eq('user_id', user.id)
    .select('id, name, key_prefix, environment, permissions, last_used_at, created_at, expires_at, is_active')
    .single();

  if (error || !key) {
    return NextResponse.json({ error: 'API key not found or update failed' }, { status: 404 });
  }

  return NextResponse.json({ key });
}

/**
 * DELETE /api/v1/keys/[id]
 * Delete an API key permanently
 */
export async function DELETE(request: NextRequest, { params }: RouteParams) {
  const { id } = await params;
  const supabase = await createClient();

  const { data: { user }, error: authError } = await supabase.auth.getUser();
  if (authError || !user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const { error } = await supabase
    .from('api_keys')
    .delete()
    .eq('id', id)
    .eq('user_id', user.id);

  if (error) {
    return NextResponse.json({ error: 'Failed to delete API key' }, { status: 500 });
  }

  return NextResponse.json({ message: 'API key deleted successfully' });
}
