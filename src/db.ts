import { Sequelize } from "sequelize";
import * as dotenv from "dotenv";

dotenv.config();

function requiredEnv(name: string): string {
  const value = process.env[name];
  if (!value || value.trim() === "") {
    throw new Error(`Environment variable not set: ${name}`);
  }
  return value;
}

const PGHOST       = requiredEnv("PGHOST");
const PGPORT       = Number(requiredEnv("PGPORT"));
const PGUSER       = requiredEnv("PGUSER");
const PGPASSWORD   = requiredEnv("PGPASSWORD");
const PGDATABASE   = requiredEnv("PGDATABASE");
const PGPOOL_MAX   = Number(requiredEnv("PGPOOL_MAX"));
const PGPOOL_IDLE  = Number(requiredEnv("PGPOOL_IDLE_MS"));
const PGPOOL_ACQ   = Number(requiredEnv("PGPOOL_CONN_MS"));

export const sequelize = new Sequelize({
  dialect: "postgres",
  host: PGHOST,
  port: PGPORT,
  username: PGUSER,
  password: PGPASSWORD,
  database: PGDATABASE,
  logging: false,
  pool: {
    max: PGPOOL_MAX,
    min: 0,
    idle: PGPOOL_IDLE,
    acquire: PGPOOL_ACQ,
  },
});

export async function shutdownDB() {
  await sequelize.close();
}
