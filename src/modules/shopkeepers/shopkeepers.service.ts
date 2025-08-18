import {
  ConflictException,
  Injectable,
  NotFoundException,
  UnauthorizedException,
} from "@nestjs/common";
import { InjectModel } from "@nestjs/mongoose";
import { Model } from "mongoose";
import { Shopkeeper, ShopkeeperDocument } from "./schemas/shopkeeper.schema";
import { LoginDto } from "../admin/dto/login.dto";
import * as bcrypt from "bcrypt";
import { JwtService } from "@nestjs/jwt";
import { MailService } from "../roles/mail.service";
import { CreateShopkeeperDto } from "./dto/createShopkeeper.dto";

@Injectable()
export class ShopkeepersService {
  constructor(
    @InjectModel(Shopkeeper.name) private shopModel: Model<ShopkeeperDocument>,
    private readonly jwtService: JwtService,
    private readonly mailService: MailService
  ) {}

  async create(data: Partial<Shopkeeper>) {
    const created = new this.shopModel(data);
    return created.save();
  }

  async list() {
    return this.shopModel.find().exec();
  }

  async getByEmail(email: string) {
    try {
      const shopkeeper = await this.shopModel.findOne({
        email: email,
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

  async login(dto: LoginDto) {
    try {
      const shopkeeper = await this.shopModel.findOne({ email: dto.email });
      if (!shopkeeper) {
        throw new NotFoundException("Organizer Not Found");
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

      console.log(token, "Vansh Sharma");

      return { message: "login Successfull", data: token };
    } catch (error) {
      console.log(error);
      throw error;
    }
  }

  async register(dto: CreateShopkeeperDto) {
    const existing = await this.shopModel.findOne({ email: dto.email });
    if (existing) throw new ConflictException("Email already registered");

    const hashed = await bcrypt.hash(dto.password, 10);

    const created = await new this.shopModel({
      ...dto,
      password: hashed,
      approved: false,
      rejected: false,
      status: "pending",
    }).save();

    // Send notification emails
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

    // Remove sensitive fields if needed, e.g. password
    delete shopkeeper.password;

    return { message: "Shopkeeper Found", data: shopkeeper };
  }

  // async getDashboardData(shopkeeperId: string) {
  //   // Example aggregation and queries:

  //   const totalProducts = await this.productModel.countDocuments({
  //     shopkeeper: shopkeeperId,
  //   });
  //   const totalOrders = await this.orderModel.countDocuments({
  //     shopkeeper: shopkeeperId,
  //   });
  //   const totalRevenueAgg = await this.orderModel.aggregate([
  //     { $match: { shopkeeper: shopkeeperId, paymentStatus: "paid" } },
  //     { $group: { _id: null, total: { $sum: "$total" } } },
  //   ]);
  //   const totalRevenue = totalRevenueAgg[0]?.total || 0;

  //   const activeCustomers = await this.customerModel.countDocuments({
  //     shopkeeper: shopkeeperId,
  //     status: "active",
  //   });

  //   // Optional: fetch latest 5 orders
  //   const recentOrders = await this.orderModel
  //     .find({ shopkeeper: shopkeeperId })
  //     .sort({ createdAt: -1 })
  //     .limit(5)
  //     .lean();

  //   // Optional: fetch additional analytics data...

  //   return {
  //     stats: {
  //       totalProducts,
  //       totalOrders,
  //       totalRevenue,
  //       activeCustomers,
  //     },
  //     recentOrders,
  //     // other data...
  //   };
  // }
}
