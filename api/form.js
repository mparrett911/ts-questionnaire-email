const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL;
const SUPABASE_KEY = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

// Simple Supabase REST helper (no SDK needed)
async function supabaseRequest(path, options = {}) {
  const res = await fetch(`${SUPABASE_URL}/rest/v1/${path}`, {
    ...options,
    headers: {
      'apikey': SUPABASE_KEY,
      'Authorization': `Bearer ${SUPABASE_KEY}`,
      'Content-Type': 'application/json',
      'Prefer': options.prefer || '',
      ...options.headers,
    },
  });
  const text = await res.text();
  return { status: res.status, data: text ? JSON.parse(text) : null };
}

// Generate a short random ID (8 chars, URL-safe)
function generateId() {
  const chars = 'abcdefghijkmnpqrstuvwxyz23456789';
  let id = '';
  for (let i = 0; i < 8; i++) {
    id += chars[Math.floor(Math.random() * chars.length)];
  }
  return id;
}

export default async function handler(req, res) {
  // CORS preflight
  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }

  // --- GET: Load a form by ID ---
  if (req.method === 'GET') {
    const { id } = req.query;
    if (!id) {
      return res.status(400).json({ error: 'Missing form ID' });
    }

    const result = await supabaseRequest(
      `llp_questionnaire_forms?id=eq.${encodeURIComponent(id)}&select=*`,
      { method: 'GET' }
    );

    if (!result.data || result.data.length === 0) {
      return res.status(404).json({ error: 'Form not found' });
    }

    return res.status(200).json(result.data[0]);
  }

  // --- POST: Create a new form ---
  if (req.method === 'POST') {
    const { client_name, form_state } = req.body;

    if (!form_state) {
      return res.status(400).json({ error: 'Missing form_state' });
    }

    const id = generateId();

    const result = await supabaseRequest('llp_questionnaire_forms', {
      method: 'POST',
      prefer: 'return=representation',
      body: JSON.stringify({
        id,
        client_name: client_name || 'Unknown',
        form_state,
      }),
    });

    if (result.status >= 400) {
      return res.status(500).json({ error: 'Failed to create form', detail: result.data });
    }

    return res.status(201).json({ id, url: `${req.headers.origin || 'https://ts-questionnaire-email.vercel.app'}/questionnaire.html?id=${id}` });
  }

  // --- PUT: Update an existing form ---
  if (req.method === 'PUT') {
    const { id, form_state, submitted } = req.body;

    if (!id || !form_state) {
      return res.status(400).json({ error: 'Missing id or form_state' });
    }

    const updateData = { form_state };
    if (typeof submitted === 'boolean') {
      updateData.submitted = submitted;
    }

    const result = await supabaseRequest(
      `llp_questionnaire_forms?id=eq.${encodeURIComponent(id)}`,
      {
        method: 'PATCH',
        prefer: 'return=representation',
        body: JSON.stringify(updateData),
      }
    );

    if (result.status >= 400) {
      return res.status(500).json({ error: 'Failed to update form', detail: result.data });
    }

    return res.status(200).json({ success: true });
  }

  return res.status(405).json({ error: 'Method not allowed' });
}
