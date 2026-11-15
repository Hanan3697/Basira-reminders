# بصيرة — Basira

Cloudflare migration staging source. **Not yet the replacement public application.**

The Quran text, font, reader, reflections, prayers, backgrounds and reading settings are preserved from the original application. Unused historical calendar/image exports are excluded; all referenced assets are included.

## Setup before public cutover

1. Connect this repository to a Cloudflare Worker named `basira`. Build: `npm run build`; deploy: `npx wrangler deploy`. Turn preview builds off until a separate test database is configured.
2. Create a D1 database. Add binding `DB` with its real database ID to `wrangler.jsonc` and `migrations_dir: "drizzle"`. Apply the two SQL migrations to the NEW database only.
3. Set up Cloudflare Access for both `/statistics` and `/api/analytics/stats`, allowing only the owner's verified email. Use the same Access application/audience for both paths. Set Worker variables `ACCESS_TEAM_DOMAIN`, `ACCESS_AUD`, `ADMIN_EMAIL`. The Worker cryptographically verifies Access assertions and rejects unsigned or forged identities; missing settings fail closed.
4. Transfer the old analytics data privately at cutover. Never commit database exports, visitor identifiers or credentials to this public repository. Old statistics remain on the original Site until migration is verified. Do not start public analytics with a fresh database and claim historic totals have transferred.
5. Provide an explicit browser reading-progress transfer before redirecting users. Browser storage does not automatically transfer between domains. Keep the old application live meanwhile.
6. Test reading, saved position, the standalone basmala, navigation, reflections, manifest and private statistics on the new domain. Verify historic totals against the old dashboard, then share the new URL.

No Cloudflare deployment or data transfer has been performed by adding this source. Background push still requires a separate notification service; this migration does not activate it.

## Local checks

Node 22+: `npm test` and `npm run build`. Use Wrangler dry-run before deployment. No paid services or billing changes are configured by these files.
