import { DataTypes, Model } from "sequelize";
import { sequelize } from "../db";

export class PingMetric extends Model {
  declare router_mac: string;
  declare timestamp: Date;
  declare destination: string;
  declare rtt1_ms: number | null;
  declare rtt2_ms: number | null;
  declare rtt3_ms: number | null;
  declare rtt4_ms: number | null;
  declare rtt5_ms: number | null;
  declare loss: number | null;
}

PingMetric.init(
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
    destination: {
      type: DataTypes.STRING,
      allowNull: false,
      primaryKey: true,
    },
    rtt1_ms: { type: DataTypes.DOUBLE, allowNull: true },
    rtt2_ms: { type: DataTypes.DOUBLE, allowNull: true },
    rtt3_ms: { type: DataTypes.DOUBLE, allowNull: true },
    rtt4_ms: { type: DataTypes.DOUBLE, allowNull: true },
    rtt5_ms: { type: DataTypes.DOUBLE, allowNull: true },
    loss: { type: DataTypes.DOUBLE, allowNull: true },
  },
  {
    sequelize,
    tableName: "ping_metrics",
    schema: "monitoramento",
    timestamps: false,
  }
);
