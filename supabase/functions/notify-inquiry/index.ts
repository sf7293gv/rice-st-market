import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  try {
    const { product_name, customer_name, customer_phone, message } = await req.json()

    console.log('[notify-inquiry] Received payload — customer:', customer_name, '| product:', product_name)

    const supabase = createClient(
      Deno.env.get('SUPABASE_URL')!,
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
    )

    const { data: settingRow, error: settingErr } = await supabase
      .from('settings')
      .select('value')
      .eq('key', 'owner_email')
      .maybeSingle()

    if (settingErr) {
      console.error('[notify-inquiry] Failed to read owner_email:', settingErr)
    }

    const ownerEmail = settingRow?.value?.trim()
    console.log('[notify-inquiry] owner_email resolved to:', ownerEmail ?? '(none)')

    if (!ownerEmail) {
      return new Response(
        JSON.stringify({ ok: true, skipped: 'owner_email not configured in settings' }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    const resendKey = Deno.env.get('RESEND_API_KEY')
    if (!resendKey) {
      console.error('[notify-inquiry] RESEND_API_KEY secret is not set')
      return new Response(
        JSON.stringify({ error: 'RESEND_API_KEY not configured' }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    // TODO: switch to 'Rice St Market <bookings@ricestmarket.com>' (or actual domain) once
    // a domain is purchased and verified in Resend. onboarding@resend.dev is Resend's
    // sandbox sender — it works without domain verification but has deliverability limits.
    const fromField = 'Rice St Market <onboarding@resend.dev>'
    const subjectField = `New Product Inquiry — ${customer_name}`
    console.log('[notify-inquiry] Sending email — from:', fromField, '| to:', ownerEmail, '| subject:', subjectField)

    const resendRes = await fetch('https://api.resend.com/emails', {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${resendKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        from: fromField,
        to: [ownerEmail],
        subject: subjectField,
        html: buildEmail({ product_name, customer_name, customer_phone, message }),
      }),
    })

    let resendBody: unknown
    try {
      resendBody = await resendRes.json()
    } catch {
      resendBody = await resendRes.text()
    }

    console.log('[notify-inquiry] Resend HTTP status:', resendRes.status)
    console.log('[notify-inquiry] Resend response body:', JSON.stringify(resendBody))

    if (!resendRes.ok) {
      console.error(`[notify-inquiry] Resend error ${resendRes.status}:`, JSON.stringify(resendBody))
      return new Response(
        JSON.stringify({ error: 'Email send failed', status: resendRes.status, detail: resendBody }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    console.log('[notify-inquiry] Email sent OK to', ownerEmail, '— Resend id:', (resendBody as { id?: string })?.id)
    return new Response(
      JSON.stringify({ ok: true }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    )

  } catch (err) {
    console.error('[notify-inquiry] Unhandled error:', err)
    return new Response(
      JSON.stringify({ error: (err as Error).message }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    )
  }
})

interface InquiryDetails {
  product_name: string
  customer_name: string
  customer_phone: string
  message: string
}

function buildEmail(d: InquiryDetails): string {
  return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width,initial-scale=1">
  <title>New Product Inquiry</title>
</head>
<body style="margin:0;padding:0;background:#f4f5f7;font-family:'Inter',system-ui,-apple-system,sans-serif;-webkit-font-smoothing:antialiased;">
  <table width="100%" cellpadding="0" cellspacing="0" style="background:#f4f5f7;padding:48px 16px;">
    <tr><td align="center">
      <table width="100%" style="max-width:520px;background:#ffffff;border-radius:16px;overflow:hidden;box-shadow:0 4px 32px rgba(0,0,0,0.10);">
        <tr>
          <td style="background:linear-gradient(135deg,#1A1A1A 0%,#4a2f0f 55%,#E8841A 100%);padding:36px 40px;text-align:center;">
            <div style="font-size:22px;font-weight:900;color:#ffffff;text-transform:uppercase;letter-spacing:-0.5px;line-height:1;">
              RICE ST <span style="color:#5BC8C0;">MARKET</span>
            </div>
            <div style="color:rgba(255,255,255,0.55);font-size:11px;letter-spacing:2.5px;text-transform:uppercase;margin-top:8px;">
              New Product Inquiry
            </div>
          </td>
        </tr>
        <tr>
          <td style="padding:36px 40px 28px;">
            <p style="margin:0 0 8px;font-size:18px;font-weight:800;color:#111827;letter-spacing:-0.3px;">
              A customer is interested in a product.
            </p>
            <p style="margin:0 0 28px;font-size:14px;color:#6b7280;line-height:1.6;">
              Someone submitted an inquiry from the Electronics page. Reply by calling the number below.
            </p>
            <table width="100%" cellpadding="0" cellspacing="0" style="border:1px solid #e5e7eb;border-radius:10px;overflow:hidden;margin-bottom:28px;">
              ${row('Product',  d.product_name, true)}
              ${row('Customer', d.customer_name)}
              ${row('Phone',    `<a href="tel:${d.customer_phone}" style="color:#E8841A;font-weight:600;text-decoration:none;">${d.customer_phone}</a>`)}
              ${row('Message',  d.message)}
            </table>
            <table width="100%" cellpadding="0" cellspacing="0">
              <tr>
                <td align="center">
                  <!-- TODO: replace with the live Rice St Market domain once deployed, e.g. https://ricestmarket.vercel.app/admin/inquiries -->
                  <a href="#todo-site-url"
                     style="display:inline-block;background:#E8841A;color:#ffffff;padding:14px 32px;border-radius:8px;font-size:14px;font-weight:700;text-decoration:none;letter-spacing:0.2px;">
                    View All Inquiries →
                  </a>
                </td>
              </tr>
            </table>
          </td>
        </tr>
        <tr>
          <td style="background:#f9fafb;padding:20px 40px;border-top:1px solid #e5e7eb;text-align:center;">
            <p style="margin:0;font-size:12px;color:#9ca3af;line-height:1.7;">
              Rice St Market &nbsp;·&nbsp; 1110 Rice St, St Paul, MN 55117<br>
              <a href="tel:+16124597870" style="color:#9ca3af;text-decoration:none;">(612) 459-7870</a>
              &nbsp;·&nbsp;
              <a href="tel:+16125012004" style="color:#9ca3af;text-decoration:none;">(612) 501-2004</a>
              &nbsp;·&nbsp; Open daily 8 AM – 10 PM
            </p>
          </td>
        </tr>
      </table>
    </td></tr>
  </table>
</body>
</html>`
}

function row(label: string, value: string, highlight = false): string {
  return `<tr style="border-bottom:1px solid #f3f4f6;">
    <td style="padding:13px 18px;font-size:11px;font-weight:700;text-transform:uppercase;letter-spacing:0.9px;color:#9ca3af;width:80px;vertical-align:top;white-space:nowrap;">
      ${label}
    </td>
    <td style="padding:13px 18px;font-size:14px;color:#111827;font-weight:${highlight ? '700' : '500'};line-height:1.5;">
      ${value ?? '—'}
    </td>
  </tr>`
}
