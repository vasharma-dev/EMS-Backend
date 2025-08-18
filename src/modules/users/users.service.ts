import { Model } from "mongoose";
import {
  Injectable,
  InternalServerErrorException,
  Logger,
  ConflictException,
} from "@nestjs/common";
import { InjectModel } from "@nestjs/mongoose";
import { User, UserDocument } from "./schemas/user.schema"; // Assuming this is your User schema
import { CreateUserDto } from "./dto/create-users.dto";
import { JwtService } from "@nestjs/jwt";

@Injectable()
export class UsersService {
  // private readonly logger = new Logger(UsersService.name);

  constructor(
    @InjectModel(User.name) private userModel: Model<User>,
    private readonly jwtService: JwtService
  ) {}

  async create(data: CreateUserDto) {
    try {
      console.log(data, "data");
      // For general registration, you might need to hash the password here
      const created = new this.userModel({
        name: data.name,
        email: data.email,
        password: data.password,
        provider: data.provider,
        providerId: data.providerId,
      });
      return await created.save();
    } catch (error) {
      console.error(error);
      console.error(`Failed to create user: ${error.message}`);
      throw new InternalServerErrorException(
        "An error occurred while creating the user."
      );
    }
  }

  // New method to find a user by their email
  async findByEmail(email: string) {
    try {
      return await this.userModel.findOne({ email }).exec();
    } catch (error) {
      console.error(`Failed to find user by email: ${error.message}`);
      return null;
    }
  }

  // New method to find a user by social provider and ID
  async findByProviderId(providerId: string, provider: string) {
    try {
      return await this.userModel.findOne({ providerId, provider }).exec();
    } catch (error) {
      console.error(`Failed to find user by provider ID: ${error.message}`);
      return null;
    }
  }
}
