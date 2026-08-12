import { serve } from 'https://deno.land/std@0.168.0/http/server.ts';
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

const RESEND_API_KEY = Deno.env.get('RESEND_API_KEY')!;
const SUPABASE_URL = Deno.env.get('SUPABASE_URL')!;
const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
const FROM_EMAIL = 'Bellinezona Credit Union <noreply@bellinzoneacredit.com>';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

interface EmailPayload {
  type: 'welcome' | 'login_alert' | 'transfer' | 'kyc_update' | 'contact_reply';
  to: string;
  user_id?: string;
  data?: Record<string, unknown>;
}

function welcomeTemplate(data: Record<string, unknown>) {
  const name = (data.first_name as string) || 'Valued Customer';
  const username = (data.username as string) || '';
  const account_number = (data.account_number as string) || '';
  return {
    subject: 'Welcome to Bellinezona Credit Union — Your Account is Active',
    html: `
<!DOCTYPE html>
<html><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1">
<title>Welcome to Bellinezona Credit Union</title></head>
<body style="margin:0;padding:0;background:#0a0f20;font-family:'Helvetica Neue',Arial,sans-serif;">
  <table width="100%" cellpadding="0" cellspacing="0" style="background:#0a0f20;padding:40px 0;">
    <tr><td align="center">
      <table width="600" cellpadding="0" cellspacing="0" style="background:#111827;border-radius:16px;overflow:hidden;border:1px solid #1e293b;">
        <!-- Header -->
        <tr><td style="background:linear-gradient(135deg,#027976,#013d36);padding:40px;text-align:center;">
          <div style="display:inline-flex;align-items:center;gap:10px;">
            <div style="width:48px;height:48px;background:rgba(255,255,255,0.2);border-radius:12px;display:inline-block;line-height:48px;text-align:center;font-size:24px;">🏦</div>
            <span style="color:#fff;font-size:22px;font-weight:800;letter-spacing:-0.5px;">Bellinezona Credit Union</span>
          </div>
          <p style="color:rgba(255,255,255,0.7);margin:12px 0 0;font-size:14px;">Premium Digital Banking</p>
        </td></tr>
        <!-- Body -->
        <tr><td style="padding:40px;">
          <h1 style="color:#f1f5f9;font-size:26px;margin:0 0 8px;">Welcome, ${name}! 🎉</h1>
          <p style="color:#94a3b8;font-size:16px;line-height:1.6;margin:0 0 24px;">
            Your Bellinezona Credit Union account has been successfully created. You now have access to world-class digital banking services.
          </p>
          <!-- Account Details Box -->
          <div style="background:#1e293b;border-radius:12px;padding:24px;margin:0 0 24px;border-left:4px solid #027976;">
            <p style="color:#64748b;font-size:12px;text-transform:uppercase;letter-spacing:1px;margin:0 0 12px;">Your Account Details</p>
            ${username ? `<div style="display:flex;justify-content:space-between;padding:8px 0;border-bottom:1px solid #334155;"><span style="color:#94a3b8;font-size:14px;">Username</span><span style="color:#f1f5f9;font-weight:600;font-size:14px;">${username}</span></div>` : ''}
            ${account_number ? `<div style="display:flex;justify-content:space-between;padding:8px 0;border-bottom:1px solid #334155;"><span style="color:#94a3b8;font-size:14px;">Account Number</span><span style="color:#027976;font-weight:700;font-size:14px;font-family:monospace;">${account_number}</span></div>` : ''}
            <div style="display:flex;justify-content:space-between;padding:8px 0;"><span style="color:#94a3b8;font-size:14px;">Account Status</span><span style="color:#10b981;font-weight:600;font-size:14px;">✓ Active</span></div>
          </div>
          <!-- CTA -->
          <div style="text-align:center;margin:32px 0;">
            <a href="https://bellinzonacredit.com/dashboard" style="background:linear-gradient(135deg,#027976,#015d58);color:#fff;text-decoration:none;padding:16px 40px;border-radius:10px;font-weight:700;font-size:16px;display:inline-block;">Access Your Dashboard →</a>
          </div>
          <!-- Features -->
          <p style="color:#64748b;font-size:13px;text-align:center;line-height:1.8;">
            🔒 Bank-grade security &nbsp;|&nbsp; 💸 Instant transfers &nbsp;|&nbsp; 📈 Investment plans &nbsp;|&nbsp; 🌍 Global access
          </p>
        </td></tr>
        <!-- Footer -->
        <tr><td style="background:#0f172a;padding:24px;text-align:center;border-top:1px solid #1e293b;">
          <p style="color:#475569;font-size:12px;margin:0;">© 2026 Bellinezona Credit Union. All rights reserved.</p>
          <p style="color:#475569;font-size:12px;margin:8px 0 0;">
            <a href="https://bellinzonacredit.com" style="color:#027976;text-decoration:none;">bellinzonacredit.com</a> &nbsp;|&nbsp;
            <a href="mailto:support@bellinzoneacredit.com" style="color:#027976;text-decoration:none;">support@bellinzoneacredit.com</a>
          </p>
        </td></tr>
      </table>
    </td></tr>
  </table>
</body></html>`,
  };
}

function loginAlertTemplate(data: Record<string, unknown>) {
  const name = (data.first_name as string) || 'Valued Customer';
  const time = new Date().toUTCString();
  const ip = (data.ip as string) || 'Unknown';
  return {
    subject: '🔐 New Login Detected — Bellinezona Credit Union',
    html: `
<!DOCTYPE html><html><head><meta charset="utf-8"></head>
<body style="margin:0;padding:0;background:#0a0f20;font-family:'Helvetica Neue',Arial,sans-serif;">
  <table width="100%" cellpadding="0" cellspacing="0" style="background:#0a0f20;padding:40px 0;">
    <tr><td align="center">
      <table width="600" cellpadding="0" cellspacing="0" style="background:#111827;border-radius:16px;overflow:hidden;border:1px solid #1e293b;">
        <tr><td style="background:linear-gradient(135deg,#027976,#013d36);padding:30px;text-align:center;">
          <span style="color:#fff;font-size:20px;font-weight:800;">🏦 Bellinezona Credit Union</span>
        </td></tr>
        <tr><td style="padding:40px;">
          <div style="text-align:center;margin-bottom:24px;">
            <div style="width:64px;height:64px;background:#fef3c7;border-radius:50%;display:inline-flex;align-items:center;justify-content:center;font-size:28px;line-height:64px;">⚠️</div>
          </div>
          <h2 style="color:#f1f5f9;text-align:center;margin:0 0 8px;">New Login Detected</h2>
          <p style="color:#94a3b8;text-align:center;margin:0 0 24px;">Hi ${name}, a new login to your account was detected.</p>
          <div style="background:#1e293b;border-radius:12px;padding:20px;margin:0 0 24px;">
            <div style="display:flex;justify-content:space-between;padding:8px 0;border-bottom:1px solid #334155;"><span style="color:#94a3b8;font-size:14px;">Time</span><span style="color:#f1f5f9;font-size:14px;">${time}</span></div>
            <div style="display:flex;justify-content:space-between;padding:8px 0;border-bottom:1px solid #334155;"><span style="color:#94a3b8;font-size:14px;">IP Address</span><span style="color:#f1f5f9;font-size:14px;">${ip}</span></div>
            <div style="display:flex;justify-content:space-between;padding:8px 0;"><span style="color:#94a3b8;font-size:14px;">Status</span><span style="color:#10b981;font-size:14px;">✓ Successful</span></div>
          </div>
          <p style="color:#94a3b8;font-size:14px;text-align:center;">If this wasn't you, contact us immediately at <a href="mailto:security@bellinzoneacredit.com" style="color:#027976;">security@bellinzoneacredit.com</a></p>
        </td></tr>
        <tr><td style="background:#0f172a;padding:20px;text-align:center;border-top:1px solid #1e293b;">
          <p style="color:#475569;font-size:12px;margin:0;">© 2026 Bellinezona Credit Union · <a href="https://bellinzonacredit.com" style="color:#027976;">bellinzonacredit.com</a></p>
        </td></tr>
      </table>
    </td></tr>
  </table>
</body></html>`,
  };
}

function transferTemplate(data: Record<string, unknown>) {
  const name = (data.first_name as string) || 'Valued Customer';
  const amount = (data.amount as number) || 0;
  const currency = (data.currency as string) || 'USD';
  const recipient = (data.recipient_account as string) || '';
  const description = (data.description as string) || 'Fund Transfer';
  const balance = (data.new_balance as number);
  return {
    subject: `✅ Transfer Confirmed — ${currency} ${amount.toFixed(2)} Sent`,
    html: `
<!DOCTYPE html><html><head><meta charset="utf-8"></head>
<body style="margin:0;padding:0;background:#0a0f20;font-family:'Helvetica Neue',Arial,sans-serif;">
  <table width="100%" cellpadding="0" cellspacing="0" style="background:#0a0f20;padding:40px 0;">
    <tr><td align="center">
      <table width="600" cellpadding="0" cellspacing="0" style="background:#111827;border-radius:16px;overflow:hidden;border:1px solid #1e293b;">
        <tr><td style="background:linear-gradient(135deg,#027976,#013d36);padding:30px;text-align:center;">
          <span style="color:#fff;font-size:20px;font-weight:800;">🏦 Bellinezona Credit Union</span>
        </td></tr>
        <tr><td style="padding:40px;">
          <div style="text-align:center;margin-bottom:24px;">
            <div style="font-size:48px;">✅</div>
            <h2 style="color:#10b981;margin:8px 0 4px;">Transfer Successful</h2>
            <p style="color:#64748b;font-size:14px;">Hi ${name}, your transfer has been processed.</p>
          </div>
          <!-- Amount highlight -->
          <div style="background:linear-gradient(135deg,#027976,#013d36);border-radius:12px;padding:24px;text-align:center;margin:0 0 24px;">
            <p style="color:rgba(255,255,255,0.7);font-size:12px;text-transform:uppercase;letter-spacing:1px;margin:0 0 8px;">Amount Sent</p>
            <p style="color:#fff;font-size:36px;font-weight:800;margin:0;">${currency} ${amount.toLocaleString('en-US', { minimumFractionDigits: 2 })}</p>
          </div>
          <!-- Details -->
          <div style="background:#1e293b;border-radius:12px;padding:20px;margin:0 0 24px;">
            <div style="display:flex;justify-content:space-between;padding:8px 0;border-bottom:1px solid #334155;"><span style="color:#94a3b8;font-size:14px;">Recipient</span><span style="color:#f1f5f9;font-weight:600;font-size:14px;font-family:monospace;">${recipient}</span></div>
            <div style="display:flex;justify-content:space-between;padding:8px 0;border-bottom:1px solid #334155;"><span style="color:#94a3b8;font-size:14px;">Description</span><span style="color:#f1f5f9;font-size:14px;">${description}</span></div>
            <div style="display:flex;justify-content:space-between;padding:8px 0;border-bottom:1px solid #334155;"><span style="color:#94a3b8;font-size:14px;">Date</span><span style="color:#f1f5f9;font-size:14px;">${new Date().toUTCString()}</span></div>
            ${balance !== undefined ? `<div style="display:flex;justify-content:space-between;padding:8px 0;"><span style="color:#94a3b8;font-size:14px;">New Balance</span><span style="color:#027976;font-weight:700;font-size:14px;">${currency} ${balance.toLocaleString('en-US', { minimumFractionDigits: 2 })}</span></div>` : ''}
          </div>
          <div style="text-align:center;">
            <a href="https://bellinzonacredit.com/dashboard/transactions" style="background:linear-gradient(135deg,#027976,#015d58);color:#fff;text-decoration:none;padding:14px 32px;border-radius:10px;font-weight:700;font-size:14px;display:inline-block;">View Transaction History →</a>
          </div>
        </td></tr>
        <tr><td style="background:#0f172a;padding:20px;text-align:center;border-top:1px solid #1e293b;">
          <p style="color:#475569;font-size:12px;margin:0;">© 2026 Bellinezona Credit Union · <a href="https://bellinzonacredit.com" style="color:#027976;">bellinzonacredit.com</a></p>
        </td></tr>
      </table>
    </td></tr>
  </table>
</body></html>`,
  };
}

function kycTemplate(data: Record<string, unknown>) {
  const name = (data.first_name as string) || 'Valued Customer';
  const status = (data.status as string) || 'pending';
  const notes = (data.notes as string) || '';
  const isApproved = status === 'approved';
  const isRejected = status === 'rejected';
  const statusColor = isApproved ? '#10b981' : isRejected ? '#ef4444' : '#f59e0b';
  const statusIcon = isApproved ? '✅' : isRejected ? '❌' : '⏳';
  const statusText = isApproved ? 'Approved' : isRejected ? 'Rejected' : 'Under Review';
  return {
    subject: `KYC Verification ${statusText} — Bellinezona Credit Union`,
    html: `
<!DOCTYPE html><html><head><meta charset="utf-8"></head>
<body style="margin:0;padding:0;background:#0a0f20;font-family:'Helvetica Neue',Arial,sans-serif;">
  <table width="100%" cellpadding="0" cellspacing="0" style="background:#0a0f20;padding:40px 0;">
    <tr><td align="center">
      <table width="600" cellpadding="0" cellspacing="0" style="background:#111827;border-radius:16px;overflow:hidden;border:1px solid #1e293b;">
        <tr><td style="background:linear-gradient(135deg,#027976,#013d36);padding:30px;text-align:center;">
          <span style="color:#fff;font-size:20px;font-weight:800;">🏦 Bellinezona Credit Union</span>
        </td></tr>
        <tr><td style="padding:40px;text-align:center;">
          <div style="font-size:56px;margin-bottom:16px;">${statusIcon}</div>
          <h2 style="color:${statusColor};margin:0 0 8px;">KYC ${statusText}</h2>
          <p style="color:#94a3b8;margin:0 0 24px;">Hi ${name}, here's an update on your identity verification.</p>
          <div style="background:#1e293b;border-radius:12px;padding:20px;text-align:left;margin:0 0 24px;">
            <div style="display:flex;justify-content:space-between;padding:8px 0;border-bottom:1px solid #334155;"><span style="color:#94a3b8;font-size:14px;">Verification Status</span><span style="color:${statusColor};font-weight:700;font-size:14px;">${statusText}</span></div>
            ${notes ? `<div style="padding:12px 0;"><span style="color:#94a3b8;font-size:13px;display:block;margin-bottom:4px;">Admin Notes</span><span style="color:#f1f5f9;font-size:14px;">${notes}</span></div>` : ''}
          </div>
          ${isApproved ? '<p style="color:#10b981;font-size:14px;">Your account is now fully verified. You have access to all banking features.</p>' : ''}
          ${isRejected ? '<p style="color:#94a3b8;font-size:14px;">Please re-submit your documents or contact support for assistance.</p>' : ''}
          <a href="https://bellinzonacredit.com/dashboard" style="background:linear-gradient(135deg,#027976,#015d58);color:#fff;text-decoration:none;padding:14px 32px;border-radius:10px;font-weight:700;font-size:14px;display:inline-block;margin-top:16px;">Go to Dashboard →</a>
        </td></tr>
        <tr><td style="background:#0f172a;padding:20px;text-align:center;border-top:1px solid #1e293b;">
          <p style="color:#475569;font-size:12px;margin:0;">© 2026 Bellinezona Credit Union · <a href="https://bellinzonacredit.com" style="color:#027976;">bellinzonacredit.com</a></p>
        </td></tr>
      </table>
    </td></tr>
  </table>
</body></html>`,
  };
}

serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: corsHeaders });

  try {
    const payload: EmailPayload = await req.json();
    const { type, to, user_id, data = {} } = payload;

    if (!to || !type) {
      return new Response(JSON.stringify({ error: 'Missing required fields: to, type' }), {
        status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    // Build email content based on type
    let emailContent: { subject: string; html: string };
    switch (type) {
      case 'welcome':        emailContent = welcomeTemplate(data); break;
      case 'login_alert':    emailContent = loginAlertTemplate(data); break;
      case 'transfer':       emailContent = transferTemplate(data); break;
      case 'kyc_update':     emailContent = kycTemplate(data); break;
      default:
        return new Response(JSON.stringify({ error: 'Unknown email type' }), {
          status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        });
    }

    // Send via Resend
    const resendRes = await fetch('https://api.resend.com/emails', {
      method: 'POST',
      headers: { 'Authorization': `Bearer ${RESEND_API_KEY}`, 'Content-Type': 'application/json' },
      body: JSON.stringify({
        from: FROM_EMAIL,
        to: [to],
        subject: emailContent.subject,
        html: emailContent.html,
      }),
    });

    const resendData = await resendRes.json();
    const success = resendRes.ok;

    // Log the email attempt
    const supabaseAdmin = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);
    await supabaseAdmin.from('email_logs').insert({
      user_id: user_id || null,
      email_to: to,
      email_type: type,
      subject: emailContent.subject,
      status: success ? 'sent' : 'failed',
      metadata: { resend_id: resendData.id, error: resendData.message || null },
    });

    if (!success) {
      console.error('Resend error:', resendData);
      return new Response(JSON.stringify({ error: resendData.message || 'Email send failed' }), {
        status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    return new Response(JSON.stringify({ success: true, id: resendData.id }), {
      status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  } catch (err) {
    console.error('Edge function error:', err);
    return new Response(JSON.stringify({ error: String(err) }), {
      status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});
