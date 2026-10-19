/* ======================================================================
   ChemLab AI — reaction helper (Cloudflare Worker)

   What it does: the Free Lab asks "what happens if I mix A + B?" for a
   pair that isn't in the site's hand-written reaction table. This Worker
   asks Claude, cleans the answer, remembers it (so each pair is only ever
   paid for ONCE), and sends it back.

   Why a Worker instead of calling Claude from the page: the API key must
   never appear in the website's code (GitHub Pages is public). The key
   lives here, as a Worker *secret*; the page only ever talks to this URL.

   Built-in limits that keep your bill tiny:
   - only a FIXED list of known chemicals is accepted (no free text, so
     this can't be used as a general-purpose chatbot),
   - exactly TWO different chemicals per request,
   - every answer is cached forever in KV → at most one paid call per
     pair, and there are only ~1,500 possible pairs,
   - only your site's address may call it (browser-level check).
   ====================================================================== */

// ---- settings you may change -------------------------------------------
const MODEL = 'claude-haiku-5-5';
const ALLOWED_ORIGINS = [
  'https://lamaaliaa.github.io', // the live site
  'http://127.0.0.1:5500',       // VS Code Live Server
  'http://localhost:5500',
];
// -------------------------------------------------------------------------

// id -> { n: English name, f: formula }  (generated from the site's CHEMICALS)
const CHEMICALS = {
  "hydrogen": {
    "n": "Hydrogen",
    "f": "H"
  },
  "oxygen": {
    "n": "Oxygen",
    "f": "O"
  },
  "carbon": {
    "n": "Carbon",
    "f": "C"
  },
  "nitrogen": {
    "n": "Nitrogen",
    "f": "N"
  },
  "sodium": {
    "n": "Sodium",
    "f": "Na"
  },
  "chlorine": {
    "n": "Chlorine",
    "f": "Cl"
  },
  "sulfur": {
    "n": "Sulfur Powder",
    "f": "S"
  },
  "zinc": {
    "n": "Zinc Powder",
    "f": "Zn"
  },
  "water": {
    "n": "Water",
    "f": "H₂O"
  },
  "calcium": {
    "n": "Calcium Metal",
    "f": "Ca"
  },
  "copper": {
    "n": "Copper Metal",
    "f": "Cu"
  },
  "nitric_acid": {
    "n": "Nitric Acid",
    "f": "HNO₃"
  },
  "lead_nitrate": {
    "n": "Lead Nitrate",
    "f": "Pb(NO₃)₂"
  },
  "sodium_chloride": {
    "n": "Sodium Chloride",
    "f": "NaCl"
  },
  "starch": {
    "n": "Starch Solution",
    "f": "(C₆H₁₀O₅)ₙ"
  },
  "iodine": {
    "n": "Iodine",
    "f": "I₂"
  },
  "glucose": {
    "n": "Glucose Solution",
    "f": "C₆H₁₂O₆"
  },
  "manganese_dioxide": {
    "n": "Manganese Dioxide",
    "f": "MnO₂"
  },
  "iron_oxide": {
    "n": "Iron Oxide Powder",
    "f": "Fe₂O₃/Fe₃O₄"
  },
  "sugar": {
    "n": "Sugar (Sucrose)",
    "f": "C₁₂H₂₂O₁₁"
  },
  "sulfuric_acid": {
    "n": "Sulfuric Acid",
    "f": "H₂SO₄"
  },
  "hydrochloric_acid": {
    "n": "Hydrochloric Acid",
    "f": "HCl"
  },
  "aluminum": {
    "n": "Aluminum Powder",
    "f": "Al"
  },
  "naoh": {
    "n": "Sodium Hydroxide",
    "f": "NaOH"
  },
  "copper_sulfate": {
    "n": "Copper Sulfate Solution",
    "f": "CuSO₄"
  },
  "vinegar": {
    "n": "Vinegar (Acetic Acid)",
    "f": "CH₃COOH"
  },
  "baking_soda": {
    "n": "Baking Soda Solution",
    "f": "NaHCO₃"
  },
  "iron": {
    "n": "Iron Filings",
    "f": "Fe"
  },
  "hydrogen_peroxide": {
    "n": "Hydrogen Peroxide",
    "f": "H₂O₂"
  },
  "potassium_iodide": {
    "n": "Potassium Iodide",
    "f": "KI"
  },
  "dry_ice": {
    "n": "Dry Ice",
    "f": "CO₂ (solid)"
  },
  "warm_water": {
    "n": "Warm Water",
    "f": "H₂O (warm)"
  },
  "luminol": {
    "n": "Luminol",
    "f": "C₈H₇N₃O₂"
  },
  "potassium": {
    "n": "Potassium Metal",
    "f": "K"
  },
  "ammonia": {
    "n": "Ammonia",
    "f": "NH₃"
  },
  "carbon_dioxide": {
    "n": "Carbon Dioxide",
    "f": "CO₂"
  },
  "iron_sulfide": {
    "n": "Iron Sulfide",
    "f": "FeS"
  },
  "potassium_chloride": {
    "n": "Potassium Chloride",
    "f": "KCl"
  },
  "methane": {
    "n": "Methane",
    "f": "CH₄"
  },
  "hydrogen_sulfide": {
    "n": "Hydrogen Sulfide",
    "f": "H₂S"
  },
  "sodium_hydride": {
    "n": "Sodium Hydride",
    "f": "NaH"
  },
  "hydrogen_iodide": {
    "n": "Hydrogen Iodide",
    "f": "HI"
  },
  "nitrogen_dioxide": {
    "n": "Nitrogen Dioxide",
    "f": "NO₂"
  },
  "sodium_oxide": {
    "n": "Sodium Oxide",
    "f": "Na₂O"
  },
  "sulfur_dioxide": {
    "n": "Sulfur Dioxide",
    "f": "SO₂"
  },
  "zinc_oxide": {
    "n": "Zinc Oxide",
    "f": "ZnO"
  },
  "calcium_oxide": {
    "n": "Calcium Oxide (Quicklime)",
    "f": "CaO"
  },
  "copper_oxide": {
    "n": "Copper Oxide",
    "f": "CuO"
  },
  "aluminum_oxide": {
    "n": "Aluminum Oxide",
    "f": "Al₂O₃"
  },
  "sodium_iodide": {
    "n": "Sodium Iodide",
    "f": "NaI"
  },
  "zinc_chloride": {
    "n": "Zinc Chloride",
    "f": "ZnCl₂"
  },
  "calcium_chloride": {
    "n": "Calcium Chloride",
    "f": "CaCl₂"
  },
  "copper_chloride": {
    "n": "Copper Chloride",
    "f": "CuCl₂"
  },
  "aluminum_chloride": {
    "n": "Aluminum Chloride",
    "f": "AlCl₃"
  },
  "iron_chloride": {
    "n": "Iron(III) Chloride",
    "f": "FeCl₃"
  },
  "zinc_sulfide": {
    "n": "Zinc Sulfide",
    "f": "ZnS"
  }
};

const COLORS = ['clear', 'blue', 'pink', 'purple', 'green', 'amber', 'copper',
  'colorless', 'cyan', 'yellow', 'gray', 'red', 'black'];
const DANGER = ['none', 'caution', 'hazard'];

const SYSTEM_PROMPT = `You are the reaction engine of an educational chemistry game for school students.
You are given exactly two chemicals that a student mixes together at room temperature in ordinary school glassware.
Decide what a student would actually observe, and answer with ONE JSON object and nothing else (no markdown, no code fences).

JSON shape:
{
  "reacts": true or false,
  "equation": "balanced equation written with formulas, e.g. 2Na + 2H2O -> 2NaOH + H2",
  "product": null or {
    "id": "lowercase_ascii_snake_case",
    "formula": "formula of the most notable product",
    "name": {"en": "", "ar": "", "fr": ""},
    "info": {"en": "", "ar": "", "fr": ""}
  },
  "color": one of ${JSON.stringify(COLORS)},
  "heat": true or false,
  "bubbles": true or false,
  "precipitate": true or false,
  "danger": "none" or "caution" or "hazard",
  "explanation": {"en": "", "ar": "", "fr": ""}
}

Rules:
- Be chemically accurate. Never invent a reaction. If nothing visible happens under normal classroom conditions (no heating, no special catalyst), set "reacts": false, "product": null, and use "explanation" to say briefly why nothing happens.
- "explanation": 1-2 short sentences in simple language, saying what happens and why.
- "info" (only when there is a product): one short factual sentence about that product.
- "color" is the liquid's color after mixing; use "colorless" or "clear" when nothing colored forms.
- "danger": "caution" for noticeably vigorous or irritating reactions, "hazard" for violent, explosive or toxic-gas outcomes. Describe what happens; never give instructions for doing it outside a school lab.
- Arabic must be clear Modern Standard Arabic. French must be natural. Keep formulas as plain characters (H2O is fine).`;

export default {
  async fetch(request, env) {
    const origin = request.headers.get('Origin') || '';
    const allowed = ALLOWED_ORIGINS.includes(origin);
    const cors = allowed ? {
      'Access-Control-Allow-Origin': origin,
      'Access-Control-Allow-Methods': 'POST, OPTIONS',
      'Access-Control-Allow-Headers': 'Content-Type',
      'Access-Control-Max-Age': '86400',
      'Vary': 'Origin',
    } : {};

    if (request.method === 'OPTIONS') {
      return new Response(null, { status: allowed ? 204 : 403, headers: cors });
    }
    if (!allowed) return reply({ ok: false, error: 'forbidden' }, 403, cors);
    if (request.method !== 'POST') return reply({ ok: false, error: 'method_not_allowed' }, 405, cors);

    if (!env.ANTHROPIC_API_KEY) return reply({ ok: false, error: 'server_missing_key' }, 500, cors);
    if (!env.CACHE) return reply({ ok: false, error: 'server_missing_cache' }, 500, cors);

    // ---- validate the request -------------------------------------------
    let body;
    try { body = await request.json(); } catch { return reply({ ok: false, error: 'bad_json' }, 400, cors); }
    const ids = body && Array.isArray(body.chemicals) ? body.chemicals : null;
    if (!ids || ids.length !== 2 || ids.some((x) => typeof x !== 'string')) {
      return reply({ ok: false, error: 'need_exactly_two_chemicals' }, 400, cors);
    }
    const pair = [...ids].sort();
    if (pair[0] === pair[1]) return reply({ ok: false, error: 'need_two_different_chemicals' }, 400, cors);
    if (!Object.prototype.hasOwnProperty.call(CHEMICALS, pair[0]) ||
        !Object.prototype.hasOwnProperty.call(CHEMICALS, pair[1])) {
      return reply({ ok: false, error: 'unknown_chemical' }, 400, cors);
    }

    // ---- cache: each pair is paid for at most once ----------------------
    const key = 'pair:' + pair.join('+');
    const hit = await env.CACHE.get(key, 'json');
    if (hit) return reply({ ok: true, cached: true, result: hit }, 200, cors);

    // ---- ask Claude -----------------------------------------------------
    const a = CHEMICALS[pair[0]], b = CHEMICALS[pair[1]];
    const userMsg = `Chemical A: ${a.n} (${a.f})\nChemical B: ${b.n} (${b.f})\nWhat happens when they are mixed?`;

    let upstream;
    const ctl = new AbortController();
    const timer = setTimeout(() => ctl.abort(), 25000);
    try {
      upstream = await fetch('https://api.anthropic.com/v1/messages', {
        method: 'POST',
        signal: ctl.signal,
        headers: {
          'content-type': 'application/json',
          'x-api-key': env.ANTHROPIC_API_KEY,
          'anthropic-version': '2023-06-01',
        },
        body: JSON.stringify({
          model: MODEL,
          max_tokens: 900,
          system: SYSTEM_PROMPT,
          messages: [{ role: 'user', content: userMsg }],
        }),
      });
    } catch (e) {
      return reply({ ok: false, error: 'upstream_unreachable' }, 502, cors);
    } finally {
      clearTimeout(timer);
    }
    if (!upstream.ok) return reply({ ok: false, error: 'upstream_error', status: upstream.status }, 502, cors);

    let result;
    try {
      const data = await upstream.json();
      const text = (data.content || []).filter((c) => c.type === 'text').map((c) => c.text).join('');
      result = sanitize(parseJsonLoose(text));
    } catch {
      result = null;
    }
    // A malformed answer is NOT cached, so the next attempt can succeed.
    if (!result) return reply({ ok: false, error: 'bad_model_output' }, 502, cors);

    await env.CACHE.put(key, JSON.stringify(result));
    return reply({ ok: true, cached: false, result }, 200, cors);
  },
};

function reply(obj, status, headers) {
  return new Response(JSON.stringify(obj), {
    status,
    headers: { 'content-type': 'application/json; charset=utf-8', ...headers },
  });
}

// Pull the first {...} object out of the model's text (tolerates code fences).
function parseJsonLoose(text) {
  const start = text.indexOf('{');
  const end = text.lastIndexOf('}');
  if (start === -1 || end <= start) throw new Error('no json');
  return JSON.parse(text.slice(start, end + 1));
}

const clean = (s, max) => String(s == null ? '' : s).replace(/[<>]/g, '').replace(/\s+/g, ' ').trim().slice(0, max);

// Three-language text: English is required, a missing ar/fr falls back to it.
function tri(o, max) {
  if (!o || typeof o !== 'object') return null;
  const en = clean(o.en, max);
  if (!en) return null;
  return { en, ar: clean(o.ar, max) || en, fr: clean(o.fr, max) || en };
}

// Everything that comes back gets shown on the page, so only well-formed,
// length-limited, tag-free values are allowed through.
function sanitize(r) {
  if (!r || typeof r !== 'object') return null;
  const explanation = tri(r.explanation, 400);
  if (!explanation) return null;

  const out = {
    reacts: r.reacts === true,
    equation: clean(r.equation, 120),
    product: null,
    color: COLORS.includes(r.color) ? r.color : 'colorless',
    heat: r.heat === true,
    bubbles: r.bubbles === true,
    precipitate: r.precipitate === true,
    danger: DANGER.includes(r.danger) ? r.danger : 'none',
    explanation,
  };

  if (out.reacts && r.product && typeof r.product === 'object') {
    const name = tri(r.product.name, 60);
    const info = tri(r.product.info, 240);
    const formula = clean(r.product.formula, 24);
    if (name && info && formula) {
      let slug = String(r.product.id || formula).toLowerCase().replace(/[^a-z0-9]+/g, '_').replace(/^_+|_+$/g, '').slice(0, 36);
      if (!slug) slug = 'compound';
      out.product = { id: 'ai_' + slug, formula, name, info };
    }
  }
  return out;
}
