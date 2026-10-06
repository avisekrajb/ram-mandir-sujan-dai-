const PLACEHOLDER_SVG = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 400 300" width="400" height="300">
  <defs>
    <linearGradient id="g" x1="0" y1="0" x2="0" y2="1">
      <stop offset="0%" stop-color="#FFF7ED"/>
      <stop offset="100%" stop-color="#FDE7CF"/>
    </linearGradient>
  </defs>
  <rect width="400" height="300" fill="url(#g)"/>
  <g fill="none" stroke="#A80808" stroke-width="3" stroke-linecap="round" stroke-linejoin="round" opacity="0.55">
    <path d="M120 190h160M140 190v-45h120v45M160 145v-30h80v30M150 115l50-35 50 35"/>
    <path d="M175 190v-25h18v25M207 190v-25h18v25"/>
  </g>
  <text x="200" y="232" font-family="Georgia,serif" font-size="26" fill="#A80808" text-anchor="middle" opacity="0.75">Shree Ramchandra</text>
  <text x="200" y="256" font-family="Georgia,serif" font-size="18" fill="#A80808" text-anchor="middle" opacity="0.6">Temple</text>
</svg>`;

export const PLACEHOLDER_IMAGE = `data:image/svg+xml;charset=utf-8,${encodeURIComponent(PLACEHOLDER_SVG)}`;

export const handleImageError = (event, fallbackSrc) => {
  const img = event?.target;
  if (!img) return;

  const current = img.currentSrc || img.src || '';

  // Never retry the same URL: the original failure already proved it is broken.
  if (current === fallbackSrc || current === PLACEHOLDER_IMAGE) return;

  img.dataset.fallbackApplied = 'true';
  img.src = fallbackSrc || PLACEHOLDER_IMAGE;
};

export const withImageFallback = (src, fallbackSrc) => {
  const initial = src || fallbackSrc || PLACEHOLDER_IMAGE;
  return {
    src: initial,
    onError: (event) => {
      const img = event.target;
      if (img.dataset.fallbackApplied) {
        img.src = PLACEHOLDER_IMAGE;
        return;
      }
      img.dataset.fallbackApplied = 'true';
      if (initial !== PLACEHOLDER_IMAGE) {
        img.src = fallbackSrc || PLACEHOLDER_IMAGE;
      }
    },
  };
};
