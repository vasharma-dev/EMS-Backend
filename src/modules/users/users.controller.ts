import {
  Controller,
  Get,
  Req,
  UseGuards,
  Res,
  InternalServerErrorException,
  ConflictException,
  Body,
  Post,
} from "@nestjs/common";
import { AuthGuard } from "@nestjs/passport";
import { Request, Response } from "express";
import { UsersService } from "./users.service";
import { JwtService } from "@nestjs/jwt"; // You will need to inject this service
import { CreateUserDto } from "./dto/create-users.dto";

@Controller("user")
export class UsersController {
  constructor(
    private readonly usersService: UsersService,
    private readonly jwtService: JwtService
  ) {}

  @Get("google")
  @UseGuards(AuthGuard("google"))
  async googleAuth(@Req() req: Request) {
    // Passport will handle the redirect. No code needed here.
  }

  @Get("google/callback")
  @UseGuards(AuthGuard("google"))
  async googleAuthRedirect(@Req() req: Request, @Res() res: Response) {
    try {
      console.log("Claeeddddddddd");
      const userFromGoogle = req.user as any;
      if (!userFromGoogle) {
        // Handle error...
        return res.redirect("https://eventsh.com/login?error=auth_failed");
      }

      // 1. Check if the user already exists in your database
      let user = await this.usersService.findByProviderId(
        userFromGoogle.providerId,
        userFromGoogle.provider
      );

      // 2. If the user doesn't exist, create a new one
      if (!user) {
        const createUserDto: CreateUserDto = {
          name: userFromGoogle.name,
          email: userFromGoogle.email,
          password: userFromGoogle.password,
          provider: userFromGoogle.provider,
          providerId: userFromGoogle.providerId,
        };
        user = await this.usersService.create(createUserDto);
      }

      // 3. Generate a JWT token
      const payload = { email: user.email, sub: user._id, roles: user.roles }; // Customize payload as needed
      const token = this.jwtService.sign(payload);

      // 4. Redirect to the frontend with the token
      return res.redirect(`https://eventsh.com/dashboard?token=${token}`);
    } catch (error) {
      // Handle error...
      return res.redirect("https://eventsh.com/login?error=auth_failed");
    }
  }

  // New endpoint for general registration
  @Post("register")
  async register(@Body() createUserDto: CreateUserDto) {
    try {
      console.log(createUserDto, "createUserDto");
      const existingUser = await this.usersService.findByEmail(
        createUserDto.email
      );
      if (existingUser) {
        throw new ConflictException("User with this email already exists.");
      }

      return await this.usersService.create(createUserDto);
    } catch (error) {
      throw new InternalServerErrorException(
        "An error occurred during registration."
      );
    }
  }
}
