import {
  IsString,
  IsMongoId,
  IsArray,
  IsNumber,
  IsEnum,
  IsOptional,
  ValidateNested,
  IsDateString,
  IsObject,
} from "class-validator";
import { Type } from "class-transformer";

export enum OrderStatus {
  Pending = "pending",
  Processing = "processing",
  Ready = "ready",
  Shipped = "shipped",
  Cancelled = "cancelled",
}

export enum OrderType {
  Delivery = "delivery",
  Pickup = "pickup",
}

class AddressDto {
  @IsString()
  street: string;

  @IsString()
  city: string;

  @IsString()
  state: string;

  zip: string;

  @IsOptional()
  @IsString()
  instructions?: string;
}

class OrderItemDto {
  @IsString()
  productId: string;

  @IsString()
  productName: string;

  @IsNumber()
  price: number;

  @IsNumber()
  quantity: number;

  @IsOptional()
  @IsString()
  variantTitle?: string;

  @IsOptional()
  @IsString()
  subcategoryName?: string;

  @IsOptional()
  @IsString()
  image?: string;
}

export class CreateOrderDto {
  @IsString()
  orderId: string;

  @IsMongoId()
  userId: string;

  @IsMongoId()
  shopkeeperId: string;

  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => OrderItemDto)
  items: OrderItemDto[];

  @IsNumber()
  totalAmount: number;

  @IsEnum(OrderType)
  orderType: OrderType;

  @IsOptional()
  @ValidateNested()
  @Type(() => AddressDto)
  deliveryAddress?: AddressDto;

  @IsOptional()
  @IsDateString()
  pickupDate?: string;

  @IsOptional()
  @IsString()
  pickupTime?: string;

  // Status is optional on create, defaulted server-side
  @IsOptional()
  @IsEnum(OrderStatus)
  status?: OrderStatus;
}
