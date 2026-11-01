// api/_lib/appraisalNotice.js
//
// NEW (2026-10-24): the staff notice. One source of wording used by (1) the preview on the organisation page,
// (2) the notice email sent to staff, and (3) the invitation email every new person receives.
// An organisation cannot start an appraisal round until it has either sent this notice through the platform to
// everyone being appraised, or confirmed that it has given its own equivalent notice (the employer carries that burden).
// If the wording changes in a way that matters, raise NOTICE_VERSION: every organisation is then asked to send it again.
//
// DRAFT FOR SOLICITOR REVIEW. See ODUSBABA-Staff-Appraisal-Notice-Employer-Guide.docx for the matching document.

export const NOTICE_VERSION = 1;
export const PROVIDER = 'BluSkye Integrated Consult, trading as ODUSBABA, Oxford, England';
export const PRIVACY_EMAIL = 'privacy@bluskyeconsult.com';

const esc = (s) => String(s ?? '').replace(/[<>&"]/g, (c) => ({ '<': '&lt;', '>': '&gt;', '&': '&amp;', '"': '&quot;' }[c]));

export function staffNotice(orgName, retentionYears) {
    const o = String(orgName || 'Your organisation').replace(/[<>&]/g, '').trim() || 'Your organisation';
    const y = Number(retentionYears) > 0 ? Number(retentionYears) : 6;
    return {
        version: NOTICE_VERSION,
        title: `How ${o} uses ODUSBABA Appraisals and your information`,
        sections: [
            { h: 'Who is responsible', p: [
                `${o} has chosen to run staff appraisals on ODUSBABA Appraisals. ${o} decides why and how your appraisal information is used, so it is the controller of that information.`,
                `The platform is provided by ${PROVIDER}. The provider handles your information only on ${o}'s instructions, as its processor. ${o} is your first point of contact for any question about your information.`] },
            { h: 'What is recorded', p: [
                `Your name, work email address, job title, department and who supervises you; your self-appraisal; your supervisor's ratings and comments; comments from any contributors; your response to your supervisor's assessment, including any disagreement; records of meetings; the agreed or final record; and, if your organisation's question set includes it, your supervisor's view of your potential. Each rating is recorded against the person rated.`] },
            { h: 'Who can see it', p: [
                `You can see your own appraisals. Your supervisor and your approver see the stages that concern you.`,
                `Your organisation's owner and HR administrators can open the individual ratings of any person whose appraisal has been filed, including from reports and charts. Ratings are not anonymous to them.`,
                `Reports hide any group of fewer than five people in grouped charts, so that a chart alone cannot point to one person. That does not stop the owner or HR administrators opening the named ratings behind a figure.`,
                `Each time named ratings are opened in a report, the platform records who opened them, when, which kind of figure they opened and how many people it showed. That record does not contain names or ratings.`,
                `The provider does not read appraisal content as part of running the service. Appraisal text is encrypted before it is stored.`] },
            { h: 'How it is used', p: [
                `Ratings support appraisal conversations. Nothing on the platform scores, ranks or decides anything about you automatically, and the platform makes no decision about pay, promotion or dismissal. Reports list people alphabetically, never ranked. The platform's guidance tells organisations not to rely on ratings alone for such decisions.`,
                `Artificial intelligence is used only to suggest ideas for appraisal questions to your organisation. It does not read, score or judge any person's appraisal.`] },
            { h: 'How long it is kept', p: [
                `Filed appraisals are kept for ${y} years after filing, as set by ${o}, and are then deleted. They may be kept longer if a legal hold is placed on them, for example because of a legal claim or an investigation.`] },
            { h: 'Your rights', p: [
                `Subject to the law that applies to you (in the United Kingdom, the UK GDPR and the Data Protection Act 2018), you may ask ${o} for a copy of your information, to correct it, to restrict or object to its use and, in some cases, to delete it. You can see your own appraisals and history, and download a copy of your own data, from your Appraisals pages. If you disagree with a rating, you can record your response in the appraisal.`,
                `If you are unhappy with how your information is handled, please speak to ${o} first. You may also complain to the Information Commissioner's Office (ico.org.uk) or to the data protection regulator in the country where you work.`] },
            { h: 'Legal basis and your organisation\'s own privacy information', p: [
                `${o} is responsible for the legal basis on which it uses your information and for its own staff privacy notice. If you are unsure, please ask ${o}.`] },
            { h: 'Service providers and countries', p: [
                `The provider uses hosting and email service providers to run the platform. Information may be processed outside the United Kingdom or the European Economic Area where those providers operate, and the provider puts in place the safeguards the law requires for that.`] },
            { h: 'Questions', p: [
                `Please ask the HR team at ${o}. Questions about the platform itself can be sent to ${PRIVACY_EMAIL}.`] }
        ]
    };
}

export function noticeText(orgName, retentionYears) {
    const n = staffNotice(orgName, retentionYears);
    return [n.title, ...n.sections.flatMap(s => [s.h, ...s.p])].join('\n\n');
}

// HTML block for emails. Contains no appraisal content, only the notice.
export function noticeHtml(orgName, retentionYears) {
    const n = staffNotice(orgName, retentionYears);
    return `<div style="border-top:1px solid #cbd5e1;margin-top:20px;padding-top:14px"><h2 style="font-size:16px;color:#0B3C5D;margin:0 0 8px">${esc(n.title)}</h2>${n.sections.map(s => `<h3 style="font-size:14px;margin:12px 0 4px;color:#0f172a">${esc(s.h)}</h3>${s.p.map(t => `<p style="margin:0 0 6px;font-size:13px;line-height:1.5;color:#1e293b">${esc(t)}</p>`).join('')}`).join('')}</div>`;
}
