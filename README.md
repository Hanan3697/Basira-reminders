# بصيرة — Basira

Repository for preparing the Basira application migration to Cloudflare.

## Status

Not ready for deployment. Application files and Cloudflare configuration still need to be prepared and tested.

Before publishing:
- Preserve the Quran reader, reflections, prayers, design, and reading settings.
- Migrate cumulative analytics without resetting totals.
- Replace hosting-specific administrator authentication with verified authentication on Cloudflare.
- Verify statistics remain private.
- Test the new address before replacing shared links.

Browser reading progress is origin-bound and needs an explicit transfer path. Background push notifications require separate setup.
