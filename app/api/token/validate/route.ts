import { NextRequest, NextResponse } from 'next/server'
import { isValidToken } from '@/lib/token'

export async function GET(request: NextRequest) {
  const token = request.nextUrl.searchParams.get('token') ?? ''
  return NextResponse.json({ valid: isValidToken(token) })
}
