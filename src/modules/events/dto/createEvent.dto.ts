// event.dto.ts
import {
  IsString,
  IsDateString,
  IsOptional,
  IsArray,
  IsObject,
  IsUrl,
  IsBoolean,
  IsEnum,
} from "class-validator";
import { Type } from "class-transformer";

export enum Visibility {
  PUBLIC = "public",
  PRIVATE = "private",
  UNLISTED = "unlisted",
}

export class OrganizerDto {
  @IsString()
  name: string;

  @IsString()
  @IsOptional()
  email?: string;

  @IsString()
  @IsOptional()
  phone?: string;

  @IsUrl()
  @IsOptional()
  website?: string;
}

export class SocialMediaDto {
  @IsUrl()
  @IsOptional()
  facebook?: string;

  @IsUrl()
  @IsOptional()
  instagram?: string;

  @IsUrl()
  @IsOptional()
  twitter?: string;
}

export class FeaturesDto {
  @IsBoolean()
  @IsOptional()
  food?: boolean;

  @IsBoolean()
  @IsOptional()
  parking?: boolean;

  @IsBoolean()
  @IsOptional()
  wifi?: boolean;

  @IsBoolean()
  @IsOptional()
  photography?: boolean;

  @IsBoolean()
  @IsOptional()
  security?: boolean;

  @IsBoolean()
  @IsOptional()
  accessibility?: boolean;
}

export class CreateEventDto {
  @IsString()
  title: string;

  @IsString()
  @IsOptional()
  description?: string;

  @IsDateString()
  startDate: string; // Use string ISO date, convert later

  @IsDateString()
  @IsOptional()
  endDate?: string;

  @IsString()
  organizerId: string; // Mongo ObjectId as string

  @IsString()
  @IsOptional()
  location?: string;

  @IsArray()
  @IsString({ each: true })
  @IsOptional()
  images?: string[];

  @IsString()
  @IsOptional()
  category?: string;

  @IsString()
  @IsOptional()
  time?: string;

  @IsString()
  @IsOptional()
  endTime?: string;

  @IsString()
  @IsOptional()
  address?: string;

  @IsString()
  @IsOptional()
  ticketPrice?: string;

  @IsString()
  @IsOptional()
  totalTickets?: string;

  @IsEnum(Visibility)
  @IsOptional()
  visibility?: Visibility;

  @IsString()
  @IsOptional()
  inviteLink?: string;

  @IsArray()
  @IsString({ each: true })
  @IsOptional()
  tags?: string[];

  @IsObject()
  @IsOptional()
  features?: FeaturesDto;

  @IsString()
  @IsOptional()
  ageRestriction?: string;

  @IsString()
  @IsOptional()
  dresscode?: string;

  @IsString()
  @IsOptional()
  specialInstructions?: string;

  @IsString()
  @IsOptional()
  refundPolicy?: string;

  @IsString()
  @IsOptional()
  termsAndConditions?: string;

  @IsObject()
  @Type(() => OrganizerDto)
  @IsOptional()
  organizer?: OrganizerDto;

  @IsObject()
  @Type(() => SocialMediaDto)
  @IsOptional()
  socialMedia?: SocialMediaDto;

  @IsString()
  @IsOptional()
  image?: string;

  @IsArray()
  @IsString({ each: true })
  @IsOptional()
  gallery?: string[];
}
