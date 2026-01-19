import { DataTypes, Model } from "sequelize";
import { sequelize } from "../db";

export class DeviceMetric extends Model {
  declare device_mac: string;
  declare timestamp: Date;
  declare router_mac: string;
  declare bytes_up: number | null;
  declare bytes_down: number | null;
  declare packets_up: number | null;
  declare packets_down: number | null;
  declare signal: number | null;
}

DeviceMetric.init(
  {
    device_mac: {
      type: DataTypes.STRING,
      allowNull: false,
      primaryKey: true,
      references: { model: "devices", key: "device_mac" },
    },
    timestamp: {
      type: DataTypes.DATE, // TIMESTAMPTZ
      allowNull: false,
      primaryKey: true,
    },
    router_mac: { type: DataTypes.STRING, allowNull: true },
    bytes_up: { type: DataTypes.BIGINT, allowNull: true },
    bytes_down: { type: DataTypes.BIGINT, allowNull: true },
    packets_up: { type: DataTypes.BIGINT, allowNull: true },
    packets_down: { type: DataTypes.BIGINT, allowNull: true },
    signal: { type: DataTypes.INTEGER, allowNull: true },
  },
  {
    sequelize,
    tableName: "device_metrics",
    schema: "monitoramento",
    timestamps: false,
  }
);
