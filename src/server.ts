import express, { Request, Response, NextFunction } from "express";
import { RegisterRoutes } from "../build/routes"; // O tsoa gerará este arquivo
import { shutdownDB } from "./db";

const app = express();
app.use(express.json({ limit: "50mb" }));
app.use(express.urlencoded({ extended: true, limit: "50mb" }));

RegisterRoutes(app);

// Global error handler — silently handle client-aborted requests
app.use((err: any, req: Request, res: Response, next: NextFunction) => {
  if (err.type === "request.aborted") {
    console.warn(`[Aviso] Cliente abortou a requisição em ${req.url} antes do envio terminar.`);
    return res.status(400).send("Request aborted by client");
  }
  next(err);
});

const port = process.env.PORT || 3000;

app.listen(port, () => {
  console.log(`Running on port ${port}`);
});

process.on("SIGINT", async () => {
  await shutdownDB();
  process.exit(0);
});
process.on("SIGTERM", async () => {
  await shutdownDB();
  process.exit(0);
});
