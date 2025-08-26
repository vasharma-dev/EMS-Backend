import {
  Controller,
  Get,
  Post,
  Body,
  Patch,
  Param,
  Delete,
} from "@nestjs/common";
import { OtpService } from "./otp.service";
import { CreateOtpDto } from "./dto/create-otp.dto";
// import { UpdateOtpDto } from './dto/update-otp.dto';

@Controller("otp")
export class OtpController {
  constructor(private readonly otpService: OtpService) {}

  @Post()
  create(@Body() createOtpDto: CreateOtpDto) {
    return this.otpService.create(createOtpDto);
  }

  @Post("send-business-email-otp")
  async sendOtp(@Body() body: { businessEmail: string; role: string }) {
    await this.otpService.sendOtp(body.businessEmail, body.role);
    return { message: "OTP sent" };
  }

  @Post("verify-business-email-otp")
  async verifyOtp(
    @Body() body: { businessEmail: string; role: string; otp: string }
  ) {
    await this.otpService.verifyOtp(body.businessEmail, body.role, body.otp);
    return { message: "OTP verified" };
  }

  @Get()
  findAll() {
    return this.otpService.findAll();
  }

  @Get(":id")
  findOne(@Param("id") id: string) {
    return this.otpService.findOne(+id);
  }

  // @Patch(':id')
  // update(@Param('id') id: string, @Body() updateOtpDto: UpdateOtpDto) {
  //   return this.otpService.update(+id, updateOtpDto);
  // }

  @Delete(":id")
  remove(@Param("id") id: string) {
    return this.otpService.remove(+id);
  }
}
