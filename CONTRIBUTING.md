# Contributing

## Development

Use Node.js 24 or newer and pnpm 11.13.1.

```bash
pnpm install --frozen-lockfile
pnpm test
pnpm build
```

The production container can be built locally with:

```bash
docker compose -f compose.yaml -f compose.build.yaml build
```

## Commit messages

Releases are generated from Conventional Commits:

- `feat: add a library feature` produces a minor release.
- `fix: correct import ordering` produces a patch release.
- `docs: explain deployment` is included in release history without forcing a version bump.
- `feat!: change the database contract` or a `BREAKING CHANGE:` footer produces a breaking release.

Keep each commit focused and include tests for behavioral changes. Release Please collects eligible commits into a release pull request; merging that pull request publishes the GitHub Release and container image.
