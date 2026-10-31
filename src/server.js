
import { createApp } from "./http/app.js";
import { config } from "./config.js";

const server = createApp();

server.listen(config.port, () => {
  console.log(`Event Ticketing server running at http://localhost:${config.port}`);
});

function shutdown() {
  server.close((error) => {
    if (error) {
      console.error("Error closing server:", error.message);
      process.exitCode = 1;
    }
  });
}

process.on("SIGINT", shutdown);
process.on("SIGTERM", shutdown);
