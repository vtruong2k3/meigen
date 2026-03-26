import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/db";

const MAX_HISTORY = 100;

export async function GET() {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const history = await prisma.viewHistory.findMany({
    where: { userId: session.user.id },
    orderBy: { viewedAt: "desc" },
    take: MAX_HISTORY,
    select: { promptId: true, viewedAt: true },
  });

  return NextResponse.json(history);
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

  // Upsert: move to top if already exists
  const item = await prisma.viewHistory.upsert({
    where: {
      userId_promptId: { userId: session.user.id, promptId },
    },
    update: { viewedAt: new Date() },
    create: { userId: session.user.id, promptId },
  });

  // Trim excess history
  const count = await prisma.viewHistory.count({
    where: { userId: session.user.id },
  });
  if (count > MAX_HISTORY) {
    const oldest = await prisma.viewHistory.findMany({
      where: { userId: session.user.id },
      orderBy: { viewedAt: "asc" },
      take: count - MAX_HISTORY,
      select: { id: true },
    });
    await prisma.viewHistory.deleteMany({
      where: { id: { in: oldest.map((h: { id: string }) => h.id) } },
    });
  }

  return NextResponse.json(item, { status: 201 });
}

export async function DELETE() {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  await prisma.viewHistory.deleteMany({
    where: { userId: session.user.id },
  });

  return NextResponse.json({ ok: true });
}
