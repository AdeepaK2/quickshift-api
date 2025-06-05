# Admin Setup Guide

This guide explains how to set up and use the admin functionality in the QuickShift API.

## Quick Start

### 1. Create the First Super Admin

After setting up your database, create the first super admin user:

```bash
npm run create-super-admin
```

This will create a super admin with default credentials:
- **Email:** `superadmin@quickshift.com`
- **Password:** `SuperAdmin123!`

Or specify custom credentials:

```bash
npm run create-super-admin -- admin@yourcompany.com YourSecurePassword123 John Admin
```

**⚠️ Important:** Change the password immediately after first login!

### 2. Login as Super Admin

Make a POST request to `/api/auth/login`:

```json
{
  "email": "superadmin@quickshift.com",
  "password": "SuperAdmin123!"
}
```

### 3. Create Additional Admins

Use the returned JWT token to create additional admin users via `/api/admin`:

```json
{
  "email": "admin@yourcompany.com",
  "password": "SecurePassword123",
  "firstName": "Jane",
  "lastName": "Admin",
  "role": "admin"
}
```

## Admin Endpoints Overview

| Endpoint | Method | Description | Permission |
|----------|--------|-------------|------------|
| `/api/admin` | POST | Create admin user | Super Admin |
| `/api/admin` | GET | List all admins | Admin/Super Admin |
| `/api/admin/:id` | GET | Get admin by ID | Admin/Super Admin |
| `/api/admin/:id` | PATCH | Update admin | Admin/Super Admin |
| `/api/admin/:id` | DELETE | Delete admin | Super Admin |
| `/api/admin/dashboard` | GET | Dashboard stats | Admin/Super Admin |
| `/api/admin/users` | GET | List all users | Admin/Super Admin |
| `/api/admin/employers` | GET | List all employers | Admin/Super Admin |

## Role Hierarchy

### Super Admin (`super_admin`)
- **Full system access**
- Create/delete other admins and super admins
- Change user roles
- Access all admin functions
- Cannot be deleted if they are the last super admin

### Admin (`admin`)
- **Limited admin access**
- View and manage users and employers
- Access dashboard statistics
- Cannot create/delete other admins
- Cannot change user roles to admin levels

### Regular User (`job_seeker`)
- **No admin access**
- Standard user functionality only

## Security Features

- **Authentication Required:** All admin endpoints require valid JWT tokens
- **Role-Based Access:** Endpoints check user roles before allowing access
- **Password Hashing:** All passwords are hashed using bcrypt
- **Last Super Admin Protection:** System prevents deletion/demotion of the last super admin
- **Audit Trail:** All admin actions are logged (if logging is implemented)

## Dashboard Statistics

The admin dashboard provides:

### Overview Metrics
- Total users (job seekers)
- Total employers
- Total gigs created
- Active gigs
- Completed gigs
- Total admin users

### Recent Activity (Last 30 days)
- New users registered
- New employers registered
- New gigs created

## User Management

Admins can:
- **View all users** with pagination and filtering
- **Search users** by name and email
- **Filter users** by role and active status
- **View user details** including registration date and activity

## Employer Management

Admins can:
- **View all employers** with pagination and filtering
- **Search employers** by company name, email, and contact person
- **Filter employers** by active status
- **View employer details** including registration date and activity

## API Authentication

All admin API calls must include the JWT token in the Authorization header:

```
Authorization: Bearer <your-jwt-token>
```

## Error Handling

The API returns standardized error responses:

```json
{
  "success": false,
  "message": "Error description",
  "error": "Detailed error information (in development)"
}
```

Common error codes:
- **400:** Bad Request (invalid data)
- **401:** Unauthorized (invalid/missing token)
- **403:** Forbidden (insufficient permissions)
- **404:** Not Found (resource doesn't exist)
- **500:** Internal Server Error

## Testing

Run admin-specific tests:

```bash
npm test -- admin.test.js
```

This will test:
- Admin creation and authentication
- Role-based access control
- Dashboard statistics
- User and employer management
- Error handling

## Best Practices

1. **Change Default Passwords:** Always change default credentials immediately
2. **Use Strong Passwords:** Enforce strong password policies
3. **Limit Super Admins:** Keep the number of super admins to a minimum
4. **Regular Audits:** Review admin accounts regularly
5. **Monitor Activity:** Implement logging for admin actions
6. **Backup Strategy:** Ensure admin account recovery procedures are in place

## Development

To add new admin functionality:

1. **Add controller methods** in `src/controllers/adminController.js`
2. **Add routes** in `src/routes/adminRoutes.js`
3. **Update middleware** if new permissions are needed
4. **Add tests** in `tests/admin.test.js`
5. **Update documentation** in `docs/admin-api.md`

## Environment Variables

Ensure these environment variables are set:

```
MONGODB_URI=your_mongodb_connection_string
JWT_SECRET=your_jwt_secret_key
JWT_EXPIRE=30d
```

## Troubleshooting

### Cannot create super admin
- Check database connection
- Verify environment variables
- Ensure no user exists with the same email

### Token errors
- Verify JWT_SECRET is set correctly
- Check token expiration
- Ensure proper Authorization header format

### Permission denied
- Verify user role in database
- Check if user account is active
- Confirm proper authentication

### Database errors
- Check MongoDB connection
- Verify database permissions
- Review error logs for details
