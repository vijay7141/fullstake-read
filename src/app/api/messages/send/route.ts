import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { getAuthenticatedUser } from '@/lib/auth';
import { broadcastCrmEvent } from '@/lib/realtime';
import { resolveWhatsAppAccount, sendWhatsAppMessage } from '@/lib/whatsapp';

export const dynamic = 'force-dynamic';

export async function POST(req: NextRequest) {
  try {
    const user = await getAuthenticatedUser(req);
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const body = await req.json();
    const { conversationId, text, whatsappAccountId } = body;

    if (!conversationId) {
      return NextResponse.json({ error: 'conversationId is required' }, { status: 400 });
    }

    const trimmedText = (text || '').trim();
    if (!trimmedText) {
      return NextResponse.json({ error: 'Message text cannot be empty' }, { status: 400 });
    }

    const conversation = await prisma.conversation.findUnique({
      where: { id: conversationId },
      include: { customer: true, whatsappAccount: true },
    });

    if (!conversation) {
      return NextResponse.json({ error: 'Conversation not found' }, { status: 404 });
    }

    const account = await resolveWhatsAppAccount(whatsappAccountId || conversation.whatsappAccountId || undefined);
    if (!account) {
      return NextResponse.json(
        { error: 'No active WhatsApp Account found. Please configure an active WhatsApp number in Settings.' },
        { status: 400 }
      );
    }

    const initialMsg = await prisma.message.create({
      data: {
        conversationId: conversation.id,
        customerId: conversation.customerId,
        whatsappAccountId: account.id,
        direction: 'OUTGOING',
        messageType: 'text',
        text: trimmedText,
        status: 'SENDING',
        timestamp: new Date(),
      },
    });

    const sendResult = await sendWhatsAppMessage({
      to: conversation.customer.phoneNumber,
      text: trimmedText,
      whatsappAccountId: account.id,
    });

    if (!sendResult.success) {
      const failedMsg = await prisma.message.update({
        where: { id: initialMsg.id },
        data: {
          status: 'FAILED',
          errorCode: sendResult.errorCode || 'SEND_ERROR',
          errorMessage: sendResult.error || 'Failed to dispatch to WhatsApp Cloud API',
        },
      });

      broadcastCrmEvent('message:status', {
        messageId: failedMsg.id,
        conversationId: conversation.id,
        status: 'FAILED',
        error: failedMsg.errorMessage,
      });

      return NextResponse.json(
        {
          success: false,
          error: sendResult.error || 'Message could not be sent to WhatsApp',
          message: failedMsg,
        },
        { status: 400 }
      );
    }

    const finalMsg = await prisma.message.update({
      where: { id: initialMsg.id },
      data: {
        whatsappMessageId: sendResult.whatsappMessageId,
        status: 'SENT',
      },
      include: {
        whatsappAccount: {
          select: {
            id: true,
            displayName: true,
            phoneNumber: true,
          },
        },
      },
    });

    const updatedConv = await prisma.conversation.update({
      where: { id: conversation.id },
      data: {
        whatsappAccount: { connect: { id: account.id } },
        lastMessageAt: new Date(),
        lastMessageText: trimmedText,
        lastMessageDirection: 'OUTGOING',
      },
    });

    broadcastCrmEvent('message:new', {
      message: finalMsg,
      conversation: updatedConv,
      customer: conversation.customer,
      whatsappAccount: account,
    });
    broadcastCrmEvent('conversation:update', {
      conversationId: updatedConv.id,
      customerId: conversation.customerId,
      lastMessageText: trimmedText,
      lastMessageAt: updatedConv.lastMessageAt,
      unreadCount: updatedConv.unreadCount,
    });

    return NextResponse.json({
      success: true,
      message: finalMsg,
      isSimulated: sendResult.isSimulated,
    });
  } catch (error: unknown) {
    console.error('[Send Message API Error]', error);
    const msg = error instanceof Error ? error.message : 'Internal server error';
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}
