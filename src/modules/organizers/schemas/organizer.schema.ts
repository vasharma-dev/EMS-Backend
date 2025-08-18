import { Prop, Schema, SchemaFactory } from "@nestjs/mongoose";
import { Document } from "mongoose";

export type OrganizerDocument = Organizer & Document;

@Schema({ timestamps: true })
export class Organizer {
  @Prop({ required: true })
  name: string;

  @Prop({ required: true })
  organizationName: string;

  @Prop({ required: true })
  phone: string;

  @Prop({ required: true, unique: true })
  email: string;

  @Prop({ required: true })
  password: string;

  @Prop()
  logo: string; // URL or path to logo image

  @Prop()
  website: string;

  @Prop()
  address: string;

  @Prop()
  bio: string;

  @Prop({
    type: {
      twitter: String,
      linkedin: String,
      instagram: String,
      facebook: String,
    },
    default: {},
  })
  socialMedia: {
    twitter?: string;
    linkedin?: string;
    instagram?: string;
    facebook?: string;
  };

  @Prop({ default: false })
  approved: boolean;

  @Prop({ default: false })
  rejected: boolean;

  @Prop()
  updatedAt?: Date;

  @Prop()
  createdAt: Date;
}

export const OrganizerSchema = SchemaFactory.createForClass(Organizer);
