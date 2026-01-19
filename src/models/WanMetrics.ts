import { DataTypes, Model } from "sequelize";
import { sequelize } from "../db";

export class WanMetric extends Model {
  declare router_mac: string;
  declare timestamp: Date;
  declare bytes_up: number | null;
  declare bytes_down: number | null;
  declare packets_up: number | null;
  declare packets_down: number | null;
  declare bytes_up_delta: number | null;
  declare bytes_down_delta: number | null;
  declare packets_up_delta: number | null;
  declare packets_down_delta: number | null;
  declare uptime: number | null;
}

WanMetric.init(
  {
    router_mac: {
      type: DataTypes.STRING,
      allowNull: false,
      primaryKey: true,
      references: { model: "routers", key: "mac_address" },
    },
    timestamp: {
      type: DataTypes.DATE, // TIMESTAMPTZ
      allowNull: false,
      primaryKey: true,
    },
    bytes_up: { type: DataTypes.BIGINT, allowNull: true },
    bytes_down: { type: DataTypes.BIGINT, allowNull: true },
    packets_up: { type: DataTypes.BIGINT, allowNull: true },
    packets_down: { type: DataTypes.BIGINT, allowNull: true },
    errors_up: { type: DataTypes.INTEGER, allowNull: true },
    errors_down: { type: DataTypes.INTEGER, allowNull: true },
    uptime: { type: DataTypes.INTEGER, allowNull: true },
  },
  {
    sequelize,
    tableName: "wan_metrics",
    schema: "monitoramento",
    timestamps: false,
  }
);
