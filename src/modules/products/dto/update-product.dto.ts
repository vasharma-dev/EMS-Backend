import {
  IsArray,
  IsBoolean,
  IsEnum,
  IsNumber,
  IsOptional,
  IsObject,
  IsString,
  MaxLength,
  ValidateNested,
  IsMongoId,
  IsNotEmpty,
  Min,
} from "class-validator";
import { Type } from "class-transformer";

export class UpdateProductVariantDto {
  @IsOptional()
  @IsNumber()
  id?: number;

  @IsOptional()
  @IsString()
  title?: string;

  @IsOptional()
  @IsNumber()
  price?: number;

  @IsOptional()
  @IsNumber()
  compareAtPrice?: number;

  @IsOptional()
  @IsString()
  sku?: string;

  @IsOptional()
  @IsString()
  barcode?: string;

  @IsOptional()
  @IsNumber()
  inventory?: number;

  @IsOptional()
  @IsObject()
  options?: Record<string, any>;
}

export class UpdateInventoryDto {
  @IsOptional()
  @Min(0)
  quantity?: number;

  @IsOptional()
  @IsBoolean()
  trackQuantity?: boolean;

  @IsOptional()
  @IsBoolean()
  allowBackorder?: boolean;

  @IsOptional()
  @IsNumber()
  lowStockThreshold?: number;
}

export class UpdateDimensionsDto {
  @IsOptional()
  @IsNumber()
  length?: number;

  @IsOptional()
  @IsNumber()
  width?: number;

  @IsOptional()
  @IsNumber()
  height?: number;
}

export class UpdateSeoDto {
  @IsOptional()
  @IsString()
  @MaxLength(60)
  title?: string;

  @IsOptional()
  @IsString()
  @MaxLength(160)
  description?: string;
}

export class UpdateProductDto {
  @IsOptional()
  @IsString()
  name?: string;

  @IsOptional()
  @IsString()
  description?: string;

  @IsOptional()
  @IsString()
  price?: string;

  @IsOptional()
  @IsString()
  compareAtPrice?: string;

  @IsOptional()
  @IsString()
  cost?: string;

  @IsOptional()
  @IsString()
  sku?: string;

  @IsOptional()
  @IsString()
  barcode?: string;

  @IsOptional()
  @IsString()
  category?: string;

  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  tags?: string[];

  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  images?: string[];

  @IsOptional()
  @ValidateNested()
  @Type(() => UpdateInventoryDto)
  inventory?: UpdateInventoryDto;

  @IsOptional()
  @ValidateNested({ each: true })
  @Type(() => UpdateProductVariantDto)
  variants?: UpdateProductVariantDto[];

  @IsOptional()
  @IsEnum(["active", "draft", "archived"])
  status?: "active" | "draft" | "archived";

  @IsOptional()
  @IsNumber()
  weight?: number;

  @IsOptional()
  @ValidateNested()
  @Type(() => UpdateDimensionsDto)
  dimensions?: UpdateDimensionsDto;

  @IsOptional()
  @ValidateNested()
  @Type(() => UpdateSeoDto)
  seo?: UpdateSeoDto;

  @IsOptional()
  @IsMongoId()
  shopkeeperId?: string;
}
