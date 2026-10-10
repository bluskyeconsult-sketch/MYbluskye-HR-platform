// src/services/jobIntent.js
// NEW (2026-10-10): decides whether a chat message is a job search WITHOUT
// requiring the word "job". The old check needed words like "job/vacancy/
// hiring", so "care assistant in Auckland" or "I want to work in Sydney as
// a nurse" never triggered a search at all.
//
// A message counts as a job search when ANY of these is true:
//   1. it contains an explicit job word (job, vacancy, hiring, apply...)
//   2. it names a place (country/city) AND an occupation
//   3. it says it wants to work / move / relocate somewhere
//   4. it is an occupation plus "in/near/around <place>"
// Course/learning questions without an explicit job word are NOT treated as
// job searches ("nursing courses in Australia" goes to the courses lookup).

export const JOB_WORDS = /\b(job|jobs|vacanc|hiring|position|positions|role|roles|career|opening|openings|opportunit|employ|apply|recruit|work\s+permit)\w*/i;
const COURSE_WORDS = /\b(course|courses|learn|learning|training|certificat|upskill|study|class|tutorial|qualif|degree|diploma)\w*/i;
const WORK_WISH = /\b(work(ing)?|move|moving|relocat\w*|emigrat\w*|migrat\w*|settle)\b[^.?!]{0,40}\b(in|to|at|near|around)\b/i;

const OCCUPATIONS = [
    'nurse', 'nurses', 'nursing assistant', 'carer', 'carers', 'care assistant', 'care worker', 'support worker', 'healthcare assistant', 'hca',
    'midwife', 'doctor', 'physician', 'surgeon', 'pharmacist', 'physiotherapist', 'dentist', 'radiographer', 'paramedic', 'social worker',
    'teacher', 'lecturer', 'tutor', 'engineer', 'developer', 'programmer', 'software', 'devops', 'data scientist', 'data analyst', 'analyst',
    'accountant', 'auditor', 'bookkeeper', 'finance', 'banker', 'actuary', 'lawyer', 'solicitor', 'paralegal',
    'electrician', 'plumber', 'welder', 'carpenter', 'builder', 'mechanic', 'technician', 'fitter', 'labourer', 'laborer', 'bricklayer', 'painter', 'roofer',
    'driver', 'truck driver', 'delivery driver', 'forklift', 'warehouse', 'logistics', 'courier',
    'cleaner', 'chef', 'cook', 'kitchen hand', 'barista', 'waiter', 'waitress', 'hospitality', 'receptionist', 'cashier', 'retail assistant', 'sales assistant',
    'manager', 'supervisor', 'administrator', 'admin', 'secretary', 'coordinator', 'officer', 'assistant', 'consultant', 'recruiter', 'hr',
    'designer', 'marketer', 'marketing', 'writer', 'editor', 'architect', 'surveyor', 'scientist', 'researcher', 'security guard', 'farm worker', 'fruit picker', 'agriculture'
];
const OCC_RE = new RegExp('\\b(' + OCCUPATIONS.map(o => o.replace(/\s+/g, '\\s+')).join('|') + ')\\b', 'i');

// code -> names a user might type (countries, nationalities, major cities).
// Codes follow ISO 3166 and match the country_code column on the jobs table.
export const PLACES = {
    AU: ['australia', 'aussie', 'sydney', 'melbourne', 'brisbane', 'perth', 'adelaide', 'canberra', 'gold coast', 'darwin', 'hobart'],
    NZ: ['new zealand', 'nz', 'kiwi', 'auckland', 'wellington', 'christchurch', 'hamilton', 'tauranga', 'dunedin', 'queenstown'],
    GB: ['united kingdom', 'uk', 'britain', 'england', 'scotland', 'wales', 'london', 'manchester', 'birmingham', 'leeds', 'glasgow', 'liverpool', 'bristol', 'edinburgh', 'sheffield', 'nottingham', 'leicester', 'cardiff', 'belfast', 'northern ireland'],
    IE: ['ireland', 'dublin', 'cork', 'galway'],
    US: ['united states', 'usa', 'america', 'new york', 'california', 'texas', 'chicago', 'los angeles', 'houston', 'seattle', 'boston'],
    CA: ['canada', 'toronto', 'vancouver', 'calgary', 'ottawa', 'montreal', 'edmonton'],
    DE: ['germany', 'berlin', 'munich', 'hamburg', 'frankfurt'],
    FR: ['france', 'paris', 'lyon'],
    NL: ['netherlands', 'holland', 'amsterdam', 'rotterdam'],
    NG: ['nigeria', 'lagos', 'abuja', 'port harcourt'],
    GH: ['ghana', 'accra'],
    KE: ['kenya', 'nairobi'],
    ZA: ['south africa', 'johannesburg', 'cape town', 'durban', 'pretoria'],
    IN: ['india', 'bangalore', 'bengaluru', 'mumbai', 'delhi', 'hyderabad', 'chennai', 'pune'],
    SG: ['singapore'],
    AE: ['uae', 'dubai', 'abu dhabi', 'united arab emirates'],
    PL: ['poland', 'warsaw', 'krakow'],
    IT: ['italy', 'rome', 'milan'],
    ES: ['spain', 'madrid', 'barcelona'],
    AT: ['austria', 'vienna'],
    CH: ['switzerland', 'zurich', 'geneva'],
    BE: ['belgium', 'brussels'],
    BR: ['brazil', 'sao paulo']
};
// Cities map to a "where" string so searches can narrow below country level.
const CITY_CODES = new Set(['sydney','melbourne','brisbane','perth','adelaide','canberra','gold coast','darwin','hobart','auckland','wellington','christchurch','hamilton','tauranga','dunedin','queenstown','london','manchester','birmingham','leeds','glasgow','liverpool','bristol','edinburgh','sheffield','nottingham','leicester','cardiff','belfast','dublin','cork','galway','toronto','vancouver','calgary','ottawa','montreal','edmonton','berlin','munich','hamburg','frankfurt','paris','lyon','amsterdam','rotterdam','lagos','abuja','port harcourt','accra','nairobi','johannesburg','cape town','durban','pretoria','bangalore','bengaluru','mumbai','delhi','hyderabad','chennai','pune','dubai','abu dhabi','warsaw','krakow','rome','milan','madrid','barcelona','vienna','zurich','geneva','brussels','new york','chicago','los angeles','houston','seattle','boston']);

const STOP = /\b(any|are|there|for|find|me|show|search|searching|looking|look|want|need|please|can|you|the|a|an|in|on|at|near|around|help|get|got|i|im|i'm|am|to|of|and|or|with|my|be|is|do|does|what|which|some|good|best|new|latest|current|open|available|work|working|move|moving|relocate|relocating|migrate|migrating|settle|from|who|how|where|when|go|going|would|like|could|should|about|into|out|up|that|this|these|those|have|has|as|by|it|its|am|us|we)\b/gi;

export function detectPlace(msg) {
    const m = ' ' + msg.toLowerCase().replace(/[^a-z0-9\s']/g, ' ') + ' ';
    let country = null, city = null, matchedNames = [];
    for (const [code, names] of Object.entries(PLACES)) {
        for (const n of names) {
            if (m.includes(' ' + n + ' ')) {
                if (!country) country = code;
                if (CITY_CODES.has(n) && !city) city = n;
                matchedNames.push(n);
            }
        }
    }
    return { country, city, matchedNames };
}

export function parseJobSearchIntent(userMessage) {
    if (!userMessage) return null;
    const msg = userMessage.toLowerCase();
    const hasJobWord = JOB_WORDS.test(msg);
    const place = detectPlace(msg);
    const hasOcc = OCC_RE.test(msg);
    const wantsToWork = WORK_WISH.test(msg) && !!place.country;
    const occInPlace = hasOcc && !!place.country;
    const isLearning = COURSE_WORDS.test(msg) && !hasJobWord;

    if (isLearning) return null;
    if (!(hasJobWord || occInPlace || wantsToWork)) return null;

    const wantsSponsorship = /\b(sponsor|visa|work permit|relocat|skilled worker|sponsorship)\w*/i.test(msg);

    let kw = userMessage.toLowerCase();
    for (const n of place.matchedNames.sort((a, b) => b.length - a.length)) kw = kw.replace(new RegExp('\\b' + n.replace(/\s+/g, '\\s+') + '\\b', 'gi'), ' ');
    kw = kw.replace(JOB_WORDS, ' ').replace(/\b(sponsor\w*|visa|work permit|relocat\w*|skilled worker)\b/gi, ' ')
        .replace(STOP, ' ').replace(/[^a-z0-9+#\s.-]/g, ' ').replace(/\s+/g, ' ').trim();
    const SHORT_OK = new Set(['hr', 'qa', 'ux', 'ui', 'pa', 'gp']);
    const terms = [...new Set(kw.split(' ').filter(w => w.length >= 3 || SHORT_OK.has(w)))].slice(0, 4);
    const keyword = terms.length ? terms.join(' ').substring(0, 100) : null;

    // "Can I move to Canada?" alone is an immigration question, not a search.
    if (!hasJobWord && !occInPlace && !keyword) return null;

    return { wantsSponsorship, country: place.country, city: place.city, keyword, terms };
}
