import {
  IsEmail,
  IsString,
  MinLength,
  IsNotEmpty,
  IsObject,
  ValidateNested,
  IsBoolean,
  IsOptional,
} from "class-validator";
import { Type } from "class-transformer";

class BusinessHourDto {
  @IsString()
  @IsOptional()
  open?: string;

  @IsString()
  @IsOptional()
  close?: string;

  @IsBoolean()
  @IsOptional()
  closed?: boolean;
}

export class CreateShopkeeperDto {
  @IsString()
  @IsNotEmpty()
  name: string;

  @IsString()
  @IsNotEmpty()
  shopName: string;

  @IsEmail()
  @IsNotEmpty()
  email: string;

  @IsString()
  @IsNotEmpty()
  @MinLength(8)
  password: string;

  @IsString()
  @IsNotEmpty()
  phone: string;

  @IsString()
  @IsNotEmpty()
  address: string;

  @IsString()
  @IsOptional()
  description?: string;

  @IsEmail()
  @IsNotEmpty()
  businessEmail: string;

  @IsObject()
  @ValidateNested({ each: true })
  @Type(() => BusinessHourDto)
  businessHours: Record<string, BusinessHourDto>;
}
