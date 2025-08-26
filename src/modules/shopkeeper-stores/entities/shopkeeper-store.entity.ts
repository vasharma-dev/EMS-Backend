import { Prop, Schema, SchemaFactory } from "@nestjs/mongoose";
import { Document, Types } from "mongoose";

export interface ContactInfo {
  phone?: string;
  email?: string;
  address?: string;
  hours?: string;
  website?: string;
}

export interface StorefrontSettings {
  general: {
    storeName: string;
    tagline: string;
    description?: string;
    logo?: string;
    favicon?: string;
    contactInfo: ContactInfo;
  };
  design: {
    theme: string;
    primaryColor: string;
    secondaryColor: string;
    fontFamily: string;
    layout: string;
    bannerImage?: string;
    showBanner: boolean;
    bannerHeight: string;
  };
  features: {
    showSearch: boolean;
    showFilters: boolean;
    showReviews: boolean;
    showWishlist: boolean;
    showSocialMedia: boolean;
    enableChat: boolean;
    showNewsletter: boolean;
  };
  seo: {
    metaTitle: string;
    metaDescription?: string;
    keywords?: string;
    customCode?: string;
  };
}

export type ShopkeeperStoreDocument = ShopfrontStore & Document;

@Schema({ timestamps: true, collection: "shopkeeper_stores" })
export class ShopfrontStore {
  @Prop({
    type: Types.ObjectId,
    ref: "Shopkeeper",
    required: true,
    unique: true,
  })
  shopkeeperId: Types.ObjectId;

  @Prop({
    type: Object,
    required: true,
    default: {
      general: {
        storeName: "EventFlow Shop",
        tagline: "Premium artisanal products crafted.",
        description: "",
        logo: "",
        favicon: "",
        contactInfo: {
          phone: "",
          email: "",
          address: "",
          hours: "",
          website: "",
        },
      },
      design: {
        theme: "light",
        primaryColor: "#6366f1",
        secondaryColor: "#8b5cf6",
        fontFamily: "Inter",
        layout: "modern",
        bannerImage: "",
        showBanner: true,
        bannerHeight: "large",
      },
      features: {
        showSearch: true,
        showFilters: true,
        showReviews: true,
        showWishlist: true,
        showSocialMedia: true,
        enableChat: false,
        showNewsletter: true,
      },
      seo: {
        metaTitle: "EventFlow Shop - Premium Storefront",
        metaDescription: "",
        keywords: "",
        customCode: "",
      },
    },
  })
  settings: StorefrontSettings;
}

export const ShopfrontStoreSchema =
  SchemaFactory.createForClass(ShopfrontStore);
