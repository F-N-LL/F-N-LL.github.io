# zumodeia.com

Personal site of Daniel Fenoll. Modern fresco × Famicom. Built with Astro, deployed by `.github/workflows/deploy.yml`:

| Branch | Environment | URL |
| --- | --- | --- |
| `dev` | Dev (GitHub Pages, noindex) | https://f-n-ll.github.io |
| `main` | Release (AWS S3 + CloudFront) | https://zumodeia.com |

Work on `dev`, check it on f-n-ll.github.io, then merge `dev` → `main` to release.

- Content: `src/data/site.ts`
- Pixel art: `src/data/sprites.ts`
- Palette and type: `src/styles/global.css`

```sh
npm install
npm run dev
```

## At a glance

```mermaid
flowchart TD
  DATA["src/data<br/>content and pixel art"] --> AS["Astro build"]
  ST["src/styles<br/>palette and type"] --> AS
  AS --> GA["GitHub Actions · deploy.yml"]
  GA -->|"push to dev"| DEV["GitHub Pages<br/>f-n-ll.github.io · test"]
  GA -->|"merge dev → main"| PROD["S3 + CloudFront<br/>zumodeia.com"]
```
