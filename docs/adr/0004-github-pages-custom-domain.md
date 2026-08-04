# GitHub Pages with a custom domain for hosting

Track needs to be served from a stable URL so IndexedDB persistence is reliable across
sessions (User Story 42). We chose **GitHub Pages**, with a custom domain attached via
DNS (`CNAME`/`A` records to GitHub, TLS provisioned automatically), over Netlify or
Vercel. Pages needs no separate account or third-party connection — it deploys directly
from this repo — and a custom domain removes the only real downside (a `github.io`
subpath URL). Netlify/Vercel offer per-PR preview deploys Track doesn't need for a
single-user app with no collaborators.
