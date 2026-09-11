# An Atlas of Engineering

Daniel Fenoll-Castro’s personal website. A parchment atlas with five procedural Three.js instruments: armillary sphere, compass, sextant, globe, and compass seal. Software and AI exploration provide the navigation metaphor.

## Preview

Run `python3 -m http.server 4173 --bind 127.0.0.1` from this directory, then open http://127.0.0.1:4173. ES modules require an HTTP server; opening the HTML as a file is insufficient.

GitHub Pages serves `main` at https://f-n-ll.github.io/. There is no build step. Three.js 0.165.0 is vendored with its MIT license; Google Fonts are optional and have serif fallbacks.

## Edit

- `index.html`: biography, CV placeholders, expandable sample essay, contact form.
- `style.css`: parchment palette, type, responsive atlas layout.
- `script.js`: procedural geometry, canvas-generated dial/map textures, lighting, animation, and shared viewport renderer.
- `atlas.svg`: original illustrative map, not a historical geographic chart.

The CV intentionally leaves companies and dates unspecified. Replace these with verified details. The article is marked as a sample essay.

## Contact form

The form posts to FormSubmit for `dfenollapps@gmail.com`. The mailbox owner must activate the form using FormSubmit’s confirmation email on first use. Email delivery has not been verified. See https://formsubmit.co/ for activation instructions. Local checks validate required fields and email syntax without sending a message. A direct email link is also provided.

## Accessibility and rendering

Native section navigation and expandable article work without JavaScript. Instruments are decorative and have descriptive labels. Reduced-motion preferences pause animation, a visible button toggles it, and rendering stops in background tabs. One WebGL renderer draws only plates intersecting the viewport. If WebGL or its module is unavailable, compass ornaments remain and all content and the form stay accessible.
