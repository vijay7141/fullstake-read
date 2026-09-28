import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { getAuthenticatedUser } from '@/lib/auth';

export const dynamic = 'force-dynamic';

export async function POST(req: NextRequest) {
  try {
    const user = await getAuthenticatedUser(req);
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const body = await req.json().catch(() => ({}));
    const { accountId } = body;

    let token = process.env.WHATSAPP_ACCESS_TOKEN || '';
    let phoneNumberId = process.env.WHATSAPP_PHONE_NUMBER_ID || '';

    if (accountId) {
      const account = await prisma.whatsAppAccount.findUnique({
        where: { id: accountId },
      });
      if (account) {
        if (account.accessToken) token = account.accessToken;
        if (account.phoneNumberId) phoneNumberId = account.phoneNumberId;
      }
    }

    const hasLiveCredentials =
      token &&
      phoneNumberId &&
      !token.startsWith('EAAG...') &&
      !token.startsWith('your_') &&
      phoneNumberId !== '100000000000001' &&
      !phoneNumberId.startsWith('meta_');

    if (!hasLiveCredentials) {
      return NextResponse.json({
        success: true,
        mode: 'SIMULATION',
        status: 'READY',
        message:
          'Running in Simulator Mode. You can send and receive test WhatsApp messages locally without live Meta credentials.',
        phoneNumberId: phoneNumberId || 'meta_phone_primary_555',
      });
    }

    const res = await fetch(`https://graph.facebook.com/v21.0/${phoneNumberId}`, {
      headers: {
        Authorization: `Bearer ${token}`,
      },
    });

    const data = await res.json();

    if (!res.ok || data.error) {
      return NextResponse.json({
        success: false,
        mode: 'LIVE',
        status: 'ERROR',
        error: data.error?.message || 'Failed to authenticate with Meta Cloud API',
        errorCode: data.error?.code,
      });
    }

    return NextResponse.json({
      success: true,
      mode: 'LIVE',
      status: 'CONNECTED',
      message: 'Successfully verified connection to Meta WhatsApp Business Cloud API!',
      data: {
        id: data.id,
        verified_name: data.verified_name,
        display_phone_number: data.display_phone_number,
        quality_rating: data.quality_rating,
      },
    });
  } catch (error: unknown) {
    console.error('[Test WhatsApp Connection Error]', error);
    const msg = error instanceof Error ? error.message : 'Internal error testing connection';
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}
