import {
  Controller,
  Get,
  Post,
  Body,
  Patch,
  Param,
  Delete,
  Res,
  UseGuards,
  UploadedFiles,
  Req,
  BadRequestException,
  UseInterceptors,
} from "@nestjs/common";
import { ProductsService } from "./products.service";
import { CreateProductDto } from "./dto/create-product.dto";
import { UpdateProductDto } from "./dto/update-product.dto";
import { AuthGuard } from "@nestjs/passport";
import { extname } from "path";
import { diskStorage } from "multer";
import { FilesInterceptor } from "@nestjs/platform-express";

@Controller("products")
export class ProductsController {
  constructor(private readonly productsService: ProductsService) {}

  @Post("create-product")
  @UseGuards(AuthGuard("jwt"))
  @UseInterceptors(
    FilesInterceptor("images", 10, {
      storage: diskStorage({
        destination: "./uploads/products",
        filename: (req, file, cb) => {
          // Unique file name with original extension
          const uniqueSuffix =
            Date.now() + "-" + Math.round(Math.random() * 1e9);
          const ext = extname(file.originalname);
          cb(null, `${file.fieldname}-${uniqueSuffix}${ext}`);
        },
      }),
      fileFilter: (req, file, cb) => {
        // Optional: filter by image mime types
        if (!file.mimetype.match(/\/(jpg|jpeg|png|gif)$/)) {
          return cb(
            new BadRequestException("Only image files are allowed!"),
            false
          );
        }
        cb(null, true);
      },
      limits: { fileSize: 5 * 1024 * 1024 }, // optional: 5MB max file size
    })
  )
  async create(
    @UploadedFiles() files: Express.Multer.File[],
    @Body("product") productJson: string,
    @Req() req: any
  ) {
    try {
      if (!productJson) {
        throw new BadRequestException("Product data missing");
      }

      const createProductDto = JSON.parse(productJson);

      // Map uploaded file paths
      const imagePaths = files.map(
        (file) => `/uploads/products/${file.filename}`
      );

      createProductDto.images = imagePaths;
      createProductDto.shopkeeperId = req.user.userId; // Assign from JWT

      return this.productsService.create(
        createProductDto,
        createProductDto.shopkeeperId
      );
    } catch (error) {
      console.error("Create product error:", error);
      throw error;
    }
  }

  @Get()
  @UseGuards(AuthGuard("jwt"))
  findAll() {
    try {
      return this.productsService.findAll();
    } catch (error) {
      console.log(error);
    }
  }

  @Get("shopkeeper-products")
  @UseGuards(AuthGuard("jwt"))
  async getShopkeeperProducts(@Req() req: any) {
    try {
      const shopkeeperId = req.user.userId;
      return this.productsService.getShopkeeperProducts(shopkeeperId);
    } catch (error) {
      console.log(error);
    }
  }

  @Get("get-product-details/:id")
  findOne(@Param("id") id: string) {
    try {
      return this.productsService.findOne(id);
    } catch (error) {
      console.log(error);
    }
  }

  @Patch(":id")
  @UseGuards(AuthGuard("jwt"))
  @UseInterceptors(
    FilesInterceptor("images", 10, {
      storage: diskStorage({
        destination: "./uploads/products",
        filename: (req, file, cb) => {
          const uniqueSuffix =
            Date.now() + "-" + Math.round(Math.random() * 1e9);
          const ext = extname(file.originalname);
          cb(null, `${file.fieldname}-${uniqueSuffix}${ext}`);
        },
      }),
      fileFilter: (req, file, cb) => {
        if (!file.mimetype.match(/\/(jpg|jpeg|png|gif)$/)) {
          return cb(
            new BadRequestException("Only image files are allowed!"),
            false
          );
        }
        cb(null, true);
      },
      limits: { fileSize: 5 * 1024 * 1024 },
    })
  )
  async update(
    @Param("id") id: string,
    @UploadedFiles() files: Express.Multer.File[],
    @Body("product") productJson: string,
    @Req() req: any
  ) {
    try {
      const updateProductDto = JSON.parse(productJson);

      // Map uploaded file paths
      const imagePaths = files.map(
        (file) => `/uploads/products/${file.filename}`
      );
      if (imagePaths.length > 0) {
        // You may choose: Replace all images or merge with existing (see below)
        updateProductDto.images = imagePaths;
      }

      return this.productsService.update(id, updateProductDto);
    } catch (error) {
      console.error("Update product error:", error);
      throw error;
    }
  }

  @Delete(":id")
  remove(@Param("id") id: string) {
    try {
      return this.productsService.remove(id);
    } catch (error) {
      console.log(error);
    }
  }
}
