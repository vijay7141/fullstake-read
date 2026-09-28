import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { Prisma } from '@prisma/client';
import { getAuthenticatedUser } from '@/lib/auth';

export const dynamic = 'force-dynamic';

export async function PATCH(
  req: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const user = await getAuthenticatedUser(req);
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { id } = params;
    const body = await req.json();
    const { displayName, status, isDefault, accessToken } = body;

    const account = await prisma.whatsAppAccount.findUnique({
      where: { id },
    });

    if (!account) {
      return NextResponse.json({ error: 'WhatsApp account not found' }, { status: 404 });
    }

    if (isDefault) {
      await prisma.whatsAppAccount.updateMany({
        where: { id: { not: id }, isDefault: true },
        data: { isDefault: false },
      });
    }

    const updateData: Prisma.WhatsAppAccountUpdateInput = {};
    if (displayName !== undefined) updateData.displayName = displayName;
    if (status !== undefined) updateData.status = status;
    if (isDefault !== undefined) updateData.isDefault = isDefault;
    if (accessToken !== undefined && accessToken.trim()) updateData.accessToken = accessToken.trim();

    const updated = await prisma.whatsAppAccount.update({
      where: { id },
      data: updateData,
    });

    return NextResponse.json({
      success: true,
      account: {
        ...updated,
        accessToken: updated.accessToken ? '••••••••••••' : null,
      },
    });
  } catch (error: unknown) {
    console.error('[Update WhatsApp Account Error]', error);
    const msg = error instanceof Error ? error.message : 'Internal server error';
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}

export async function DELETE(
  req: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const user = await getAuthenticatedUser(req);
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { id } = params;

    const account = await prisma.whatsAppAccount.findUnique({
      where: { id },
      include: {
        _count: {
          select: { messages: true, conversations: true },
        },
      },
    });

    if (!account) {
      return NextResponse.json({ error: 'WhatsApp account not found' }, { status: 404 });
    }

    if (account._count.messages > 0 || account._count.conversations > 0) {
      const updated = await prisma.whatsAppAccount.update({
        where: { id },
        data: {
          status: 'INACTIVE',
          isDefault: false,
        },
      });

      return NextResponse.json({
        success: true,
        action: 'deactivated',
        message:
          'Number deactivated successfully. All historical messages and customer records have been preserved.',
        account: updated,
      });
    }

    await prisma.whatsAppAccount.delete({
      where: { id },
    });

    return NextResponse.json({
      success: true,
      action: 'deleted',
      message: 'Unused WhatsApp number removed successfully.',
    });
  } catch (error: unknown) {
    console.error('[Delete/Deactivate WhatsApp Account Error]', error);
    const msg = error instanceof Error ? error.message : 'Internal server error';
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}
