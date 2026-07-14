import 'server-only'
import { prisma } from '@/server/prisma'
import type { NewsletterSubscribeInput } from '@/shared/schemas'

export type SubscribeToNewsletterInput = Omit<NewsletterSubscribeInput, 'language'> & {
  language?: 'he' | 'en'
}

/** Upserts a newsletter subscriber. Re-activates an existing (possibly unsubscribed) row. */
export async function subscribeToNewsletter(input: SubscribeToNewsletterInput): Promise<void> {
  const language = input.language ?? 'he'
  await prisma.newsletterSubscriber.upsert({
    where: { email: input.email },
    update: { isActive: true, language, ...(input.name && { name: input.name }) },
    create: {
      email: input.email,
      name: input.name,
      language,
      isActive: true,
    },
  })
}
