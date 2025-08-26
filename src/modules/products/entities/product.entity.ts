import { Prop, Schema, SchemaFactory } from "@nestjs/mongoose";
import { Document, Types } from "mongoose";

// --- Interfaces ---

export interface ProductVariant {
  id: number;
  title: string;
  price: number;
  compareAtPrice?: number;
  sku: string;
  barcode?: string;
  inventory: number;
  lowstockThreshold?: number;
  trackQuantity: boolean;
  options?: Record<string, any>;
}

export interface ProductSubcategory {
  id: number;
  name: string;
  description?: string;
  basePrice?: number;
  variants: ProductVariant[];
}

export type ProductDocument = Product & Document;

@Schema({ timestamps: true, collection: "products" })
export class Product {
  @Prop({ required: true })
  name: string;

  @Prop()
  description?: string;

  @Prop({ type: Number })
  compareAtPrice?: number;

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

  // 💡 No top-level inventory here anymore

  @Prop({
    type: [
      {
        id: { type: Number, required: true },
        name: { type: String, required: true },
        description: { type: String },
        basePrice: { type: Number },
        variants: [
          {
            id: { type: Number, required: true },
            title: { type: String, required: true },
            price: { type: Number, required: true },
            compareAtPrice: { type: Number },
            sku: { type: String, required: true },
            barcode: { type: String },
            inventory: { type: Number, required: true },
            lowstockThreshold: { type: Number, default: 10 },
            trackQuantity: { type: Boolean, default: true },
            options: { type: Object, default: {} },
          },
        ],
      },
    ],
    default: [],
  })
  subcategories: ProductSubcategory[];

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
