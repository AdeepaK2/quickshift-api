# Admin Management API

This document describes the admin management endpoints for the QuickShift API.

## Base URL
All admin endpoints are prefixed with `/api/admin`

## Authentication
All admin endpoints require:
- Valid JWT token in Authorization header: `Bearer <token>`
- User role must be `admin` or `super_admin`

## Endpoints

### Create Admin User

Creates a new admin user account.

- **URL:** `/api/admin`
- **Method:** `POST`
- **Auth required:** Yes
- **Permissions required:** Super Admin only
- **Content-Type:** `application/json`

**Request Body:**
```json
{
  "email": "admin@example.com",
  "password": "securePassword123",
  "firstName": "John",
  "lastName": "Admin",
  "role": "admin"
}
```

**Request Fields:**
- `email` (string, required): Admin email address
- `password` (string, required): Admin password
- `firstName` (string, required): Admin first name
- `lastName` (string, required): Admin last name
- `role` (string, optional): Either "admin" or "super_admin" (default: "admin")

**Success Response:**
- **Code:** 201 Created
- **Content:**
```json
{
  "success": true,
  "message": "Admin user created successfully",
  "data": {
    "_id": "60d21b4967d0d8992e610c85",
    "email": "admin@example.com",
    "firstName": "John",
    "lastName": "Admin",
    "role": "admin",
    "isActive": true,
    "createdAt": "2023-06-22T10:30:00.000Z",
    "updatedAt": "2023-06-22T10:30:00.000Z"
  }
}
```

### Get All Admin Users

Retrieves all admin users with pagination and filtering.

- **URL:** `/api/admin`
- **Method:** `GET`
- **Auth required:** Yes
- **Permissions required:** Admin or Super Admin
- **Query parameters:**
  - `page`: Page number (default: 1)
  - `limit`: Results per page (default: 10)
  - `role`: Filter by role ("admin" or "super_admin")
  - `isActive`: Filter by active status (true/false)

**Success Response:**
- **Code:** 200 OK
- **Content:**
```json
{
  "success": true,
  "count": 5,
  "total": 15,
  "page": 1,
  "pages": 2,
  "data": [
    {
      "_id": "60d21b4967d0d8992e610c85",
      "email": "admin@example.com",
      "firstName": "John",
      "lastName": "Admin",
      "role": "admin",
      "isActive": true,
      "createdAt": "2023-06-22T10:30:00.000Z",
      "updatedAt": "2023-06-22T10:30:00.000Z"
    }
  ]
}
```

### Get Admin User by ID

Retrieves a specific admin user by ID.

- **URL:** `/api/admin/:id`
- **Method:** `GET`
- **Auth required:** Yes
- **Permissions required:** Admin or Super Admin

**Success Response:**
- **Code:** 200 OK
- **Content:**
```json
{
  "success": true,
  "data": {
    "_id": "60d21b4967d0d8992e610c85",
    "email": "admin@example.com",
    "firstName": "John",
    "lastName": "Admin",
    "role": "admin",
    "isActive": true,
    "createdAt": "2023-06-22T10:30:00.000Z",
    "updatedAt": "2023-06-22T10:30:00.000Z"
  }
}
```

### Update Admin User

Updates an admin user's information.

- **URL:** `/api/admin/:id`
- **Method:** `PATCH`
- **Auth required:** Yes
- **Permissions required:** Admin or Super Admin
- **Note:** Only Super Admins can change roles

**Request Body:**
```json
{
  "firstName": "Updated",
  "lastName": "Name",
  "email": "updated@example.com",
  "role": "super_admin",
  "isActive": false
}
```

**Success Response:**
- **Code:** 200 OK
- **Content:**
```json
{
  "success": true,
  "message": "Admin user updated successfully",
  "data": {
    "_id": "60d21b4967d0d8992e610c85",
    "email": "updated@example.com",
    "firstName": "Updated",
    "lastName": "Name",
    "role": "super_admin",
    "isActive": false,
    "updatedAt": "2023-06-22T11:30:00.000Z"
  }
}
```

### Delete Admin User

Deletes an admin user account.

- **URL:** `/api/admin/:id`
- **Method:** `DELETE`
- **Auth required:** Yes
- **Permissions required:** Super Admin only
- **Note:** Cannot delete the last Super Admin

**Success Response:**
- **Code:** 200 OK
- **Content:**
```json
{
  "success": true,
  "message": "Admin user deleted successfully"
}
```

### Get Dashboard Statistics

Retrieves system statistics for the admin dashboard.

- **URL:** `/api/admin/dashboard`
- **Method:** `GET`
- **Auth required:** Yes
- **Permissions required:** Admin or Super Admin

**Success Response:**
- **Code:** 200 OK
- **Content:**
```json
{
  "success": true,
  "data": {
    "overview": {
      "totalUsers": 1250,
      "totalEmployers": 85,
      "totalGigs": 320,
      "activeGigs": 45,
      "completedGigs": 275,
      "totalAdmins": 3
    },
    "recentActivity": {
      "newUsersLastMonth": 150,
      "newEmployersLastMonth": 12,
      "newGigsLastMonth": 65
    },
    "generatedAt": "2023-06-22T12:00:00.000Z"
  }
}
```

### Get All Users (Admin View)

Retrieves all users for admin management with enhanced filtering and search.

- **URL:** `/api/admin/users`
- **Method:** `GET`
- **Auth required:** Yes
- **Permissions required:** Admin or Super Admin
- **Query parameters:**
  - `page`: Page number (default: 1)
  - `limit`: Results per page (default: 10)
  - `role`: Filter by user role
  - `isActive`: Filter by active status (true/false)
  - `search`: Search in name and email fields

**Success Response:**
- **Code:** 200 OK
- **Content:**
```json
{
  "success": true,
  "count": 10,
  "total": 1250,
  "page": 1,
  "pages": 125,
  "data": [
    {
      "_id": "60d21b4967d0d8992e610c90",
      "email": "user@example.com",
      "firstName": "Jane",
      "lastName": "Doe",
      "role": "job_seeker",
      "isActive": true,
      "createdAt": "2023-06-20T08:15:00.000Z"
    }
  ]
}
```

### Get All Employers (Admin View)

Retrieves all employers for admin management with enhanced filtering and search.

- **URL:** `/api/admin/employers`
- **Method:** `GET`
- **Auth required:** Yes
- **Permissions required:** Admin or Super Admin
- **Query parameters:**
  - `page`: Page number (default: 1)
  - `limit`: Results per page (default: 10)
  - `isActive`: Filter by active status (true/false)
  - `search`: Search in company name, email, and contact person fields

**Success Response:**
- **Code:** 200 OK
- **Content:**
```json
{
  "success": true,
  "count": 10,
  "total": 85,
  "page": 1,
  "pages": 9,
  "data": [
    {
      "_id": "60d21b4967d0d8992e610c95",
      "email": "company@example.com",
      "companyName": "Example Corp",
      "contactPersonName": "John Manager",
      "isActive": true,
      "createdAt": "2023-06-18T14:20:00.000Z"
    }
  ]
}
```

## Error Responses

### 400 Bad Request
```json
{
  "success": false,
  "message": "Invalid admin role"
}
```

### 401 Unauthorized
```json
{
  "success": false,
  "message": "Not authorized to access this route"
}
```

### 403 Forbidden
```json
{
  "success": false,
  "message": "Only super administrators can create super admin accounts"
}
```

### 404 Not Found
```json
{
  "success": false,
  "message": "Admin user not found"
}
```

### 500 Internal Server Error
```json
{
  "success": false,
  "message": "Failed to create admin user",
  "error": "Database connection error"
}
```

## Admin Role Hierarchy

1. **Super Admin (`super_admin`)**:
   - Can create/delete admin and super_admin accounts
   - Can change user roles
   - Has access to all admin functions
   - Cannot be deleted if they are the last super admin

2. **Admin (`admin`)**:
   - Can view and manage users and employers
   - Can access dashboard statistics
   - Cannot create/delete other admins
   - Cannot change user roles to admin levels

## Security Notes

- All admin endpoints require authentication
- Role-based access control is enforced
- Passwords are hashed using bcrypt
- The last super admin cannot be deleted or demoted
- Only super admins can perform admin management operations
