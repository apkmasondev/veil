# VEIL

VEIL is a single-frame, scroll-driven cinematic journey assembled from four continuous generated shots. The interaction treats the footage as one passage: the page scroll controls a smoothed global timeline, while typography, the portal trace, and the final hold remain subordinate to the image.

Built with React, TypeScript, Vite, CSS, and a small requestAnimationFrame engine. React owns structure and lifecycle; per-frame progress stays in refs and CSS custom properties, so scrolling does not re-render the component tree. Video is supplied as separate all-intra H.264 desktop and mobile encodes for responsive, frame-accurate seeking. The video elements are hidden decoders; one persistent canvas presents only completed frames and retains the last valid frame while a seek is pending, preventing browser poster flashes.

## Development

Requires Node.js 24.

```bash
npm ci
npm run dev
```

Validation:

```bash
npm run lint
npm run typecheck
npm test
npm run build
```

## Deployment

`.github/workflows/deploy.yml` audits dependencies, validates the project, and publishes `dist/` to GitHub Pages with Node 24. Vite uses a relative base so the same build works at a repository subpath or a custom-domain root without hard-coded asset URLs. The workflow injects the Pages URL during the build so canonical and social metadata stay absolute.

Set the repository variable `PORTFOLIO_URL` when the experience should return to a specific portfolio page. Without it, the deployed build uses the Pages origin. For local overrides, use an untracked `.env.local` file with `VITE_PORTFOLIO_URL`; an unconfigured `RETURN` control is omitted instead of guessing browser history.
