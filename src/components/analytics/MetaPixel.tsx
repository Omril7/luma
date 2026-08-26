// Meta (Facebook) Pixel base install — mirrors GoogleTagManager.tsx's pattern: an inline
// <script> rendered from a server component so it can run before hydration, reading any prior
// consent choice from localStorage synchronously (same approach as THEME_INIT_SCRIPT in
// src/app/layout.tsx). Renders nothing if NEXT_PUBLIC_META_PIXEL_ID is unset (local/dev by default).
//
// Facebook's pixel has no built-in region-aware consent mode like gtag's `consent default`, so
// unlike GTM we can't defer the decision to Google's region matching — we gate on the visitor's
// own explicit choice only: skip loading entirely if they've explicitly declined
// ('luma-consent' status === 'denied'), matching the project's existing "granted by default
// outside an explicit decline" policy (see .claude/docs/15-analytics.md consent section).
const PIXEL_ID = process.env.NEXT_PUBLIC_META_PIXEL_ID

function buildInlineScript(pixelId: string): string {
  return `
try {
  var stored = JSON.parse(localStorage.getItem('luma-consent') || 'null');
  var status = stored && stored.state && stored.state.status;
  if (status === 'denied') { /* respect explicit decline */ } else {
    !function(f,b,e,v,n,t,s)
    {if(f.fbq)return;n=f.fbq=function(){n.callMethod?
    n.callMethod.apply(n,arguments):n.queue.push(arguments)};
    if(!f._fbq)f._fbq=n;n.push=n;n.loaded=!0;n.version='2.0';
    n.queue=[];t=b.createElement(e);t.async=!0;
    t.src=v;s=b.getElementsByTagName(e)[0];
    s.parentNode.insertBefore(t,s)}(window, document,'script',
    'https://connect.facebook.net/en_US/fbevents.js');
    fbq('init', '${pixelId}');
    fbq('track', 'PageView');
  }
} catch (e) {}
`.trim()
}

export function MetaPixel() {
  if (!PIXEL_ID || !/^\d+$/.test(PIXEL_ID)) return null

  return (
    <>
      <script dangerouslySetInnerHTML={{ __html: buildInlineScript(PIXEL_ID) }} />
      <noscript>
        <img
          height="1"
          width="1"
          style={{ display: 'none' }}
          src={`https://www.facebook.com/tr?id=${PIXEL_ID}&ev=PageView&noscript=1`}
          alt=""
        />
      </noscript>
    </>
  )
}
