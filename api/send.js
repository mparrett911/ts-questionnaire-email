import { Resend } from 'resend';

const resend = new Resend(process.env.RESEND_API_KEY);

export default async function handler(req, res) {
  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }

  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    const { clientName, fields } = req.body;

    if (!fields || !Array.isArray(fields)) {
      return res.status(400).json({ error: 'Missing or invalid fields data' });
    }

    const rows = fields
      .map(f => `<tr><td style="padding:6px 12px;border:1px solid #ddd;font-weight:600;width:40%;vertical-align:top;">${f.label}</td><td style="padding:6px 12px;border:1px solid #ddd;">${f.value || '<em style="color:#999;">Not provided</em>'}</td></tr>`)
      .join('\n');

    const html = `
      <div style="font-family:Helvetica Neue,Arial,sans-serif;max-width:800px;margin:0 auto;">
        <div style="background:#E8751A;padding:16px 24px;border-radius:4px 4px 0 0;">
          <h1 style="color:#fff;margin:0;font-size:20px;">LLP Formation &amp; Asset Introduction Questionnaire</h1>
        </div>
        <div style="padding:16px 24px;background:#fafafa;border:1px solid #ddd;border-top:none;">
          <p style="margin:0 0 4px;font-size:14px;color:#555;">Client: <strong>${clientName || 'Not specified'}</strong></p>
          <p style="margin:0;font-size:13px;color:#999;">Submitted: ${new Date().toLocaleString('en-GB', { timeZone: 'Europe/London' })}</p>
        </div>
        <table style="width:100%;border-collapse:collapse;font-size:13px;margin-top:12px;">
          ${rows}
        </table>
        <p style="font-size:11px;color:#999;margin-top:20px;">Sent from the LLP Client Questionnaire form.</p>
      </div>
    `;

    const { data, error } = await resend.emails.send({
      from: 'LLP Questionnaire <questionnaire@tspjobs.net>',
      to: ['matt@tspartners.co.uk'],
      subject: `LLP Questionnaire — ${clientName || 'New Submission'}`,
      html: html,
    });

    if (error) {
      console.error('Resend error:', error);
      return res.status(500).json({ error: 'Failed to send email', detail: error.message });
    }

    return res.status(200).json({ success: true, id: data.id });
  } catch (err) {
    console.error('Server error:', err);
    return res.status(500).json({ error: 'Server error', detail: err.message });
  }
}
