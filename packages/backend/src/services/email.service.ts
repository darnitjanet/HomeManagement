import nodemailer, { Transporter } from 'nodemailer';
import { DigestData } from './notification.service';

export class EmailService {
  private transporter: Transporter | null = null;
  private fromAddress: string;

  constructor() {
    this.fromAddress = process.env.SMTP_FROM || 'HomeManagement <noreply@example.com>';
    this.initializeTransporter();
  }

  private initializeTransporter(): void {
    const host = process.env.SMTP_HOST;
    const port = parseInt(process.env.SMTP_PORT || '587', 10);
    const secure = process.env.SMTP_SECURE === 'true';
    const user = process.env.SMTP_USER;
    const pass = process.env.SMTP_PASS;

    if (!host || !user || !pass) {
      console.warn('Email service not configured. Set SMTP_HOST, SMTP_USER, and SMTP_PASS in .env');
      return;
    }

    this.transporter = nodemailer.createTransport({
      host,
      port,
      secure,
      auth: {
        user,
        pass,
      },
    });
  }

  /**
   * Check if email service is configured
   */
  isConfigured(): boolean {
    return this.transporter !== null;
  }

  /**
   * Send a daily digest email
   */
  async sendDailyDigest(to: string, data: DigestData): Promise<boolean> {
    if (!this.transporter) {
      console.warn('Cannot send digest: Email service not configured');
      return false;
    }

    const today = new Date().toLocaleDateString('en-US', {
      weekday: 'long',
      year: 'numeric',
      month: 'long',
      day: 'numeric',
    });

    const html = this.generateDigestHtml(data, today);
    const text = this.generateDigestText(data, today);

    try {
      await this.transporter.sendMail({
        from: this.fromAddress,
        to,
        subject: `Daily Digest - ${today}`,
        text,
        html,
      });
      console.log(`Daily digest sent to ${to}`);
      return true;
    } catch (error) {
      console.error('Failed to send daily digest:', error);
      throw error;
    }
  }

  /**
   * Generate HTML email content for digest
   */
  private generateDigestHtml(data: DigestData, dateStr: string): string {
    const styles = `
      body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif; line-height: 1.6; color: #333; max-width: 600px; margin: 0 auto; padding: 20px; }
      h1 { color: #5b768a; border-bottom: 2px solid #da6b34; padding-bottom: 10px; }
      h2 { color: #5b768a; font-size: 18px; margin-top: 24px; margin-bottom: 12px; }
      .section { background: #f8f9fa; border-radius: 8px; padding: 16px; margin-bottom: 16px; }
      .item { padding: 8px 0; border-bottom: 1px solid #e9ecef; }
      .item:last-child { border-bottom: none; }
      .time { color: #666; font-size: 14px; }
      .priority-urgent { color: #dc3545; font-weight: bold; }
      .priority-high { color: #da6b34; font-weight: bold; }
      .location { color: #666; font-size: 13px; }
      .empty { color: #999; font-style: italic; }
      .overdue { background: #fff5f5; border-left: 3px solid #dc3545; }
      .footer { margin-top: 30px; padding-top: 20px; border-top: 1px solid #e9ecef; color: #666; font-size: 13px; }
    `;

    let html = `
<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <style>${styles}</style>
</head>
<body>
  <h1>Good Morning!</h1>
  <p>Here's your daily digest for <strong>${dateStr}</strong>.</p>
`;

    // Calendar Events
    html += `<h2>Today's Calendar</h2><div class="section">`;
    if (data.calendarEvents.length === 0) {
      html += `<p class="empty">No events scheduled for today.</p>`;
    } else {
      for (const event of data.calendarEvents) {
        const time = event.allDay
          ? 'All Day'
          : new Date(event.startDateTime).toLocaleTimeString([], {
              hour: '2-digit',
              minute: '2-digit',
            });
        html += `
          <div class="item">
            <strong>${this.escapeHtml(event.summary)}</strong>
            <div class="time">${time}</div>
            ${event.location ? `<div class="location">${this.escapeHtml(event.location)}</div>` : ''}
          </div>
        `;
      }
    }
    html += `</div>`;

    // Tasks Due
    html += `<h2>Tasks Due Today</h2><div class="section">`;
    if (data.tasksDueToday.length === 0) {
      html += `<p class="empty">No tasks due today.</p>`;
    } else {
      for (const task of data.tasksDueToday) {
        const priorityClass =
          task.priority === 'urgent'
            ? 'priority-urgent'
            : task.priority === 'high'
            ? 'priority-high'
            : '';
        html += `
          <div class="item">
            <strong class="${priorityClass}">${this.escapeHtml(task.title)}</strong>
            ${task.dueTime ? `<div class="time">Due at ${task.dueTime}</div>` : ''}
          </div>
        `;
      }
    }
    html += `</div>`;

    // Chores Due
    html += `<h2>Chores Due Today</h2><div class="section">`;
    if (data.choresDueToday.length === 0) {
      html += `<p class="empty">No chores due today.</p>`;
    } else {
      for (const chore of data.choresDueToday) {
        html += `
          <div class="item">
            <strong>${this.escapeHtml(chore.name)}</strong>
            ${chore.assignedKidName ? `<div class="time">${this.escapeHtml(chore.assignedKidName)}'s turn</div>` : ''}
          </div>
        `;
      }
    }
    html += `</div>`;

    // Overdue Game Loans
    if (data.overdueGameLoans.length > 0) {
      html += `<h2>Overdue Game Loans</h2><div class="section overdue">`;
      for (const loan of data.overdueGameLoans) {
        html += `
          <div class="item">
            <strong>${this.escapeHtml(loan.gameName)}</strong>
            <div class="time">With ${this.escapeHtml(loan.borrowerName)} for ${loan.daysOverdue} days</div>
          </div>
        `;
      }
      html += `</div>`;
    }

    html += `
  <div class="footer">
    <p>This digest was sent from your HomeManagement app.</p>
  </div>
</body>
</html>
`;

    return html;
  }

  /**
   * Generate plain text email content for digest
   */
  private generateDigestText(data: DigestData, dateStr: string): string {
    let text = `Good Morning!\n\nHere's your daily digest for ${dateStr}.\n\n`;

    // Calendar Events
    text += `TODAY'S CALENDAR\n${'='.repeat(40)}\n`;
    if (data.calendarEvents.length === 0) {
      text += `No events scheduled for today.\n`;
    } else {
      for (const event of data.calendarEvents) {
        const time = event.allDay
          ? 'All Day'
          : new Date(event.startDateTime).toLocaleTimeString([], {
              hour: '2-digit',
              minute: '2-digit',
            });
        text += `- ${event.summary} (${time})${event.location ? ` @ ${event.location}` : ''}\n`;
      }
    }
    text += '\n';

    // Tasks Due
    text += `TASKS DUE TODAY\n${'='.repeat(40)}\n`;
    if (data.tasksDueToday.length === 0) {
      text += `No tasks due today.\n`;
    } else {
      for (const task of data.tasksDueToday) {
        const priority = task.priority !== 'medium' ? ` [${task.priority.toUpperCase()}]` : '';
        text += `- ${task.title}${priority}${task.dueTime ? ` (due at ${task.dueTime})` : ''}\n`;
      }
    }
    text += '\n';

    // Chores Due
    text += `CHORES DUE TODAY\n${'='.repeat(40)}\n`;
    if (data.choresDueToday.length === 0) {
      text += `No chores due today.\n`;
    } else {
      for (const chore of data.choresDueToday) {
        text += `- ${chore.name}${chore.assignedKidName ? ` (${chore.assignedKidName}'s turn)` : ''}\n`;
      }
    }
    text += '\n';

    // Overdue Game Loans
    if (data.overdueGameLoans.length > 0) {
      text += `OVERDUE GAME LOANS\n${'='.repeat(40)}\n`;
      for (const loan of data.overdueGameLoans) {
        text += `- ${loan.gameName} - with ${loan.borrowerName} for ${loan.daysOverdue} days\n`;
      }
      text += '\n';
    }

    text += `---\nThis digest was sent from your HomeManagement app.\n`;

    return text;
  }

  /**
   * Escape HTML special characters
   */
  private escapeHtml(text: string): string {
    const map: Record<string, string> = {
      '&': '&amp;',
      '<': '&lt;',
      '>': '&gt;',
      '"': '&quot;',
      "'": '&#039;',
    };
    return text.replace(/[&<>"']/g, (char) => map[char]);
  }

  /**
   * Test email configuration by sending a test email
   */
  async sendTestEmail(to: string): Promise<boolean> {
    if (!this.transporter) {
      throw new Error('Email service not configured');
    }

    try {
      await this.transporter.sendMail({
        from: this.fromAddress,
        to,
        subject: 'HomeManagement - Test Email',
        text: 'This is a test email from your HomeManagement app. If you received this, your email configuration is working correctly!',
        html: `
          <div style="font-family: sans-serif; padding: 20px;">
            <h2 style="color: #5b768a;">Test Email Successful!</h2>
            <p>This is a test email from your HomeManagement app.</p>
            <p>If you received this, your email configuration is working correctly!</p>
          </div>
        `,
      });
      return true;
    } catch (error) {
      console.error('Test email failed:', error);
      throw error;
    }
  }
}
