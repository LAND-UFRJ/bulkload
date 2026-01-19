import { DataTypes, Model } from "sequelize";
import { sequelize } from "../db";

export class Device extends Model {
  declare device_mac: string;
  declare router_mac: string;
  declare host_name?: string | null;
  declare ip_addr?: string | null;
  declare vendor?: string | null;
  declare vendor_class?: string | null;
  declare connection_type?: string | null;
}

Device.init(
  {
    device_mac: {
      type: DataTypes.STRING,
      primaryKey: true,
      allowNull: false,
    },
    router_mac: {
      type: DataTypes.STRING,
      allowNull: false,
      references: { model: "routers", key: "mac_address" },
    },
    host_name: {
      type: DataTypes.STRING,
      allowNull: true,
      defaultValue: null,
    },
    ip_addr: {
      type: DataTypes.STRING,
      allowNull: true,
      defaultValue: null,
    },
    vendor: {
      type: DataTypes.STRING,
      allowNull: true,
      defaultValue: null,
    },
    vendor_class: {
      type: DataTypes.STRING,
      allowNull: true,
      defaultValue: null,
    },
    connection_type: {
      type: DataTypes.STRING,
      allowNull: true,
      defaultValue: null,
    },
  },
  {
    sequelize,
    tableName: "devices",
    schema: "monitoramento",
    timestamps: false,
  }
);
