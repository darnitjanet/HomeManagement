import { EmailMessage } from './google-gmail.service';

export interface ParsedShippingInfo {
  emailId: string;
  vendor: string | null;
  carrier: string | null;
  trackingNumber: string | null;
  orderNumber: string | null;
  itemDescription: string | null;
  expectedDelivery: string | null;
  status: string;
}

// Tracking number patterns for different carriers
const TRACKING_PATTERNS: Record<string, RegExp[]> = {
  ups: [
    /\b1Z[A-Z0-9]{16}\b/gi,
  ],
  fedex: [
    /\b\d{12}\b/g,
    /\b\d{15}\b/g,
    /\b\d{20}\b/g,
    /\b\d{22}\b/g,
    /\b[0-9]{4}[- ]?[0-9]{4}[- ]?[0-9]{4}\b/g,
  ],
  usps: [
    /\b9[0-9]{15,21}\b/g,
    /\b[0-9]{20,22}\b/g,
    /\bEC[0-9]{9}US\b/gi,
    /\b[A-Z]{2}[0-9]{9}US\b/gi,
  ],
  amazon: [
    /\bTBA[0-9]{12,}\b/gi,
  ],
  dhl: [
    /\b[0-9]{10,11}\b/g,
    /\b[0-9]{4}[- ]?[0-9]{4}[- ]?[0-9]{2}\b/g,
  ],
  ontrac: [
    /\bC[0-9]{14}\b/gi,
    /\bD[0-9]{14}\b/gi,
  ],
};

// Vendor detection patterns
const VENDOR_PATTERNS: Array<{ pattern: RegExp; vendor: string }> = [
  { pattern: /amazon\.com|from:.*amazon/i, vendor: 'Amazon' },
  { pattern: /walmart\.com|from:.*walmart/i, vendor: 'Walmart' },
  { pattern: /target\.com|from:.*target/i, vendor: 'Target' },
  { pattern: /ebay\.com|from:.*ebay/i, vendor: 'eBay' },
  { pattern: /bestbuy\.com|from:.*best\s?buy/i, vendor: 'Best Buy' },
  { pattern: /homedepot\.com|from:.*home\s?depot/i, vendor: 'Home Depot' },
  { pattern: /lowes\.com|from:.*lowe'?s/i, vendor: 'Lowes' },
  { pattern: /costco\.com|from:.*costco/i, vendor: 'Costco' },
  { pattern: /etsy\.com|from:.*etsy/i, vendor: 'Etsy' },
  { pattern: /aliexpress\.com|from:.*aliexpress/i, vendor: 'AliExpress' },
  { pattern: /newegg\.com|from:.*newegg/i, vendor: 'Newegg' },
  { pattern: /chewy\.com|from:.*chewy/i, vendor: 'Chewy' },
  { pattern: /express-scripts\.com|from:.*express\s?scripts|expressscripts/i, vendor: 'Express Scripts' },
  { pattern: /cvs\.com|from:.*cvs/i, vendor: 'CVS' },
  { pattern: /walgreens\.com|from:.*walgreens/i, vendor: 'Walgreens' },
];

// Carrier detection from email
const CARRIER_DETECTION: Array<{ pattern: RegExp; carrier: string }> = [
  { pattern: /ups\.com|from:.*@ups\.|united parcel service/i, carrier: 'ups' },
  { pattern: /fedex\.com|from:.*@fedex\./i, carrier: 'fedex' },
  { pattern: /usps\.com|from:.*@usps\.|postal service/i, carrier: 'usps' },
  { pattern: /dhl\.com|from:.*@dhl\./i, carrier: 'dhl' },
  { pattern: /ontrac\.com|from:.*@ontrac\./i, carrier: 'ontrac' },
  { pattern: /shipped with ups|via ups|ups tracking/i, carrier: 'ups' },
  { pattern: /shipped with fedex|via fedex|fedex tracking/i, carrier: 'fedex' },
  { pattern: /shipped with usps|via usps|usps tracking/i, carrier: 'usps' },
  { pattern: /amazon logistics|shipped with amazon/i, carrier: 'amazon' },
];

// Date extraction patterns
const DATE_PATTERNS = [
  // "arriving Monday, January 15"
  /arriving\s+(?:on\s+)?(?:monday|tuesday|wednesday|thursday|friday|saturday|sunday)?,?\s*([a-z]+)\s+(\d{1,2})(?:st|nd|rd|th)?/gi,
  // "delivery by January 15, 2024"
  /delivery\s+(?:by|on|date:?)\s*([a-z]+)\s+(\d{1,2})(?:st|nd|rd|th)?,?\s*(\d{4})?/gi,
  // "arriving by Jan 15"
  /arriving\s+(?:by|on)\s+([a-z]{3,})\s+(\d{1,2})(?:st|nd|rd|th)?/gi,
  // "expected delivery: 01/15/2024"
  /expected\s+delivery:?\s*(\d{1,2})\/(\d{1,2})\/(\d{2,4})/gi,
  // "will be delivered January 15"
  /will be delivered\s+(?:on\s+)?([a-z]+)\s+(\d{1,2})(?:st|nd|rd|th)?/gi,
];

const MONTHS: Record<string, number> = {
  january: 0, jan: 0,
  february: 1, feb: 1,
  march: 2, mar: 2,
  april: 3, apr: 3,
  may: 4,
  june: 5, jun: 5,
  july: 6, jul: 6,
  august: 7, aug: 7,
  september: 8, sep: 8, sept: 8,
  october: 9, oct: 9,
  november: 10, nov: 10,
  december: 11, dec: 11,
};

export function parseShippingEmail(email: EmailMessage): ParsedShippingInfo | null {
  const content = `${email.from} ${email.subject} ${email.body} ${email.bodyHtml}`;
  const textContent = content.replace(/<[^>]*>/g, ' '); // Strip HTML tags for pattern matching

  // Check if this looks like a shipping email
  if (!isShippingEmail(email)) {
    return null;
  }

  // Detect vendor
  const vendor = detectVendor(content);

  // Detect carrier
  let carrier = detectCarrier(content);

  // Extract tracking number
  let trackingNumber = extractTrackingNumber(textContent, carrier);

  // If we found a tracking number but no carrier, try to detect carrier from the number
  if (trackingNumber && !carrier) {
    carrier = detectCarrierFromTrackingNumber(trackingNumber);
  }

  // Extract order number
  const orderNumber = extractOrderNumber(textContent, vendor);

  // Extract item description from subject or body
  const itemDescription = extractItemDescription(email.subject, textContent);

  // Extract expected delivery date
  const expectedDelivery = extractDeliveryDate(textContent);

  // Determine status based on email content
  const status = determineStatus(textContent);

  // Only return if we have at least some useful info
  if (!trackingNumber && !orderNumber && !itemDescription) {
    return null;
  }

  return {
    emailId: email.id,
    vendor,
    carrier,
    trackingNumber,
    orderNumber,
    itemDescription,
    expectedDelivery,
    status,
  };
}

function isShippingEmail(email: EmailMessage): boolean {
  const content = `${email.subject} ${email.snippet}`.toLowerCase();
  const shippingKeywords = [
    'shipped', 'has shipped', 'tracking', 'out for delivery',
    'on its way', 'delivery', 'arriving', 'will be delivered',
    'package', 'order shipped', 'shipment', 'dispatched',
    'prescription shipped', 'medication shipped', 'rx shipped',
    'your order is on the way', 'your prescription is on the way'
  ];

  return shippingKeywords.some(keyword => content.includes(keyword));
}

function detectVendor(content: string): string | null {
  for (const { pattern, vendor } of VENDOR_PATTERNS) {
    if (pattern.test(content)) {
      return vendor;
    }
  }
  return null;
}

function detectCarrier(content: string): string | null {
  for (const { pattern, carrier } of CARRIER_DETECTION) {
    if (pattern.test(content)) {
      return carrier;
    }
  }
  return null;
}

function detectCarrierFromTrackingNumber(trackingNumber: string): string | null {
  for (const [carrier, patterns] of Object.entries(TRACKING_PATTERNS)) {
    for (const pattern of patterns) {
      // Reset regex state
      pattern.lastIndex = 0;
      if (pattern.test(trackingNumber)) {
        return carrier;
      }
    }
  }
  return null;
}

function extractTrackingNumber(content: string, preferredCarrier: string | null): string | null {
  // If we know the carrier, try those patterns first
  if (preferredCarrier && TRACKING_PATTERNS[preferredCarrier]) {
    for (const pattern of TRACKING_PATTERNS[preferredCarrier]) {
      pattern.lastIndex = 0;
      const match = pattern.exec(content);
      if (match) {
        return match[0].replace(/[- ]/g, '');
      }
    }
  }

  // Try all patterns
  for (const [carrier, patterns] of Object.entries(TRACKING_PATTERNS)) {
    for (const pattern of patterns) {
      pattern.lastIndex = 0;
      const match = pattern.exec(content);
      if (match) {
        return match[0].replace(/[- ]/g, '');
      }
    }
  }

  return null;
}

function extractOrderNumber(content: string, vendor: string | null): string | null {
  const patterns = [
    /order\s*#?\s*:?\s*([A-Z0-9-]{5,})/gi,
    /order\s+number:?\s*([A-Z0-9-]{5,})/gi,
    /confirmation\s*#?\s*:?\s*([A-Z0-9-]{5,})/gi,
  ];

  // Amazon-specific pattern
  if (vendor === 'Amazon') {
    const amazonPattern = /\b(\d{3}-\d{7}-\d{7})\b/g;
    const match = amazonPattern.exec(content);
    if (match) return match[1];
  }

  for (const pattern of patterns) {
    pattern.lastIndex = 0;
    const match = pattern.exec(content);
    if (match) {
      return match[1];
    }
  }

  return null;
}

function extractItemDescription(subject: string, content: string): string | null {
  // Try to extract from subject first
  // Remove common prefixes
  let description = subject
    .replace(/^(your|re:|fwd:)\s*/gi, '')
    .replace(/has\s+shipped/gi, '')
    .replace(/shipped!/gi, '')
    .replace(/tracking\s+number/gi, '')
    .replace(/order\s+confirmation/gi, '')
    .trim();

  if (description && description.length > 5 && description.length < 200) {
    return description;
  }

  // Try to find item name in content
  const itemPatterns = [
    /item:?\s*([^\n]+)/i,
    /product:?\s*([^\n]+)/i,
    /ordered:?\s*([^\n]+)/i,
  ];

  for (const pattern of itemPatterns) {
    const match = pattern.exec(content);
    if (match && match[1].trim().length > 3) {
      return match[1].trim().substring(0, 200);
    }
  }

  return subject.substring(0, 200);
}

function extractDeliveryDate(content: string): string | null {
  for (const pattern of DATE_PATTERNS) {
    pattern.lastIndex = 0;
    const match = pattern.exec(content);
    if (match) {
      try {
        // Handle different date formats
        if (match[3] && /^\d+$/.test(match[1])) {
          // MM/DD/YYYY format
          const month = parseInt(match[1]) - 1;
          const day = parseInt(match[2]);
          let year = parseInt(match[3]);
          if (year < 100) year += 2000;
          const date = new Date(year, month, day);
          return date.toISOString().split('T')[0];
        } else {
          // Month name format
          const monthStr = match[1].toLowerCase();
          const month = MONTHS[monthStr];
          if (month !== undefined) {
            const day = parseInt(match[2]);
            const year = match[3] ? parseInt(match[3]) : new Date().getFullYear();
            const date = new Date(year, month, day);
            // If date is in the past, assume next year
            if (date < new Date()) {
              date.setFullYear(date.getFullYear() + 1);
            }
            return date.toISOString().split('T')[0];
          }
        }
      } catch (e) {
        continue;
      }
    }
  }
  return null;
}

function determineStatus(content: string): string {
  const lowerContent = content.toLowerCase();

  if (lowerContent.includes('delivered')) {
    return 'delivered';
  }
  if (lowerContent.includes('out for delivery')) {
    return 'out_for_delivery';
  }
  if (lowerContent.includes('in transit') || lowerContent.includes('on its way') || lowerContent.includes('on the way')) {
    return 'in_transit';
  }
  if (lowerContent.includes('shipped') || lowerContent.includes('has shipped') || lowerContent.includes('dispatched')) {
    return 'shipped';
  }

  return 'shipped'; // Default for shipping confirmation emails
}

export function parseMultipleEmails(emails: EmailMessage[]): ParsedShippingInfo[] {
  const results: ParsedShippingInfo[] = [];

  for (const email of emails) {
    const parsed = parseShippingEmail(email);
    if (parsed) {
      results.push(parsed);
    }
  }

  return results;
}
