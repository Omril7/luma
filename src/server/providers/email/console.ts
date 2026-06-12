import 'server-only'
import type { EmailProvider, EmailMessage } from './index'

/** Logs emails to stdout — safe stub for development */
export class ConsoleEmailProvider implements EmailProvider {
  async send(message: EmailMessage): Promise<void> {
    console.log('[ConsoleEmailProvider] send:', {
      to: message.to,
      subject: message.subject,
    })
  }

  async sendNewsletter(message: EmailMessage, recipients: string[]): Promise<void> {
    console.log('[ConsoleEmailProvider] newsletter to', recipients.length, 'recipients:', {
      subject: message.subject,
    })
  }
}
