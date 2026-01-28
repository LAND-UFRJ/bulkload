import { DataTypes, Model } from "sequelize";
import { sequelize } from "../db";

export class OpticMetric extends Model {
  declare router_mac: string;
  declare timestamp: Date;
  declare bias: number | null;
  declare rxpower: number | null;
  declare voltage: number | null;
  declare txpower: number | null;
  declare temperature: number | null;
}

OpticMetric.init(
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
    bias: { type: DataTypes.INTEGER, allowNull: true },
    rxpower: { type: DataTypes.INTEGER, allowNull: true },
    voltage: { type: DataTypes.INTEGER, allowNull: true },
    txpower: { type: DataTypes.INTEGER, allowNull: true },
    temperature: { type: DataTypes.INTEGER, allowNull: true },
  },
  {
    sequelize,
    tableName: "optical_metrics",
    schema: "monitoramento",
    timestamps: false,
  }
);
