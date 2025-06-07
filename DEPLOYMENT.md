# DigitalOcean Deployment Guide for QuickShift API

## Prerequisites
1. DigitalOcean account
2. GitHub repository connected to DigitalOcean App Platform
3. Environment variables configured

## Deployment Methods

### Method 1: DigitalOcean App Platform (Recommended)

#### Step 1: Push your code to GitHub
```bash
git add .
git commit -m "Add deployment configuration"
git push origin main
```

#### Step 2: Create App on DigitalOcean
1. Go to DigitalOcean App Platform
2. Click "Create App"
3. Connect your GitHub repository
4. Select the `quickshift-api` repository
5. Choose the `main` branch

#### Step 3: Configure Build Settings
- **Build Command**: `npm install && npm run build`
- **Run Command**: `npm start`
- **Environment**: Node.js
- **Node.js Version**: 18.x

#### Step 4: Set Environment Variables
In the DigitalOcean App Platform console, add these environment variables:

```
NODE_ENV=production
PORT=8080
MONGODB_URI=your-mongodb-connection-string
JWT_SECRET=your-jwt-secret-key
JWT_REFRESH_SECRET=your-jwt-refresh-secret
SENDGRID_API_KEY=your-sendgrid-api-key
SENDGRID_FROM_EMAIL=noreply@yourdomain.com
STRIPE_SECRET_KEY=your-stripe-secret-key
STRIPE_WEBHOOK_SECRET=your-stripe-webhook-secret
FRONTEND_URL=https://your-frontend-domain.com
```

#### Step 5: Add MongoDB Database
1. In the App settings, go to "Database"
2. Create a new MongoDB database
3. Note the connection string and add it to MONGODB_URI

### Method 2: Docker Deployment

#### Build and Deploy with Docker
```bash
# Build the Docker image
docker build -t quickshift-api .

# Run locally for testing
docker run -p 8080:8080 --env-file .env quickshift-api

# Push to DigitalOcean Container Registry
doctl registry login
docker tag quickshift-api registry.digitalocean.com/your-registry/quickshift-api
docker push registry.digitalocean.com/your-registry/quickshift-api
```

## Environment Variables Required

Create these environment variables in DigitalOcean:

### Database
- `MONGODB_URI`: MongoDB connection string
- `DB_NAME`: Database name (optional, can be included in URI)

### Authentication
- `JWT_SECRET`: Secret key for JWT tokens
- `JWT_REFRESH_SECRET`: Secret key for refresh tokens

### Email Service
- `SENDGRID_API_KEY`: SendGrid API key for email notifications
- `SENDGRID_FROM_EMAIL`: Email address for sending emails

### Payment Processing
- `STRIPE_SECRET_KEY`: Stripe secret key
- `STRIPE_WEBHOOK_SECRET`: Stripe webhook endpoint secret

### Application
- `NODE_ENV`: Set to "production"
- `PORT`: Set to "8080" (DigitalOcean default)
- `FRONTEND_URL`: Your frontend application URL

## Database Setup

### Option 1: DigitalOcean Managed MongoDB
1. Create a MongoDB database in DigitalOcean
2. Use the provided connection string
3. Add your app's IP to trusted sources

### Option 2: External MongoDB (MongoDB Atlas)
1. Create a cluster on MongoDB Atlas
2. Whitelist DigitalOcean IPs: `0.0.0.0/0` (or specific ranges)
3. Get connection string and add to environment variables

## Post-Deployment Steps

1. **Test the API endpoints**:
   ```bash
   curl https://your-app-name.ondigitalocean.app/api/health
   ```

2. **Create Super Admin** (if needed):
   Access the console and run:
   ```bash
   npm run create-super-admin
   ```

3. **Set up webhooks**:
   - Configure Stripe webhooks to point to: `https://your-app-name.ondigitalocean.app/api/webhooks/stripe`

## Troubleshooting

### Common Build Failures

1. **Node.js Version Mismatch**:
   - Ensure `.nvmrc` file specifies Node.js 18.x
   - Check `engines` in package.json

2. **Missing Environment Variables**:
   - Verify all required environment variables are set
   - Check for typos in variable names

3. **Database Connection Issues**:
   - Verify MongoDB URI is correct
   - Check database user permissions
   - Ensure IP whitelist includes DigitalOcean ranges

4. **Build Command Failures**:
   - Check that all dependencies are listed in package.json
   - Ensure build script runs successfully locally

### Monitoring and Logs

1. **View Application Logs**:
   - Go to DigitalOcean App Platform dashboard
   - Click on your app → Runtime Logs

2. **Health Monitoring**:
   - Health check endpoint: `/api/health`
   - Monitor response times and error rates

### Scaling

- **Horizontal Scaling**: Increase instance count in App Platform
- **Vertical Scaling**: Upgrade instance size (basic-xxs → basic-xs → basic-s)

## Security Checklist

- [ ] All sensitive data in environment variables
- [ ] JWT secrets are strong and unique
- [ ] Database has proper authentication
- [ ] CORS is configured for production domains
- [ ] Rate limiting implemented (if needed)
- [ ] HTTPS enforced (automatic with DigitalOcean App Platform)

## Cost Optimization

- Start with `basic-xxs` instances
- Use managed database for easier maintenance
- Monitor resource usage and scale as needed
- Consider using DigitalOcean Spaces for file storage if needed

---

For more help, check the DigitalOcean App Platform documentation or contact support.
