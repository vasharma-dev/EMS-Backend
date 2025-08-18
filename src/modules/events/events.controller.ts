import {
  Controller,
  Post,
  UseGuards,
  Body,
  UploadedFile,
  UseInterceptors,
  Req,
  Get,
  Query,
  Param,
  Put,
  Delete,
} from "@nestjs/common";
import { FileInterceptor } from "@nestjs/platform-express";
import { diskStorage } from "multer";
import { AuthGuard } from "@nestjs/passport";
import { EventsService } from "./events.service";
import { CreateEventDto } from "./dto/createEvent.dto";
import { v4 as uuidv4 } from "uuid";
import * as path from "path";

function fileName(req, file, cb) {
  const ext = path.extname(file.originalname);
  const filename = `${uuidv4()}${ext}`;
  cb(null, filename);
}

@Controller("events")
export class EventsController {
  constructor(private readonly eventsService: EventsService) {}

  @Post("create-event")
  @UseGuards(AuthGuard("jwt"))
  @UseInterceptors(
    FileInterceptor("image", {
      storage: diskStorage({
        destination: "./uploads/events",
        filename: fileName,
      }),
      fileFilter: (req, file, cb) => {
        if (!file.mimetype.match(/\/(jpg|jpeg|png)$/)) {
          cb(new Error("Only image files are allowed!"), false);
        } else {
          cb(null, true);
        }
      },
      limits: { fileSize: 3 * 1024 * 1024 }, // optional: 3MB file size limit
    })
  )
  async create(
    @UploadedFile() image: Express.Multer.File,
    @Body() body: any,
    @Req() req: any
  ) {
    try {
      // Fix the mapping
      body.title = body.name; // Rename 'name' to 'title'
      body.startDate = body.date || body.startDate;

      // Parse JSON strings
      if (typeof body.tags === "string") body.tags = JSON.parse(body.tags);
      if (typeof body.features === "string")
        body.features = JSON.parse(body.features);
      if (typeof body.gallery === "string")
        body.gallery = JSON.parse(body.gallery);
      if (typeof body.organizer === "string")
        body.organizer = JSON.parse(body.organizer);
      if (typeof body.socialMedia === "string")
        body.socialMedia = JSON.parse(body.socialMedia);

      // Convert dates
      body.startDate = new Date(
        body.startDate + (body.time ? "T" + body.time : "")
      );
      body.endDate = body.endDate
        ? new Date(body.endDate + (body.endTime ? "T" + body.endTime : ""))
        : null;

      // Handle image
      if (image) {
        body.image = `/uploads/events/${image.filename}`;
      }

      return await this.eventsService.create(body);
    } catch (error) {
      throw error;
    }
  }

  @Get()
  async list(@Query("page") page = "1") {
    return this.eventsService.list(Number(page));
  }

  @Get(":id")
  async get(@Param("id") id: string) {
    return this.eventsService.findById(id);
  }

  @Put(":id")
  async update(@Param("id") id: string, @Body() body: any) {
    return this.eventsService.update(id, body);
  }

  @Delete(":id")
  async remove(@Param("id") id: string) {
    return this.eventsService.remove(id);
  }
}
