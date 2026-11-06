import { createApp, analytics, genie, server } from '@databricks/appkit';

// One Genie space per tenant: platform operations (all customers) plus two
// white-labeled customer portals, each scoped to that customer's governed views.
await createApp({
  plugins: [
    analytics(),
    genie({
      spaces: {
        ops: process.env.GENIE_SPACE_OPS ?? '',
        northwind: process.env.GENIE_SPACE_NORTHWIND ?? '',
        bastion: process.env.GENIE_SPACE_BASTION ?? '',
      },
    }),
    server(),
  ],
  onPluginsReady(appkit) {
    appkit.server.extend((app) => {
      app.get('/api/whoami', (req, res) => {
        res.json({
          email: req.header('x-forwarded-email') ?? null,
          user: req.header('x-forwarded-user') ?? null,
        });
      });
    });
  },
});
