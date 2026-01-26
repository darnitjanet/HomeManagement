import { google, gmail_v1 } from 'googleapis';
import { OAuth2Client } from 'google-auth-library';

export interface EmailMessage {
  id: string;
  threadId: string;
  subject: string;
  from: string;
  to: string;
  date: string;
  snippet: string;
  body: string;
  bodyHtml: string;
}

export class GoogleGmailService {
  private gmail: gmail_v1.Gmail;

  constructor(auth: OAuth2Client) {
    this.gmail = google.gmail({ version: 'v1', auth });
  }

  /**
   * Search emails using Gmail query syntax
   */
  async searchEmails(query: string, maxResults = 20): Promise<gmail_v1.Schema$Message[]> {
    const response = await this.gmail.users.messages.list({
      userId: 'me',
      q: query,
      maxResults,
    });

    return response.data.messages || [];
  }

  /**
   * Get full email content by ID
   */
  async getEmail(messageId: string): Promise<EmailMessage | null> {
    try {
      const response = await this.gmail.users.messages.get({
        userId: 'me',
        id: messageId,
        format: 'full',
      });

      const message = response.data;
      if (!message) return null;

      const headers = message.payload?.headers || [];
      const getHeader = (name: string) =>
        headers.find(h => h.name?.toLowerCase() === name.toLowerCase())?.value || '';

      // Extract body
      let body = '';
      let bodyHtml = '';

      if (message.payload?.body?.data) {
        body = this.decodeBase64(message.payload.body.data);
      } else if (message.payload?.parts) {
        for (const part of message.payload.parts) {
          if (part.mimeType === 'text/plain' && part.body?.data) {
            body = this.decodeBase64(part.body.data);
          } else if (part.mimeType === 'text/html' && part.body?.data) {
            bodyHtml = this.decodeBase64(part.body.data);
          } else if (part.parts) {
            // Handle nested multipart
            for (const subpart of part.parts) {
              if (subpart.mimeType === 'text/plain' && subpart.body?.data) {
                body = this.decodeBase64(subpart.body.data);
              } else if (subpart.mimeType === 'text/html' && subpart.body?.data) {
                bodyHtml = this.decodeBase64(subpart.body.data);
              }
            }
          }
        }
      }

      return {
        id: message.id || '',
        threadId: message.threadId || '',
        subject: getHeader('Subject'),
        from: getHeader('From'),
        to: getHeader('To'),
        date: getHeader('Date'),
        snippet: message.snippet || '',
        body,
        bodyHtml,
      };
    } catch (error) {
      console.error('Error fetching email:', error);
      return null;
    }
  }

  /**
   * Search for shipping/tracking emails from common carriers and retailers
   */
  async getShippingEmails(afterDate?: Date, maxResults = 50): Promise<EmailMessage[]> {
    // Build query for shipping-related emails
    // Focus on specific trusted senders: Amazon, Walmart, Target, USPS, UPS, FedEx
    const queryParts: string[] = [];

    // Only look in Updates category (where shipping notifications go)
    queryParts.push('category:updates');

    // Require emails from specific trusted senders (retailers and carriers)
    queryParts.push('from:(amazon.com OR walmart.com OR target.com OR ebay.com OR bestbuy.com OR homedepot.com OR lowes.com OR costco.com OR etsy.com OR aliexpress.com OR newegg.com OR chewy.com OR express-scripts.com OR cvs.com OR walgreens.com OR usps.com OR ups.com OR fedex.com OR dhl.com OR ontrac.com)');

    // Subject keywords for shipping notifications
    queryParts.push('subject:(shipped OR "has shipped" OR "out for delivery" OR "on its way" OR "your package")');

    // Date filter
    if (afterDate) {
      const dateStr = afterDate.toISOString().split('T')[0].replace(/-/g, '/');
      queryParts.push(`after:${dateStr}`);
    } else {
      // Default to last 30 days
      const thirtyDaysAgo = new Date();
      thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);
      const dateStr = thirtyDaysAgo.toISOString().split('T')[0].replace(/-/g, '/');
      queryParts.push(`after:${dateStr}`);
    }

    const query = queryParts.join(' ');
    console.log('Gmail search query:', query);

    const messageList = await this.searchEmails(query, maxResults);
    const emails: EmailMessage[] = [];

    for (const msg of messageList) {
      if (msg.id) {
        const fullEmail = await this.getEmail(msg.id);
        if (fullEmail) {
          emails.push(fullEmail);
        }
      }
    }

    return emails;
  }

  /**
   * Search for appointment reminder emails
   */
  async getAppointmentEmails(afterDate?: Date, maxResults = 50): Promise<EmailMessage[]> {
    const queryParts: string[] = [];

    // Subject keywords for appointment reminders
    queryParts.push('subject:("appointment reminder" OR "appointment confirmation" OR "your appointment" OR "upcoming appointment" OR "scheduled appointment" OR "looking forward to seeing you" OR "see you on" OR "your visit")');

    // Date filter
    if (afterDate) {
      const dateStr = afterDate.toISOString().split('T')[0].replace(/-/g, '/');
      queryParts.push(`after:${dateStr}`);
    } else {
      // Default to last 14 days
      const twoWeeksAgo = new Date();
      twoWeeksAgo.setDate(twoWeeksAgo.getDate() - 14);
      const dateStr = twoWeeksAgo.toISOString().split('T')[0].replace(/-/g, '/');
      queryParts.push(`after:${dateStr}`);
    }

    const query = queryParts.join(' ');
    console.log('Gmail appointment search query:', query);

    const messageList = await this.searchEmails(query, maxResults);
    const emails: EmailMessage[] = [];

    for (const msg of messageList) {
      if (msg.id) {
        const fullEmail = await this.getEmail(msg.id);
        if (fullEmail) {
          emails.push(fullEmail);
        }
      }
    }

    return emails;
  }

  /**
   * Decode base64url encoded string
   */
  private decodeBase64(data: string): string {
    // Gmail uses URL-safe base64 encoding
    const base64 = data.replace(/-/g, '+').replace(/_/g, '/');
    return Buffer.from(base64, 'base64').toString('utf-8');
  }
}
