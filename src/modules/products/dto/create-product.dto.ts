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

export class ProductVariantDto {
  @IsNumber()
  @IsNotEmpty()
  id: number;

  @IsString()
  @IsNotEmpty()
  title: string;

  @IsNumber()
  @IsNotEmpty()
  price: number;

  @IsOptional()
  @IsNumber()
  compareAtPrice?: number;

  @IsString()
  @IsNotEmpty()
  sku: string;

  @IsOptional()
  @IsString()
  barcode?: string;

  @IsNumber()
  @IsNotEmpty()
  inventory: number;

  @IsOptional()
  @IsObject()
  options?: Record<string, any>;
}

export class InventoryDto {
  @Min(0)
  quantity: number;

  @IsBoolean()
  trackQuantity: boolean;

  @IsBoolean()
  allowBackorder: boolean;

  @IsNumber()
  lowStockThreshold: number;
}

export class DimensionsDto {
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

export class SeoDto {
  @IsOptional()
  @IsString()
  @MaxLength(60)
  title?: string;

  @IsOptional()
  @IsString()
  @MaxLength(160)
  description?: string;
}

export class CreateProductDto {
  @IsString()
  @IsNotEmpty()
  name: string;

  @IsOptional()
  @IsString()
  description?: string;

  @IsString()
  @IsNotEmpty()
  price: string;

  @IsOptional()
  @IsString()
  compareAtPrice?: string;

  @IsString()
  @IsNotEmpty()
  cost: string;

  @IsString()
  @IsNotEmpty()
  sku: string;

  @IsOptional()
  @IsString()
  barcode?: string;

  @IsString()
  @IsNotEmpty()
  category: string;

  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  tags?: string[];

  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  images?: string[];

  @ValidateNested()
  @Type(() => InventoryDto)
  inventory: InventoryDto;

  @IsOptional()
  @ValidateNested({ each: true })
  @Type(() => ProductVariantDto)
  variants?: ProductVariantDto[];

  @IsEnum(["active", "draft", "archived"])
  status: "active" | "draft" | "archived";

  @IsOptional()
  @IsNumber()
  weight?: number;

  @IsOptional()
  @ValidateNested()
  @Type(() => DimensionsDto)
  dimensions?: DimensionsDto;

  @IsOptional()
  @ValidateNested()
  @Type(() => SeoDto)
  seo?: SeoDto;

  @IsMongoId()
  shopkeeperId: string;
}
