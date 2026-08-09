import { NextResponse } from 'next/server'
import type { NextRequest } from 'next/server'

export function middleware(request: NextRequest) {
  // Auth bypassed — allow seamless access to all dashboard routes
  return NextResponse.next()
}

export const config = {
  matcher: [
    '/dashboard/:path*',
  ],
}
