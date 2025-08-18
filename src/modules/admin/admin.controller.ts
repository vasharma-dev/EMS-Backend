import {
  Controller,
  Get,
  Post,
  Body,
  Patch,
  Param,
  Delete,
  UseGuards,
  Req,
} from "@nestjs/common";
import { AdminService } from "./admin.service";
import { CreateAdminDto } from "./dto/create-admin.dto";
import { LocalDto } from "../auth/dto/local.dto";
import { LoginDto } from "./dto/login.dto";
import { JwtAuthGuard } from "../auth/guards/jwt-auth.guard";
// import { UpdateAdminDto } from './dto/update-admin.dto';

@Controller("admin")
export class AdminController {
  constructor(private readonly adminService: AdminService) {}

  @Post("create-admin")
  @UseGuards(JwtAuthGuard)
  async create(@Body() createAdminDto: CreateAdminDto, @Req() req: any) {
    try {
      const creatorId = req.user.sub; // sub from JWT payload
      return this.adminService.create(createAdminDto, creatorId);
    } catch (error) {
      console.log(error);
      throw error;
    }
  }

  @Post("login-admin")
  login(@Body() dto: LoginDto) {
    try {
      return this.adminService.login(dto);
    } catch (error) {
      console.error(error);
      throw error;
    }
  }

  @Get("dashboard-stats")
  @UseGuards(JwtAuthGuard)
  pendingApprovals() {
    try {
      return this.adminService.getDashboardData();
    } catch (error) {
      console.log(error);
      throw error;
    }
  }

  @Patch("approve/:id")
  @UseGuards(JwtAuthGuard)
  approveApplicant(
    @Param("id") id: string,
    @Body("role") role: "Organizer" | "Shopkeeper"
  ) {
    try {
      return this.adminService.approveApplicant(id, role);
    } catch (error) {
      console.log(error);
      throw error;
    }
  }

  // ✅ Reject Applicant (Organizer or Shopkeeper)
  @Patch("reject/:id")
  @UseGuards(JwtAuthGuard)
  rejectApplicant(
    @Param("id") id: string,
    @Body("role") role: "Organizer" | "Shopkeeper"
  ) {
    try {
      return this.adminService.rejectApplicant(id, role);
    } catch (error) {
      console.log(error);
      throw error;
    }
  }

  @Get()
  findAll() {
    return this.adminService.findAll();
  }

  @Get(":id")
  findOne(@Param("id") id: string) {
    return this.adminService.findOne(+id);
  }

  // @Patch(':id')
  // update(@Param('id') id: string, @Body() updateAdminDto: UpdateAdminDto) {
  //   return this.adminService.update(+id, updateAdminDto);
  // }

  @Delete(":id")
  remove(@Param("id") id: string) {
    return this.adminService.remove(+id);
  }
}
