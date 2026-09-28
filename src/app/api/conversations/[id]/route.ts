import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { Prisma } from '@prisma/client';
import { getAuthenticatedUser } from '@/lib/auth';
import { broadcastCrmEvent } from '@/lib/realtime';

export const dynamic = 'force-dynamic';

export async function GET(
  req: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const user = await getAuthenticatedUser(req);
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { id } = params;

    const conversation = await prisma.conversation.findUnique({
      where: { id },
      include: {
        customer: true,
        whatsappAccount: true,
      },
    });

    if (!conversation) {
      return NextResponse.json({ error: 'Conversation not found' }, { status: 404 });
    }

    const messages = await prisma.message.findMany({
      where: { conversationId: id },
      orderBy: { timestamp: 'asc' },
      include: {
        whatsappAccount: {
          select: {
            id: true,
            displayName: true,
            phoneNumber: true,
            status: true,
          },
        },
      },
    });

    return NextResponse.json({
      conversation,
      messages,
    });
  } catch (error: unknown) {
    console.error('[Get Conversation Detail Error]', error);
    const msg = error instanceof Error ? error.message : 'Internal server error';
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}

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
    const { status, markAsRead, whatsappAccountId } = body;

    const updateData: Prisma.ConversationUpdateInput = {};

    if (status) {
      updateData.status = status;
    }

    if (markAsRead) {
      updateData.unreadCount = 0;
    }

    if (whatsappAccountId) {
      updateData.whatsappAccount = { connect: { id: whatsappAccountId } };
    }

    const updated = await prisma.conversation.update({
      where: { id },
      data: updateData,
      include: {
        customer: true,
        whatsappAccount: true,
      },
    });

    broadcastCrmEvent('conversation:update', {
      conversationId: updated.id,
      unreadCount: updated.unreadCount,
      status: updated.status,
    });

    return NextResponse.json({ success: true, conversation: updated });
  } catch (error: unknown) {
    console.error('[Update Conversation Error]', error);
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

    await prisma.conversation.delete({
      where: { id },
    });

    return NextResponse.json({ success: true, message: 'Conversation deleted' });
  } catch (error: unknown) {
    console.error('[Delete Conversation Error]', error);
    const msg = error instanceof Error ? error.message : 'Internal server error';
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}
