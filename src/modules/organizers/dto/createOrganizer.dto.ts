import {
  IsEmail,
  IsString,
  MinLength,
  IsOptional,
  IsObject,
  IsNotEmpty,
} from "class-validator";

export class CreateOrganizerDto {
  @IsString()
  name: string;

  @IsEmail()
  email: string;

  @IsString()
  @MinLength(8)
  password: string;

  @IsString()
  @IsNotEmpty()
  organizationName: string;

  @IsString()
  phone: string;

  @IsOptional()
  @IsString()
  website?: string;

  @IsOptional()
  @IsString()
  address?: string;

  @IsOptional()
  @IsString()
  bio?: string;

  @IsOptional()
  @IsString()
  logo?: string;

  @IsOptional()
  @IsObject()
  socialMedia?: {
    twitter?: string;
    linkedin?: string;
    instagram?: string;
    facebook?: string;
  };
}
