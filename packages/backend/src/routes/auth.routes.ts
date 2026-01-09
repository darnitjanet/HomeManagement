import { Router, Request, Response } from 'express';
import { getAuthUrl, getTokensFromCode, setCredentials } from '../config/google';
import { requireAuth } from '../middleware/auth.middleware';

const router = Router();

// GET /api/auth/google - Initiate OAuth flow
router.get('/google', (req: Request, res: Response) => {
  try {
    const forceReauth = req.query.reauth === 'true';

    // If forcing reauth, destroy session first
    if (forceReauth && req.session) {
      req.session.destroy((err) => {
        if (err) console.error('Session destruction error:', err);
      });
    }

    const authUrl = getAuthUrl(forceReauth);
    // Redirect directly to Google OAuth
    res.redirect(authUrl);
  } catch (error) {
    console.error('Error generating auth URL:', error);
    res.status(500).json({ error: 'Failed to generate authentication URL' });
  }
});

// GET /api/auth/google/callback - Handle OAuth callback
router.get('/google/callback', async (req: Request, res: Response) => {
  try {
    const { code } = req.query;

    if (!code || typeof code !== 'string') {
      return res.status(400).json({ error: 'Missing authorization code' });
    }

    // Exchange code for tokens
    const tokens = await getTokensFromCode(code);

    // Store tokens in session
    req.session.googleTokens = {
      access_token: tokens.access_token!,
      refresh_token: tokens.refresh_token,
      expiry_date: tokens.expiry_date,
      token_type: tokens.token_type!,
      scope: tokens.scope!,
    };

    // Set credentials for future API calls
    setCredentials(tokens);

    // Save session
    req.session.save((err) => {
      if (err) {
        console.error('Session save error:', err);
        return res.status(500).json({ error: 'Failed to save session' });
      }

      // Redirect to frontend
      const frontendUrl = process.env.NODE_ENV === 'production'
        ? '/'
        : 'http://localhost:5173';

      res.redirect(frontendUrl);
    });
  } catch (error) {
    console.error('OAuth callback error:', error);

    // Redirect to frontend with error parameter
    const frontendUrl = process.env.NODE_ENV === 'production'
      ? '/?auth=error'
      : 'http://localhost:5173/?auth=error';

    res.redirect(frontendUrl);
  }
});

// GET /api/auth/status - Check authentication status
router.get('/status', (req: Request, res: Response) => {
  const isAuthenticated = !!req.session.googleTokens;

  res.json({
    authenticated: isAuthenticated,
    expiryDate: req.session.googleTokens?.expiry_date,
  });
});

// POST /api/auth/logout - Logout and clear session
router.post('/logout', (req: Request, res: Response) => {
  req.session.destroy((err) => {
    if (err) {
      console.error('Logout error:', err);
      return res.status(500).json({ error: 'Failed to logout' });
    }

    res.json({ success: true, message: 'Logged out successfully' });
  });
});

// GET /api/auth/test - Test endpoint (requires auth)
router.get('/test', requireAuth, (req: Request, res: Response) => {
  res.json({
    success: true,
    message: 'You are authenticated!',
    tokens: {
      hasAccessToken: !!req.session.googleTokens?.access_token,
      hasRefreshToken: !!req.session.googleTokens?.refresh_token,
      expiryDate: req.session.googleTokens?.expiry_date,
      scope: req.session.googleTokens?.scope,
    },
  });
});

export default router;
