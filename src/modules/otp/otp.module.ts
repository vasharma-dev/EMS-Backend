import { Module } from "@nestjs/common";
import { OtpService } from "./otp.service";
import { OtpController } from "./otp.controller";
import { MongooseModule } from "@nestjs/mongoose/dist";
import { MailService } from "../roles/mail.service";
import { Otp, OtpSchema } from "./entities/otp.entity";
import { MailModule } from "../roles/mail.module";

@Module({
  imports: [
    MongooseModule.forFeature([{ name: Otp.name, schema: OtpSchema }]),
    MailModule,
  ],
  controllers: [OtpController],
  providers: [OtpService],
  exports: [OtpService],
})
export class OtpModule {}
