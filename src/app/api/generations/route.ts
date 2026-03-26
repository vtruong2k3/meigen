import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/db";

const MAX_GENERATIONS = 50;

export async function GET() {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const generations = await prisma.generation.findMany({
    where: { userId: session.user.id },
    orderBy: { createdAt: "desc" },
    take: MAX_GENERATIONS,
  });

  return NextResponse.json(generations);
}

export async function POST(req: NextRequest) {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { taskId, prompt, width, height, quality } = await req.json();
  if (!taskId || !prompt) {
    return NextResponse.json(
      { error: "taskId and prompt required" },
      { status: 400 }
    );
  }

  const generation = await prisma.generation.create({
    data: {
      userId: session.user.id,
      taskId,
      prompt,
      width: width || 1024,
      height: height || 1536,
      quality: quality || "sd",
    },
  });

  // Trim excess generations
  const count = await prisma.generation.count({
    where: { userId: session.user.id },
  });
  if (count > MAX_GENERATIONS) {
    const oldest = await prisma.generation.findMany({
      where: { userId: session.user.id },
      orderBy: { createdAt: "asc" },
      take: count - MAX_GENERATIONS,
      select: { id: true },
    });
    await prisma.generation.deleteMany({
      where: { id: { in: oldest.map((g: { id: string }) => g.id) } },
    });
  }

  return NextResponse.json(generation, { status: 201 });
}

export async function PATCH(req: NextRequest) {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { taskId, status, progress, imageUrl, totalTime, error } =
    await req.json();
  if (!taskId) {
    return NextResponse.json({ error: "taskId required" }, { status: 400 });
  }

  // Build update payload — only include provided fields
  const updateData: Record<string, unknown> = {};
  if (status !== undefined) updateData.status = status;
  if (progress !== undefined) updateData.progress = progress;
  if (imageUrl !== undefined) updateData.imageUrl = imageUrl;
  if (totalTime !== undefined) updateData.totalTime = totalTime;
  if (error !== undefined) updateData.error = error;

  const updated = await prisma.generation.updateMany({
    where: { taskId, userId: session.user.id },
    data: updateData,
  });

  return NextResponse.json({ updated: updated.count });
}

export async function DELETE() {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  await prisma.generation.deleteMany({
    where: { userId: session.user.id },
  });

  return NextResponse.json({ ok: true });
}
