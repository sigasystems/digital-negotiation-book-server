import { Op } from "sequelize";
import { Product } from "../models/index.js";

class ProductRepository {
  async createMany(products) {
    return await Product.bulkCreate(products);
  }

  async findAll(ownerId) {
    return await Product.findAll({ where: { ownerId } });
  }

  async findById(id) {
    return await Product.findByPk(id);
  }

  async findByCode(code, ownerId) {
    const where = ownerId ? { code, ownerId } : { code };
    return await Product.findOne({ where });
  }

  async findByCodes(codes, ownerId) {
    const where = ownerId ? { code: codes, ownerId } : { code: codes };
    return await Product.findAll({ where });
  }

  async update(product, data) {
    return await product.update(data);
  }

  async delete(product) {
    return await product.destroy();
  }

  async search(filters, pagination) {
    const { limit, offset } = pagination;
    return await Product.findAndCountAll({
      where: filters,
      limit,
      offset,
      order: [["productName", "ASC"]],
    });
  }
}

// Export a singleton instance
export default new ProductRepository();
