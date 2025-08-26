import { Module } from "@nestjs/common";
import { MongooseModule } from "@nestjs/mongoose";
import { ShopkeepersService } from "./shopkeepers.service";
import { ShopkeepersController } from "./shopkeepers.controller";
import { Shopkeeper, ShopkeeperSchema } from "./schemas/shopkeeper.schema";
import { JwtService } from "@nestjs/jwt";
import { MailService } from "../roles/mail.service";
import { OtpService } from "../otp/otp.service";
import { OtpModule } from "../otp/otp.module";
import { Otp, OtpSchema } from "../otp/entities/otp.entity";
import { MailModule } from "../roles/mail.module";

@Module({
  imports: [
    MongooseModule.forFeature([
      { name: Shopkeeper.name, schema: ShopkeeperSchema }, // Use Shopkeeper.name constant
      { name: Otp.name, schema: OtpSchema }, // Ensure OTP schema registered here or in OtpModule
    ]),
    OtpModule, // Import the module that provides OtpService, Otp model
    MailModule, // Mail module for MailService injection
  ],
  providers: [
    ShopkeepersService,
    JwtService,
    // you might also want to include OtpService here if you inject it directly
  ],
  controllers: [ShopkeepersController],
  exports: [ShopkeepersService],
})
export class ShopkeepersModule {}
