import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import prisma from '@/lib/prisma';

export async function POST(request: NextRequest) {
  const session = await getServerSession(authOptions);

  if (!session) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  try {
    const body = await request.json();
    const ids: unknown = body?.ids;

    if (!Array.isArray(ids) || ids.length === 0 || !ids.every((id) => typeof id === 'string')) {
      return NextResponse.json(
        { error: 'ids must be a non-empty array of strings' },
        { status: 400 }
      );
    }

    await prisma.paymentProjection.deleteMany({
      where: { contractId: { in: ids as string[] } },
    });

    const result = await prisma.contract.deleteMany({
      where: { id: { in: ids as string[] } },
    });

    return NextResponse.json({ success: true, deleted: result.count });
  } catch (error) {
    console.error('Bulk contract delete error:', error);
    return NextResponse.json({ error: 'Failed to delete contracts' }, { status: 500 });
  }
}
