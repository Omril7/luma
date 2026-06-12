import 'server-only'

export interface PaymentIntent {
  orderId: string
  amount: number // agorot
  currency: string
  installments?: number
}

export interface PaymentResult {
  success: boolean
  transactionId?: string
  redirectUrl?: string
  error?: string
}

export interface PaymentProvider {
  createPayment(intent: PaymentIntent): Promise<PaymentResult>
  verifyWebhook(body: unknown, signature: string): Promise<boolean>
}

export async function getPaymentProvider(): Promise<PaymentProvider> {
  // Only stub for now; real providers (Meshulam/Tranzila/PayPlus) are Phase 2
  const { StubPaymentProvider } = await import('./stub')
  return new StubPaymentProvider()
}
