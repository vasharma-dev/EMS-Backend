import {
  Body,
  Controller,
  Get,
  Param,
  Post,
  Patch,
  UseGuards,
  Req,
} from "@nestjs/common";
import { OrganizersService } from "./organizers.service";
import { LocalDto } from "../auth/dto/local.dto";
import { LoginDto } from "../admin/dto/login.dto";
import { AuthGuard } from "@nestjs/passport";
import { CreateOrganizerDto } from "./dto/createOrganizer.dto";

@Controller("organizers")
export class OrganizersController {
  constructor(private organizersService: OrganizersService) {}

  @Post()
  async create(@Body() body: any) {
    return this.organizersService.create(body);
  }

  @Get("events")
  @UseGuards(AuthGuard("jwt"))
  async list(@Req() req) {
    try {
      const organizerId = req.user.userId;
      return this.organizersService.list(organizerId);
    } catch (error) {
      console.log(error);
      throw error;
    }
  }

  @Post("login")
  async login(@Body() body: LoginDto) {
    try {
      return await this.organizersService.login(body);
    } catch (error) {
      console.log(error);
      throw error;
    }
  }

  @Post("register")
  async register(@Body() dto: CreateOrganizerDto) {
    return await this.organizersService.registerOrganizer(dto);
  }

  @Get("dashboard-data")
  @UseGuards(AuthGuard("jwt"))
  async getDashboardData(@Req() req) {
    try {
      const organizerId = req.user.userId;
      return this.organizersService.getDashboardDataForOrganizer(organizerId);
    } catch (error) {
      console.log(error);
      throw error;
    }
  }

  @Get(":email")
  async get(@Param("email") email: string) {
    try {
      return await this.organizersService.findByEmail(email);
    } catch (error) {
      console.log(error);
      throw error;
    }
  }

  @Patch(":id/approve")
  async approve(@Param("id") id: string) {
    return this.organizersService.approve(id);
  }
}
