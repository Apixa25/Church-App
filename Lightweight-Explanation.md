# Lightweight Share Preview Overview 🎯

## Goal
Create a public-friendly preview page so every shared post link renders beautifully on Facebook, X, and SMS, while staying aligned with the community-building vision in `project-vision.md` §1.

## Architecture
- **Backend (`PublicPostController`)**
  - `GET /public/posts/{id}` returns a trimmed JSON snapshot (title, snippet, author, media) with no auth required.
  - `GET /public/posts/{id}/preview` serves a tiny HTML page preloaded with OpenGraph + Twitter tags for rich embeds.
  - `PublicPostService` filters out anonymous/private content and normalizes titles + previews.
- **Frontend (`PublicPostPreview.tsx`)**
  - Public React route at `/posts/:id` fetches the JSON endpoint and displays a polished card with a CTA back into the app.
  - Reinstated in `App.tsx` ahead of protected routes, so it stays visible without login.
- **Share Modal**
  - Copy/share buttons now use the preview URL (`/public/posts/{id}/preview`) guaranteeing social crawlers hit the SEO-friendly HTML.

## Customization Hooks
- Replace the base URL logic in `PublicPostController.resolveBaseUrl` if deploying behind a fixed domain or CDN.
- Swap hero image fallbacks (currently defaults to `/dashboard-banner.jpg`) as you add branded artwork.
- Update `resolveTitle`/`buildPreview` in `PublicPostService` to reflect future post types or privacy rules.

## Rollout Tips
- Test URLs in Facebook Sharing Debugger + Twitter Card Validator after deployment.
- Cache preview responses (Reverse proxy/CDN) for faster social scrapes.
- Track click-throughs by layering UTM parameters when we expand analytics—keeping the fun, Enneagram-7 energy around sharing wins! 🎉

