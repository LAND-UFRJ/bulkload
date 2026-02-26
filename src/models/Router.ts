import { DataTypes, Model } from "sequelize";
import { sequelize } from "../db";

export class Router extends Model {
  declare mac_address: string;
  declare manufactorer?: string | null;
  declare serialnumber?: string | null;
  declare extractor_type: number;
}

Router.init(
  {
    mac_address: {
      type: DataTypes.STRING,
      primaryKey: true,
      allowNull: false,
    },
    manufacturer: {
      type: DataTypes.STRING,
      allowNull: true,
      defaultValue: null,
    },
    serialnumber: {
      type: DataTypes.STRING,
      allowNull: true,
      defaultValue: null,
    },
    model: {
      type: DataTypes.STRING,
      allowNull: true,
      defaultValue: null,
    },
    user_ppp: {
      type: DataTypes.STRING,
      allowNull: true,
      defaultValue: null,
    },
    extractor_type: {
      type: DataTypes.INTEGER,
      allowNull: false,
      defaultValue: 0, // 0 = bulkdata , 1 = firmware
      validate: {
        isValidExtractorType(value: number) {
          if (![0, 1, 2].includes(value)) {
            throw new Error(
              `invalid extractor_type (${value}).`
            );
          }
        },
      },
    },
  },
  {
    sequelize,
    tableName: "routers",
    schema: "monitoramento",
    timestamps: false,
  }
);
