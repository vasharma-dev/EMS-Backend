import {
  Injectable,
  NotFoundException,
  UnauthorizedException,
} from "@nestjs/common";
import { InjectModel } from "@nestjs/mongoose";
import { Model, Types } from "mongoose";
import { Organizer, OrganizerDocument } from "./schemas/organizer.schema";
import { LocalDto } from "../auth/dto/local.dto";
import * as bcrypt from "bcrypt";
import { JwtService } from "@nestjs/jwt";
import { LoginDto } from "../admin/dto/login.dto";
import { EventDocument } from "../events/schemas/event.schema";
import { User } from "../users/schemas/user.schema";
import { MailService } from "../roles/mail.service";
import { CreateOrganizerDto } from "./dto/createOrganizer.dto";

@Injectable()
export class OrganizersService {
  constructor(
    @InjectModel(Organizer.name)
    private organizerModel: Model<OrganizerDocument>,
    @InjectModel(Event.name)
    private eventModel: Model<EventDocument>,
    @InjectModel(User.name)
    private userModel: Model<User>,
    private readonly jwtService: JwtService,
    private readonly mailService: MailService
  ) {}

  async create(data: Partial<Organizer>) {
    const created = new this.organizerModel(data);
    return created.save();
  }

  async findByEmail(email: string) {
    try {
      const organizer = await this.organizerModel.findOne({
        email: email,
        approved: true,
      });

      if (organizer) return { message: "Organizer found", data: organizer };
    } catch (error) {
      console.log(error);
      throw error;
    }
  }

  async list(organizerId: string) {
    try {
      const organizer = new Types.ObjectId(organizerId);
      const events = await this.eventModel.find({
        organizer: organizer,
      });
      if (!events) {
        throw new NotFoundException("No events found");
      }
      return { message: "Events found", data: events };
    } catch (error) {
      console.log(error);
      throw error;
    }
    // return this.organizerModel.find().exec();
  }

  async getDashboardDataForOrganizer(organizerId: string): Promise<any> {
    const now = new Date();

    const organizer = new Types.ObjectId(organizerId);

    const currentEvents = await this.eventModel
      .find({
        organizer: organizer,
        startDate: { $lte: now },
        $or: [{ endDate: { $gte: now } }, { endDate: null }],
      })
      .lean();

    const upcomingEvents = await this.eventModel
      .find({
        organizer: organizer,
        startDate: { $gte: now },
      })
      .lean();

    const pastEvents = await this.eventModel
      .find({
        organizer: organizer,
        endDate: { $lte: now },
      })
      .lean();

    const totalEvents = await this.eventModel.countDocuments({
      organizer: organizer,
    });

    const totalAttendees = await this.eventModel.aggregate([
      { $match: { organizer: organizer } },
      { $group: { _id: null, total: { $sum: "$attendees" } } },
    ]);

    // const ticketsSold = await this.eventModel.aggregate([
    //   { $match: { organizer: new Types.ObjectId(organizerId) } },
    //   { $group: { _id: null, total: { $sum: "$ticketsSold" } } },
    // ]);

    // const revenue = await this.eventModel.aggregate([
    //   { $match: { organizer: new Types.ObjectId(organizerId) } },
    //   {
    //     $group: {
    //       _id: null,
    //       totalRevenue: {
    //         $sum: {
    //           $toDouble: {
    //             $replaceAll: { input: "$revenue", find: "$", replacement: "" },
    //           },
    //         },
    //       },
    //     },
    //   },
    // ]);

    return {
      stats: [
        { title: "Total Events", value: totalEvents.toString() },
        {
          title: "Total Attendees",
          value: totalAttendees[0]?.total?.toLocaleString() || "0",
        },
        // {
        //   title: "Tickets Sold",
        //   value: ticketsSold?.total?.toLocaleString() || "0",
        // },
        // {
        //   title: "Revenue",
        //   value: `$${revenue?.totalRevenue?.toFixed(2) || "0.00"}`,
        // },
      ],
      currentEvents,
      upcomingEvents,
      pastEvents,
    };
  }

  async registerOrganizer(dto: CreateOrganizerDto) {
    const hashedPassword = await bcrypt.hash(dto.password, 10);

    // Check if organizer already exists
    const existing = await this.organizerModel.findOne({ email: dto.email });
    if (existing) throw new Error("Organizer with this email already exists");

    const organizer = await new this.organizerModel({
      ...dto,
      password: hashedPassword,
      status: "pending",
      approved: false,
      rejected: false,
    }).save();

    // Send emails
    await this.mailService.sendApprovalRequestToAdmin({
      name: dto.name,
      email: dto.email,
      role: "organizer",
    });
    await this.mailService.sendConfirmationToUser({
      name: dto.name,
      email: dto.email,
      role: "organizer",
    });

    const userObj = organizer.toObject();
    delete userObj.password;
    return userObj;
  }

  async login(dto: LoginDto) {
    try {
      const organizer = await this.organizerModel.findOne({ email: dto.email });
      if (!organizer) {
        throw new NotFoundException("Organizer Not Found");
      }

      if (!organizer.approved) {
        throw new NotFoundException(
          "Your request is still pending! Please wait for admin Approval..."
        );
      }

      const isMatch = await bcrypt.compare(dto.password, organizer.password);
      if (!isMatch) {
        throw new UnauthorizedException("Invalid Credentials");
      }

      const payload = {
        name: organizer.name,
        email: organizer.email,
        sub: organizer._id,
        roles: ["organizer"],
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

  async approve(id: string) {
    return this.organizerModel
      .findByIdAndUpdate(id, { approved: true }, { new: true })
      .exec();
  }

  async getprofile(id: string) {
    return this.organizerModel.findById(id).exec();
  }
}
