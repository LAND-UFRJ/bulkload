import express from 'express';
import { RegisterRoutes } from '../build/routes'; // O tsoa gerará este arquivo
import { shutdownDB } from "./db";

const app = express();
app.use(express.json({ limit: '50mb' }));
app.use(express.urlencoded({ extended: true, limit: '50mb' }));

RegisterRoutes(app);

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
