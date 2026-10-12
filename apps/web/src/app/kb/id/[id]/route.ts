import { NextResponse, type NextRequest } from "next/server";
import { prisma } from "@/lib/prisma";

// /kb/id/12 → /kb/<slug>. Lets plain-text citations ("KB12") link to an article.
export async function GET(req: NextRequest, { params }: { params: { id: string } }) {
    const id = Number(params.id);
    const article = Number.isSafeInteger(id)
        ? await prisma.kbArticle.findFirst({ where: { id, status: "PUBLISHED" }, select: { slug: true } })
        : null;
    return NextResponse.redirect(new URL(article ? `/kb/${article.slug}` : "/kb", req.url));
}
