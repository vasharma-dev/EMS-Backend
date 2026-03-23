import {
  Injectable,
  NotFoundException,
  InternalServerErrorException,
  BadRequestException,
} from "@nestjs/common";
import { InjectModel } from "@nestjs/mongoose";
import { Model, Types } from "mongoose";
import { CreateTicketDto } from "./dto/create-ticket.dto";
import { UpdateTicketDto } from "./dto/update-ticket.dto";
import { Ticket, TicketDocument, TicketStatus } from "./entities/ticket.entity";
import { Event } from "../events/schemas/event.schema";
import { Organizer } from "../organizers/schemas/organizer.schema";
import * as QRCode from "qrcode";
import * as fs from "fs";
import * as path from "path";
import { MailService } from "../roles/mail.service";
import { OtpService } from "../otp/otp.service";
import * as puppeteer from "puppeteer";
import { User } from "../users/schemas/user.schema";
import { UsersService } from "../users/users.service";

@Injectable()
export class TicketsService {
  constructor(
    @InjectModel(Ticket.name) private ticketModel: Model<TicketDocument>,
    @InjectModel(Event.name) private eventModel: Model<Event>,
    @InjectModel(Organizer.name) private organizerModel: Model<Organizer>,
    @InjectModel(User.name) private readonly userModel: Model<User>,
    private readonly usersService: UsersService,
    private mailService: MailService,
    private otpService: OtpService,
  ) {
    const qrDir = path.join(process.cwd(), "uploads", "generatedQRs");
    if (!fs.existsSync(qrDir)) fs.mkdirSync(qrDir, { recursive: true });
  }

  async create(createTicketDto: CreateTicketDto): Promise<Ticket> {
    try {
      // 1. Find or create user by WhatsApp number
      let user = await this.userModel
        .findOne({
          whatsAppNumber: createTicketDto.customerDetails.whatsapp,
        })
        .exec();

      if (!user) {
        // Create new user record
        const createUserDto = {
          name:
            `${createTicketDto.customerDetails.firstName} ${createTicketDto.customerDetails.lastName}` ||
            "Guest User",
          email: createTicketDto.customerDetails.email || null,
          password: null,
          provider: "whatsapp",
          providerId: null,
          whatsAppNumber: createTicketDto.customerDetails.whatsapp,
        };
        user = await this.usersService.create(createUserDto);
      }

      // Use email from user record if available
      const ticketEmail =
        user.email || createTicketDto.customerDetails.email || null;

      const whatsAppNumber =
        user.whatsAppNumber || createTicketDto.customerDetails.whatsapp || null;

      // 2. Ticket details setup
      const customerName = `${createTicketDto.customerDetails.firstName} ${createTicketDto.customerDetails.lastName}`;
      const ticketDetails = createTicketDto.tickets.map((t) => ({
        ticketType: t.type,
        quantity: t.quantity,
        price: t.price,
        featureAccess: Array.isArray(t.featureAccess) ? t.featureAccess : [],
      }));
      const totalQuantity = createTicketDto.tickets.reduce(
        (acc, t) => acc + t.quantity,
        0,
      );

      // 3. Generate secure QR payload
      const qrPayload = {
        warning:
          "❌ Normal scanners not allowed. Please use the Eventsh app to scan this ticket.",
        type: "eventsh-ticket",
        ticketId: createTicketDto.ticketId,
        eventId: createTicketDto.eventId,
        coupon: createTicketDto.coupon || null,
        issuedAt: new Date().toISOString(),
        // Ticket type + feature info for scanner app
        tickets: createTicketDto.tickets.map((t) => ({
          ticketType: t.type,
          quantity: t.quantity,
          featureAccess: Array.isArray(t.featureAccess) ? t.featureAccess : [],
        })),
      };

      console.log("QR Payload:", qrPayload);

      const qrCodeBase64 = await QRCode.toDataURL(JSON.stringify(qrPayload), {
        width: 200,
        margin: 2,
      });
      await this.saveQRToDisk(qrCodeBase64, createTicketDto.ticketId);

      // 4. Create the ticket document
      const ticket = new this.ticketModel({
        ticketId: createTicketDto.ticketId,
        eventId: new Types.ObjectId(createTicketDto.eventId),
        organizerId: new Types.ObjectId(createTicketDto.organizerId),
        eventTitle: createTicketDto.eventInfo.title,
        eventDate: new Date(createTicketDto.eventInfo.date),
        eventTime: createTicketDto.eventInfo.time,
        eventVenue: createTicketDto.eventInfo.venue,
        customerName,
        coupon: createTicketDto.coupon || null,
        customerEmail: ticketEmail,
        customerWhatsapp: whatsAppNumber,
        customerEmergencyContact:
          createTicketDto.customerDetails.emergencyContact,
        ticketDetails,
        totalAmount: createTicketDto.total,
        paymentConfirmed: createTicketDto.paymentConfirmed,
        status: createTicketDto.paymentConfirmed
          ? TicketStatus.CONFIRMED
          : TicketStatus.PENDING,
        purchaseDate: new Date(createTicketDto.purchaseDate),
        discount: createTicketDto.discount,
        couponCode: createTicketDto.couponCode,
        notes: createTicketDto.notes,
        qrCode: qrCodeBase64,
        isUsed: false,
        // Optional: may want to store a userId/reference here as well
        userId: user._id,
      });

      await this.updateEventTicketCount(
        createTicketDto.eventId,
        createTicketDto.tickets.map((t) => ({
          type: t.type,
          quantity: t.quantity,
        })),
      );

      const savedTicket = await ticket.save();
      

      // 5. Delivery - WhatsApp or Email fallback (prefer WhatsApp)
      if (whatsAppNumber) {
        console.log(whatsAppNumber);
        try {
          console.log("called");
          await this.sendTicketViaWhatsApp(
            savedTicket,
            qrCodeBase64,
            whatsAppNumber,
          );
        } catch (error) {
          // throw error;
          console.log(error);
          if (ticketEmail) {
            await this.sendTicketViaEmail(savedTicket, qrCodeBase64);
          }
        }
      } else if (ticketEmail) {
        await this.sendTicketViaEmail(savedTicket, qrCodeBase64);
      }

      return savedTicket;
    } catch (error) {
      throw new InternalServerErrorException(
        `Failed to create ticket: ${error.message}`,
      );
    }
  }

  // --- Puppeteer PDF Generation ---
  private generateTicketHTML(ticket: Ticket, qrBase64: string): string {
    const eventDate = new Date(ticket.eventDate).toLocaleDateString();

    // Build ticket type breakdown rows
    const ticketBreakdownRows = ticket.ticketDetails
      .map((td) => {
        const features =
          Array.isArray(td.featureAccess) && td.featureAccess.length > 0
            ? td.featureAccess
                .map(
                  (f) =>
                    `<span style="display:inline-block;background:#f0fdf4;color:#15803d;border:1px solid #bbf7d0;border-radius:20px;padding:2px 10px;font-size:12px;margin:2px;font-weight:600;text-transform:capitalize;">✓ ${f}</span>`,
                )
                .join("")
            : `<span style="font-size:12px;color:#94a3b8;">No special access</span>`;

        return `
        <div style="background:#f9fafb;border-radius:8px;padding:12px 16px;margin-bottom:10px;border:1px solid #e5e7eb;">
          <div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:6px;">
            <span style="font-weight:700;font-size:15px;color:#1e293b;">🎟 ${td.ticketType}</span>
            <span style="font-size:14px;color:#475569;">× ${td.quantity} &nbsp;|&nbsp; $${(td.price * td.quantity).toFixed(2)}</span>
          </div>
          <div style="margin-top:5px;">${features}</div>
        </div>`;
      })
      .join("");

    return `<!DOCTYPE html>
  <html lang="en">
  <head>
    <meta charset="UTF-8">
    <title>Eventsh Ticket</title>
    <style>
      body { font-family: Arial, sans-serif; margin:0; background:#fff; color:#18181b; }
      .header { background: linear-gradient(135deg, #3b82f6, #6366f1); color:white; text-align:center; padding:30px 24px 20px; }
      .header h1 { margin:0; font-size:28px; }
      .header .subtitle { margin:6px 0 0 0; font-size:17px; opacity:0.93; }
      .container { max-width:620px; margin:0 auto; background:white; border:2px solid #e5e7eb; border-radius:14px; overflow:hidden; }
      .details { padding:24px; }
      .detailsTitle { font-size:20px; font-weight:bold; margin-bottom:16px; color:#1e293b; }
      .info { background:#f3f4f6; border-radius:9px; padding:14px 18px; margin-bottom:16px; }
      .info p { margin:0 0 6px 0; font-size:15px; line-height:1.5; }
      .section-title { font-size:15px; font-weight:700; color:#1e293b; margin:16px 0 8px 0; }
      .qr-section { margin:20px 0; text-align:center; }
      .qr-section img { border-radius:10px; border:2px solid #e5e7eb; width:200px; height:200px; }
      .info-warning { background:#fef2f2; border:1.5px solid #fecaca; border-radius:10px; margin-top:14px; color:#dc2626; padding:10px 12px; font-size:13px; }
      .footer { padding:12px; background:#f1f5f9; color:#64748b; font-size:12px; text-align:center; border-top:1px solid #e5e7eb; }
    </style>
  </head>
  <body>
    <div class="container">
      <div class="header">
        <h1>EVENTSH TICKET</h1>
        <div class="subtitle">${ticket.eventTitle}</div>
      </div>
      <div class="details">
        <div class="detailsTitle">Ticket Details</div>
        <div class="info">
          <p><strong>🎫 Ticket ID:</strong> ${ticket.ticketId}</p>
          <p><strong>👤 Attendee:</strong> ${ticket.customerName}</p>
          <p><strong>📅 Date:</strong> ${eventDate}</p>
          <p><strong>🕒 Time:</strong> ${ticket.eventTime || "N/A"}</p>
          <p><strong>📍 Venue:</strong> ${ticket.eventVenue || "N/A"}</p>
          <p><strong>💰 Total:</strong> $${ticket.totalAmount?.toFixed(2) || "0.00"}</p>
        </div>

        <div class="section-title">🎟 Ticket Type(s) & Feature Access</div>
        ${ticketBreakdownRows}

        <div class="qr-section">
          <div style="font-size:15px;font-weight:600;margin-bottom:8px;color:#1e293b;">Scan at Event Entrance</div>
          <img src="${qrBase64}" alt="Ticket QR Code" />
          <div style="font-size:11px;color:#94a3b8;margin-top:6px;">Use the official Eventsh app to scan</div>
        </div>
        <div class="info-warning">
          ⚠️ <strong>Important:</strong> This QR code can ONLY be scanned using the official Eventsh app. Normal camera scanners will not work.
        </div>
      </div>
      <div class="footer">© ${new Date().getFullYear()} Eventsh. All rights reserved.</div>
    </div>
  </body>
  </html>`;
  }

  private async generateTicketPDF(
    ticket: Ticket,
    qrBase64: string,
  ): Promise<Buffer> {
    const html = this.generateTicketHTML(ticket, qrBase64);
    const browser = await puppeteer.launch({
      headless: true,
      args: ["--no-sandbox", "--disable-setuid-sandbox"],
    });
    const page = await browser.newPage();
    await page.setContent(html, { waitUntil: "networkidle0" });
    const uint8arrayBuffer = await page.pdf({
      format: "A4",
      printBackground: true,
      margin: { top: "10mm", bottom: "0mm", left: "0mm", right: "0mm" },
    });
    await browser.close();
    const buffer = Buffer.from(uint8arrayBuffer);
    return buffer;
  }

  private async sendTicketViaWhatsApp(
    ticket: Ticket,
    qrBase64: string,
    whatsappNumber: string,
  ): Promise<void> {
    try {
      console.log("Called 1");
      const pdfBuffer = await this.generateTicketPDF(ticket, qrBase64);
      const pdfDir = path.join(process.cwd(), "uploads", "tickets");
      if (!fs.existsSync(pdfDir)) fs.mkdirSync(pdfDir, { recursive: true });
      const pdfFileName = `ticket_${ticket.ticketId}.pdf`;
      const pdfPath = path.join(pdfDir, pdfFileName);
      await fs.promises.writeFile(pdfPath, pdfBuffer);

      const eventDate = new Date(ticket.eventDate).toLocaleDateString();
      const ticketLines = ticket.ticketDetails
        .map((td) => {
          const features =
            Array.isArray(td.featureAccess) && td.featureAccess.length > 0
              ? `\n   ✅ Features: ${td.featureAccess.join(", ")}`
              : "";
          return `🎟 *${td.ticketType}* × ${td.quantity} — $${(td.price * td.quantity).toFixed(2)}${features}`;
        })
        .join("\n");

      const message = `🎉 *Your Eventsh Ticket is Ready!*

🎫 *Event:* ${ticket.eventTitle}
👤 *Attendee:* ${ticket.customerName}
📅 *Date:* ${eventDate}
🕒 *Time:* ${ticket.eventTime || "N/A"}
📍 *Venue:* ${ticket.eventVenue || "N/A"}
💰 *Total Amount:* $${ticket.totalAmount?.toFixed(2) || "0.00"}

*Your Tickets:*
${ticketLines}

⚠️ *Important:* Your ticket PDF is attached. Please save it and present the QR code at the event entrance.
The QR code can ONLY be scanned using the official Eventsh app.

Thank you for choosing Eventsh! 🎊`;
      await this.otpService.sendWhatsAppMessage(whatsappNumber, message);
      await this.otpService.sendMediaMessage(
        whatsappNumber,
        pdfPath,
        `🎫 Your ticket for ${ticket.eventTitle}`,
      );
    } catch (error) {
      throw error;
    }
  }

  private async sendTicketViaEmail(
    ticket: Ticket,
    qrBase64: string,
  ): Promise<void> {
    try {
      const eventDate = new Date(ticket.eventDate).toLocaleDateString();
      const emailTicketRows = ticket.ticketDetails
        .map((td) => {
          const features =
            Array.isArray(td.featureAccess) && td.featureAccess.length > 0
              ? td.featureAccess
                  .map(
                    (f) =>
                      `<span style="display:inline-block;background:#f0fdf4;color:#15803d;border:1px solid #bbf7d0;border-radius:20px;padding:2px 8px;font-size:12px;margin:2px;font-weight:600;text-transform:capitalize;">✓ ${f}</span>`,
                  )
                  .join("")
              : `<span style="font-size:12px;color:#94a3b8;">No special access</span>`;
          return `
      <div style="background:#f9fafb;border-radius:8px;padding:10px 14px;margin-bottom:8px;border:1px solid #e5e7eb;">
        <div style="display:flex;justify-content:space-between;">
          <strong>🎟 ${td.ticketType}</strong>
          <span>× ${td.quantity} | $${(td.price * td.quantity).toFixed(2)}</span>
        </div>
        <div style="margin-top:5px;">${features}</div>
      </div>`;
        })
        .join("");

      const html = `
  <div style="font-family:Arial,sans-serif;max-width:600px;margin:0 auto;border:1px solid #e2e8f0;border-radius:12px;overflow:hidden;">
    <div style="background:linear-gradient(135deg,#3b82f6,#6366f1);color:white;padding:30px;text-align:center;">
      <h1 style="margin:0;font-size:24px;">EVENTSH TICKET</h1>
      <p style="margin:8px 0 0 0;opacity:0.9;">${ticket.eventTitle}</p>
    </div>
    <div style="padding:25px;">
      <h2 style="color:#1e293b;font-size:18px;margin-bottom:16px;">Ticket Details</h2>
      <div style="background:#f8fafc;padding:15px;border-radius:8px;margin-bottom:16px;">
        <p><strong>🎫 Ticket ID:</strong> ${ticket.ticketId}</p>
        <p><strong>👤 Attendee:</strong> ${ticket.customerName}</p>
        <p><strong>📅 Date:</strong> ${eventDate}</p>
        <p><strong>🕒 Time:</strong> ${ticket.eventTime || "N/A"}</p>
        <p><strong>📍 Venue:</strong> ${ticket.eventVenue || "N/A"}</p>
        <p><strong>💰 Total Amount:</strong> $${ticket.totalAmount?.toFixed(2) || "0.00"}</p>
      </div>
      <h3 style="font-size:15px;font-weight:700;color:#1e293b;margin:0 0 10px 0;">🎟 Ticket Type(s) & Feature Access</h3>
      ${emailTicketRows}
      <div style="text-align:center;margin:25px 0;">
        <p style="margin-bottom:12px;font-weight:600;color:#1e293b;">Scan at Event Entrance</p>
        <img src="cid:qrcodeeventsh" alt="Ticket QR Code" style="width:200px;height:200px;border:2px solid #e2e8f0;border-radius:8px;" />
      </div>
      <div style="background:#fef2f2;border:1px solid #fecaca;border-radius:8px;padding:15px;margin-top:16px;">
        <p style="margin:0;color:#dc2626;font-size:14px;">⚠️ <strong>Important:</strong> This QR code can ONLY be scanned using the official Eventsh app.<br>Normal camera scanners will not work.</p>
      </div>
    </div>
    <div style="background:#f1f5f9;padding:15px;text-align:center;font-size:12px;color:#64748b;">
      <p style="margin:0;">© ${new Date().getFullYear()} Eventsh. All rights reserved.</p>
    </div>
  </div>`;
      await this.mailService.sendEmail({
        to: ticket.customerEmail,
        subject: `🎟️ Your Eventsh Ticket - ${ticket.eventTitle}`,
        html,
        attachments: [
          {
            filename: "ticket-qrcode.png",
            content: qrBase64.split(",")[1],
            encoding: "base64",
            cid: "qrcodeeventsh",
          },
        ],
      });
    } catch (error) {
      throw error;
    }
  }

  private async saveQRToDisk(
    base64Data: string,
    ticketId: string,
  ): Promise<string> {
    const qrDir = path.join(process.cwd(), "uploads", "generatedQRs");
    const fileName = `qr_${ticketId}.png`;
    const filePath = path.join(qrDir, fileName);
    const buffer = Buffer.from(base64Data.split(",")[1], "base64");
    await fs.promises.writeFile(filePath, buffer);
    return filePath;
  }

  private async updateEventTicketCount(
    eventId: string,
    tickets: { type: string; quantity: number }[],
  ) {
    const event = await this.eventModel.findById(eventId);
    if (!event) throw new NotFoundException("Event not found");

    // Validate all ticket types and availability first
    for (const ticketItem of tickets) {
      const visitorType = event.visitorTypes?.find(
        (vt) =>
          vt.name.toLowerCase().trim() === ticketItem.type.toLowerCase().trim(),
      );

      if (!visitorType) {
        throw new BadRequestException(
          `Visitor type "${ticketItem.type}" not found on this event`,
        );
      }

      if (
        visitorType.maxCount !== undefined &&
        visitorType.maxCount !== null &&
        visitorType.maxCount < ticketItem.quantity // ← check BEFORE deducting
      ) {
        throw new BadRequestException(
          `Not enough tickets for "${ticketItem.type}". Available: ${visitorType.maxCount}, Requested: ${ticketItem.quantity}`,
        );
      }
    }

    // Apply all deductions atomically using $inc with positional filtered operator
    for (const ticketItem of tickets) {
      await this.eventModel.updateOne(
        {
          _id: eventId,
          "visitorTypes.name": {
            $regex: new RegExp(`^${ticketItem.type}$`, "i"),
          },
        },
        {
          $inc: { "visitorTypes.$.maxCount": -ticketItem.quantity },
        },
      );
    }
  }

  // Removed generateTicketPDF method (not needed)

  async findAll(): Promise<Ticket[]> {
    return this.ticketModel.find().populate("eventId organizerId").exec();
  }

  async findOne(id: string): Promise<Ticket> {
    if (!Types.ObjectId.isValid(id))
      throw new BadRequestException("Invalid ticket ID");

    const ticket = await this.ticketModel
      .findById(id)
      .populate("eventId organizerId")
      .exec();

    if (!ticket) throw new NotFoundException("Ticket not found");

    return ticket;
  }

  async findByTicketId(ticketId: string): Promise<Ticket> {
    const ticket = await this.ticketModel
      .findOne({ ticketId: ticketId })
      .populate("eventId organizerId")
      .exec();

    if (!ticket) throw new NotFoundException("Ticket not found");

    return ticket;
  }

  async getCustomerTickets(customerEmail: string): Promise<Ticket[]> {
    return this.ticketModel
      .find({ customerEmail: customerEmail.toLowerCase() })
      .populate("eventId organizerId")
      .sort({ purchaseDate: -1 })
      .exec();
  }

  async getOrganizerTickets(organizerId: string): Promise<Ticket[]> {
    return this.ticketModel
      .find({ organizerId: new Types.ObjectId(organizerId) })
      .populate("eventId")
      .sort({ purchaseDate: -1 })
      .exec();
  }

  async getEventTickets(eventId: string): Promise<{
    tickets: Ticket[];
    summary: {
      totalTicketsSold: number;
      totalRevenue: number;
      ticketTypeBreakdown: any[];
      statusBreakdown: any[];
    };
  }> {
    if (!Types.ObjectId.isValid(eventId))
      throw new BadRequestException("Invalid event ID");

    const tickets = await this.ticketModel
      .find({ eventId: new Types.ObjectId(eventId) })
      .sort({ purchaseDate: -1 })
      .exec();

    const totalTicketsSold = tickets.reduce((sum, t) => sum + t.totalAmount, 0);
    const totalRevenue = tickets.reduce((sum, t) => sum + t.totalAmount, 0);

    const ticketTypeMap = new Map();
    tickets.forEach((ticket) => {
      ticket.ticketDetails.forEach((detail) => {
        const existing = ticketTypeMap.get(detail.ticketType) || {
          quantity: 0,
          revenue: 0,
        };
        existing.quantity += detail.quantity;
        existing.revenue += detail.price * detail.quantity;
        ticketTypeMap.set(detail.ticketType, existing);
      });
    });
    const ticketTypeBreakdown = Array.from(ticketTypeMap.entries()).map(
      ([type, data]) => ({
        ticketType: type,
        ...data,
      }),
    );

    const statusMap = new Map();
    tickets.forEach((ticket) => {
      const count = statusMap.get(ticket.status) || 0;
      statusMap.set(ticket.status, count + 1);
    });
    const statusBreakdown = Array.from(statusMap.entries()).map(
      ([status, count]) => ({
        status,
        count,
      }),
    );

    return {
      tickets,
      summary: {
        totalTicketsSold,
        totalRevenue,
        ticketTypeBreakdown,
        statusBreakdown,
      },
    };
  }

  async update(id: string, updateTicketDto: UpdateTicketDto): Promise<Ticket> {
    if (!Types.ObjectId.isValid(id))
      throw new BadRequestException("Invalid ticket ID");

    const updatedTicket = await this.ticketModel
      .findByIdAndUpdate(id, updateTicketDto, { new: true })
      .populate("eventId organizerId")
      .exec();

    if (!updatedTicket) throw new NotFoundException("Ticket not found");

    return updatedTicket;
  }

  async markTicketAsUsed(ticketId: string): Promise<Ticket> {
    const ticket = await this.ticketModel.findOne({ ticketId }).exec();

    if (!ticket) throw new NotFoundException("Ticket not found");

    if (ticket.isUsed) throw new BadRequestException("Ticket already used");
    if (ticket.status !== TicketStatus.CONFIRMED)
      throw new BadRequestException("Ticket is not confirmed");

    ticket.isUsed = true;
    ticket.usedAt = new Date();
    ticket.status = TicketStatus.USED;

    return ticket.save();
  }

  // Removed downloadTicket method (no PDF needed)

  async remove(id: string): Promise<void> {
    if (!Types.ObjectId.isValid(id))
      throw new BadRequestException("Invalid ticket ID");

    const result = await this.ticketModel.findByIdAndDelete(id).exec();

    if (!result) throw new NotFoundException("Ticket not found");

    // No PDF cleanup needed
  }

  async markAttendance(ticketId: string) {
    try {
      // Find the ticket first
      const ticket = await this.ticketModel.findOne({ ticketId: ticketId });
      if (!ticket) {
        throw new NotFoundException("Ticket Not Found");
      }

      // Update the ticket attendance field to true and return the updated document
      const attendance = await this.ticketModel.findOneAndUpdate(
        { ticketId: ticketId },
        { $set: { attendance: true, isUsed: true } },
        { new: true }, // return the updated document
      );

      if (!attendance) {
        throw new NotFoundException("Failed to update attendance");
      }

      return { message: "Attendance Marked True", data: attendance };
    } catch (error) {
      throw error;
    }
  }
}
