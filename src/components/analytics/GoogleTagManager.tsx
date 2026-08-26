// Loads the GTM container. GA4 is configured as a tag *inside* that container
// (see .claude/docs/15-analytics.md) — this component never talks to gtag.js directly.
// Meta Pixel is installed separately, in MetaPixel.tsx (not routed through GTM).
// Renders nothing if NEXT_PUBLIC_GTM_ID is unset (local/dev by default).

const GTM_ID = process.env.NEXT_PUBLIC_GTM_ID

// Consent Mode v2 default is region-scoped: denied-by-default only where there's an actual
// legal basis for it (EEA/UK/CH), granted-by-default everywhere else — including Israel, where
// almost all real traffic is. A single global default: 'denied' (the previous approach) trips
// GTM's "0% consent rate outside the EEA" diagnostic and needlessly blocks ads
// measurement/personalization for the vast majority of visitors. Reads any prior explicit
// choice from localStorage synchronously (same pattern as THEME_INIT_SCRIPT in
// src/app/layout.tsx) so returning users' choice always wins over the regional default.
function buildInlineScript(gtmId: string): string {
  return `
try {
  window.dataLayer = window.dataLayer || [];
  function gtag(){ window.dataLayer.push(arguments); }
  var storedStatus;
  try {
    var stored = JSON.parse(localStorage.getItem('luma-consent') || 'null');
    storedStatus = stored && stored.state && stored.state.status;
  } catch (e) {}
  var eeaStatus = storedStatus === 'granted' ? 'granted' : 'denied';
  var restStatus = storedStatus === 'denied' ? 'denied' : 'granted';
  gtag('consent', 'default', {
    analytics_storage: eeaStatus,
    ad_storage: eeaStatus,
    ad_user_data: eeaStatus,
    ad_personalization: eeaStatus,
    wait_for_update: 500,
    region: ['AT','BE','BG','HR','CY','CZ','DK','EE','FI','FR','DE','GR','HU','IE','IT','LV','LT','LU','MT','NL','PL','PT','RO','SK','SI','ES','SE','IS','LI','NO','GB','CH']
  });
  gtag('consent', 'default', {
    analytics_storage: restStatus,
    ad_storage: restStatus,
    ad_user_data: restStatus,
    ad_personalization: restStatus
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
