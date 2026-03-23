import { Prop, Schema, SchemaFactory } from "@nestjs/mongoose";
import { Document, Types } from "mongoose";

export type EventDocument = Event & Document;

class VenueConfig {
  @Prop()
  venueConfigId: string;

  @Prop()
  width: number;

  @Prop()
  height: number;

  @Prop()
  scale: number;

  @Prop()
  gridSize: number;

  @Prop()
  showGrid: boolean;

  @Prop()
  hasMainStage: boolean;

  @Prop()
  totalRows?: number;
}

class termsAndConditionsforStalls {
  @Prop()
  termsAndConditionsforStalls: string;

  @Prop()
  isMandatory: boolean;
}

class VisitorFeatureAccess {
  @Prop() food: boolean;
  @Prop() parking: boolean;
  @Prop() wifi: boolean;
  @Prop() photography: boolean;
  @Prop() security: boolean;
  @Prop() accessibility: boolean;
}

class VisitorType {
  @Prop() id: string;
  @Prop() name: string; // e.g. "VIP", "Delegate", "Normal Visitor"
  @Prop() price: number; // 0 = free
  @Prop() maxCount?: number; // undefined/null = unlimited
  @Prop() description?: string;
  @Prop({ type: Object }) featureAccess: VisitorFeatureAccess;
  @Prop({ default: true }) isActive: boolean;
}

class SpeakerBooking {
  @Prop() bookingId: string;
  @Prop() speakerId?: string;
  @Prop() speakerName: string;
  @Prop() whatsAppNumber?: string;
  @Prop() agenda: string;
  @Prop() startTime: Date; // chunk start within slot window
  @Prop() endTime: Date; // chunk end within slot window
  @Prop({ default: "confirmed" }) status: string;
  @Prop({ default: false }) bookedByOrganizer: boolean;
}

class SpeakerSlot {
  @Prop() slotId: string;
  @Prop() templateId: string;
  @Prop() slotName: string;
  @Prop() venueConfigId: string;
  @Prop() x: number;
  @Prop() y: number;
  @Prop() rotation: number;
  @Prop({ default: false }) isPlaced: boolean;

  // ✅ The stage's total availability window
  @Prop() availableFrom: Date;
  @Prop() availableTo: Date;

  @Prop() maxSpeakersPerSlot: number;
  @Prop({ default: 0 }) slotPrice: number;
  @Prop({ default: 0 }) bookingPrice: number;
  @Prop({ default: 0 }) depositPrice: number;

  // ✅ Multiple speaker bookings, each with their own time chunk
  @Prop({ type: Array, default: [] }) bookings: SpeakerBooking[];
}

class SpeakerTemplate {
  @Prop() id: string;
  @Prop() name: string;
  @Prop() durationMinutes: number;
  @Prop({ default: 0 }) slotPrice: number;
  @Prop({ default: 0 }) bookingPrice: number;
  @Prop({ default: 0 }) depositPrice: number;
  @Prop() maxSpeakersPerSlot: number;
  @Prop() description?: string;
}

@Schema({ timestamps: true })
export class Event {
  @Prop({ required: true })
  title: string;

  @Prop()
  description?: string;

  @Prop()
  category?: string;

  @Prop()
  startDate: Date;

  @Prop()
  time?: string;

  @Prop()
  endDate?: Date;

  @Prop()
  endTime?: string;

  @Prop({ type: Types.ObjectId, ref: "Organizer", required: true })
  organizer: Types.ObjectId;

  @Prop()
  location?: string;

  @Prop()
  address?: string;

  @Prop()
  ticketPrice?: string;

  @Prop()
  totalTickets?: number;

  @Prop({ enum: ["public", "private", "unlisted"], default: "public" })
  visibility: string;

  @Prop()
  inviteLink?: string;

  @Prop([String])
  tags: string[];

  @Prop({
    type: Object,
    default: {
      food: false,
      parking: false,
      wifi: false,
      photography: false,
      security: false,
      accessibility: false,
    },
  })
  features: {
    food: boolean;
    parking: boolean;
    wifi: boolean;
    photography: boolean;
    security: boolean;
    accessibility: boolean;
  };

  @Prop()
  ageRestriction?: string;

  @Prop()
  dresscode?: string;

  @Prop()
  specialInstructions?: string;

  @Prop()
  refundPolicy?: string;

  @Prop()
  termsAndConditions?: string;

  @Prop()
  setupTime?: string;

  @Prop()
  breakdownTime?: string;

  // Media fields
  @Prop()
  image?: string;

  @Prop([String])
  gallery?: string[];

  @Prop({
    type: Object,
    default: {
      facebook: "",
      instagram: "",
      twitter: "",
      linkedin: "",
    },
  })
  socialMedia?: {
    facebook?: string;
    instagram?: string;
    twitter?: string;
    linkedin?: string;
  };

  // Exhibition/Venue fields with ROW-BASED PRICING
  @Prop({ type: Array, default: [] })
  tableTemplates: {
    id: string;
    name: string;
    type: "Straight";
    width: number;
    height: number;
    rowNumber?: number; // NEW: Row number for pricing
    tablePrice: number; // NEW: Full table rental price
    bookingPrice: number; // NEW: Partial payment (must be <= tablePrice)
    depositPrice: number; // NEW: Security deposit (can be > tablePrice)
    isBooked: boolean; // NEW: Booking status
    bookedBy?: string; // NEW: Reference to shopkeeper/stall booking
    customDimensions?: boolean;
  }[];

  @Prop({ type: Array, default: [] })
  venueTables: {
    venueConfigId: string;
    tableName: string;
    positionId: string;
    id: string;
    name: string;
    type: "Straight";
    width: number;
    height: number;
    x: number;
    y: number;
    rotation: number;
    isPlaced: boolean;
    rowNumber?: number; // NEW: Row number for pricing
    tablePrice: number; // NEW: Full table rental price
    bookingPrice: number; // NEW: Partial payment (must be <= tablePrice)
    depositPrice: number; // NEW: Security deposit (can be > tablePrice)
    isBooked: boolean; // NEW: Booking status
    bookedBy?: string; // NEW: Reference to shopkeeper/stall booking
  }[];

  @Prop({ type: Array, default: [] })
  addOnItems: {
    id: string;
    name: string;
    price: number;
    description: string;
    addOnImage?: string;
  }[];

  @Prop({ type: Array, default: [] })
  visitorTypes: VisitorType[];

  @Prop({ type: [Object], default: [] })
  venueConfig: VenueConfig[];

  @Prop({ enum: ["draft", "published", "cancelled"], default: "draft" })
  status: string;

  @Prop({ default: false })
  featured: boolean;

  // Boolean guards — controls whether each section is saved
  @Prop({ default: false }) hasVenue: boolean;
  @Prop({ default: false }) hasTables: boolean;
  @Prop({ default: false }) hasSpeakers: boolean;

  // Speaker arrays
  @Prop({ type: Array, default: [] }) speakerTemplates: SpeakerTemplate[];
  @Prop({ type: Array, default: [] }) speakerSlots: SpeakerSlot[];

  @Prop({ type: [Object], default: [] })
  termsAndConditionsforStalls?: termsAndConditionsforStalls[];

  @Prop()
  createdAt: Date;

  @Prop()
  updatedAt: Date;
}

export const EventSchema = SchemaFactory.createForClass(Event);
