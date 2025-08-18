import { Module } from "@nestjs/common";
import { ProductsService } from "./products.service";
import { ProductsController } from "./products.controller";
import { MongooseModule } from "@nestjs/mongoose/dist";
import { ProductSchema } from "./entities/product.entity";
import { ShopkeeperSchema } from "../shopkeepers/schemas/shopkeeper.schema";

@Module({
  imports: [
    MongooseModule.forFeature([
      { name: "Product", schema: ProductSchema },
      { name: "Shopkeeper", schema: ShopkeeperSchema },
    ]),
  ],
  controllers: [ProductsController],
  providers: [ProductsService],
  exports: [ProductsService, MongooseModule],
})
export class ProductsModule {}
