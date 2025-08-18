import { BadRequestException, Injectable } from "@nestjs/common";
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
      console.log(createProductDto, "Vansh Sharma");

      // Create product instance with all fields from DTO
      const product = new this.productModel({
        name: createProductDto.name,
        description: createProductDto.description,
        price: createProductDto.price,
        compareAtPrice: createProductDto.compareAtPrice,
        cost: createProductDto.cost,
        sku: createProductDto.sku,
        barcode: createProductDto.barcode,
        category: createProductDto.category,
        tags: createProductDto.tags || [],
        images: createProductDto.images || [],
        inventory: {
          quantity: createProductDto.inventory.quantity,
          trackQuantity: createProductDto.inventory.trackQuantity,
          allowBackorder: createProductDto.inventory.allowBackorder,
          lowStockThreshold: createProductDto.inventory.lowStockThreshold,
        },
        variants: createProductDto.variants || [],
        status: createProductDto.status,
        weight: createProductDto.weight,
        dimensions: createProductDto.dimensions,
        seo: createProductDto.seo,
        shopkeeperId: shopkeeperId,
      });

      const result = await product.save();

      // Save product to database
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

  findOne(id: number) {
    return `This action returns a #${id} product`;
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
