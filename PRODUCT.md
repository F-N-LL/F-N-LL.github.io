# Product

<!-- impeccable:product-schema 1 -->

## Platform

web

## Users

Three audiences, weighted equally: recruiters filtering quickly (role, years, technologies, CV), hiring managers and engineers judging evidence and technical judgement, and curious peers arriving from X or GitHub.

## Product Purpose

zumodeia.com is the personal site of Daniel Fenoll, a senior software engineer and designer in Alicante, Spain. Success is that a visitor remembers who he is after leaving. Contacting him or opening the CV follows from that; neither replaces it.

## Positioning

An engineer who also designs and makes things by hand: production platforms at TUI, personal tools that are finished and strange (an e-ink reader, a dumb-phone conversion, a servo that follows a hand), a vegetable garden, and a site that is itself one crafted object.

## Operating Context

Visitors arrive from a job application, a CV link, X, GitHub or LinkedIn. On a large screen with WebGL the site is three small worlds the juice box guides you through: home (the huerta, the workbench, the computer), the planet inside the computer's screen (projects, experience, education) and a station in orbit reached by rocket (posts, links, gallery). Elsewhere the desktop falls back to the mosaic floor; the phone has its own card flow.

## Capabilities and Constraints

- Astro static site. Content lives in `src/data/cabinet.ts` and `src/data/site.ts`; plates are rendered by `scripts/dither.mjs`.
- `dev` deploys to f-n-ll.github.io; `main` deploys to zumodeia.com and is merged only on request.
- The desktop stays one explorable object (drag, zoom, keyboard). Confirmed by the owner: keep the mosaic, reordered with hierarchy, and do not depend on hover to say what a thing is.
- An index view remains as the accessible, sortable alternative.

## Brand Commitments

- Mediterranean palette (Jávea, Alicante, with an Animal Crossing warmth): slate, pine, terracotta, lemon, whitewash, sea. Colour lives in the plates and the worlds; the interface stays monochrome and recedes.
- Dithered plates, tombstone captions, gallery wording (Index, Information). The theme belongs in the artwork, never in interface ornament.
- Motto: "The pursuit of excellence does not need justification."
- Mark: the pixel juice box ("Zumo de IA").

## Evidence on Hand

- TUI Archive: 50,000+ users, 300M+ documents, searches under 200 ms, thousands of events a day handled by Lambda services in Rust; agentic infrastructure used by the whole development team.
- Instructor to dozens of students at IMMUNE.
- Projects: Ligero and Campanile (private source), new_dumb_iPhone, trackpad-curve, haskarm, dino_ML, HTTPServer_C (public on GitHub).
- The huerta: 4 tomatoes, 2 aubergines, 2 courgettes, 2 peppers, 6 leeks, 1 lemon tree; per-plant progress is to come. The gallery's two drawings are placeholders until real ones arrive.
- One-page CV at `public/Daniel-Fenoll-CV.pdf`. No testimonials or product screenshots of TUI exist; do not fabricate them.

## Product Principles

- One object, not a document: the page is explored, and it is remembered for that.
- Say what things are: a visitor who never hovers still learns who he is and what he built.
- Evidence over adjectives: real figures and real projects carry the claim.
- The work and the garden belong to the same person; neither is hidden behind the other.
