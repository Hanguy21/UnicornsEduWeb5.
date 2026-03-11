import { NextRequest, NextResponse } from "next/server";


export function proxy(req: NextRequest, res: NextResponse) {
    const { pathname } = req.nextUrl;

    return NextResponse.next();
}