## Usage

```bash
$ npm install # or pnpm install or yarn install
```

### Learn more on the [Solid Website](https://solidjs.com) and come chat with us on our [Discord](https://discord.com/invite/solidjs)

## Available Scripts

In the project directory, you can run:

### `npm run dev`

Runs the app in the development mode.<br>
Open [http://localhost:5173](http://localhost:5173) to view it in the browser.

### `npm run build`

Builds the app for production to the `dist` folder.<br>
It correctly bundles Solid in production mode and optimizes the build for the best performance.

The build is minified and the filenames include the hashes.<br>
Your app is ready to be deployed!

## Deployment

Track is deployed to [GitHub Pages](https://seano288.github.io/track/) via the
`.github/workflows/deploy.yml` workflow, which builds and publishes `main` on every
push. See [ADR 0004](docs/adr/0004-github-pages-custom-domain.md) for why Pages was
chosen over Netlify/Vercel.

- [ ] Attach a custom domain (`CNAME` file + DNS records) once one is chosen — a
      human decision, tracked separately from the initial Pages deploy.
