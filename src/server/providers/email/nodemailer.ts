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
      from: process.env.EMAIL_FROM,
      to: message.to,
      subject: message.subject,
      html: message.html,
      text: message.text,
    })
  }

  async sendNewsletter(message: EmailMessage, recipients: string[]): Promise<void> {
    const transporter = await this.createTransport()
    await Promise.all(
      recipients.map((to) =>
        transporter.sendMail({
          from: process.env.EMAIL_FROM,
          to,
          subject: message.subject,
          html: message.html,
          text: message.text,
        })
      )
    )
  }
}
