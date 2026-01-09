import { google } from 'googleapis';

// Scopes for Google Calendar and Contacts APIs
export const SCOPES = [
  'https://www.googleapis.com/auth/calendar', // Read/write access to calendars
  'https://www.googleapis.com/auth/calendar.events', // Read/write access to events
  'https://www.googleapis.com/auth/contacts', // Read/write access to contacts
];

// OAuth2 client - created lazily after env vars are loaded
let _oauth2Client: any = null;

export function getOAuth2Client() {
  if (!_oauth2Client) {
    _oauth2Client = new google.auth.OAuth2(
      process.env.GOOGLE_CLIENT_ID,
      process.env.GOOGLE_CLIENT_SECRET,
      process.env.GOOGLE_REDIRECT_URI
    );
  }
  return _oauth2Client;
}

// Export for backward compatibility
export const oauth2Client = new Proxy({} as any, {
  get(target, prop) {
    return getOAuth2Client()[prop];
  },
  set(target, prop, value) {
    getOAuth2Client()[prop] = value;
    return true;
  }
});

// Generate authentication URL
export function getAuthUrl(forceReauth: boolean = false): string {
  return getOAuth2Client().generateAuthUrl({
    access_type: 'offline', // Get refresh token
    scope: SCOPES,
    prompt: forceReauth ? 'select_account consent' : 'consent', // Force consent screen to get refresh token
    include_granted_scopes: true, // Include previously granted scopes
  });
}

// Exchange authorization code for tokens
export async function getTokensFromCode(code: string) {
  const { tokens } = await getOAuth2Client().getToken(code);
  return tokens;
}

// Set credentials on the client
export function setCredentials(tokens: any) {
  getOAuth2Client().setCredentials(tokens);
}

// Refresh access token if expired
export async function refreshAccessToken(refreshToken: string) {
  const client = getOAuth2Client();
  client.setCredentials({ refresh_token: refreshToken });
  const { credentials } = await client.refreshAccessToken();
  return credentials;
}

// Check if tokens are expired
export function isTokenExpired(expiryDate?: number): boolean {
  if (!expiryDate) return true;
  // Add 5 minute buffer
  return Date.now() >= expiryDate - 5 * 60 * 1000;
}
