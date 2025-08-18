// src/users/dto/create-user.dto.ts
import { IsString, IsNotEmpty, IsOptional, IsEmail } from "class-validator";

export class CreateUserDto {
  @IsString()
  @IsNotEmpty()
  name: string;

  @IsEmail()
  @IsNotEmpty()
  email: string;

  @IsString()
  @IsOptional()
  password?: string;

  @IsString()
  @IsOptional()
  provider?: string; // e.g., 'google', 'instagram'

  @IsString()
  @IsOptional()
  providerId?: string; // Unique ID from the social provider
}
