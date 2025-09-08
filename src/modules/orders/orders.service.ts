import {
  Injectable,
  NotFoundException,
  InternalServerErrorException,
  BadRequestException,
} from "@nestjs/common";
import { InjectModel } from "@nestjs/mongoose";
import { Model, Types } from "mongoose";
import { Order, OrderStatus } from "./entities/order.entity";
import { CreateOrderDto } from "./dto/create-order.dto";
import { Product } from "../products/entities/product.entity";
import { User } from "../users/schemas/user.schema";
import { Shopkeeper } from "../shopkeepers/schemas/shopkeeper.schema";
import { MailService } from "../roles/mail.service";
// import axios from "axios"; // Commented out - not needed without WhatsApp

@Injectable()
export class OrdersService {
  constructor(
    @InjectModel(Order.name) private readonly orderModel: Model<Order>,
    @InjectModel(Product.name) private readonly productModel: Model<Product>, // Add product model
    @InjectModel(User.name) private readonly userModel: Model<User>, // Add user model
    @InjectModel(Shopkeeper.name)
    private readonly shopkeeperModel: Model<Shopkeeper>, // Add shopkeeper model
    private readonly mailService: MailService // Inject your existing mail service
  ) {}

  async createOrder(dto: CreateOrderDto): Promise<Order> {
    try {
      // 1. Validate and update product inventory first
      await this.updateProductInventory(dto.items, "deduct");

      // 2. Create the order
      const order = new this.orderModel({
        ...dto,
        status: OrderStatus.Pending,
      });
      const savedOrder = await order.save();

      // 3. Get shopkeeper details for WhatsApp - COMMENTED OUT
      // const shopkeeper = await this.shopkeeperModel.findById(dto.shopkeeperId);
      // if (shopkeeper?.whatsappNumber) {
      //   await this.sendWhatsAppToShopkeeper(
      //     shopkeeper.whatsappNumber,
      //     shopkeeper.name || shopkeeper.shopName,
      //     savedOrder.orderId,
      //     savedOrder.totalAmount,
      //     dto.items.length
      //   );
      // }

      return savedOrder;
    } catch (error) {
      throw new InternalServerErrorException(
        "Failed to create order: " + error.message
      );
    }
  }

  async updateOrderStatus(
    orderId: string,
    newStatus: OrderStatus
  ): Promise<Order> {
    try {
      const order = await this.orderModel
        .findById({ _id: orderId })
        .populate("userId")
        .populate("shopkeeperId");

      if (!order) throw new NotFoundException("Order not found");

      // Validate status transition if needed
      if (order.status === OrderStatus.Cancelled) {
        throw new BadRequestException(
          "Cannot change status of a cancelled order"
        );
      }

      // Update status and handle side-effects
      order.status = newStatus;

      if (newStatus === OrderStatus.Cancelled) {
        // Restore inventory on cancellation
        await this.updateProductInventory(order.items, "restore");
      }

      await order.save();

      // Notify user: Email and WhatsApp (if needed)
      const user = order.userId as any;
      const shopkeeper = order.shopkeeperId as any;

      // Send email notification
      if (user?.email) {
        console.log("calledd");
        await this.sendOrderStatusEmail(
          user.email,
          user.name,
          order.orderId,
          newStatus !== OrderStatus.Cancelled, // accepted boolean
          newStatus, // status string
          order.totalAmount,
          shopkeeper.name || shopkeeper.shopName
        );
      }

      // Optional: send WhatsApp notification (uncomment and implement accordingly)
      // if (user?.phone) {
      //   await this.sendWhatsAppNotification(user.phone, user.name, order.orderId, newStatus);
      // }

      return order;
    } catch (error) {
      if (
        error instanceof NotFoundException ||
        error instanceof BadRequestException
      ) {
        throw error;
      }
      throw new InternalServerErrorException(
        "Failed to update order status: " + error.message
      );
    }
  }

  // Update product inventory
  private async updateProductInventory(
    items: any[],
    action: "deduct" | "restore"
  ) {
    for (const item of items) {
      const product = await this.productModel.findById(item.productId);
      if (!product) {
        throw new NotFoundException(`Product ${item.productId} not found`);
      }

      // Find subcategory by its name property
      const subcategory = product.subcategories?.find(
        (sub: any) => sub.name === item.subcategoryName
      );
      if (!subcategory) {
        throw new NotFoundException(
          `Subcategory '${item.subcategoryName}' not found`
        );
      }

      // Find variant by its title property
      const variant = subcategory.variants?.find(
        (v: any) => v.title === item.variantTitle
      );
      if (!variant) {
        throw new NotFoundException(`Variant '${item.variantTitle}' not found`);
      }

      const quantityChange =
        action === "deduct" ? -item.quantity : item.quantity;

      if (action === "deduct" && variant.inventory < item.quantity) {
        throw new InternalServerErrorException(
          `Insufficient stock for ${item.productName}. Available: ${variant.inventory}, Requested: ${item.quantity}`
        );
      }

      // Update inventory
      variant.inventory += quantityChange;

      // You need the index for markModified!
      const subcategoryIndex = product.subcategories.findIndex(
        (sub: any) => sub.name === item.subcategoryName
      );
      const variantIndex = subcategory.variants.findIndex(
        (v: any) => v.title === item.variantTitle
      );

      product.markModified(
        `subcategories.${subcategoryIndex}.variants.${variantIndex}.inventory`
      );
      await product.save();
    }
  }

  // WhatsApp to Shopkeeper (New Order) - COMMENTED OUT
  // private async sendWhatsAppToShopkeeper(
  //   phone: string,
  //   shopkeeperName: string,
  //   orderId: string,
  //   amount: number,
  //   itemCount: number
  // ) {
  //   try {
  //     const message = `🔔 New Order Alert!\n\nHi ${shopkeeperName},\n\nYou received a new order:\n📋 Order ID: ${orderId}\n💰 Amount: ₹${amount.toFixed(2)}\n📦 Items: ${itemCount}\n\nPlease confirm or reject the payment in your dashboard.\n\nThank you! 🙏`;
  //     await this.sendWhatsAppMessage(phone, message);
  //   } catch (error) {
  //     console.error("Failed to send WhatsApp to shopkeeper:", error);
  //   }
  // }

  // WhatsApp to User (Order Status Update) - COMMENTED OUT
  // private async sendWhatsAppToUser(
  //   phone: string,
  //   userName: string,
  //   orderId: string,
  //   accepted: boolean,
  //   status: string,
  //   shopkeeperName: string
  // ) {
  //   try {
  //     const statusText = accepted ? "✅ Confirmed" : "❌ Rejected";
  //     const message = `${statusText} Order Update\n\nHi ${userName},\n\nYour order ${orderId} has been ${accepted ? "confirmed" : "rejected"} by ${shopkeeperName}.\n\n📋 Current Status: ${status.toUpperCase()}\n\n${accepted ? "Your order is being processed!" : "Please contact the shopkeeper for more details."}\n\nThank you! 🙏`;
  //     await this.sendWhatsAppMessage(phone, message);
  //   } catch (error) {
  //     console.error("Failed to send WhatsApp to user:", error);
  //   }
  // }

  // Generic WhatsApp sender using CallMeBot (Free) - COMMENTED OUT
  // private async sendWhatsAppMessage(phone: string, message: string) {
  //   try {
  //     const apiKey = process.env.CALLMEBOT_API_KEY;
  //     const url = `https://api.callmebot.com/whatsapp.php`;
  //     const params = {
  //       phone: phone,
  //       text: encodeURIComponent(message),
  //       apikey: apiKey,
  //     };
  //     await axios.get(url, { params });
  //   } catch (error) {
  //     console.error("WhatsApp send error:", error);
  //   }
  // }

  // Professional Email for Order Status
  private async sendOrderStatusEmail(
    email: string,
    userName: string,
    orderId: string,
    accepted: boolean,
    status: string,
    amount: number,
    shopkeeperName: string
  ) {
    try {
      console.log(accepted);
      const subject = accepted
        ? "✅ Order Confirmed - Payment Accepted"
        : "❌ Order Rejected - Payment Declined";

      const emailData = {
        name: userName,
        email: email,
        orderId: orderId,
        status: status.toUpperCase(),
        accepted: accepted,
        amount: amount.toFixed(2),
        shopkeeperName: shopkeeperName,
        date: new Date().toLocaleString(),
      };

      console.log(emailData, "EmailData");

      const htmlContent = this.generateOrderStatusEmailTemplate(emailData);

      console.log(htmlContent, "Hello");

      await this.mailService.sendMail({
        to: email,
        subject: subject,
        html: htmlContent,
      });
    } catch (error) {
      console.error("Failed to send email:", error);
    }
  }

  private generateOrderStatusEmailTemplate(data: any): string {
    const statusColor = data.accepted ? "#22c55e" : "#ef4444";
    const statusIcon = data.accepted ? "✅" : "❌";

    return `
<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1" />
  <title>Order ${data.accepted ? "Confirmed" : "Rejected"}</title>
</head>
<body style="font-family: Arial, sans-serif; line-height: 1.6; margin: 0; padding: 20px; background-color: #f4f4f4;">
  <div style="max-width: 600px; margin: auto; background: white; padding: 30px; border-radius: 10px; box-shadow: 0 0 10px rgba(0,0,0,0.1);">
    <div style="text-align: center; margin-bottom: 30px;">
      <h1 style="color: ${statusColor}; margin: 0;">${statusIcon} Order ${data.accepted ? "Confirmed" : "Rejected"}</h1>
      <p style="color: #666; margin: 10px 0;">Your order status has been updated</p>
    </div>

    <h2 style="color: #333;">Hello ${data.name},</h2>

    <div style="background: #f8f9fa; padding: 20px; border-radius: 8px; border-left: 4px solid ${statusColor}; margin: 20px 0;">
      <h3 style="margin-top: 0; color: #333;">📋 Order Information</h3>
      <table style="width: 100%; border-collapse: collapse;">
        <tr><td style="padding: 8px 0; font-weight: bold;">Order ID:</td><td style="padding: 8px 0;">${data.orderId}</td></tr>
        <tr><td style="padding: 8px 0; font-weight: bold;">Status:</td><td style="padding: 8px 0; color: ${statusColor}; font-weight: bold;">${data.status}</td></tr>
        <tr><td style="padding: 8px 0; font-weight: bold;">Amount:</td><td style="padding: 8px 0;">₹${data.amount}</td></tr>
        <tr><td style="padding: 8px 0; font-weight: bold;">Merchant:</td><td style="padding: 8px 0;">${data.shopkeeperName}</td></tr>
        <tr><td style="padding: 8px 0; font-weight: bold;">Updated:</td><td style="padding: 8px 0;">${data.date}</td></tr>
      </table>
    </div>

    <div style="margin: 30px 0;">
      ${
        data.accepted
          ? `<p style="color: #22c55e; font-size: 16px;"><strong>Great news!</strong> Your payment has been accepted. Your order is now being processed.</p>
             <p>We will keep you updated about your order progress.</p>`
          : `<p style="color: #ef4444; font-size: 16px;"><strong>Order Rejected.</strong> The payment was not accepted.</p>
             <p>Please contact the merchant for more info or place a new order.</p>`
      }
    </div>

    <div style="background: #e3f2fd; padding: 15px; border-radius: 8px; margin-bottom: 20px;">
      <h4 style="margin-top: 0; color: #1976d2;">Need Help?</h4>
      <p>Contact your merchant directly for any questions.</p>
      <p><strong>Merchant:</strong> ${data.shopkeeperName}</p>
    </div>

    <div style="text-align: center; font-size: 12px; color: #999;">
      <p>This is an automated message. Please do not reply.</p>
      <p>© ${new Date().getFullYear()} Event SH</p>
    </div>
  </div>
</body>
</html>
`;
  }

  async getOrderById(orderId: string): Promise<Order> {
    try {
      const order = await this.orderModel
        .findOne({ _id: orderId })
        .populate("userId")
        .populate("shopkeeperId")
        .exec();

      if (!order) throw new NotFoundException("Order not found");
      return order;
    } catch (error) {
      if (error instanceof NotFoundException) throw error;
      throw new InternalServerErrorException(
        "Failed to get order: " + error.message
      );
    }
  }

  async getOrdersByUserId(userId: string): Promise<Order[]> {
    try {
      if (!Types.ObjectId.isValid(userId)) {
        throw new NotFoundException("Invalid userId");
      }
      return await this.orderModel
        .find({ userId })
        .populate("shopkeeperId")
        .exec();
    } catch (error) {
      if (error instanceof NotFoundException) throw error;
      throw new InternalServerErrorException(
        "Failed to get orders by user: " + error.message
      );
    }
  }

  async getOrdersByShopkeeperId(shopkeeperId: string): Promise<Order[]> {
    try {
      if (!Types.ObjectId.isValid(shopkeeperId)) {
        throw new NotFoundException("Invalid shopkeeperId");
      }
      return await this.orderModel
        .find({ shopkeeperId })
        .populate("userId")
        .exec();
    } catch (error) {
      if (error instanceof NotFoundException) throw error;
      throw new InternalServerErrorException(
        "Failed to get orders by shopkeeper: " + error.message
      );
    }
  }

  async listAll(): Promise<Order[]> {
    try {
      return await this.orderModel
        .find()
        .populate("userId")
        .populate("shopkeeperId")
        .exec();
    } catch (error) {
      throw new InternalServerErrorException(
        "Failed to list orders: " + error.message
      );
    }
  }
}
