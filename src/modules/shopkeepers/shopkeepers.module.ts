import { Module } from "@nestjs/common";
import { MongooseModule } from "@nestjs/mongoose";
import { ShopkeepersService } from "./shopkeepers.service";
import { ShopkeepersController } from "./shopkeepers.controller";
import { Shopkeeper, ShopkeeperSchema } from "./schemas/shopkeeper.schema";
import { JwtService } from "@nestjs/jwt";
import { MailService } from "../roles/mail.service";

@Module({
  imports: [
    MongooseModule.forFeature([
      { name: "Shopkeeper", schema: ShopkeeperSchema },
    ]),
  ],
  providers: [ShopkeepersService, JwtService, MailService],
  controllers: [ShopkeepersController],
})
export class ShopkeepersModule {}
