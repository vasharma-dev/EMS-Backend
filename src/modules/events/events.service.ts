import { Injectable } from "@nestjs/common";
import { InjectModel } from "@nestjs/mongoose";
import { Model, Types } from "mongoose";
import { Event, EventDocument } from "./schemas/event.schema";
import { CreateEventDto } from "./dto/createEvent.dto";

@Injectable()
export class EventsService {
  constructor(
    @InjectModel(Event.name) private eventModel: Model<EventDocument>
  ) {}

  async create(createEventDto: CreateEventDto): Promise<Event> {
    try {
      console.log(createEventDto, "Vansh Sharma");
      const startDate = new Date(createEventDto.startDate);
      const endDate = createEventDto.endDate
        ? new Date(createEventDto.endDate)
        : null;

      const event = new this.eventModel({
        title: createEventDto.title,
        description: createEventDto.description,
        category: createEventDto.category,
        startDate,
        time: createEventDto.time,
        endDate,
        endTime: createEventDto.endTime,
        organizer: new Types.ObjectId(createEventDto.organizerId),
        location: createEventDto.location,
        address: createEventDto.address,
        ticketPrice: createEventDto.ticketPrice,
        totalTickets: createEventDto.totalTickets,
        visibility: createEventDto.visibility || "public",
        inviteLink: createEventDto.inviteLink,
        tags: createEventDto.tags,
        features: createEventDto.features,
        ageRestriction: createEventDto.ageRestriction,
        dresscode: createEventDto.dresscode,
        specialInstructions: createEventDto.specialInstructions,
        image: createEventDto.image,
        gallery: createEventDto.gallery,
        organizerDetails: createEventDto.organizer,
        socialMedia: createEventDto.socialMedia,
        refundPolicy: createEventDto.refundPolicy,
        termsAndConditions: createEventDto.termsAndConditions,
      });

      return await event.save();
    } catch (error) {
      console.log(error);
      throw error;
    }
  }

  async list(page = 1, limit = 10) {
    return this.eventModel
      .find()
      .skip((page - 1) * limit)
      .limit(limit)
      .populate("organizer")
      .exec();
  }

  async findById(id: string) {
    return this.eventModel.findById(id).populate("organizer").exec();
  }

  async update(id: string, data: Partial<Event>) {
    return this.eventModel.findByIdAndUpdate(id, data, { new: true }).exec();
  }

  async remove(id: string) {
    return this.eventModel.findByIdAndDelete(id).exec();
  }
}
