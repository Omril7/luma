import { NextRequest, NextResponse } from 'next/server'
import { withAdmin, errorResponse } from '@/server/http'

export const GET = withAdmin(async () => {
  // Phase-2: Bundle UI not yet implemented. Return empty list.
  return NextResponse.json({ data: [], total: 0, page: 1, pageSize: 25 })
})

export const POST = withAdmin(async (_req: NextRequest, _admin, _ctx) => {
  return errorResponse('Not implemented — Bundles are a phase-2 feature', 501)
})
