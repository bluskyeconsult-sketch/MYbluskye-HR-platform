// supabase/functions/send-article-notification/index.ts
//
// NEW (2026-09-13): this function was confirmed to genuinely not exist
// at all in the Supabase project (0 of 37 functions matched), despite
// a Database Webhook apparently being configured to call it. Rather
// than just deleting that webhook, this builds the real, missing
// piece so the existing infrastructure actually works.
//
// Confirmed via direct code review that the webhook is almost
// certainly configured broadly on the articles table's UPDATE event -
// which fires on every single page view (ArticleDetail.jsx increments
// view_count on each visit) as well as on a genuine publish
// (ArticleEditor.jsx's saveArticle()). A webhook payload includes both
// the old and new row, so this function checks specifically for
// is_published flipping from false to true - a real publish event -
// and does nothing at all otherwise, including for view_count-only
// updates. This means the SAME webhook trigger can stay exactly as
// configured; no dashboard reconfiguration is required beyond this
// function existing.
//
// Deliberately does not duplicate the notification-sending logic -
// that already exists, tested and working, as the
// notify-article-subscribers action on the main Vercel backend. This
// function's only job is to recognize a genuine publish event from
// the webhook payload and call that existing endpoint.

const corsHeaders = {
  'Access-Control-Allow-Origin': 'https://www.bluskyeconsult.com',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
};

Deno.serve(async (req) => {
  // Confirmed root cause of the original CORS error: without an
  // explicit OPTIONS handler, the browser's preflight request gets no
  // valid response at all, which surfaces to the page as a CORS
  // failure rather than the real underlying issue.
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  try {
    const payload = await req.json();

    // Supabase Database Webhook payload shape: { type, table, record,
    // old_record }. Only a genuine publish - is_published flipping
    // from false to true - should ever trigger a notification. Every
    // other update (view_count increments, edits to a draft, edits to
    // an already-published article) is deliberately ignored here.
    const oldRecord = payload.old_record;
    const newRecord = payload.record;

    const isGenuinePublishEvent =
      oldRecord && newRecord &&
      oldRecord.is_published === false &&
      newRecord.is_published === true;

    if (!isGenuinePublishEvent) {
      return new Response(
        JSON.stringify({ success: true, skipped: true, reason: 'Not a genuine publish event' }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Calls the existing, already-working backend action rather than
    // duplicating its logic here - one real implementation, not two.
    // Authenticates as a genuine internal service call via a shared
    // secret (set as INTERNAL_SERVICE_SECRET in both this function's
    // and Vercel's environment variables) - a service role key is not
    // a user JWT and would be rejected by the backend's normal
    // admin-user check, which is why this exists as a separate path.
    const backendResponse = await fetch('https://www.bluskyeconsult.com/api/index?action=notify-article-subscribers', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-internal-secret': Deno.env.get('INTERNAL_SERVICE_SECRET') ?? '',
      },
      body: JSON.stringify({
        articleId: newRecord.id,
        articleTitle: newRecord.title,
        articleSlug: newRecord.slug,
      }),
    });

    const result = await backendResponse.json();

    return new Response(
      JSON.stringify({ success: true, notifiedCount: result.notifiedCount ?? 0 }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  } catch (error) {
    console.error('send-article-notification error:', error);
    return new Response(
      JSON.stringify({ success: false, error: error.message }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
