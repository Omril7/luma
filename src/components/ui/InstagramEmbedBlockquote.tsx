'use client'

import { useEffect } from 'react'
import Script from 'next/script'

declare global {
  interface Window {
    instgrm?: { Embeds: { process: () => void } }
  }
}

interface InstagramEmbedBlockquoteProps {
  permalink: string
  maxWidth?: number
}

// Renders Instagram's real embed widget for a post permalink — native photo/video playback via
// Instagram's own embed.js, loaded once (Next.js dedupes <Script> by src across mounts).
export function InstagramEmbedBlockquote({
  permalink,
  maxWidth = 400,
}: InstagramEmbedBlockquoteProps) {
  // Re-process when the permalink changes after the script is already loaded — the script's own
  // onLoad only covers the very first blockquote it sees.
  useEffect(() => {
    window.instgrm?.Embeds.process()
  }, [permalink])

  return (
    <>
      <Script
        src="https://www.instagram.com/embed.js"
        strategy="lazyOnload"
        onLoad={() => window.instgrm?.Embeds.process()}
      />
      <blockquote
        className="instagram-media"
        data-instgrm-permalink={permalink}
        data-instgrm-version="14"
        style={{ margin: '0 auto', maxWidth, minWidth: 326, width: '100%' }}
      />
    </>
  )
}
