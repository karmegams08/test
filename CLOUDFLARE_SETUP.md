# Cloudflare D1 setup

The feedback API and sentiment summary use a Cloudflare D1 database bound to
the Worker as `DB`.

1. From the repository folder, create the database:

   ```powershell
   npx wrangler d1 create signal-vs-reality
   ```

2. Copy the returned `database_id` into `wrangler.jsonc`, replacing
   `REPLACE_WITH_CLOUDFLARE_D1_DATABASE_ID`.

3. Apply the schema to the remote database:

   ```powershell
   npx wrangler d1 migrations apply signal-vs-reality --remote
   ```

4. Commit the updated `wrangler.jsonc` and push. Cloudflare Workers Builds can
   then deploy the Worker and static assets from the repository. The `DB`
   binding and `ASSETS` binding are declared in `wrangler.jsonc`.

The sentiment summary counts every submitted reaction: `comedy` is positive,
`other` is neutral, and `turtle`, `buffering`, and `frustrated` are negative.
