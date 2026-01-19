import { DataTypes, Model } from "sequelize";
import { sequelize } from "../db";

export class RouterMetric extends Model {
  declare router_mac: string;
  declare timestamp: Date;
  declare cpu_usage: number | null;
  declare memory: number | null;
  declare temperature: number | null;
  declare uptime: number | null;
}

RouterMetric.init(
  {
    router_mac: {
      type: DataTypes.STRING,
      allowNull: false,
      primaryKey: true,
      references: { model: "routers", key: "mac_address" },
    },
    timestamp: {
      type: DataTypes.DATE,
      allowNull: false,
      primaryKey: true,
    },
    cpu_usage: { type: DataTypes.INTEGER, allowNull: true },
    memory: { type: DataTypes.INTEGER, allowNull: true },
    temperature: { type: DataTypes.INTEGER, allowNull: true },
    uptime: { type: DataTypes.INTEGER, allowNull: true },
  },
  {
    sequelize,
    tableName: "router_metrics",
    schema: "monitoramento",
    timestamps: false,
  }
);
