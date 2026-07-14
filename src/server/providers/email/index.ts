import 'server-only'

export interface EmailMessage {
  to: string | string[]
  subject: string
  html: string
  text?: string
  from?: { address: string; name?: string }
  replyTo?: string
}

export interface EmailProvider {
  send(message: EmailMessage): Promise<void>
  sendNewsletter(message: EmailMessage, recipients: string[]): Promise<void>
}

export async function getEmailProvider(): Promise<EmailProvider> {
  const provider = process.env.EMAIL_PROVIDER ?? 'stub'
  if (provider === 'nodemailer') {
    const { NodemailerEmailProvider } = await import('./nodemailer')
    return new NodemailerEmailProvider()
  }
  const { ConsoleEmailProvider } = await import('./console')
  return new ConsoleEmailProvider()
}
