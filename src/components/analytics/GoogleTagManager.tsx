// Loads the GTM container. GA4 + Meta Pixel are configured as tags *inside* that container
// (see .claude/docs/15-analytics.md) — this component never talks to gtag.js/fbq directly.
// Renders nothing if NEXT_PUBLIC_GTM_ID is unset (local/dev by default).

const GTM_ID = process.env.NEXT_PUBLIC_GTM_ID

// Consent Mode v2 default is denied until the user chooses in <ConsentBanner>. Reads any prior
// choice from localStorage synchronously (same pattern as the THEME_INIT_SCRIPT in
// src/app/layout.tsx) so returning users with a stored choice don't get re-blocked on reload.
function buildInlineScript(gtmId: string): string {
  return `
try {
  window.dataLayer = window.dataLayer || [];
  function gtag(){ window.dataLayer.push(arguments); }
  var status = 'denied';
  try {
    var stored = JSON.parse(localStorage.getItem('luma-consent') || 'null');
    if (stored && stored.state && stored.state.status === 'granted') status = 'granted';
  } catch (e) {}
  gtag('consent', 'default', {
    analytics_storage: status,
    ad_storage: status,
    ad_user_data: status,
    ad_personalization: status,
    wait_for_update: 500
  });
} catch (e) {}
(function(w,d,s,l,i){w[l]=w[l]||[];w[l].push({'gtm.start':new Date().getTime(),event:'gtm.js'});
var f=d.getElementsByTagName(s)[0],j=d.createElement(s),dl=l!='dataLayer'?'&l='+l:'';
j.async=true;j.src='https://www.googletagmanager.com/gtm.js?id='+i+dl;f.parentNode.insertBefore(j,f);
})(window,document,'script','dataLayer','${gtmId}');
`.trim()
}

export function GoogleTagManager() {
  if (!GTM_ID || !/^GTM-[A-Z0-9]+$/.test(GTM_ID)) return null

  return (
    <>
      <script dangerouslySetInnerHTML={{ __html: buildInlineScript(GTM_ID) }} />
      <noscript>
        <iframe
          src={`https://www.googletagmanager.com/ns.html?id=${GTM_ID}`}
          height="0"
          width="0"
          style={{ display: 'none', visibility: 'hidden' }}
          title="gtm"
        />
      </noscript>
    </>
  )
}
