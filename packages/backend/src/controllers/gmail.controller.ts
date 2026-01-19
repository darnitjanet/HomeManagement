import { Request, Response } from 'express';
import { GoogleGmailService } from '../services/google-gmail.service';
import { parseShippingEmail, parseMultipleEmails, ParsedShippingInfo } from '../services/shipping-email-parser';
import * as packageRepo from '../repositories/package.repository';

/**
 * Get recent shipping emails
 */
export async function getShippingEmails(req: Request, res: Response) {
  try {
    if (!req.googleAuth) {
      return res.status(401).json({ success: false, message: 'Not authenticated with Google' });
    }

    const daysBack = req.query.days ? parseInt(req.query.days as string) : 30;
    const afterDate = new Date();
    afterDate.setDate(afterDate.getDate() - daysBack);

    const gmailService = new GoogleGmailService(req.googleAuth);
    const emails = await gmailService.getShippingEmails(afterDate);
    const parsed = parseMultipleEmails(emails);

    // Check which emails have already been imported
    const results = await Promise.all(
      parsed.map(async (info) => {
        const existing = await packageRepo.findByEmailId(info.emailId);
        return {
          ...info,
          alreadyImported: !!existing,
          packageId: existing?.id || null,
        };
      })
    );

    res.json({ success: true, data: results });
  } catch (error: any) {
    console.error('Error getting shipping emails:', error);
    res.status(500).json({ success: false, message: error.message });
  }
}

/**
 * Import a single shipping email as a package
 */
export async function importShippingEmail(req: Request, res: Response) {
  try {
    if (!req.googleAuth) {
      return res.status(401).json({ success: false, message: 'Not authenticated with Google' });
    }

    const { emailId } = req.body;
    if (!emailId) {
      return res.status(400).json({ success: false, message: 'emailId is required' });
    }

    // Check if already imported
    const existing = await packageRepo.findByEmailId(emailId);
    if (existing) {
      return res.status(409).json({
        success: false,
        message: 'Email already imported',
        data: existing,
      });
    }

    // Fetch and parse the email
    const gmailService = new GoogleGmailService(req.googleAuth);
    const email = await gmailService.getEmail(emailId);

    if (!email) {
      return res.status(404).json({ success: false, message: 'Email not found' });
    }

    const parsed = parseShippingEmail(email);
    if (!parsed) {
      return res.status(400).json({ success: false, message: 'Could not parse shipping info from email' });
    }

    // Create the package
    const pkg = await packageRepo.createPackage({
      name: parsed.itemDescription || 'Package from ' + (parsed.vendor || 'Unknown'),
      tracking_number: parsed.trackingNumber || undefined,
      carrier: parsed.carrier || undefined,
      status: parsed.status,
      expected_delivery: parsed.expectedDelivery || undefined,
      order_number: parsed.orderNumber || undefined,
      vendor: parsed.vendor || undefined,
      email_id: emailId,
    });

    res.status(201).json({ success: true, data: pkg });
  } catch (error: any) {
    console.error('Error importing shipping email:', error);
    res.status(500).json({ success: false, message: error.message });
  }
}

/**
 * Sync all recent shipping emails to packages
 */
export async function syncShippingEmails(req: Request, res: Response) {
  try {
    if (!req.googleAuth) {
      return res.status(401).json({ success: false, message: 'Not authenticated with Google' });
    }

    const daysBack = req.query.days ? parseInt(req.query.days as string) : 30;
    const afterDate = new Date();
    afterDate.setDate(afterDate.getDate() - daysBack);

    const gmailService = new GoogleGmailService(req.googleAuth);
    const emails = await gmailService.getShippingEmails(afterDate);
    const parsed = parseMultipleEmails(emails);

    const results = {
      found: parsed.length,
      imported: 0,
      skipped: 0,
      errors: 0,
      packages: [] as any[],
    };

    for (const info of parsed) {
      try {
        // Check if already imported
        const existing = await packageRepo.findByEmailId(info.emailId);
        if (existing) {
          results.skipped++;
          continue;
        }

        // Create the package
        const pkg = await packageRepo.createPackage({
          name: info.itemDescription || 'Package from ' + (info.vendor || 'Unknown'),
          tracking_number: info.trackingNumber || undefined,
          carrier: info.carrier || undefined,
          status: info.status,
          expected_delivery: info.expectedDelivery || undefined,
          order_number: info.orderNumber || undefined,
          vendor: info.vendor || undefined,
          email_id: info.emailId,
        });

        results.imported++;
        results.packages.push(pkg);
      } catch (err) {
        console.error('Error importing email:', info.emailId, err);
        results.errors++;
      }
    }

    res.json({ success: true, data: results });
  } catch (error: any) {
    console.error('Error syncing shipping emails:', error);
    res.status(500).json({ success: false, message: error.message });
  }
}
