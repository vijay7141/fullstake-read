import crypto from 'crypto';
import { prisma } from './prisma';

export interface SendMessageOptions {
  to: string; // Recipient phone number (clean digits or formatted)
  text: string;
  whatsappAccountId?: string;
  previewUrl?: boolean;
}

export interface SendMessageResult {
  success: boolean;
  whatsappMessageId?: string;
  whatsappAccountId?: string;
  error?: string;
  errorCode?: string;
  isSimulated?: boolean;
}

/**
 * Sanitizes phone number by removing non-numeric characters except leading '+'
 */
export function cleanPhoneNumber(phone: string): string {
  if (!phone) return '';
  // Remove all non-digits
  return phone.replace(/\D/g, '');
}

/**
 * Formats a phone number for user display
 */
export function formatPhoneNumber(phone: string): string {
  const digits = cleanPhoneNumber(phone);
  if (!digits) return '';
  if (digits.length === 10) {
    return `+1 (${digits.slice(0, 3)}) ${digits.slice(3, 6)}-${digits.slice(6)}`;
  }
  if (digits.length === 12 && digits.startsWith('91')) {
    return `+91 ${digits.slice(2, 7)} ${digits.slice(7)}`;
  }
  return `+${digits}`;
}

/**
 * Checks if the last incoming message was within Meta's 24-hour customer service window
 */
export function isWithin24Hours(lastIncomingAt: Date | string | null | undefined): boolean {
  if (!lastIncomingAt) return false;
  const lastTime = new Date(lastIncomingAt).getTime();
  const now = Date.now();
  const diffHours = (now - lastTime) / (1000 * 60 * 60);
  return diffHours <= 24;
}

/**
 * Resolves the WhatsApp Account to use for sending
 */
export async function resolveWhatsAppAccount(preferredAccountId?: string) {
  if (preferredAccountId) {
    const acc = await prisma.whatsAppAccount.findUnique({
      where: { id: preferredAccountId },
    });
    if (acc && acc.status === 'ACTIVE') return acc;
  }

  // Look for default active account
  const defaultAcc = await prisma.whatsAppAccount.findFirst({
    where: { isDefault: true, status: 'ACTIVE' },
  });
  if (defaultAcc) return defaultAcc;

  // Look for any active account
  const anyActive = await prisma.whatsAppAccount.findFirst({
    where: { status: 'ACTIVE' },
    orderBy: { createdAt: 'desc' },
  });
  if (anyActive) return anyActive;

  return null;
}

/**
 * Verifies Meta Webhook HMAC SHA-256 signature
 */
export function verifyWebhookSignature(
  rawBody: string,
  signatureHeader: string | null,
  appSecret: string
): boolean {
  if (!appSecret) return true; // If no app secret configured, bypass signature check
  if (!signatureHeader) return false;

  const parts = signatureHeader.split('sha256=');
  if (parts.length !== 2) return false;
  const signature = parts[1];

  try {
    const hmac = crypto.createHmac('sha256', appSecret);
    const digest = hmac.update(rawBody).digest('hex');
    return crypto.timingSafeEqual(Buffer.from(signature, 'hex'), Buffer.from(digest, 'hex'));
  } catch {
    return false;
  }
}

/**
 * Sends a WhatsApp message using the official Meta WhatsApp Business Cloud API
 */
export async function sendWhatsAppMessage({
  to,
  text,
  whatsappAccountId,
  previewUrl = false,
}: SendMessageOptions): Promise<SendMessageResult> {
  const cleanTo = cleanPhoneNumber(to);
  if (!cleanTo) {
    return { success: false, error: 'Recipient phone number is invalid or empty' };
  }

  // 1. Resolve Account & Credentials
  const account = await resolveWhatsAppAccount(whatsappAccountId);

  const token =
    account?.accessToken ||
    process.env.WHATSAPP_ACCESS_TOKEN ||
    '';

  const phoneNumberId =
    account?.phoneNumberId ||
    process.env.WHATSAPP_PHONE_NUMBER_ID ||
    '';

  // Check if credentials are present
  const hasValidCredentials =
    token &&
    phoneNumberId &&
    token !== 'EAAG...' &&
    !token.startsWith('your_') &&
    phoneNumberId !== '100000000000001';

  // If no credentials configured, operate in safe simulation mode for testability
  if (!hasValidCredentials) {
    console.log(
      `[WhatsApp Cloud API Mock] Message sent to ${cleanTo} via ${account?.phoneNumber || 'Default Simulator'}: "${text}"`
    );
    const mockWamid = `wamid.HBgL${Date.now()}SIMULATED${Math.random().toString(36).substring(2, 9)}`;
    return {
      success: true,
      whatsappMessageId: mockWamid,
      whatsappAccountId: account?.id,
      isSimulated: true,
    };
  }

  // 2. Call Meta WhatsApp Business Cloud API
  const url = `https://graph.facebook.com/v21.0/${phoneNumberId}/messages`;
  const body = {
    messaging_product: 'whatsapp',
    recipient_type: 'individual',
    to: cleanTo,
    type: 'text',
    text: {
      preview_url: previewUrl,
      body: text,
    },
  };

  try {
    const res = await fetch(url, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${token}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(body),
    });

    const data = await res.json();

    if (!res.ok || data.error) {
      const errMsg = data.error?.message || `WhatsApp API error: ${res.statusText}`;
      const errCode = data.error?.code ? String(data.error.code) : String(res.status);
      console.error('[WhatsApp Cloud API Error]', data.error);
      return {
        success: false,
        error: errMsg,
        errorCode: errCode,
        whatsappAccountId: account?.id,
      };
    }

    const wamid = data.messages?.[0]?.id;
    return {
      success: true,
      whatsappMessageId: wamid,
      whatsappAccountId: account?.id,
    };
  } catch (err: unknown) {
    console.error('[WhatsApp Cloud API Network Error]', err);
    const errorMessage = err instanceof Error ? err.message : 'Network error communicating with WhatsApp Cloud API';
    return {
      success: false,
      error: errorMessage,
      whatsappAccountId: account?.id,
    };
  }
}
