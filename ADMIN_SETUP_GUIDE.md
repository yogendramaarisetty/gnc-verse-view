# Admin Setup Guide

This guide explains how to set up admin users in your GNC Verse View application.

## 🚀 Quick Setup

### 1. Run Database Migration

First, apply the admin roles migration to your Supabase database:

```bash
# If using Supabase CLI
supabase db push

# Or manually run the migration file:
# supabase/migrations/20241201000002_admin_roles.sql
```

### 2. Set Up Your First Admin User

#### Option A: Automatic Setup (Recommended)
```bash
# This promotes the first user (oldest by creation date) to super admin
npx tsx scripts/setup-admin.ts
```

#### Option B: Manual Setup
1. Create a user account through your app's registration
2. Get the user ID from Supabase Auth dashboard
3. Run the setup script with the user ID:
```bash
npx tsx scripts/setup-admin.ts <user-id>
```

### 3. Environment Variables

Make sure you have these environment variables in your `.env.local`:

```env
NEXT_PUBLIC_SUPABASE_URL=your_supabase_url
NEXT_PUBLIC_SUPABASE_ANON_KEY=your_anon_key
SUPABASE_SERVICE_ROLE_KEY=your_service_role_key  # For admin setup script
```

## 🔐 Admin Roles

### Role Hierarchy

1. **Super Admin** (`super_admin`)
   - Full system access
   - Can manage other admins
   - Can grant/revoke admin roles
   - Access to all admin features

2. **Admin** (`admin`)
   - Can manage songs, artists, and content
   - Can perform bulk operations
   - Cannot manage other admin users
   - Access to most admin features

### Role Management

#### Granting Admin Role
```typescript
import { grantAdminRole } from '@/lib/utils/admin-auth'

// Grant admin role
await grantAdminRole(userId, 'admin')

// Grant super admin role
await grantAdminRole(userId, 'super_admin')
```

#### Revoking Admin Role
```typescript
import { revokeAdminRole } from '@/lib/utils/admin-auth'

// Revoke admin role
await revokeAdminRole(userId)
```

#### Checking Admin Status
```typescript
import { checkAdminStatus } from '@/lib/utils/admin-auth'

const { isAdmin, isSuperAdmin, roles } = await checkAdminStatus(userId)
```

## 🛡️ Security Features

### Row Level Security (RLS)
- All admin operations are protected by RLS policies
- Only authenticated users with admin roles can access admin endpoints
- Users can only view their own roles (unless they're admin)

### API Protection
- All admin API endpoints check for authentication
- Admin role verification on sensitive operations
- Proper error handling and logging

### Database Functions
- `is_admin(user_uuid)` - Check if user is admin
- `is_super_admin(user_uuid)` - Check if user is super admin
- `grant_admin_role(target_user_id, role)` - Grant admin role
- `revoke_admin_role(target_user_id)` - Revoke admin role
- `get_admin_users()` - List all admin users

## 📊 Admin Dashboard Features

### 1. Song Management
- View, edit, delete songs
- Search and filter songs
- Bulk operations
- Real-time updates

### 2. Bulk Operations
- Import songs from JSON/CSV
- Export songs to JSON/CSV
- Preview data before import
- Progress tracking and error reporting

### 3. Analytics Dashboard
- System statistics
- Language distribution
- Top performers
- Recent activity

### 4. Admin User Management
- View all admin users
- Grant/revoke admin roles
- Role hierarchy management
- Activity tracking

## 🔧 Manual Admin Setup

If you prefer to set up admin users manually:

### 1. Direct Database Insert
```sql
-- Grant super admin role to a user
INSERT INTO user_roles (user_id, role, granted_by)
VALUES ('user-uuid-here', 'super_admin', 'user-uuid-here');

-- Grant admin role to a user
INSERT INTO user_roles (user_id, role, granted_by)
VALUES ('user-uuid-here', 'admin', 'admin-user-uuid');
```

### 2. Using Supabase Dashboard
1. Go to your Supabase project dashboard
2. Navigate to Table Editor
3. Open the `user_roles` table
4. Insert a new row with:
   - `user_id`: The user's UUID
   - `role`: `admin` or `super_admin`
   - `granted_by`: Your user ID (or the same user ID for self-grant)

## 🚨 Troubleshooting

### Common Issues

1. **"Access denied" error**
   - Make sure the user has an admin role in the `user_roles` table
   - Check if the migration was applied correctly

2. **"Cannot read properties of undefined" error**
   - This is fixed in the updated API routes
   - Make sure you're using the latest code

3. **Admin dashboard not loading**
   - Check browser console for errors
   - Verify Supabase connection
   - Ensure user is authenticated

### Debug Steps

1. Check user authentication:
```typescript
const { data: { user } } = await supabase.auth.getUser()
console.log('User:', user)
```

2. Check admin status:
```typescript
const status = await checkAdminStatus(user.id)
console.log('Admin status:', status)
```

3. Check database connection:
```typescript
const { data, error } = await supabase.from('user_roles').select('*')
console.log('User roles:', data, error)
```

## 📝 API Endpoints

### Admin Authentication
All admin endpoints require authentication and admin role verification:

- `GET /api/admin/songs` - List songs (admin only)
- `POST /api/admin/songs` - Create song (admin only)
- `PATCH /api/admin/songs/[id]` - Update song (admin only)
- `DELETE /api/admin/songs/[id]` - Delete song (admin only)
- `POST /api/admin/bulk-import` - Bulk import (admin only)
- `GET /api/admin/bulk-export` - Bulk export (admin only)
- `GET /api/admin/analytics` - Analytics data (admin only)

### Error Responses
- `401 Unauthorized` - Not authenticated
- `403 Forbidden` - Not an admin user
- `500 Internal Server Error` - Server error

## 🎯 Best Practices

1. **Use Super Admin Sparingly**
   - Only grant super admin to trusted users
   - Regular admins should be sufficient for most operations

2. **Regular Audits**
   - Periodically review admin users
   - Remove access for inactive users
   - Monitor admin activities

3. **Secure Setup**
   - Use strong passwords for admin accounts
   - Enable 2FA if available
   - Keep service role key secure

4. **Backup Strategy**
   - Regular database backups
   - Document admin user changes
   - Keep migration files versioned

## 🔄 Migration Commands

```bash
# Apply all migrations
supabase db push

# Reset database (development only)
supabase db reset

# Generate new migration
supabase db diff --schema public > supabase/migrations/new_migration.sql
```

## 📞 Support

If you encounter issues:

1. Check the troubleshooting section above
2. Review the console logs for errors
3. Verify your Supabase configuration
4. Ensure all environment variables are set correctly

The admin system is now fully functional with proper role-based access control!


