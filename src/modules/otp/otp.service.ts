import { Injectable, UnauthorizedException } from "@nestjs/common";
import { CreateOtpDto } from "./dto/create-otp.dto";
// import { UpdateOtpDto } from "./dto/update-otp.dto";
import { InjectModel } from "@nestjs/mongoose/dist";
import { Otp } from "./entities/otp.entity";
import { Model } from "mongoose";
import { MailService } from "../roles/mail.service";

@Injectable()
export class OtpService {
  constructor(
    @InjectModel(Otp.name) private otpModel: Model<Otp>,
    private mailService: MailService
  ) {}

  create(createOtpDto: CreateOtpDto) {
    return "This action adds a new otp";
  }

  async sendOtp(email: string, role: string) {
    const otp = Math.floor(100000 + Math.random() * 900000).toString();
    const expiresAt = new Date(Date.now() + 10 * 60 * 1000); // 10 min expiry

    await this.otpModel.findOneAndUpdate(
      { email, role },
      { otp, expiresAt },
      { upsert: true, new: true }
    );

    await this.mailService.sendOtpEmail(email, otp);
  }

  async verifyOtp(email: string, role: string, otp: string) {
    const record = await this.otpModel.findOne({ email, role });

    if (!record || record.otp !== otp || record.expiresAt < new Date()) {
      throw new UnauthorizedException("Invalid or expired OTP");
    }

    await this.otpModel.deleteOne({ email, role });

    return true;
  }

  findAll() {
    return `This action returns all otp`;
  }

  findOne(id: number) {
    return `This action returns a #${id} otp`;
  }

  // update(id: number, updateOtpDto: UpdateOtpDto) {
  //   return `This action updates a #${id} otp`;
  // }

  remove(id: number) {
    return `This action removes a #${id} otp`;
  }
}
