# Google OAuth Setup Guide

This guide will walk you through setting up Google OAuth 2.0 credentials for the Home Management app.

## Prerequisites

- A Google account
- Access to [Google Cloud Console](https://console.cloud.google.com/)

## Steps

### 1. Create a Google Cloud Project

1. Go to [Google Cloud Console](https://console.cloud.google.com/)
2. Click "Select a project" dropdown at the top
3. Click "New Project"
4. Enter project name: "Home Management App" (or your preferred name)
5. Click "Create"

### 2. Enable Google Calendar API

1. In your project, go to "APIs & Services" > "Library"
2. Search for "Google Calendar API"
3. Click on it and press "Enable"

### 3. Configure OAuth Consent Screen

1. Go to "APIs & Services" > "OAuth consent screen"
2. Select "External" user type (or "Internal" if you have a Google Workspace account)
3. Click "Create"
4. Fill in the required information:
   - **App name**: Home Management App
   - **User support email**: Your email
   - **Developer contact information**: Your email
5. Click "Save and Continue"
6. On the "Scopes" page, click "Add or Remove Scopes"
7. Add these scopes:
   - `.../auth/calendar` (See, edit, share, and permanently delete all calendars)
   - `.../auth/calendar.events` (View and edit events on all calendars)
8. Click "Update" then "Save and Continue"
9. On "Test users", add your Google account email if using External user type
10. Click "Save and Continue"
11. Review and click "Back to Dashboard"

### 4. Create OAuth 2.0 Credentials

1. Go to "APIs & Services" > "Credentials"
2. Click "Create Credentials" > "OAuth client ID"
3. Select "Web application"
4. Enter name: "Home Management Web Client"
5. Under "Authorized redirect URIs", add:
   - **For development**: `http://localhost:3000/api/auth/google/callback`

   **Important**: Only add this localhost URI for now. See "Production Deployment Options" below for Raspberry Pi setup.

6. Click "Create"
7. A dialog will show your **Client ID** and **Client Secret** - copy these!

### 5. Update Environment Variables

1. Open the `.env` file in your HomeManagement directory
2. Update these values:

```env
GOOGLE_CLIENT_ID=your_client_id_here
GOOGLE_CLIENT_SECRET=your_client_secret_here
GOOGLE_REDIRECT_URI=http://localhost:3000/api/auth/google/callback
```

3. Save the file

## Testing the OAuth Flow

1. Start the backend server:
```bash
npm run dev:backend
```

2. Navigate to: `http://localhost:3000/api/auth/google`
   This will return a JSON with an `authUrl`

3. Copy the `authUrl` and paste it in your browser

4. You'll be redirected to Google's consent screen
   - Review the permissions
   - Click "Continue" or "Allow"

5. You'll be redirected back to your app at `/api/auth/google/callback`
   - If successful, you'll see a success message
   - Your session will now contain the OAuth tokens

6. Test authentication status:
   - Visit: `http://localhost:3000/api/auth/status`
   - Should return `{"authenticated": true}`

## Troubleshooting

### "Error 400: redirect_uri_mismatch"
- Make sure the redirect URI in your .env exactly matches one of the authorized redirect URIs in Google Cloud Console
- Common issue: `http://localhost` vs `http://localhost:3000`

### "Error 403: access_denied"
- Make sure you've added your Google account as a test user if using External user type
- Check that the Calendar API is enabled

### "Token expired" errors
- The app automatically refreshes tokens using the refresh token
- If you get this error, try logging out and logging in again

## Security Notes

- **Never commit your `.env` file** - it contains sensitive credentials
- The `.env.example` file is safe to commit (it has placeholder values)
- For production deployment, use environment variables or a secure secret management system

## Production Deployment Options for Raspberry Pi

Since Google OAuth doesn't accept `.local` domains (like `raspberrypi.local`), you have several options for production deployment:

### Option 1: Access via Localhost on the Pi (Recommended for touchscreen)
If you're using the Raspberry Pi with a directly connected touchscreen, the browser runs on the Pi itself:

1. The app will be accessed at `http://localhost` on the Pi
2. No additional redirect URI needed - use the same `http://localhost:3000/api/auth/google/callback`
3. This is the simplest option for a kiosk-style setup

### Option 2: Use IP Address (Limited Support)
Access the Pi via its local IP address (e.g., `192.168.1.100`):

1. Find your Pi's IP: `hostname -I`
2. Add redirect URI in Google Console: `http://192.168.1.100:3000/api/auth/google/callback`
3. Update `.env`: `GOOGLE_REDIRECT_URI=http://192.168.1.100:3000/api/auth/google/callback`

**Note**: IP addresses may change if using DHCP. Consider setting a static IP on your Pi.

### Option 3: Use a Custom Domain (Most Flexible)
Set up a proper domain name:

1. Register a domain (or use a free subdomain service)
2. Point it to your Raspberry Pi's IP or use a service like DuckDNS
3. Add redirect URI: `https://yourdomain.com/api/auth/google/callback`
4. Set up SSL with Let's Encrypt (required for `https://`)

### Option 4: Development Tunnel (Testing Only)
Use ngrok or similar for temporary public URL:

```bash
# Install ngrok
npm install -g ngrok

# Create tunnel
ngrok http 3000
```

Then add the ngrok URL as a redirect URI (e.g., `https://abc123.ngrok.io/api/auth/google/callback`)

**Note**: Free ngrok URLs change on restart, so this is only good for testing.

### Recommendation for Your Setup

Since you mentioned using a Raspberry Pi with a touchscreen, **Option 1** is best:
- The browser runs directly on the Pi
- Access the app at `http://localhost` on the touchscreen
- No network complications
- Use the same redirect URI you're using for development

## Next Steps

Once OAuth is set up and working, you can:
1. Access Google Calendar API endpoints
2. Fetch user's calendars
3. Create, read, update, and delete calendar events
4. Sync external calendars

The app will automatically handle token refresh when the access token expires.
