import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/db";

export async function GET() {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const favorites = await prisma.favorite.findMany({
    where: { userId: session.user.id },
    orderBy: { addedAt: "desc" },
    select: { promptId: true, addedAt: true },
  });

  return NextResponse.json(favorites);
}

export async function POST(req: NextRequest) {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { promptId } = await req.json();
  if (!promptId) {
    return NextResponse.json({ error: "promptId required" }, { status: 400 });
  }

  const favorite = await prisma.favorite.upsert({
    where: {
      userId_promptId: { userId: session.user.id, promptId },
    },
    update: { addedAt: new Date() },
    create: { userId: session.user.id, promptId },
  });

  return NextResponse.json(favorite, { status: 201 });
}

export async function DELETE(req: NextRequest) {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { searchParams } = new URL(req.url);
  const promptId = searchParams.get("promptId");

  if (!promptId) {
    return NextResponse.json({ error: "promptId required" }, { status: 400 });
  }

  await prisma.favorite.deleteMany({
    where: { userId: session.user.id, promptId },
  });

  return NextResponse.json({ ok: true });
}
