import { EmailMessage } from './google-gmail.service';

export interface ParsedAppointment {
  emailId: string;
  provider: string | null;
  appointmentType: string | null;
  date: string | null;
  time: string | null;
  location: string | null;
  description: string;
}

// Keywords that indicate an appointment email
const APPOINTMENT_KEYWORDS = [
  'appointment reminder',
  'appointment confirmation',
  'your appointment',
  'upcoming appointment',
  'scheduled appointment',
  'reminder:',
  'don\'t forget your appointment',
  'see you on',
  'visit scheduled',
  'your visit',
  'looking forward to seeing you',
];

// Provider detection patterns
const PROVIDER_PATTERNS: Array<{ pattern: RegExp; provider: string; type: string }> = [
  // Medical
  { pattern: /doctor|physician|md|medical|clinic|health/i, provider: 'Medical', type: 'Doctor appointment' },
  { pattern: /dentist|dental|dds|orthodont/i, provider: 'Dental', type: 'Dentist appointment' },
  { pattern: /eye|vision|optometr|ophthalmolog/i, provider: 'Eye Care', type: 'Eye appointment' },
  { pattern: /veterinar|vet|animal hospital|pet/i, provider: 'Veterinary', type: 'Vet appointment' },
  { pattern: /therapist|counselor|psycholog|psychiatr|mental health/i, provider: 'Mental Health', type: 'Therapy appointment' },
  { pattern: /physical therapy|pt appointment|rehabilitation/i, provider: 'Physical Therapy', type: 'PT appointment' },
  { pattern: /chiropract/i, provider: 'Chiropractic', type: 'Chiropractor appointment' },

  // Personal care
  { pattern: /salon|hair|stylist|barber/i, provider: 'Salon', type: 'Hair appointment' },
  { pattern: /spa|massage|wellness/i, provider: 'Spa', type: 'Spa appointment' },
  { pattern: /nail|manicure|pedicure/i, provider: 'Nail Salon', type: 'Nail appointment' },

  // Auto
  { pattern: /auto|car|vehicle|service center|mechanic|tire|oil change/i, provider: 'Auto Service', type: 'Car appointment' },
  { pattern: /dealership/i, provider: 'Dealership', type: 'Car appointment' },

  // Home
  { pattern: /hvac|plumber|electrician|contractor|home service/i, provider: 'Home Service', type: 'Service appointment' },

  // Financial/Legal
  { pattern: /bank|financial|advisor|accountant|cpa/i, provider: 'Financial', type: 'Financial appointment' },
  { pattern: /lawyer|attorney|legal/i, provider: 'Legal', type: 'Legal appointment' },
];

// Date patterns - more specific patterns first
const DATE_PATTERNS = [
  // "Thursday, January 15, 2026" - weekday then full date
  /(?:monday|tuesday|wednesday|thursday|friday|saturday|sunday),?\s*(january|february|march|april|may|june|july|august|september|october|november|december|jan|feb|mar|apr|jun|jul|aug|sep|sept|oct|nov|dec)\s+(\d{1,2})(?:st|nd|rd|th)?,?\s*(\d{4})?/gi,
  // "January 15, 2024" or "January 15th, 2024" - full month name with year
  /(january|february|march|april|may|june|july|august|september|october|november|december)\s+(\d{1,2})(?:st|nd|rd|th)?,?\s*(\d{4})/gi,
  // "Jan 15, 2024" - abbreviated month with year
  /(jan|feb|mar|apr|may|jun|jul|aug|sep|sept|oct|nov|dec)\s+(\d{1,2})(?:st|nd|rd|th)?,?\s*(\d{4})/gi,
  // "01/15/2024" or "1/15/24"
  /(\d{1,2})\/(\d{1,2})\/(\d{2,4})/g,
  // "2024-01-15"
  /(\d{4})-(\d{2})-(\d{2})/g,
  // "January 15" without year (assume current year)
  /(january|february|march|april|may|june|july|august|september|october|november|december|jan|feb|mar|apr|jun|jul|aug|sep|sept|oct|nov|dec)\s+(\d{1,2})(?:st|nd|rd|th)?/gi,
  // "tomorrow" or "today"
  /\b(today|tomorrow)\b/gi,
];

// Time patterns
const TIME_PATTERNS = [
  // "2:30 PM" or "2:30PM" or "14:30"
  /(\d{1,2}):(\d{2})\s*(am|pm)?/gi,
  // "at 2 PM" or "at 2PM"
  /at\s+(\d{1,2})\s*(am|pm)/gi,
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

export function parseAppointmentEmail(email: EmailMessage): ParsedAppointment | null {
  const content = `${email.from} ${email.subject} ${email.body} ${email.snippet}`;
  const textContent = content.replace(/<[^>]*>/g, ' ');
  const lowerContent = textContent.toLowerCase();

  // Check if this looks like an appointment email
  if (!isAppointmentEmail(lowerContent)) {
    return null;
  }

  // Detect provider and type
  const { provider, type } = detectProviderAndType(textContent);

  // Extract date
  const date = extractDate(textContent);

  // Extract time
  const time = extractTime(textContent);

  // Extract location (look for address patterns)
  const location = extractLocation(textContent);

  // Use subject as description, cleaned up
  const description = cleanDescription(email.subject);

  // Only return if we have at least a date
  if (!date) {
    return null;
  }

  return {
    emailId: email.id,
    provider,
    appointmentType: type,
    date,
    time,
    location,
    description,
  };
}

function isAppointmentEmail(lowerContent: string): boolean {
  return APPOINTMENT_KEYWORDS.some(keyword => lowerContent.includes(keyword.toLowerCase()));
}

function detectProviderAndType(content: string): { provider: string | null; type: string | null } {
  for (const { pattern, provider, type } of PROVIDER_PATTERNS) {
    if (pattern.test(content)) {
      return { provider, type };
    }
  }
  return { provider: null, type: 'Appointment' };
}

function extractDate(content: string): string | null {
  const lowerContent = content.toLowerCase();

  // Check for "today" or "tomorrow"
  if (/\btoday\b/.test(lowerContent)) {
    return new Date().toISOString().split('T')[0];
  }
  if (/\btomorrow\b/.test(lowerContent)) {
    const tomorrow = new Date();
    tomorrow.setDate(tomorrow.getDate() + 1);
    return tomorrow.toISOString().split('T')[0];
  }

  for (const pattern of DATE_PATTERNS) {
    pattern.lastIndex = 0;
    const match = pattern.exec(content);
    if (match) {
      try {
        // Check which format matched
        if (match[0].includes('/')) {
          // MM/DD/YYYY format
          const month = parseInt(match[1]) - 1;
          const day = parseInt(match[2]);
          let year = parseInt(match[3]);
          if (year < 100) year += 2000;
          const date = new Date(year, month, day);
          return date.toISOString().split('T')[0];
        } else if (match[0].includes('-') && match[1].length === 4) {
          // YYYY-MM-DD format
          return match[0];
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

function extractTime(content: string): string | null {
  for (const pattern of TIME_PATTERNS) {
    pattern.lastIndex = 0;
    const match = pattern.exec(content);
    if (match) {
      let hours = parseInt(match[1]);
      const minutes = match[2] ? parseInt(match[2]) : 0;
      const ampm = (match[3] || match[2] || '').toLowerCase();

      if (ampm === 'pm' && hours < 12) hours += 12;
      if (ampm === 'am' && hours === 12) hours = 0;

      return `${hours.toString().padStart(2, '0')}:${minutes.toString().padStart(2, '0')}`;
    }
  }
  return null;
}

function extractLocation(content: string): string | null {
  // Look for common address patterns
  const addressPatterns = [
    /(?:at|location|address):?\s*([^,\n]+,\s*[A-Z]{2}\s*\d{5})/i,
    /(\d+\s+[A-Za-z\s]+(?:St|Street|Ave|Avenue|Rd|Road|Blvd|Boulevard|Dr|Drive|Ln|Lane|Way|Court|Ct)[^,]*,\s*[^,]+,\s*[A-Z]{2}\s*\d{5})/i,
  ];

  for (const pattern of addressPatterns) {
    const match = pattern.exec(content);
    if (match) {
      return match[1].trim();
    }
  }
  return null;
}

function cleanDescription(subject: string): string {
  return subject
    .replace(/^(re:|fwd:|reminder:)\s*/gi, '')
    .replace(/appointment reminder:?\s*/gi, '')
    .replace(/^\s*-\s*/, '')
    .trim()
    .substring(0, 200);
}

export function parseMultipleAppointmentEmails(emails: EmailMessage[]): ParsedAppointment[] {
  const results: ParsedAppointment[] = [];

  for (const email of emails) {
    const parsed = parseAppointmentEmail(email);
    if (parsed) {
      results.push(parsed);
    }
  }

  return results;
}
