import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { Prisma } from '@prisma/client';
import { getAuthenticatedUser } from '@/lib/auth';
import { cleanPhoneNumber, formatPhoneNumber } from '@/lib/whatsapp';

export const dynamic = 'force-dynamic';

export async function GET(req: NextRequest) {
  try {
    const user = await getAuthenticatedUser(req);
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { searchParams } = new URL(req.url);
    const search = searchParams.get('search') || '';
    const tag = searchParams.get('tag') || '';

    const where: Prisma.CustomerWhereInput = {};

    if (search.trim()) {
      const q = search.trim();
      where.OR = [
        { name: { contains: q } },
        { phoneNumber: { contains: q } },
        { formattedPhone: { contains: q } },
        { notes: { contains: q } },
        { tags: { contains: q } },
      ];
    }

    if (tag && tag !== 'ALL') {
      where.tags = { contains: tag };
    }

    const contacts = await prisma.customer.findMany({
      where,
      orderBy: { updatedAt: 'desc' },
      include: {
        conversations: {
          select: {
            id: true,
            status: true,
            lastMessageAt: true,
            lastMessageText: true,
            unreadCount: true,
          },
          take: 1,
          orderBy: { lastMessageAt: 'desc' },
        },
        _count: {
          select: { messages: true },
        },
      },
    });

    return NextResponse.json({ contacts });
  } catch (error: unknown) {
    console.error('[Get Contacts Error]', error);
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
    const { name, phoneNumber, notes, tags } = body;

    const cleanPhone = cleanPhoneNumber(phoneNumber);
    if (!cleanPhone || cleanPhone.length < 8) {
      return NextResponse.json({ error: 'Valid phone number is required (at least 8 digits)' }, { status: 400 });
    }

    const existing = await prisma.customer.findUnique({
      where: { phoneNumber: cleanPhone },
    });

    if (existing) {
      return NextResponse.json({ error: 'A contact with this phone number already exists' }, { status: 400 });
    }

    const contact = await prisma.customer.create({
      data: {
        name: name || `Customer +${cleanPhone}`,
        phoneNumber: cleanPhone,
        formattedPhone: formatPhoneNumber(cleanPhone),
        notes: notes || '',
        tags: tags || '',
      },
    });

    const primaryAccount = (await prisma.whatsAppAccount.findFirst({
      where: { isDefault: true, status: 'ACTIVE' },
    })) || (await prisma.whatsAppAccount.findFirst({
      where: { status: 'ACTIVE' },
    }));

    const conversation = await prisma.conversation.create({
      data: {
        customerId: contact.id,
        whatsappAccountId: primaryAccount?.id,
        status: 'OPEN',
        lastMessageAt: new Date(),
        lastMessageText: 'Contact created',
        unreadCount: 0,
      },
    });

    return NextResponse.json({ success: true, contact, conversationId: conversation.id });
  } catch (error: unknown) {
    console.error('[Create Contact Error]', error);
    const msg = error instanceof Error ? error.message : 'Internal server error';
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}
