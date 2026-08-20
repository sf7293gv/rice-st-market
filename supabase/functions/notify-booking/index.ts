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
    const { customer_name, customer_phone, service_name, booking_date, booking_time, notes } =
      await req.json()

    console.log('[notify-booking] Received payload — customer:', customer_name, '| service:', service_name, '| date:', booking_date, '| time:', booking_time)

    // ── Fetch owner_email via service role ──────────────────
    const supabase = createClient(
      Deno.env.get('SUPABASE_URL')!,
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
    )

    const { data: settingRow, error: settingErr } = await supabase
      .from('settings')
      .select('value')
      .eq('key', 'owner_email')
      .maybeSingle()   // exactly 0 or 1 row — never returns an array

    if (settingErr) {
      console.error('[notify-booking] Failed to read owner_email from settings:', settingErr)
    }

    const ownerEmail = settingRow?.value?.trim()
    console.log('[notify-booking] owner_email resolved to:', ownerEmail ?? '(none)')

    if (!ownerEmail) {
      return new Response(
        JSON.stringify({ ok: true, skipped: 'owner_email not configured in settings' }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    // ── Send via Resend ─────────────────────────────────────
    const resendKey = Deno.env.get('RESEND_API_KEY')
    if (!resendKey) {
      console.error('[notify-booking] RESEND_API_KEY secret is not set')
      return new Response(
        JSON.stringify({ error: 'RESEND_API_KEY not configured' }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    const dateDisplay = formatDate(booking_date)
    const timeDisplay = format12h(booking_time)

    const fromField = 'Unity Foods <bookings@unityfoodsmn.com>'
    const subjectField = `New Repair Booking — ${customer_name}`
    console.log('[notify-booking] Sending email — from:', fromField, '| to:', ownerEmail, '| subject:', subjectField)

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
        html: buildEmail({ customer_name, customer_phone, service_name, dateDisplay, timeDisplay, notes }),
      }),
    })

    // Parse Resend's response — it always returns JSON
    let resendBody: unknown
    try {
      resendBody = await resendRes.json()
    } catch {
      resendBody = await resendRes.text()
    }

    console.log('[notify-booking] Resend HTTP status:', resendRes.status)
    console.log('[notify-booking] Resend response body:', JSON.stringify(resendBody))

    if (!resendRes.ok) {
      console.error(`[notify-booking] Resend error ${resendRes.status}:`, JSON.stringify(resendBody))
      return new Response(
        JSON.stringify({ error: 'Email send failed', status: resendRes.status, detail: resendBody }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    console.log('[notify-booking] Email sent OK to', ownerEmail, '— Resend id:', (resendBody as { id?: string })?.id)
    return new Response(
      JSON.stringify({ ok: true }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    )

  } catch (err) {
    console.error('[notify-booking] Unhandled error:', err)
    return new Response(
      JSON.stringify({ error: (err as Error).message }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    )
  }
})

// ── Helpers ──────────────────────────────────────────────────

function formatDate(d: string): string {
  const [y, mo, day] = d.split('-').map(Number)
  return new Date(y, mo - 1, day).toLocaleDateString('en-US', {
    weekday: 'long', month: 'long', day: 'numeric', year: 'numeric',
  })
}

function format12h(t: string): string {
  const [h, m] = t.split(':').map(Number)
  const ampm = h >= 12 ? 'PM' : 'AM'
  return `${h % 12 || 12}:${String(m).padStart(2, '0')} ${ampm}`
}

// ── Email template ────────────────────────────────────────────

interface BookingDetails {
  customer_name: string
  customer_phone: string
  service_name: string
  dateDisplay: string
  timeDisplay: string
  notes?: string | null
}

function buildEmail(b: BookingDetails): string {
  return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width,initial-scale=1">
  <title>New Repair Booking</title>
</head>
<body style="margin:0;padding:0;background:#f4f5f7;font-family:'Inter',system-ui,-apple-system,sans-serif;-webkit-font-smoothing:antialiased;">
  <table width="100%" cellpadding="0" cellspacing="0" style="background:#f4f5f7;padding:48px 16px;">
    <tr><td align="center">
      <table width="100%" style="max-width:520px;background:#ffffff;border-radius:16px;overflow:hidden;box-shadow:0 4px 32px rgba(0,0,0,0.10);">
        <tr>
          <td style="background:linear-gradient(135deg,#1a0000 0%,#3a0000 60%,#8B0000 100%);padding:36px 40px;text-align:center;">
            <div style="font-size:22px;font-weight:900;color:#ffffff;text-transform:uppercase;letter-spacing:-0.5px;line-height:1;">
              UNITY <span style="color:#CC0000;">FOODS</span>
            </div>
            <div style="color:rgba(255,255,255,0.55);font-size:11px;letter-spacing:2.5px;text-transform:uppercase;margin-top:8px;">
              New Repair Booking
            </div>
          </td>
        </tr>
        <tr>
          <td style="padding:36px 40px 28px;">
            <p style="margin:0 0 8px;font-size:18px;font-weight:800;color:#111827;letter-spacing:-0.3px;">
              You have a new appointment request.
            </p>
            <p style="margin:0 0 28px;font-size:14px;color:#6b7280;line-height:1.6;">
              A customer submitted a repair booking. Review the details below and call to confirm.
            </p>
            <table width="100%" cellpadding="0" cellspacing="0" style="border:1px solid #e5e7eb;border-radius:10px;overflow:hidden;margin-bottom:28px;">
              ${row('Customer',  b.customer_name)}
              ${row('Phone',     `<a href="tel:${b.customer_phone}" style="color:#8B0000;font-weight:600;text-decoration:none;">${b.customer_phone}</a>`)}
              ${row('Service',   b.service_name, true)}
              ${row('Date',      b.dateDisplay)}
              ${row('Time',      b.timeDisplay)}
              ${b.notes ? row('Notes', b.notes) : ''}
            </table>
            <table width="100%" cellpadding="0" cellspacing="0">
              <tr>
                <td align="center">
                  <a href="https://unity-foods.vercel.app/admin/bookings"
                     style="display:inline-block;background:#8B0000;color:#ffffff;padding:14px 32px;border-radius:8px;font-size:14px;font-weight:700;text-decoration:none;letter-spacing:0.2px;">
                    View All Bookings →
                  </a>
                </td>
              </tr>
            </table>
          </td>
        </tr>
        <tr>
          <td style="background:#f9fafb;padding:20px 40px;border-top:1px solid #e5e7eb;text-align:center;">
            <p style="margin:0;font-size:12px;color:#9ca3af;line-height:1.7;">
              Unity Foods &nbsp;·&nbsp; 3759 Chicago Ave #2, Minneapolis, MN 55407<br>
              <a href="tel:+16128216444" style="color:#9ca3af;text-decoration:none;">(612) 821-6444</a>
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
