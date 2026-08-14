# Nova AI — Commercial Landing Page Template

A production-ready, single-file marketing site for an AI startup, built to be **launch-ready**.

## ✨ What's included
- **Bilingual** — English (LTR) + Arabic (RTL) with a one-click language toggle (preference saved in `localStorage`).
- **Full commercial sections** — Hero, trust logos, features, how-it-works, live-stats band, **transparent pricing (3 tiers)**, testimonials, FAQ accordion, email capture, and a footer with **legal links** (Privacy, Terms, Security, Status).
- **SEO ready** — `<title>`, meta description, canonical, **Open Graph + Twitter cards**, JSON-LD structured data, and an inline SVG favicon.
- **Responsive** — mobile-first layout with a hamburger menu.
- **Accessible** — semantic landmarks, ARIA states, visible focus rings, and reduced-motion support.
- **Zero build step** — everything is in `index.html` (only Google Fonts loaded externally).

## 🚀 Deploy
Open `index.html` locally, or host it on any static host:
- **Netlify / Vercel / Cloudflare Pages** — drag-and-drop or connect this repo.
- **GitHub Pages** — enable Pages on this branch, root folder.

## 🔧 Before going live (checklist)
- [ ] Replace brand name, copy, and the `og:image` at `og-image.png`.
- [ ] Point `#`/`#pricing` CTAs to your real signup / checkout flow.
- [ ] Wire the newsletter form to your provider (Mailchimp, ConvertKit, HubSpot, etc.).
- [ ] Add a real **Privacy Policy**, **Terms of Service**, and **AI data-usage** page.
- [ ] Add analytics (Plausible / GA4) and a cookie/consent notice if targeting the EU.
- [ ] Buy a custom domain and enable HTTPS.
- [ ] Run Lighthouse and confirm performance/SEO/accessibility scores.

## 🎨 Customize
- **Colors / fonts** — edit the CSS variables in the `:root` block at the top of `index.html`.
- **Copy** — English lives in the HTML; the Arabic translations live in the `I18N.ar` object in the `<script>` at the bottom.
