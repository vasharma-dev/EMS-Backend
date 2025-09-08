import {
  Controller,
  Post,
  Body,
  Get,
  Param,
  Patch,
  Query,
  BadRequestException,
} from "@nestjs/common";
import { OrdersService } from "./orders.service";
import { CreateOrderDto } from "./dto/create-order.dto";
import { OrderStatus } from "./entities/order.entity";
import { UpdateOrderDto } from "./dto/update-order.dto";

@Controller("orders")
export class OrdersController {
  constructor(private readonly ordersService: OrdersService) {}

  @Post("create-order")
  async create(@Body() dto: CreateOrderDto) {
    try {
      return await this.ordersService.createOrder(dto);
    } catch (err) {
      throw new BadRequestException(err.message);
    }
  }

  @Get("get-orders/:orderId")
  async getByOrderId(@Param("orderId") orderId: string) {
    try {
      return await this.ordersService.getOrderById(orderId);
    } catch (err) {
      throw new BadRequestException(err.message);
    }
  }

  @Get("get-orders/shopkeeper/:shopkeeperId")
  async getByField(@Param("shopkeeperId") shopkeeperId: string) {
    try {
      return await this.ordersService.getOrdersByShopkeeperId(shopkeeperId);
    } catch (err) {
      throw new BadRequestException(err.message);
    }
  }

  @Get("get-orders/user/:userId")
  async getByUser(@Param("userId") userId: string) {
    try {
      return await this.ordersService.getOrdersByUserId(userId);
    } catch (err) {
      throw new BadRequestException(err.message);
    }
  }

  @Patch(":orderId/status")
  async confirmOrder(
    @Param("orderId") orderId: string,
    @Body() updateDTO: UpdateOrderDto
  ) {
    try {
      // If order is for delivery, confirm => Processing; if pickup, confirm => Ready
      const order = await this.ordersService.getOrderById(orderId);
      console.log(order, "Order");
      if (!order) throw new BadRequestException("Order not found");
      console.log(updateDTO.status, "status");

      return await this.ordersService.updateOrderStatus(
        orderId,
        updateDTO.status
      );
    } catch (err) {
      throw new BadRequestException(err.message);
    }
  }

  @Patch(":orderId/reject")
  async rejectOrder(@Param("orderId") orderId: string) {
    try {
      return await this.ordersService.updateOrderStatus(
        orderId,
        OrderStatus.Cancelled
      );
    } catch (err) {
      throw new BadRequestException(err.message);
    }
  }
}
