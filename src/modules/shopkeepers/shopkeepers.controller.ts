import {
  Body,
  Controller,
  Get,
  Param,
  Post,
  Req,
  UseGuards,
} from "@nestjs/common";
import { ShopkeepersService } from "./shopkeepers.service";
import { LoginDto } from "../admin/dto/login.dto";
import { CreateShopkeeperDto } from "./dto/createShopkeeper.dto";
import { AuthGuard } from "@nestjs/passport";
import { JwtAuthGuard } from "../auth/guards/jwt-auth.guard";

// DTO for OTP requests
class RequestOTPDto {
  email: string;
}

class VerifyOTPDto {
  email: string;
  otp: string;
}

@Controller("shopkeepers")
export class ShopkeepersController {
  constructor(private shopkeepersService: ShopkeepersService) {}

  @Post()
  async create(@Body() body: any) {
    return this.shopkeepersService.create(body);
  }

  @Get()
  async list() {
    return this.shopkeepersService.list();
  }

  @Get(":email")
  async getByEmail(@Param("email") email: string) {
    try {
      return await this.shopkeepersService.getByEmail(email);
    } catch (error) {
      throw error;
    }
  }

  // New OTP-based authentication endpoints
  @Post("request-otp")
  async requestOTP(@Body() body: any) {
    try {
      console.log(body, "vansh Sharm a");
      return await this.shopkeepersService.requestOTP(body.email);
    } catch (error) {
      throw error;
    }
  }

  @Post("verify-otp")
  async verifyOTP(@Body() body: any) {
    try {
      console.log(body, "vansh Sharma");
      return await this.shopkeepersService.verifyOTP(body.email, body.otp);
    } catch (error) {
      throw error;
    }
  }

  @Post("resend-otp")
  async resendOTP(@Body() body: RequestOTPDto) {
    try {
      return await this.shopkeepersService.resendOTP(body.email);
    } catch (error) {
      throw error;
    }
  }

  // Original login method (keeping for backward compatibility)
  @Post("login")
  async login(@Body() body: LoginDto) {
    try {
      return await this.shopkeepersService.login(body);
    } catch (error) {
      throw error;
    }
  }

  @Get("profile")
  @UseGuards(AuthGuard("jwt"))
  async getProfile(@Req() req: any) {
    try {
      const shopkeeperId = req.user.userId;
      return await this.shopkeepersService.getProfile(shopkeeperId);
    } catch (error) {
      throw error;
    }
  }

  @Post("register")
  async register(@Body() body: CreateShopkeeperDto) {
    try {
      return await this.shopkeepersService.register(body);
    } catch (error) {
      throw error;
    }
  }
}
