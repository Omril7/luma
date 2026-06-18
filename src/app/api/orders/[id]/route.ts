import { NextRequest, NextResponse } from 'next/server'
import { errorResponse } from '@/server/http'
import { getOrderById } from '@/server/services/orderService'

export async function GET(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await params
    const order = await getOrderById(id)
    if (!order) return errorResponse('Order not found', 404)
    return NextResponse.json(order)
  } catch (err) {
    console.error('[API error]', err)
    return errorResponse('Internal server error', 500)
  }
}
