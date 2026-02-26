import { Hono } from "hono";
import { handle } from "hono/vercel";
import { roomsRouter } from "@/app/api/rooms/handler";
import { tokenRouter } from "@/app/api/token/handler";
import { credentialsRouter } from "@/app/api/credentials/handler";
import { egressRouter } from "@/app/api/egress/handler";
import { gcsRouter } from "@/app/api/egress/gcs/handler";

const app = new Hono().basePath("/api");

// Health check
app.get("/healthz", (c) => {
  return c.text("OK");
});

// Routes
app.route("/credentials", credentialsRouter);
app.route("/rooms", roomsRouter);
app.route("/token", tokenRouter);
app.route("/egress", egressRouter);
app.route("/egress/gcs", gcsRouter);

export const GET = handle(app);
export const POST = handle(app);
export const DELETE = handle(app);
export const OPTIONS = handle(app);
