import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { getAuthenticatedUser } from '@/lib/auth';
import { cleanPhoneNumber, formatPhoneNumber } from '@/lib/whatsapp';

export const dynamic = 'force-dynamic';

export async function GET(req: NextRequest) {
  try {
    const user = await getAuthenticatedUser(req);
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const accounts = await prisma.whatsAppAccount.findMany({
      orderBy: [
        { isDefault: 'desc' },
        { createdAt: 'desc' },
      ],
      include: {
        _count: {
          select: {
            conversations: true,
            messages: true,
          },
        },
      },
    });

    const sanitized = accounts.map((acc) => ({
      ...acc,
      accessToken: acc.accessToken ? '••••••••••••' + acc.accessToken.slice(-6) : null,
      hasCustomToken: Boolean(acc.accessToken),
    }));

    return NextResponse.json({ accounts: sanitized });
  } catch (error: unknown) {
    console.error('[Get WhatsApp Accounts Error]', error);
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
    const { displayName, phoneNumber, phoneNumberId, businessAccountId, accessToken, setAsDefault } = body;

    if (!displayName || !phoneNumber || !phoneNumberId) {
      return NextResponse.json(
        { error: 'Display Name, Phone Number, and Meta Phone Number ID are required' },
        { status: 400 }
      );
    }

    const existing = await prisma.whatsAppAccount.findUnique({
      where: { phoneNumberId: phoneNumberId.trim() },
    });

    if (existing) {
      return NextResponse.json(
        { error: 'A WhatsApp Account with this Phone Number ID is already registered' },
        { status: 400 }
      );
    }

    if (setAsDefault) {
      await prisma.whatsAppAccount.updateMany({
        where: { isDefault: true },
        data: { isDefault: false },
      });
    }

    const cleanPhone = cleanPhoneNumber(phoneNumber);
    const formatted = formatPhoneNumber(cleanPhone);

    const newAccount = await prisma.whatsAppAccount.create({
      data: {
        displayName: displayName.trim(),
        phoneNumber: formatted || phoneNumber.trim(),
        phoneNumberId: phoneNumberId.trim(),
        businessAccountId: businessAccountId?.trim() || null,
        accessToken: accessToken?.trim() || null,
        status: 'ACTIVE',
        isDefault: Boolean(setAsDefault),
        qualityRating: 'GREEN',
      },
    });

    return NextResponse.json({
      success: true,
      account: {
        ...newAccount,
        accessToken: newAccount.accessToken ? '••••••••••••' : null,
      },
    });
  } catch (error: unknown) {
    console.error('[Create WhatsApp Account Error]', error);
    const msg = error instanceof Error ? error.message : 'Internal server error';
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}
