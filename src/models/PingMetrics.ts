import { DataTypes, Model } from "sequelize";
import { sequelize } from "../db";

export class PingMetric extends Model {
  declare router_mac: string;
  declare timestamp: Date;
  declare destination: string;
  declare rtt1_us: number | null;
  declare rtt2_us: number | null;
  declare rtt3_us: number | null;
  declare rtt4_us: number | null;
  declare rtt5_us: number | null;
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
    },
    rtt1_us: { type: DataTypes.INTEGER, allowNull: true },
    rtt2_us: { type: DataTypes.INTEGER, allowNull: true },
    rtt3_us: { type: DataTypes.INTEGER, allowNull: true },
    rtt4_us: { type: DataTypes.INTEGER, allowNull: true },
    rtt5_us: { type: DataTypes.INTEGER, allowNull: true },
    loss: { type: DataTypes.INTEGER, allowNull: true },
  },
  {
    sequelize,
    tableName: "ping_metrics",
    schema: "monitoramento",
    timestamps: false,
  }
);
