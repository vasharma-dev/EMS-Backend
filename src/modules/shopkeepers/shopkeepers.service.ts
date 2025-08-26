import {
  ConflictException,
  Injectable,
  NotFoundException,
  UnauthorizedException,
  BadRequestException,
} from "@nestjs/common";
import { InjectModel } from "@nestjs/mongoose";
import { Model } from "mongoose";
import { Shopkeeper, ShopkeeperDocument } from "./schemas/shopkeeper.schema";
import { LoginDto } from "../admin/dto/login.dto";
import * as bcrypt from "bcrypt";
import { JwtService } from "@nestjs/jwt";
import { MailService } from "../roles/mail.service";
import { CreateShopkeeperDto } from "./dto/createShopkeeper.dto";
import { Otp } from "../otp/entities/otp.entity";

@Injectable()
export class ShopkeepersService {
  constructor(
    @InjectModel(Shopkeeper.name) private shopModel: Model<ShopkeeperDocument>,
    @InjectModel(Otp.name) private otpModel: Model<Otp>, // Use your existing Otp model
    private readonly jwtService: JwtService,
    private readonly mailService: MailService
  ) {}

  private normalizeEmail(email: string): string {
    return email.toLowerCase().trim();
  }

  async create(data: Partial<Shopkeeper>) {
    const created = new this.shopModel(data);
    return created.save();
  }

  async list() {
    return this.shopModel.find().exec();
  }

  async getByEmail(email: string) {
    try {
      const normalizedEmail = this.normalizeEmail(email);
      const shopkeeper = await this.shopModel.findOne({
        email: normalizedEmail,
        approved: true,
      });
      if (shopkeeper) return { message: "Shopkeeper found", data: shopkeeper };
    } catch (error) {
      console.log(error);
      throw error;
    }
  }

  async get(id: string) {
    return this.shopModel.findById(id).exec();
  }

  // Request OTP with your existing Otp schema
  async requestOTP(email: string) {
    try {
      const normalizedEmail = this.normalizeEmail(email);
      console.log(`Requesting OTP for: ${normalizedEmail}`);

      const shopkeeper = await this.shopModel.findOne({
        businessEmail: normalizedEmail,
        approved: true,
      });

      if (!shopkeeper) {
        throw new NotFoundException("Shopkeeper not found or not approved");
      }

      // Generate 6-digit OTP
      const otp = Math.floor(100000 + Math.random() * 900000).toString();
      const expiresAt = new Date(Date.now() + 10 * 60 * 1000); // 10 minutes

      // Delete any existing OTPs for this email and role
      await this.otpModel.deleteMany({
        email: normalizedEmail,
        role: "shopkeeper",
      });

      // Create new OTP document using your existing schema
      const otpDoc = new this.otpModel({
        email: normalizedEmail,
        role: "shopkeeper", // Set role as shopkeeper
        otp,
        expiresAt,
        attempts: 0,
        verified: false,
      });

      await otpDoc.save();
      console.log(`OTP saved to database for ${normalizedEmail}: ${otp}`);

      // Send OTP to business email
      const businessEmail = shopkeeper.businessEmail || shopkeeper.email;

      await this.mailService.sendOTPEmail({
        name: shopkeeper.name,
        email: businessEmail,
        otp,
        businessName: shopkeeper.shopName || shopkeeper.name,
      });

      return {
        message: "OTP sent successfully to your registered business email",
        data: {
          email: normalizedEmail,
          businessEmail: businessEmail,
          expiresIn: 10,
        },
      };
    } catch (error) {
      console.log("Error in requestOTP:", error);
      throw error;
    }
  }

  // Verify OTP with your existing Otp schema
  async verifyOTP(email: string, otp: string) {
    try {
      const normalizedEmail = this.normalizeEmail(email);
      console.log(`Verifying OTP for: ${normalizedEmail}`);

      // Find OTP document with role filter
      const otpDoc = await this.otpModel.findOne({
        email: normalizedEmail,
        role: "shopkeeper", // Filter by role
        verified: false,
      });

      if (!otpDoc) {
        console.log(`No OTP document found for email: ${normalizedEmail}`);
        throw new BadRequestException(
          "OTP not found or expired. Please request a new one."
        );
      }

      // Check if expired
      if (new Date() > otpDoc.expiresAt) {
        console.log("OTP has expired");
        await this.otpModel.deleteOne({ _id: otpDoc._id });
        throw new BadRequestException(
          "OTP has expired. Please request a new one."
        );
      }

      // Check attempts
      if (otpDoc.attempts >= 3) {
        console.log("Too many attempts");
        await this.otpModel.deleteOne({ _id: otpDoc._id });
        throw new BadRequestException(
          "Too many invalid attempts. Please request a new OTP."
        );
      }

      // Verify OTP
      if (otpDoc.otp !== otp) {
        console.log(`OTP mismatch. Expected: ${otpDoc.otp}, Received: ${otp}`);
        // Increment attempts
        await this.otpModel.updateOne(
          { _id: otpDoc._id },
          { $inc: { attempts: 1 } }
        );
        throw new BadRequestException(
          `Invalid OTP. ${3 - otpDoc.attempts - 1} attempts remaining.`
        );
      }

      console.log("OTP verified successfully");

      // Get shopkeeper details
      const shopkeeper = await this.shopModel.findOne({
        businessEmail: normalizedEmail,
        approved: true,
      });

      if (!shopkeeper) {
        throw new NotFoundException("Shopkeeper not found or not approved");
      }

      // Generate JWT token
      const payload = {
        name: shopkeeper.name,
        email: shopkeeper.email,
        sub: shopkeeper._id,
        roles: ["shopkeeper"],
      };

      const token = this.jwtService.sign(payload, {
        secret: process.env.JWT_ACCESS_SECRET,
        expiresIn: "24h",
      });

      // Mark OTP as verified and delete
      await this.otpModel.deleteOne({ _id: otpDoc._id });
      console.log(`OTP deleted for ${normalizedEmail}`);

      return {
        message: "Login successful",
        data: {
          token,
          shopkeeper: {
            id: shopkeeper._id,
            name: shopkeeper.name,
            email: shopkeeper.email,
            businessName: shopkeeper.shopName,
          },
        },
      };
    } catch (error) {
      console.log("Error in verifyOTP:", error);
      throw error;
    }
  }

  // Resend OTP with your existing Otp schema
  async resendOTP(email: string) {
    try {
      const normalizedEmail = this.normalizeEmail(email);
      console.log(`Resending OTP for: ${normalizedEmail}`);

      const shopkeeper = await this.shopModel.findOne({
        businessEmail: normalizedEmail,
        approved: true,
      });

      if (!shopkeeper) {
        throw new NotFoundException("Shopkeeper not found or not approved");
      }

      // Check for recent OTP requests (prevent spam)
      const recentOtp = await this.otpModel.findOne({
        email: normalizedEmail,
        role: "shopkeeper",
        createdAt: { $gte: new Date(Date.now() - 60 * 1000) }, // Last 60 seconds
      });

      if (recentOtp) {
        throw new BadRequestException(
          "Please wait 60 seconds before requesting a new OTP"
        );
      }

      // Delete any existing OTPs for this email and role
      await this.otpModel.deleteMany({
        email: normalizedEmail,
        role: "shopkeeper",
      });

      // Generate new OTP
      const otp = Math.floor(100000 + Math.random() * 900000).toString();
      const expiresAt = new Date(Date.now() + 10 * 60 * 1000);

      // Create new OTP document
      const otpDoc = new this.otpModel({
        email: normalizedEmail,
        role: "shopkeeper",
        otp,
        expiresAt,
        attempts: 0,
        verified: false,
      });

      await otpDoc.save();
      console.log(`New OTP saved for ${normalizedEmail}: ${otp}`);

      // Send OTP via email
      const businessEmail = shopkeeper.businessEmail || shopkeeper.email;

      await this.mailService.sendOTPEmail({
        name: shopkeeper.name,
        email: businessEmail,
        otp,
        businessName: shopkeeper.shopName || shopkeeper.name,
      });

      return {
        message: "New OTP sent successfully",
        data: {
          email: businessEmail,
          expiresIn: 10,
        },
      };
    } catch (error) {
      console.log("Error in resendOTP:", error);
      throw error;
    }
  }

  // Rest of your existing methods remain the same...
  async login(dto: LoginDto) {
    try {
      const normalizedEmail = this.normalizeEmail(dto.email);
      const shopkeeper = await this.shopModel.findOne({
        email: normalizedEmail,
      });

      if (!shopkeeper) {
        throw new NotFoundException("Shopkeeper Not Found");
      }

      if (!shopkeeper.approved) {
        throw new NotFoundException(
          "Your request is still pending! Please wait for admin Approval..."
        );
      }

      const isMatch = await bcrypt.compare(dto.password, shopkeeper.password);
      if (!isMatch) {
        throw new UnauthorizedException("Invalid Credentials");
      }

      const payload = {
        name: shopkeeper.name,
        email: shopkeeper.email,
        sub: shopkeeper._id,
        roles: ["shopkeeper"],
      };

      const token = this.jwtService.sign(payload, {
        secret: process.env.JWT_ACCESS_SECRET,
        expiresIn: "1h",
      });

      return { message: "login Successful", data: token };
    } catch (error) {
      console.log(error);
      throw error;
    }
  }

  async register(dto: CreateShopkeeperDto) {
    const normalizedEmail = this.normalizeEmail(dto.email);
    const existing = await this.shopModel.findOne({ email: normalizedEmail });
    if (existing) throw new ConflictException("Email already registered");

    const hashed = await bcrypt.hash(dto.password, 10);
    const created = await new this.shopModel({
      ...dto,
      email: normalizedEmail,
      password: hashed,
      approved: false,
      rejected: false,
      status: "pending",
    }).save();

    await this.mailService.sendApprovalRequestToAdmin({
      name: dto.name,
      email: dto.email,
      role: "shopkeeper",
    });

    await this.mailService.sendConfirmationToUser({
      name: dto.name,
      email: dto.email,
      role: "shopkeeper",
    });

    const userObj = created.toObject();
    delete userObj.password;
    return userObj;
  }

  async getProfile(id: string) {
    const shopkeeper = await this.shopModel.findById(id).lean().exec();
    if (!shopkeeper) {
      throw new NotFoundException("Shopkeeper not found with this id");
    }

    delete shopkeeper.password;
    return { message: "Shopkeeper Found", data: shopkeeper };
  }
}
