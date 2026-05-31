import "dotenv/config";
import { Hono } from "hono";
import { cors } from "hono/cors";
import { compress } from "hono/compress";
import { serve } from "@hono/node-server";
import { serveStatic } from "@hono/node-server/serve-static";
import { authRouter } from "./routes/auth.js";
import { produitsRouter } from "./routes/produits.js";
import { variantesRouter } from "./routes/variantes.js";
import { categoriesRouter } from "./routes/categories.js";
import { clientsRouter } from "./routes/clients.js";
import { ventesRouter } from "./routes/ventes.js";
import { cloturesRouter } from "./routes/clotures.js";
import { configRouter } from "./routes/config.js";
import { usersRouter } from "./routes/users.js";
import { facturesRouter } from "./routes/factures.js";
import { statsRouter } from "./routes/stats.js";
import { auditRouter } from "./routes/audit.js";
import { tauxTvaRouter } from "./routes/taux-tva.js";
import { rgpdRouter } from "./routes/rgpd.js";
import { stockRouter } from "./routes/stock.js";
import { abonnementsRouter } from "./routes/abonnements.js";

const app = new Hono();

const WEB_ORIGIN = process.env.WEB_ORIGIN ?? "http://localhost:5173";

app.use("*", compress());

app.use(
  "*",
  cors({
    origin: WEB_ORIGIN,
    credentials: true,
    allowMethods: ["GET", "POST", "PUT", "PATCH", "DELETE", "OPTIONS"],
    allowHeaders: ["Content-Type", "Authorization"],
  }),
);

app.route("/api/auth", authRouter);
app.route("/api/produits", produitsRouter);
app.route("/api/variantes", variantesRouter);
app.route("/api/categories", categoriesRouter);
app.route("/api/clients", clientsRouter);
app.route("/api/ventes", ventesRouter);
app.route("/api/clotures", cloturesRouter);
app.route("/api/config", configRouter);
app.route("/api/users", usersRouter);
app.route("/api/factures", facturesRouter);
app.route("/api/stats", statsRouter);
app.route("/api/audit", auditRouter);
app.route("/api/taux-tva", tauxTvaRouter);
app.route("/api/rgpd", rgpdRouter);
app.route("/api/stock", stockRouter);
app.route("/api/abonnements", abonnementsRouter);

app.get("/health", (c) => c.json({ ok: true }));

app.use("/uploads/*", serveStatic({ root: "./" }));

const port = parseInt(process.env.PORT ?? "3001");

serve({ fetch: app.fetch, port }, () => {
  console.log(`API running on http://localhost:${port}`);
});

export default app;
