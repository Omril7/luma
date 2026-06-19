export function IsraelFlag({ className }: { className?: string }) {
  return (
    <svg
      viewBox="0 0 900 600"
      xmlns="http://www.w3.org/2000/svg"
      className={className}
      aria-hidden="true"
    >
      <rect width="900" height="600" fill="#fff" />
      <rect y="80" width="900" height="80" fill="#0038b8" />
      <rect y="440" width="900" height="80" fill="#0038b8" />
      <polygon points="450,200 363,350 537,350" fill="none" stroke="#0038b8" strokeWidth="30" />
      <polygon points="450,400 363,250 537,250" fill="none" stroke="#0038b8" strokeWidth="30" />
    </svg>
  )
}

export function USAFlag({ className }: { className?: string }) {
  const sh = 600 / 13
  return (
    <svg
      viewBox="0 0 900 600"
      xmlns="http://www.w3.org/2000/svg"
      className={className}
      aria-hidden="true"
    >
      <rect width="900" height="600" fill="#B22234" />
      {[1, 3, 5, 7, 9, 11].map((i) => (
        <rect key={i} y={i * sh} width="900" height={sh} fill="#fff" />
      ))}
      <rect width="360" height={7 * sh} fill="#3C3B6E" />
    </svg>
  )
}
