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

  // @Get("dashboard-data")
  // async getDashboardData(@Req() req: any) {
  //   try {
  //     const shopkeeperId = req.user.userId;
  //     return await this.shopkeepersService.getDashboardData(shopkeeperId);
  //   } catch (error) {
  //     throw error;
  //   }
  // }
}
