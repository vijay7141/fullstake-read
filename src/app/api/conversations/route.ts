import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { Prisma } from '@prisma/client';
import { getAuthenticatedUser } from '@/lib/auth';
import { cleanPhoneNumber, formatPhoneNumber, resolveWhatsAppAccount } from '@/lib/whatsapp';

export const dynamic = 'force-dynamic';

export async function GET(req: NextRequest) {
  try {
    const user = await getAuthenticatedUser(req);
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { searchParams } = new URL(req.url);
    const search = searchParams.get('search') || '';
    const status = searchParams.get('status') || '';
    const accountId = searchParams.get('accountId') || '';

    const where: Prisma.ConversationWhereInput = {};

    if (status && status !== 'ALL') {
      where.status = status;
    }

    if (accountId && accountId !== 'ALL') {
      where.whatsappAccountId = accountId;
    }

    if (search.trim()) {
      const q = search.trim();
      where.OR = [
        { customer: { name: { contains: q } } },
        { customer: { phoneNumber: { contains: q } } },
        { customer: { formattedPhone: { contains: q } } },
        { lastMessageText: { contains: q } },
      ];
    }

    const conversations = await prisma.conversation.findMany({
      where,
      orderBy: { lastMessageAt: 'desc' },
      include: {
        customer: true,
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

    return NextResponse.json({ conversations });
  } catch (error: unknown) {
    console.error('[Get Conversations Error]', error);
    const msg = error instanceof Error ? error.message : 'Internal server error';
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  try {
    const user = await getAuthenticatedUser(req);
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const body = await req.json();
    const { phoneNumber, name, notes, whatsappAccountId } = body;

    const cleanPhone = cleanPhoneNumber(phoneNumber);
    if (!cleanPhone || cleanPhone.length < 8) {
      return NextResponse.json({ error: 'Valid phone number is required (at least 8 digits)' }, { status: 400 });
    }

    const account = await resolveWhatsAppAccount(whatsappAccountId);

    const customer = await prisma.customer.upsert({
      where: { phoneNumber: cleanPhone },
      update: {
        ...(name ? { name } : {}),
        ...(notes ? { notes } : {}),
        formattedPhone: formatPhoneNumber(cleanPhone),
      },
      create: {
        phoneNumber: cleanPhone,
        name: name || `Customer +${cleanPhone}`,
        notes: notes || '',
        formattedPhone: formatPhoneNumber(cleanPhone),
      },
    });

    let conversation = await prisma.conversation.findFirst({
      where: { customerId: customer.id },
      include: {
        customer: true,
        whatsappAccount: true,
      },
    });

    if (!conversation) {
      conversation = await prisma.conversation.create({
        data: {
          customerId: customer.id,
          whatsappAccountId: account?.id,
          status: 'OPEN',
          lastMessageAt: new Date(),
          lastMessageText: 'Conversation started',
          unreadCount: 0,
        },
        include: {
          customer: true,
          whatsappAccount: true,
        },
      });
    }

    return NextResponse.json({ success: true, conversation });
  } catch (error: unknown) {
    console.error('[Create Conversation Error]', error);
    const msg = error instanceof Error ? error.message : 'Internal server error';
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}
