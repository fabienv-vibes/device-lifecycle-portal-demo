# Device lifecycle portal (Databricks App)

AppKit (React + Node) app deployed on Databricks Apps. See the [repo README](../README.md) for the full demo, setup and story.

```bash
npm install
npm run dev                                  # local dev on http://localhost:8000 (uses .env written by setup)
databricks apps deploy --profile <PROFILE>   # validate, deploy, start
```

- `client/src/tenants.ts`: the four "Viewing as" personas (branding, Genie alias, dashboard, wording).
- `client/src/config.generated.ts`: workspace host/ID, schemas and dashboard IDs (written by `setup/setup.py`).
- `config/queries/*.sql`: AppKit analytics queries (run on the SQL warehouse as the app service principal).
- `server/server.ts`: Genie plugin with one space per persona (runs on behalf of the signed-in user).
