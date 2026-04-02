import { NextRequest, NextResponse } from 'next/server';

export async function GET(request: NextRequest, { params }: { params: Promise<{ code: string }> }) {
    const { code } = await params;
    const url = request.nextUrl.clone();
    url.pathname = '/registro';
    url.searchParams.set('ref', code);
    return NextResponse.redirect(url);
}
