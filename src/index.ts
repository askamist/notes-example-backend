import { serve } from "@hono/node-server";
import { Hono, type Context } from "hono";
import router from "./routes/index.js";
import { HTTPException } from "hono/http-exception";
import { cors } from "hono/cors";
import { logger } from "hono/logger";

const app = new Hono();

// Add CORS middleware
app.use(
  "/*",
  cors({
    origin: "*", // Add your frontend URL
    allowMethods: ["GET", "POST", "PUT", "DELETE"],
    allowHeaders: ["Content-Type", "Authorization"],
    exposeHeaders: ["Content-Length", "X-Requested-With"],
    credentials: true,
    maxAge: 600,
  })
);

app.use(logger());

// Error handling middleware
app.onError((err, c) => {
  if (err instanceof HTTPException) {
    return c.json(
      {
        message: err.message,
        status: err.status,
      },
      err.status
    );
  }

  console.error(err);
  return c.json(
    {
      message: "Internal Server Error",
      status: 500,
    },
    500
  );
});

app.get("/", (c: Context) => {
  return c.json({ message: "Hello Hono!" });
});

app.get("/health", (c: Context) => {
  return c.json("OK");
});

app.route("/api", router);

const port = process.env.PORT ? parseInt(process.env.PORT) : 3000;
console.log(`Server is running on http://localhost:${port}`);

serve({
  fetch: app.fetch,
  port,
  hostname: "0.0.0.0",
});
