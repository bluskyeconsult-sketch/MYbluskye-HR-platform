// src/services/joobleConfig.js
// Shared Jooble settings for the job-board fetch (rssJobService.js) and the
// chat live search (liveJobSearchService.js).
//
// WHAT JOOBLE SAYS (Jooble Help Centre, "REST API Documentation"):
//  - free keys have "a total lifetime limit of 500 requests per key" - an
//    absolute lifetime quota, NOT monthly;
//  - "Each Jooble domain (country) requires its own unique REST API key";
//    a key generated on jooble.org "provides access exclusively to US job
//    listings". For other countries, register on that country's own Jooble
//    domain (e.g. uk.jooble.org/api/about, de.jooble.org/api/about).
//
// UNVERIFIED: Jooble's help page does not document the API URL for regional
// domains. This assumes the same pattern as the main site,
// POST https://<country>.jooble.org/api/<key>. Test one country first.
//
// HOW KEYS ARE NAMED in Vercel (Environment Variables):
//   JOOBLE_API_KEY      -> jooble.org      (United States)
//   JOOBLE_API_KEY_AU   -> au.jooble.org   (Australia)
//   JOOBLE_API_KEY_NZ, _IE, _CA, _GB, _NG, _GH, _KE, _ZA, _AE ... likewise.
// A country with no key set is simply skipped.

export const JOOBLE_COUNTRIES = {
    US: { name: 'United States',        host: 'jooble.org',    env: 'JOOBLE_API_KEY' },
    GB: { name: 'United Kingdom',       host: 'uk.jooble.org', env: 'JOOBLE_API_KEY_GB' },
    AU: { name: 'Australia',            host: 'au.jooble.org', env: 'JOOBLE_API_KEY_AU' },
    NZ: { name: 'New Zealand',          host: 'nz.jooble.org', env: 'JOOBLE_API_KEY_NZ' },
    IE: { name: 'Ireland',              host: 'ie.jooble.org', env: 'JOOBLE_API_KEY_IE' },
    CA: { name: 'Canada',               host: 'ca.jooble.org', env: 'JOOBLE_API_KEY_CA' },
    DE: { name: 'Germany',              host: 'de.jooble.org', env: 'JOOBLE_API_KEY_DE' },
    NG: { name: 'Nigeria',              host: 'ng.jooble.org', env: 'JOOBLE_API_KEY_NG' },
    GH: { name: 'Ghana',                host: 'gh.jooble.org', env: 'JOOBLE_API_KEY_GH' },
    KE: { name: 'Kenya',                host: 'ke.jooble.org', env: 'JOOBLE_API_KEY_KE' },
    ZA: { name: 'South Africa',         host: 'za.jooble.org', env: 'JOOBLE_API_KEY_ZA' },
    AE: { name: 'United Arab Emirates', host: 'ae.jooble.org', env: 'JOOBLE_API_KEY_AE' }
};

export function joobleKeyFor(code) {
    const c = JOOBLE_COUNTRIES[code];
    if (!c || typeof process === 'undefined') return '';
    return String(process.env[c.env] || '').trim();
}

export function joobleEndpoint(code) {
    const c = JOOBLE_COUNTRIES[code];
    const key = joobleKeyFor(code);
    return c && key ? `https://${c.host}/api/${key}` : null;
}

// Settlement / PR / sponsorship search phrases per country. The job-board
// fetch rotates through these by day (see rssJobService.js), so a key's 500
// lifetime requests stretch across many different searches.
export const JOOBLE_QUERIES = {
    AU: ['visa sponsorship', 'skills in demand visa', 'employer nomination scheme', 'permanent residency', 'sponsored work visa', 'care worker visa sponsorship', 'nurse sponsorship', 'relocation support', 'subclass 482', 'permanent residence pathway'],
    NZ: ['visa sponsorship', 'accredited employer work visa', 'AEWV', 'residence pathway', 'sponsored work visa', 'care worker visa sponsorship', 'nurse sponsorship', 'relocation support', 'work visa support', 'skilled migrant'],
    GB: ['skilled worker visa sponsorship', 'certificate of sponsorship', 'visa sponsorship', 'sponsored care worker', 'nurse sponsorship', 'settlement support', 'relocation support', 'sponsor licence', 'health and care visa', 'right to work sponsorship'],
    IE: ['visa sponsorship', 'critical skills employment permit', 'employment permit', 'work permit sponsorship', 'nurse sponsorship', 'care assistant permit', 'relocation support', 'general employment permit', 'permanent residency', 'sponsorship available'],
    CA: ['visa sponsorship', 'LMIA', 'work permit sponsorship', 'permanent residence', 'express entry', 'provincial nominee', 'care worker sponsorship', 'nurse sponsorship', 'relocation support', 'sponsorship available'],
    US: ['visa sponsorship', 'H-1B sponsorship', 'green card sponsorship', 'relocation support', 'nurse sponsorship', 'permanent residency', 'sponsorship available', 'work visa support', 'engineer sponsorship', 'sponsored work visa'],
    DE: ['visa sponsorship', 'blue card', 'work visa support', 'relocation support', 'permanent residence', 'sponsorship available', 'nurse sponsorship', 'engineer visa', 'skilled immigration', 'work permit'],
    NG: ['visa sponsorship', 'relocation abroad', 'international recruitment', 'work abroad', 'overseas jobs', 'nurse overseas', 'sponsorship available', 'relocation support', 'abroad care worker', 'work permit'],
    GH: ['visa sponsorship', 'international recruitment', 'work abroad', 'overseas jobs', 'nurse overseas', 'relocation support', 'sponsorship available', 'work permit', 'abroad care worker', 'relocation abroad'],
    KE: ['visa sponsorship', 'international recruitment', 'work abroad', 'overseas jobs', 'nurse overseas', 'relocation support', 'sponsorship available', 'work permit', 'abroad care worker', 'relocation abroad'],
    ZA: ['visa sponsorship', 'international recruitment', 'work abroad', 'overseas jobs', 'nurse overseas', 'relocation support', 'sponsorship available', 'work permit', 'critical skills visa', 'relocation abroad'],
    AE: ['visa sponsorship', 'visa provided', 'relocation support', 'nurse sponsorship', 'work permit', 'sponsorship available', 'golden visa', 'residence visa', 'accommodation and visa', 'engineer relocation']
};

// Text that marks a listing as sponsorship / settlement / PR related.
export const SPONSORSHIP_KEYWORDS = [
    'visa sponsorship', 'sponsorship available', 'sponsorship provided', 'will sponsor', 'we sponsor', 'sponsored visa', 'sponsored work visa', 'sponsor your visa',
    'certificate of sponsorship', 'sponsor licence', 'sponsor license', 'skilled worker visa', 'health and care visa',
    'permanent residency', 'permanent residence', 'pathway to residency', 'residence pathway', 'settlement', 'indefinite leave',
    'subclass 482', '482 visa', 'subclass 186', '186 visa', 'skills in demand', 'employer nomination',
    'accredited employer', 'aewv', 'lmia', 'express entry', 'provincial nominee', 'employment permit', 'critical skills',
    'h-1b', 'h1b', 'green card', 'blue card', 'visa provided', 'visa support', 'work visa support', 'relocation support', 'relocation package', 'work permit'
];
