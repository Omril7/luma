import 'server-only'
import type { EmailProvider, EmailMessage } from './index'

export class NodemailerEmailProvider implements EmailProvider {
  private async createTransport() {
    const { createTransport } = await import('nodemailer')
    return createTransport({
      host: process.env.EMAIL_SMTP_HOST,
      port: Number(process.env.EMAIL_SMTP_PORT ?? 587),
      auth: {
        user: process.env.EMAIL_SMTP_USER,
        pass: process.env.EMAIL_SMTP_PASS,
      },
    })
  }

  async send(message: EmailMessage): Promise<void> {
    const transporter = await this.createTransport()
    await transporter.sendMail({
      from: formatFrom(message.from),
      to: message.to,
      subject: message.subject,
      html: message.html,
      text: message.text,
      ...(message.replyTo ? { replyTo: message.replyTo } : {}),
    })
  }

  async sendNewsletter(message: EmailMessage, recipients: string[]): Promise<void> {
    const transporter = await this.createTransport()
    await Promise.all(
      recipients.map((to) =>
        transporter.sendMail({
          from: formatFrom(message.from),
          to,
          subject: message.subject,
          html: message.html,
          text: message.text,
          ...(message.replyTo ? { replyTo: message.replyTo } : {}),
        })
      )
    )
  }
}

function formatFrom(from: EmailMessage['from']): string | undefined {
  if (!from) return process.env.EMAIL_FROM
  return from.name ? `"${from.name}" <${from.address}>` : from.address
}
