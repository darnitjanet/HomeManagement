import { Request, Response, NextFunction } from 'express';
import { getOAuth2Client, refreshAccessToken, isTokenExpired } from '../config/google';

// Extend Request type to include googleAuth
declare global {
  namespace Express {
    interface Request {
      googleAuth?: any;
    }
  }
}

// Middleware to check if user is authenticated
export async function requireAuth(req: Request, res: Response, next: NextFunction) {
  try {
    const tokens = req.session.googleTokens;

    if (!tokens) {
      return res.status(401).json({
        error: 'Not authenticated',
        message: 'Please login with Google first'
      });
    }

    // Check if access token is expired
    if (isTokenExpired(tokens.expiry_date)) {
      // Try to refresh the token
      if (tokens.refresh_token) {
        try {
          const newTokens = await refreshAccessToken(tokens.refresh_token);

          // Update session with new tokens
          req.session.googleTokens = {
            ...tokens,
            ...newTokens,
          };

          getOAuth2Client().setCredentials(newTokens);
        } catch (error) {
          console.error('Token refresh failed:', error);
          return res.status(401).json({
            error: 'Authentication expired',
            message: 'Please login again'
          });
        }
      } else {
        return res.status(401).json({
          error: 'Authentication expired',
          message: 'Please login again'
        });
      }
    } else {
      // Set credentials on oauth client
      getOAuth2Client().setCredentials(tokens);
    }

    // Attach oauth client to request
    req.googleAuth = getOAuth2Client();
    next();
  } catch (error) {
    console.error('Auth middleware error:', error);
    res.status(500).json({ error: 'Authentication error' });
  }
}

// Optional auth middleware (doesn't fail if not authenticated)
export async function optionalAuth(req: Request, res: Response, next: NextFunction) {
  try {
    const tokens = req.session.googleTokens;

    if (tokens) {
      // Check if access token is expired and refresh if needed
      if (isTokenExpired(tokens.expiry_date) && tokens.refresh_token) {
        try {
          const newTokens = await refreshAccessToken(tokens.refresh_token);
          req.session.googleTokens = {
            ...tokens,
            ...newTokens,
          };
          getOAuth2Client().setCredentials(newTokens);
        } catch (error) {
          console.error('Token refresh failed:', error);
        }
      } else if (!isTokenExpired(tokens.expiry_date)) {
        getOAuth2Client().setCredentials(tokens);
      }

      req.googleAuth = getOAuth2Client();
    }

    next();
  } catch (error) {
    console.error('Optional auth middleware error:', error);
    next();
  }
}
