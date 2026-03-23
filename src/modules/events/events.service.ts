import {
  BadRequestException,
  Injectable,
  NotFoundException,
} from "@nestjs/common";
import { InjectModel } from "@nestjs/mongoose";
import { Model, Types } from "mongoose";
import { Event, EventDocument } from "./schemas/event.schema";
import { CreateEventDto } from "./dto/createEvent.dto";
import { UpdateEventDto } from "./dto/updateEvent.dto";

@Injectable()
export class EventsService {
  constructor(
    @InjectModel(Event.name) private eventModel: Model<EventDocument>,
  ) {}

  async create(createEventDto: CreateEventDto): Promise<Event> {
    try {
      const startDate = new Date(createEventDto.startDate);
      const endDate = createEventDto.endDate
        ? new Date(createEventDto.endDate)
        : new Date(createEventDto.startDate);

      let endTime: Date;
      if (createEventDto.endTime) {
        endTime = new Date(createEventDto.endTime);
      } else {
        endTime = new Date(endDate);
        endTime.setHours(23, 59, 59, 999);
      }

      if (
        createEventDto.hasSpeakers &&
        createEventDto.speakerSlots?.length > 0
      ) {
        this.validateAllSpeakerSlots(
          createEventDto.speakerSlots,
          startDate,
          endTime,
        );
      }

      const event = new this.eventModel({
        title: createEventDto.title,
        description: createEventDto.description,
        category: createEventDto.category,
        startDate,
        time: createEventDto.time,
        endDate,
        endTime,
        organizer: createEventDto.organizerId,
        location: createEventDto.location,
        address: createEventDto.address,
        ticketPrice: createEventDto.ticketPrice,
        totalTickets: createEventDto.totalTickets,
        visibility: createEventDto.visibility || "public",
        inviteLink: createEventDto.inviteLink,
        tags: createEventDto.tags || [],
        visitorTypes: createEventDto.visitorTypes || [],
        features: createEventDto.features || {
          food: false,
          parking: false,
          wifi: false,
          photography: false,
          security: false,
          accessibility: false,
        },
        ageRestriction: createEventDto.ageRestriction,
        dresscode: createEventDto.dresscode,
        specialInstructions: createEventDto.specialInstructions,
        refundPolicy: createEventDto.refundPolicy,
        termsAndConditions: createEventDto.termsAndConditions,
        setupTime: createEventDto.setupTime,
        breakdownTime: createEventDto.breakdownTime,
        socialMedia: createEventDto.socialMedia || {
          facebook: "",
          instagram: "",
          twitter: "",
          linkedin: "",
        },
        image: createEventDto.image,
        gallery: createEventDto.gallery || [],

        termsAndConditionsforStalls:
          createEventDto.termsAndConditionsforStalls || [],
        addOnItems: createEventDto.addOnItems || [],

        // WITH THIS:
        hasVenue: createEventDto.hasVenue || false,
        hasTables: createEventDto.hasTables || false,
        hasSpeakers: createEventDto.hasSpeakers || false,

        venueConfig: createEventDto.hasVenue
          ? createEventDto.venueConfig?.length > 0
            ? createEventDto.venueConfig
            : [
                {
                  venueConfigId: "venueConfig1",
                  width: 800,
                  height: 500,
                  scale: 0.75,
                  gridSize: 20,
                  showGrid: true,
                  hasMainStage: true,
                  totalRows: 3,
                },
              ]
          : [],

        tableTemplates: createEventDto.hasTables
          ? createEventDto.tableTemplates || []
          : [],
        venueTables: createEventDto.hasTables
          ? createEventDto.venueTables || []
          : [],

        speakerTemplates: createEventDto.hasSpeakers
          ? createEventDto.speakerTemplates || []
          : [],
        speakerSlots: createEventDto.hasSpeakers
          ? createEventDto.speakerSlots || []
          : [],

        status: createEventDto.status || "draft",
        featured: createEventDto.featured || false,
      });

      const savedEvent = await event.save();

      return savedEvent;
    } catch (error) {
      console.error("Error creating event:", error);
      throw error;
    }
  }

  async findAll(): Promise<Event[]> {
    try {
      const events = await this.eventModel
        .find()
        .populate("organizer")
        .sort({ createdAt: -1 })
        .exec();
      return events;
    } catch (error) {
      console.error("Error fetching events:", error);
      throw error;
    }
  }

  async findById(id: string): Promise<Event> {
    try {
      const event = await this.eventModel
        .findById(id)
        .populate("organizer")
        .exec();

      if (!event) {
        throw new NotFoundException(`Event with ID ${id} not found`);
      }

      return event;
    } catch (error) {
      console.error("Error finding event:", error);
      throw error;
    }
  }

  async findByOrganizer(
    organizerId: string,
  ): Promise<{ events: Event[]; total: number }> {
    try {
      const [events, total] = await Promise.all([
        this.eventModel
          .find({ organizer: organizerId })
          .populate("organizer")
          .sort({ createdAt: -1 })
          .exec(),
        this.eventModel.countDocuments({ organizer: organizerId }).exec(),
      ]);

      return { events, total };
    } catch (error) {
      console.error("Error fetching organizer events:", error);
      throw error;
    }
  }

  async update(id: string, updateEventDto: UpdateEventDto): Promise<Event> {
    try {
      // Handle date conversions
      if (updateEventDto.startDate) {
        updateEventDto.startDate = new Date(updateEventDto.startDate) as any;
      }
      if (updateEventDto.endDate) {
        updateEventDto.endDate = new Date(updateEventDto.endDate) as any;
      } else if (updateEventDto.startDate) {
        updateEventDto.endDate = new Date(updateEventDto.startDate) as any;
      }

      const updatedEvent = await this.eventModel
        .findByIdAndUpdate(id, updateEventDto, {
          new: true,
          runValidators: true,
        })
        .populate("organizer")
        .exec();

      if (!updatedEvent) {
        throw new NotFoundException(`Event with ID ${id} not found`);
      }

      return updatedEvent;
    } catch (error) {
      console.error("Error updating event:", error);
      throw error;
    }
  }

  async remove(id: string): Promise<Event> {
    try {
      const deletedEvent = await this.eventModel
        .findByIdAndDelete(id)
        .populate("organizer")
        .exec();

      if (!deletedEvent) {
        throw new NotFoundException(`Event with ID ${id} not found`);
      }

      return deletedEvent;
    } catch (error) {
      console.error("Error deleting event:", error);
      throw error;
    }
  }

  async updateStatus(id: string, status: string): Promise<Event> {
    try {
      const updatedEvent = await this.eventModel
        .findByIdAndUpdate(id, { status }, { new: true })
        .populate("organizer")
        .exec();

      if (!updatedEvent) {
        throw new NotFoundException(`Event with ID ${id} not found`);
      }

      return updatedEvent;
    } catch (error) {
      console.error("Error updating event status:", error);
      throw error;
    }
  }

  async searchEvents(query: string): Promise<Event[]> {
    try {
      const searchRegex = new RegExp(query, "i");

      const events = await this.eventModel
        .find({
          $or: [
            { title: { $regex: searchRegex } },
            { description: { $regex: searchRegex } },
            { category: { $regex: searchRegex } },
            { location: { $regex: searchRegex } },
            { tags: { $in: [searchRegex] } },
          ],
        })
        .populate("organizer")
        .sort({ createdAt: -1 })
        .exec();

      return events;
    } catch (error) {
      console.error("Error searching events:", error);
      throw error;
    }
  }

  private validateSpeakerBooking(
    booking: any,
    slot: any,
    eventStart: Date,
    eventEnd: Date,
  ) {
    const bStart = new Date(booking.startTime);
    const bEnd = new Date(booking.endTime);
    const slotFrom = new Date(slot.availableFrom);
    const slotTo = new Date(slot.availableTo);

    // 1. startTime before endTime
    if (bStart >= bEnd)
      throw new BadRequestException(
        `"${booking.speakerName}": startTime must be before endTime`,
      );

    // 2. Slot window must be within event window
    if (slotFrom < eventStart || slotTo > eventEnd)
      throw new BadRequestException(
        `Slot "${slot.slotName}": availableFrom/To must be within event duration`,
      );

    // 3. Booking chunk must be within slot window
    if (bStart < slotFrom || bEnd > slotTo)
      throw new BadRequestException(
        `"${booking.speakerName}": booking time must be within slot window ` +
          `(${slot.availableFrom} → ${slot.availableTo})`,
      );

    // 4. No overlap with existing bookings in the same slot
    const hasOverlap = slot.bookings?.some((b: any) => {
      const eStart = new Date(b.startTime);
      const eEnd = new Date(b.endTime);
      return bStart < eEnd && bEnd > eStart;
    });

    if (hasOverlap)
      throw new BadRequestException(
        `"${booking.speakerName}": time overlaps with an existing speaker in slot "${slot.slotName}"`,
      );

    // 5. Max speakers check
    if ((slot.bookings?.length || 0) >= slot.maxSpeakersPerSlot)
      throw new BadRequestException(
        `Slot "${slot.slotName}" is full (max ${slot.maxSpeakersPerSlot} speakers)`,
      );
  }

  private validateAllSpeakerSlots(
    speakerSlots: any[],
    eventStart: Date,
    eventEnd: Date,
  ) {
    for (const slot of speakerSlots) {
      const validated: any[] = [];
      for (const booking of slot.bookings || []) {
        this.validateSpeakerBooking(
          booking,
          { ...slot, bookings: validated },
          eventStart,
          eventEnd,
        );
        validated.push(booking);
      }
    }
  }

  async bookSpeakerSlot(
    eventId: string,
    slotId: string,
    booking: any,
  ): Promise<Event> {
    const event = await this.eventModel.findById(eventId);
    if (!event) throw new NotFoundException(`Event ${eventId} not found`);

    const slot = (event as any).speakerSlots.find(
      (s: any) => s.slotId === slotId,
    );
    if (!slot) throw new NotFoundException(`Slot ${slotId} not found`);

    this.validateSpeakerBooking(booking, slot, event.startDate, event.endDate);

    slot.bookings.push({
      ...booking,
      startTime: new Date(booking.startTime),
      endTime: new Date(booking.endTime),
    });

    event.markModified("speakerSlots");
    return event.save();
  }
}
