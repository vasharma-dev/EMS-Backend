import {
  BadRequestException,
  Injectable,
  NotFoundException,
} from "@nestjs/common";
import { CreateProductDto } from "./dto/create-product.dto";
import { UpdateProductDto } from "./dto/update-product.dto";
import { InjectModel } from "@nestjs/mongoose/dist";
import { Product, ProductDocument } from "./entities/product.entity";
import { Model, Types } from "mongoose";

@Injectable()
export class ProductsService {
  constructor(
    @InjectModel(Product.name) private productModel: Model<ProductDocument>
  ) {}

  async create(createProductDto: CreateProductDto, shopkeeperId: string) {
    try {
      // Build new product data, matching the schema and DTO structure
      const product = new this.productModel({
        name: createProductDto.name,
        description: createProductDto.description,
        sku: createProductDto.sku,
        barcode: createProductDto.barcode,
        category: createProductDto.category,
        tags: createProductDto.tags || [],
        images: createProductDto.images || [],
        subcategories: createProductDto.subcategories || [],
        status: createProductDto.status,
        weight: createProductDto.weight,
        dimensions: createProductDto.dimensions,
        seo: createProductDto.seo,
        shopkeeperId: shopkeeperId,
      });

      const result = await product.save();

      return { message: "Product created successfully", data: result };
    } catch (error) {
      console.error("Error creating product:", error);
      throw error;
    }
  }

  async getShopkeeperProducts(shopkeeperId: string) {
    try {
      const shopkeeperObjectId = new Types.ObjectId(shopkeeperId);
      const products = await this.productModel.find({
        shopkeeperId: shopkeeperId,
      });
      if (!products) {
        throw new BadRequestException("No products found");
      }
      return { message: "Products found", data: products };
    } catch (error) {
      console.log(error);
      throw error;
    }
  }

  findAll() {
    return `This action returns all products`;
  }

  async findOne(id: string) {
    try {
      const product = await this.productModel.find({ _id: id });
      if (!product) {
        throw new NotFoundException("Product Not Found");
      }

      return { message: "Product Found", data: product };
    } catch (error) {
      console.log(error);
      throw error;
    }
  }

  async update(id: string, updateProductDto: UpdateProductDto) {
    // Fetch current product
    const current = await this.productModel.findById(id);

    if (!current) throw new BadRequestException("Product not found");

    // Merge new images with existing images if desired (or replace all)
    if (updateProductDto.images && Array.isArray(updateProductDto.images)) {
      // This logic will replace images if present, or keep current if not
      // Alternatively: updateProductDto.images = Array.from(new Set([...current.images, ...updateProductDto.images]))
    } else {
      updateProductDto.images = current.images;
    }

    const updatedProduct = await this.productModel.findByIdAndUpdate(
      id,
      updateProductDto,
      { new: true }
    );
    return { message: "Product updated successfully", data: updatedProduct };
  }

  async remove(id: string) {
    try {
      const product = await this.productModel.findByIdAndDelete(id);
      if (!product) {
        throw new BadRequestException("Product not found");
      }
      return { message: "Product deleted successfully" };
    } catch (error) {}
    return `This action removes a #${id} product`;
  }
}
