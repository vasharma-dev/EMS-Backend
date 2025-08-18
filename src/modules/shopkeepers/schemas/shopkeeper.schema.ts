import { Prop, Schema, SchemaFactory } from "@nestjs/mongoose";
import { Document } from "mongoose";

export type ShopkeeperDocument = Shopkeeper & Document;

@Schema({ timestamps: true })
export class Shopkeeper {
  @Prop({ required: true })
  name: string;

  @Prop({ required: true })
  shopName: string;

  @Prop({ required: true, unique: true })
  email: string;

  @Prop({ required: true })
  businessEmail: string;

  @Prop({ required: true })
  password: string;

  @Prop({ required: true })
  phone: string;

  @Prop({ required: true })
  address: string;

  @Prop()
  description: string;

  @Prop({ type: Object }) // Validate shape in DTO
  businessHours: Record<
    string,
    { open: string; close: string; closed: boolean }
  >;

  @Prop({ default: false })
  approved: boolean;

  @Prop({ default: false })
  rejected: boolean;

  @Prop()
  updatedAt?: Date;

  @Prop()
  createdAt: Date;
}

export const ShopkeeperSchema = SchemaFactory.createForClass(Shopkeeper);
