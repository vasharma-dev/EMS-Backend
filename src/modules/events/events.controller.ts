import {
  Controller,
  Post,
  Get,
  Put,
  Delete,
  Body,
  Param,
  Query,
  UseGuards,
  UseInterceptors,
  UploadedFile,
  UploadedFiles,
  Req,
  ParseIntPipe,
  ValidationPipe,
} from "@nestjs/common";
import {
  FileInterceptor,
  FilesInterceptor,
  FileFieldsInterceptor,
} from "@nestjs/platform-express";
import { diskStorage } from "multer";
import { AuthGuard } from "@nestjs/passport";
import { EventsService } from "./events.service";
import { CreateEventDto } from "./dto/createEvent.dto";
import { UpdateEventDto } from "./dto/updateEvent.dto";
import { v4 as uuidv4 } from "uuid";
import * as path from "path";

function generateFileName(req: any, file: any, cb: any) {
  const ext = path.extname(file.originalname);
  const filename = `${uuidv4()}${ext}`;
  cb(null, filename);
}

const imageFilter = (req: any, file: any, cb: any) => {
  if (!file.mimetype.match(/\/(jpg|jpeg|png|gif)$/)) {
    cb(new Error("Only image files are allowed!"), false);
  } else {
    cb(null, true);
  }
};

function parseFormDataFields(body: any) {
  const jsonFields = [
    "tags",
    "features",
    "socialMedia",
    "tableTemplates",
    "venueTables",
    "addOnItems",
    "venueConfig",
    "visitorTypes",
    "termsAndConditionsforStalls",
    "speakerTemplates",
    "speakerSlots",
  ];
  for (const field of jsonFields) {
    if (typeof body[field] === "string") body[field] = JSON.parse(body[field]);
  }
  for (const field of ["hasVenue", "hasTables", "hasSpeakers"]) {
    if (typeof body[field] === "string") body[field] = body[field] === "true";
  }
}

@Controller("events")
export class EventsController {
  constructor(private readonly eventsService: EventsService) {}

  @Post("create-event")
  @UseGuards(AuthGuard("jwt"))
  @UseInterceptors(
    FileFieldsInterceptor(
      [
        { name: "banner", maxCount: 1 },
        { name: "gallery", maxCount: 5 },
        { name: "addOnImages", maxCount: 100 },
      ],
      {
        storage: diskStorage({
          destination: "./uploads/events",
          filename: generateFileName,
        }),
        fileFilter: imageFilter,
        limits: { fileSize: 5 * 1024 * 1024 }, // 5MB per file
      },
    ),
  )
  async createEvent(
    @UploadedFiles()
    files: {
      banner?: Express.Multer.File[];
      gallery?: Express.Multer.File[];
      addOnImages?: Express.Multer.File[];
    },
    @Body() body: any,
    @Req() req: any,
  ) {
    try {
      // Extract organizer ID from JWT token
      body.organizerId = req.user.sub || body.organizerId;

      // Parse JSON strings from FormData
      parseFormDataFields(body);

      const event = await this.eventsService.create(body);

      return {
        success: true,
        message: "Event created successfully",
        data: event,
      };
    } catch (error) {
      console.error("Error in createEvent:", error);
      throw error;
    }
  }

  @Get("get-events")
  async getAllEvents() {
    try {
      const events = await this.eventsService.findAll();
      return {
        success: true,
        message: "Events retrieved successfully",
        data: events,
      };
    } catch (error) {
      console.error("Error in getAllEvents:", error);
      throw error;
    }
  }

  @Get("search")
  async searchEvents(@Query("q") query: string) {
    try {
      const events = await this.eventsService.searchEvents(query);
      return {
        success: true,
        message: "Events searched successfully",
        data: events,
      };
    } catch (error) {
      console.error("Error in searchEvents:", error);
      throw error;
    }
  }

  @Get("organizer/:organizerId")
  async getEventsByOrganizer(@Param("organizerId") organizerId: string) {
    try {
      const result = await this.eventsService.findByOrganizer(organizerId);
      return {
        success: true,
        message: "Organizer events retrieved successfully",
        data: result.events,
        pagination: {
          total: result.total,
        },
      };
    } catch (error) {
      console.error("Error in getEventsByOrganizer:", error);
      throw error;
    }
  }

  @Get(":id")
  async getEventById(@Param("id") id: string) {
    try {
      const event = await this.eventsService.findById(id);
      return {
        success: true,
        message: "Event retrieved successfully",
        data: event,
      };
    } catch (error) {
      console.error("Error in getEventById:", error);
      throw error;
    }
  }

  @Put(":id")
  @UseGuards(AuthGuard("jwt"))
  @UseInterceptors(
    FileFieldsInterceptor(
      [
        { name: "banner", maxCount: 1 },
        { name: "gallery", maxCount: 5 },
        { name: "addOnImages", maxCount: 100 }, // 1. Added this field
      ],
      {
        storage: diskStorage({
          destination: "./uploads/events",
          filename: generateFileName,
        }),
        fileFilter: imageFilter,
        limits: { fileSize: 5 * 1024 * 1024 },
      },
    ),
  )
  async updateEvent(
    @Param("id") id: string,
    @UploadedFiles()
    files: {
      banner?: Express.Multer.File[];
      gallery?: Express.Multer.File[];
      addOnImages?: Express.Multer.File[]; // 2. Updated type definition
    },
    @Body() body: any,
    @Req() req: any,
  ) {
    try {
      // Parse JSON strings from FormData
      parseFormDataFields(body);

      const event = await this.eventsService.update(id, body);

      return {
        success: true,
        message: "Event updated successfully",
        data: event,
      };
    } catch (error) {
      console.error("Error in updateEvent:", error);
      throw error;
    }
  }

  @Put(":id/status")
  @UseGuards(AuthGuard("jwt"))
  async updateEventStatus(
    @Param("id") id: string,
    @Body("status") status: string,
  ) {
    try {
      const event = await this.eventsService.updateStatus(id, status);
      return {
        success: true,
        message: "Event status updated successfully",
        data: event,
      };
    } catch (error) {
      console.error("Error in updateEventStatus:", error);
      throw error;
    }
  }

  @Delete(":id")
  @UseGuards(AuthGuard("jwt"))
  async deleteEvent(@Param("id") id: string, @Req() req: any) {
    try {
      const event = await this.eventsService.remove(id);
      return {
        success: true,
        message: "Event deleted successfully",
        data: event,
      };
    } catch (error) {
      console.error("Error in deleteEvent:", error);
      throw error;
    }
  }

  @Post(":id/speaker-slots/:slotId/book")
  @UseGuards(AuthGuard("jwt"))
  async bookSpeakerSlot(
    @Param("id") id: string,
    @Param("slotId") slotId: string,
    @Body() booking: any,
    @Req() req: any,
  ) {
    try {
      booking.speakerId = req.user.sub;
      booking.bookedByOrganizer = false;
      const event = await this.eventsService.bookSpeakerSlot(
        id,
        slotId,
        booking,
      );
      return {
        success: true,
        message: "Speaker slot booked successfully",
        data: event,
      };
    } catch (error) {
      console.error("Error in bookSpeakerSlot:", error);
      throw error;
    }
  }
}
