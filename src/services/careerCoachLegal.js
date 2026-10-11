// src/services/careerCoachLegal.js
// NEW (2026-10-10): the public Career Coach notice (privacy notice + terms of use),
// kept in one place. Rendered by CareerCoachNoticePage.jsx and reproduced in the
// legal pack. EDIT LEGAL_ENTITY BEFORE LAUNCH - values in [square brackets] are
// placeholders that must be replaced with real details. See the launch checklist.

export const NOTICE_VERSION = '2026-10-10-v2';
export const NOTICE_UPDATED = '10 October 2026';

export const LEGAL_ENTITY = {
    name: 'BluSkye Integrated Consult',            // trading name; confirm the registered legal name
    legalName: 'Joseph Odugboye, sole trader',
    address: 'Oxford, United Kingdom',
    privacyEmail: 'privacy@bluskyeconsult.com',
    icoNumber: '[ICO REGISTRATION NUMBER]',
    governingLaw: 'England and Wales'               // confirm
};

export const NOTICE_SECTIONS = [
    {
        id: 'who', title: '1. Who we are',
        body: [
            'Career Coach is a feature of ODUSBABA (the "Platform"), run by {name} ({legalName}), {address}. We are the controller of the personal data described here. Contact us about your data at {privacyEmail}. UK registration with the Information Commissioner\'s Office: {icoNumber}.'
        ]
    },
    {
        id: 'what', title: '2. What Career Coach is, and is not',
        body: [
            'Career Coach lets you set a desired job, compares your skills and CV with it, scores job listings against your goal, and drafts a cover letter, CV wording and interview practice for you to check and use yourself.',
            'It is not a recruitment or employment agency. We do not find you work, put you forward to employers, or send anything to an employer for you. You decide whether and where to apply.',
            'It is not immigration, legal or financial advice. It never tells you whether you qualify for a visa, sponsorship or residence. A listing that mentions sponsorship is only repeating the advert. Visa and settlement rules change, so always check the official government website for the country concerned, or use a regulated adviser.',
            'Drafts are written by AI and can be wrong. You are responsible for checking that everything you send to an employer is true.'
        ]
    },
    {
        id: 'data', title: '3. The personal data we use',
        body: [
            'Only if you turn Career Coach on, we use: your job goal (roles, countries, work style, salary wish, whether you need sponsorship or want a route to settle); the CV or experience text you paste or upload; your assessment results and skills already on the Platform; your name and location from your profile (for letters); and a record of your reviews, drafts and application tracker entries.',
            'Uploaded CV files are read to extract text and are not stored. Only the text you review and choose to save is kept.',
            'Please do not include sensitive information (health, religion, ethnicity, political views, trade union membership, criminal records, ID or passport numbers) in your CV text. If you do include it, you are giving your explicit consent for it to be processed to produce your drafts.'
        ]
    },
    {
        id: 'basis', title: '4. Why we may use it (lawful basis)',
        body: [
            'Your consent (UK GDPR / EU GDPR Article 6(1)(a); Nigeria Data Protection Act 2023, consent basis). Where you include special-category data, your explicit consent (Article 9(2)(a)). You can withdraw consent at any time on the Career Coach page, without affecting the rest of the Platform. Withdrawing does not affect processing done before you withdrew.',
            'Saying no, or not answering, never reduces your access to any other part of ODUSBABA.'
        ]
    },
    {
        id: 'who-gets', title: '5. Who receives your data',
        body: [
            'OpenAI (our AI processor) and its group companies receive the text needed for each review or draft, to generate the result. Under OpenAI\'s published terms for its business API, data sent through the API is not used to train its models by default, and OpenAI may retain it for up to 30 days for abuse monitoring unless the law requires longer.',
            'Our hosting and database providers (Vercel and Supabase) store your data for us as processors.',
            'We do not sell your data, share it with employers or use it for advertising. We may disclose data if the law requires it.',
            'Job listings come from our own job board and from third-party sources (for example, Jooble and similar services). Their adverts are not checked by us and are not your personal data; we do not tell those sources who you are.'
        ]
    },
    {
        id: 'transfers', title: '6. Sending data outside your country',
        body: [
            'Reviews and drafts are generated in the United States, which does not have the same data protection law as the UK, EU/EEA, Nigeria or other countries. For UK and EU data we rely on the Standard Contractual Clauses (with the UK Addendum for UK data) in OpenAI\'s data processing addendum. For Nigeria and other countries that require it, we also rely on your explicit consent to the transfer, which you give when you turn Career Coach on.',
            'Before sending, we remove obvious email addresses, links, phone numbers and long ID-style numbers from your CV text.'
        ]
    },
    {
        id: 'retention', title: '7. How long we keep it',
        body: [
            'Your Career Coach data is kept until you withdraw, or until 12 months after you last used Career Coach, whichever comes first. About 30 days before automatic deletion we notify you inside the Platform. Withdrawal deletes your job goal, CV text, reviews, drafts and tracker entries immediately.',
            'We keep a record that you gave, declined or withdrew consent (date and wording version, no CV or job data) for 6 years, to prove we acted lawfully.',
            'OpenAI may keep requests for up to 30 days for abuse monitoring, as described above. Backups are overwritten on the provider\'s normal cycle.'
        ]
    },
    {
        id: 'rights', title: '8. Your rights',
        body: [
            'You can ask to see, correct, delete, restrict or object to our use of your data, to withdraw consent, and to receive your data in a portable format. You can download everything Career Coach holds about you, and delete it, on the Career Coach page. Otherwise email {privacyEmail}. We reply within one month.',
            'You may complain to your data protection authority. In the UK this is the Information Commissioner\'s Office (ico.org.uk); in Nigeria the Nigeria Data Protection Commission; in Australia the Office of the Australian Information Commissioner; in New Zealand the Office of the Privacy Commissioner; in the EU your national authority. We would appreciate the chance to put things right first.',
            'No decision with legal or similarly significant effect is made about you by automated means. Job scores are a simple comparison you can see the reasons for; AI drafts are suggestions you review.'
        ]
    },
    {
        id: 'security', title: '9. Security and incidents',
        body: [
            'Your data is protected by access controls, per-user access rules in the database, encrypted connections, and rate limits. If a breach puts your rights at risk we will tell you and the relevant regulator within the legal time limits (72 hours to regulators under UK/EU GDPR and the Nigeria Data Protection Act).'
        ]
    },
    {
        id: 'age', title: '10. Age',
        body: ['Career Coach is for people aged 18 or over.']
    },
    {
        id: 'terms', title: '11. Terms of use for Career Coach',
        body: [
            'You must give true information and only use drafts that are true about you. You must not use Career Coach to produce false, misleading or discriminatory applications, to impersonate anyone, or to copy other people\'s data.',
            'We do not guarantee any job, interview, offer, sponsorship or visa outcome, the accuracy of any third-party listing, or that AI drafts are error-free. We are not responsible for decisions you make about applying or about any employer. Nothing in these terms limits liability that cannot be limited by law, including for death or personal injury caused by negligence or for fraud.',
            'Job matching is free. Skills reviews and application drafts use credits shown before you use them. If a review or draft fails, the credits are returned automatically. Drafts can be created for any job advert you paste, and are not conditional on using any ODUSBABA job listing. Credits and plans are governed by the Platform\'s main terms and pricing. Because the service is delivered immediately, by using a draft you agree that your right to cancel for that digital content ends once it has been supplied (where consumer law allows this).',
            'We may change or withdraw Career Coach, with fair notice where possible. These terms are governed by the law of {governingLaw}; if you are a consumer, you also keep the mandatory protections of the country where you live.'
        ]
    }
];

// Replaces {placeholders} with LEGAL_ENTITY values.
export function fillNotice(text) {
    return String(text).replace(/\{(\w+)\}/g, (_, k) => LEGAL_ENTITY[k] ?? `{${k}}`);
}

export function legalEntityComplete() {
    return !Object.values(LEGAL_ENTITY).some(v => /\[[A-Z ,]+\]/.test(String(v)));
}
