import { DataTypes, Model } from "sequelize";
import { sequelize } from "../db";

export class Geolocation extends Model {
  declare router_mac: string;
  declare timestamp: Date;
  declare location: string | null;
  declare city: string | null;
  declare state: string | null;
  declare latitude: number | null;
  declare longitude: number | null;
  declare user_ppp: string | null;
}

Geolocation.init(
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
    location:  { type: DataTypes.STRING, allowNull: true, defaultValue: null },
    city:      { type: DataTypes.STRING, allowNull: true, defaultValue: null },
    state:     { type: DataTypes.STRING, allowNull: true, defaultValue: null },
    latitude:  { type: DataTypes.DOUBLE, allowNull: true, defaultValue: null },
    longitude: { type: DataTypes.DOUBLE, allowNull: true, defaultValue: null },
    user_ppp:  { type: DataTypes.STRING, allowNull: true, defaultValue: null },
  },
  {
    sequelize,
    tableName: "geolocation",
    schema: "monitoramento",
    timestamps: false,
  }
);
