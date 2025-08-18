import { Prop, Schema, SchemaFactory } from "@nestjs/mongoose";
import { Document, Types } from "mongoose";

export type ProductDocument = Product & Document;

// Interface for ProductVariant embedded document (no separate schema class)
export interface ProductVariant {
  id: number;
  title: string;
  price: string;
  compareAtPrice?: string;
  sku: string;
  barcode?: string;
  inventory: number;
  options?: Record<string, any>;
}

@Schema({ timestamps: true, collection: "products" })
export class Product {
  @Prop({ required: true })
  name: string;

  @Prop()
  description?: string;

  @Prop({ required: true, type: Number })
  price: number;

  @Prop({ type: Number })
  compareAtPrice?: number;

  @Prop({ required: true, type: Number })
  cost: number;

  @Prop({ required: true })
  sku: string;

  @Prop()
  barcode?: string;

  @Prop({ required: true })
  category: string;

  @Prop({ type: [String], default: [] })
  tags: string[];

  @Prop({ type: [String], default: [] })
  images: string[];

  @Prop({
    type: {
      quantity: { type: Number, required: true },
      trackQuantity: { type: Boolean, default: true, required: true },
      allowBackorder: { type: Boolean, default: false, required: true },
      lowStockThreshold: { type: Number, default: 10, required: true },
    },
    required: true,
  })
  inventory: {
    quantity: number;
    trackQuantity: boolean;
    allowBackorder: boolean;
    lowStockThreshold: number;
  };

  @Prop({
    type: [
      {
        id: { type: Number, required: true },
        title: { type: String, required: true },
        price: { type: Number, required: true },
        compareAtPrice: { type: Number },
        sku: { type: String, required: true },
        barcode: { type: String },
        inventory: { type: Number, required: true },
        options: { type: Object }, // Flexible object for variant options
      },
    ],
    default: [],
  })
  variants?: ProductVariant[];

  @Prop({ enum: ["active", "draft", "archived"], default: "active" })
  status: "active" | "draft" | "archived";

  @Prop({ type: Number })
  weight?: number;

  @Prop({
    type: {
      length: { type: Number },
      width: { type: Number },
      height: { type: Number },
    },
  })
  dimensions?: {
    length?: number;
    width?: number;
    height?: number;
  };

  @Prop({
    type: {
      title: { type: String, maxlength: 60 },
      description: { type: String, maxlength: 160 },
    },
  })
  seo?: {
    title?: string;
    description?: string;
  };

  @Prop({ type: Types.ObjectId, ref: "Shopkeeper", required: true })
  shopkeeperId: Types.ObjectId;
}

export const ProductSchema = SchemaFactory.createForClass(Product);
