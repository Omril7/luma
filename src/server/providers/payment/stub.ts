import 'server-only'
import type { PaymentProvider, PaymentIntent, PaymentResult } from './index'

/** Stub payment provider — always succeeds immediately. Replace in Phase 2. */
export class StubPaymentProvider implements PaymentProvider {
  async createPayment(intent: PaymentIntent): Promise<PaymentResult> {
    console.log('[StubPaymentProvider] createPayment', intent)
    return {
      success: true,
      transactionId: `stub-${Date.now()}`,
    }
  }

  async verifyWebhook(_body: unknown, _signature: string): Promise<boolean> {
    return true
  }
}
