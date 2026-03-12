import { NextRequest, NextResponse } from "next/server";
import { getUser } from "./lib/auth-server";


export async function proxy(req: NextRequest, res: NextResponse) {
    const { pathname } = req.nextUrl;

    const user = await getUser();

    // if (pathname.startsWith("/admin/")) {
    //     if (user?.roleType !== "admin") {
    //         return NextResponse.redirect(new URL("/", req.url));
    //     }
    // }

    return NextResponse.next();
}