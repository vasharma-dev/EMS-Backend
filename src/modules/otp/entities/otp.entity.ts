import { Prop, Schema, SchemaFactory } from "@nestjs/mongoose";
import { Document } from "mongoose";

@Schema({ timestamps: true })
export class Otp extends Document {
  @Prop({ required: true })
  email: string;

  @Prop({ required: true })
  role: "organizer" | "shopkeeper"; // or string if you want more roles

  @Prop({ required: true })
  otp: string;

  @Prop({ required: true })
  expiresAt: Date;

  @Prop({ default: 0 }) // Add this field for attempt tracking
  attempts: number;

  @Prop({ default: false }) // Add this field to track if OTP is verified
  verified: boolean;
}

export const OtpSchema = SchemaFactory.createForClass(Otp);

// Create TTL index - MongoDB will auto-delete expired documents
OtpSchema.index({ expiresAt: 1 }, { expireAfterSeconds: 0 });
