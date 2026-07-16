# Scene Map

A local-first K-drama and Korean film journal. Track watch status, episode progress, ratings, notes, cast credits, and source links, then browse shared cast history across titles and people.

[Releases](https://github.com/swilcox/kdrama-graph/releases) · [Container images](https://github.com/swilcox/kdrama-graph/pkgs/container/kdrama-graph)

Paste an AsianWiki title URL into **Import** to preview and import its metadata and cast. Imports are explicit, rate-friendly single-page requests; the app does not crawl AsianWiki in the background. Existing titles and people are reused when possible.

## Run locally

Requirements: Node.js 24+ and pnpm 11.13.1.

```bash
pnpm install
pnpm dev
```

Open [http://localhost:5173](http://localhost:5173). The API runs on `http://localhost:8787` and Vite proxies `/api` requests to it.

## Commands

```bash
pnpm dev       # Run the frontend and API with hot reload
pnpm build     # Type-check and create the production frontend
pnpm start     # Serve the built frontend and API on port 8787
pnpm test      # Run database tests
```

## Data

SQLite data is stored in `data/scene-map.db`. This file is ignored by Git. Set `DB_PATH` to use a different location and `PORT` to change the API/production server port.

The database starts with a small editable sample library to demonstrate cast connections on first run. Poster and profile image URLs are presentation placeholders; replace them with images you have permission to use. AsianWiki links are stored as source references only. Deleting `data/scene-map.db` resets the local database to the starter data on the next launch.

## Production

```bash
pnpm build
pnpm start
```

The Express server detects `dist/`, serves the compiled frontend, and falls back to `index.html` for client routes.

## Docker Compose

The Compose deployment runs the built frontend and API in one non-root container. SQLite data and backups are bind-mounted from the host and survive container replacement.

Download the latest stable deployment bundle on the server:

```bash
mkdir scene-map && cd scene-map
curl -LO https://github.com/swilcox/kdrama-graph/releases/latest/download/scene-map-compose.tar.gz
tar -xzf scene-map-compose.tar.gz
cp .env.example .env
mkdir -p data backups
docker compose up -d
docker compose ps
```

Open `http://<server-address>:8787`. Change `SCENE_MAP_PORT` in `.env` when that host port is already in use.

For a conventional server layout, create writable directories and use absolute paths in `.env`:

```bash
sudo install -d -o 1000 -g 1000 -m 0750 /srv/scene-map/data /srv/scene-map/backups
```

```dotenv
SCENE_MAP_DATA_DIR=/srv/scene-map/data
SCENE_MAP_BACKUP_DIR=/srv/scene-map/backups
```

Compose follows the newest stable image by default. For a controlled deployment, pin a release in `.env`:

```dotenv
SCENE_MAP_IMAGE=ghcr.io/swilcox/kdrama-graph:0.1.0
```

The container runs as UID/GID `1000`, uses a read-only root filesystem, drops Linux capabilities, and only writes to the two mounted directories and a temporary in-memory filesystem. It reports health through `GET /api/health` and checkpoints SQLite's WAL during a graceful shutdown.

### Back up

The backup helper uses SQLite's online backup API, so it is safe to run while the application is serving requests:

```bash
docker compose exec scene-map node scripts/backup.mjs
```

The command writes a timestamped, consistent database into `SCENE_MAP_BACKUP_DIR`. An explicit destination inside the mounted backup directory is also supported:

```bash
docker compose exec scene-map node scripts/backup.mjs /app/backups/before-upgrade.db
```

Copy the backup directory to another machine or backup target. A bind mount alone is persistence, not a backup.

### Restore

Stop the application before restoring, then run the restore helper in a one-off container:

```bash
docker compose stop scene-map
docker compose run --rm --no-deps scene-map node scripts/restore.mjs /app/backups/before-upgrade.db --force
docker compose up -d
```

Restore verifies the backup with SQLite `PRAGMA quick_check`. It moves the current database and any WAL files into a timestamped `pre-restore_*` directory before replacing them.

### Upgrade

Create a backup, pull the configured image, and replace the container:

```bash
docker compose exec scene-map node scripts/backup.mjs /app/backups/before-upgrade.db
docker compose pull
docker compose up -d
docker compose ps
```

When `SCENE_MAP_IMAGE` is pinned, update it to the desired version before pulling. Roll back by restoring the previous image tag and running the same two Compose commands. The SQLite schema migrates automatically on startup; restore a pre-upgrade backup before running an older image if that release cannot read the migrated schema. Review logs with `docker compose logs -f scene-map`.

### Build locally

The default Compose file always pulls the published image. To build the current source tree instead:

```bash
docker compose -f compose.yaml -f compose.build.yaml up -d --build
```

### Releases

Stable releases are tracked in GitHub and published for `linux/amd64` and `linux/arm64`. Release tags include the full version (`0.1.0`), minor channel (`0.1`), immutable commit SHA, and `latest`. Major channels begin with version 1; there is intentionally no moving `0` tag.

Release Please maintains `CHANGELOG.md`, `package.json`, tags, and GitHub Releases from Conventional Commits. `feat:` creates a minor release, `fix:` creates a patch release, and `feat!:` or a `BREAKING CHANGE:` footer creates a breaking release.

### Network exposure

Scene Map does not currently include authentication. Keep port `8787` limited to your trusted LAN or place it behind an authenticated reverse proxy; do not publish it directly to the internet.

## License

Scene Map is available under the [MIT License](LICENSE).
