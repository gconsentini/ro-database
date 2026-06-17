import { config } from "./config.js";
import { closePool } from "./db.js";
import { buildServer } from "./server.js";

const app = buildServer();

app
  .listen({ port: config.port, host: config.host })
  .then((addr) => app.log.info(`ro-database API em ${addr}`))
  .catch((err) => {
    app.log.error(err);
    process.exit(1);
  });

for (const sig of ["SIGINT", "SIGTERM"] as const) {
  process.on(sig, async () => {
    await app.close();
    await closePool();
    process.exit(0);
  });
}
