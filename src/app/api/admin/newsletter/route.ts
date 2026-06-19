import { NextRequest, NextResponse } from 'next/server'
import { withAdmin } from '@/server/http'
import { listSubscribers, exportSubscribersCSV } from '@/server/services/adminNewsletterService'

export const GET = withAdmin(async (req: NextRequest, _admin, _ctx) => {
  const { searchParams } = new URL(req.url)

  // CSV export
  if (searchParams.get('export') === 'csv') {
    const csv = await exportSubscribersCSV()
    return new NextResponse(csv, {
      status: 200,
      headers: {
        'Content-Type': 'text/csv; charset=utf-8',
        'Content-Disposition': 'attachment; filename="subscribers.csv"',
      },
    })
  }

  const page = parseInt(searchParams.get('page') ?? '1', 10)
  const pageSize = parseInt(searchParams.get('pageSize') ?? '25', 10)
  const search = searchParams.get('search') ?? undefined
  const languageParam = searchParams.get('language')
  const language = languageParam === 'he' || languageParam === 'en' ? languageParam : undefined
  const isActiveParam = searchParams.get('isActive')
  const isActive = isActiveParam === null ? undefined : isActiveParam === 'true'

  const result = await listSubscribers({ page, pageSize, search, language, isActive })
  return NextResponse.json(result)
})
