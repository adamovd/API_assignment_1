const path = require("path");
const crypto = require("node:crypto");
const axios = require("axios").default;
const fsPromises = require("fs/promises");
const { GraphQLError } = require("graphql");
const { fileExists, readJsonFile } = require("../utils/fileHandling");

const cartsDirectory = path.join(__dirname, "../data/carts");
const productsDirectory = path.join(__dirname, "../data/products");

exports.resolvers = {
  Query: {
    getProductById: async (_, args) => {
      const { productId } = args;
      const filePath = path.join(productsDirectory, `${productId}.json`);
      const productExist = await fileExists(filePath);

      if (!productExist) {
        return new GraphQLError("☠️ There's no product with this ID!");
      }

      const product = JSON.parse(
        await fsPromises.readFile(filePath, {
          encoding: "utf-8",
        })
      );

      return product;
    },

    getCartById: async (_, args) => {
      const { cartId } = args;
      const filePath = path.join(cartsDirectory, `${cartId}.json`);
      const cartExists = await fileExists(filePath);

      if (!cartExists) {
        return new GraphQLError("☠️ There's no cart with this ID!");
      }

      const cart = JSON.parse(
        await fsPromises.readFile(filePath, {
          encoding: "utf-8",
        })
      );

      return cart;
    },

    getAllProducts: async (_, args) => {
      const products = await fsPromises.readdir(productsDirectory);

      const promises = [];
      products.forEach((fileName) => {
        const filePath = path.join(productsDirectory, fileName);
        promises.push(readJsonFile(filePath));
      });

      const productData = await Promise.all(promises);

      return productData;
    },
  },

  Mutation: {
    createCart: async (_, args) => {
      const cartId = crypto.randomUUID();

      const newCart = {
        cartId: cartId,
        products: [],
        totalAmount: 0,
      };

      const filePath = path.join(cartsDirectory, `${newCart.cartId}.json`);

      await fsPromises.writeFile(filePath, JSON.stringify(newCart));

      return newCart;
    },

    createProduct: async (_, args) => {
      const { title, price, type } = args.input;
      const id = crypto.randomUUID();

      const newProduct = {
        productId: id,
        title: title,
        price: price,
        type: type,
      };

      const filePath = path.join(
        productsDirectory,
        `${newProduct.productId}.json`
      );
      await fsPromises.writeFile(filePath, JSON.stringify(newProduct));

      return newProduct;
    },

    addProductToCart: async (_, args) => {
      const { cartId, productId } = args;

      const filePath = path.join(cartsDirectory, `${cartId}.json`);
      const cartExists = await fileExists(filePath);

      if (!cartExists) {
        return new GraphQLError("☠️ This cart does not exist!");
      }

      const productFilePath = path.join(productsDirectory, `${productId}.json`);
      const productExist = await fileExists(productFilePath);

      if (!productExist) {
        return new GraphQLError("☠️ This file does not exist!");
      }

      const cartContent = await fsPromises.readFile(filePath, {
        encoding: "utf-8",
      });
      const cart = JSON.parse(cartContent);

      const fileContent = await fsPromises.readFile(productFilePath, {
        encoding: "utf-8",
      });
      const addProductToCart = JSON.parse(fileContent);

      const products = cart.products;
      cart.products.push(addProductToCart);

      let totalAmount = 0;
      for (let i = 0; i < cart.products.length; i++) {
        totalAmount += cart.products[i].price;
      }

      const updatedCart = { cartId, products, totalAmount };
      await fsPromises.writeFile(filePath, JSON.stringify(updatedCart));

      return updatedCart;
    },

    deleteProductById: async (_, args) => {
      const { cartId, productId } = args;

      const filePath = path.join(cartsDirectory, `${cartId}.json`);
      const cartExists = await fileExists(filePath);

      if (!cartExists) {
        return new GraphQLError("☠️ This cart does not exist!");
      }

      const cart = JSON.parse(
        await fsPromises.readFile(filePath, {
          encoding: "utf-8",
        })
      );

      let foundProduct = false;

      for (let i = 0; i < cart.products.length; i++) {
        if (
          productId === cart.products[i].productId &&
          foundProduct === false
        ) {
          cart.totalAmount -= cart.products[i].price;
          cart.products.splice([i], 1);
          foundProduct = true;
        }
      }

      if (!foundProduct) {
        return new GraphQLError("☠️ This product does not exist in this cart.");
      }

      await fsPromises.writeFile(filePath, JSON.stringify(cart));

      let DeletedResourceResponse = {
        deleteMessage: `You removed a product with id: ${productId} from this cart.`,
        deletedId: productId,
      };

      return DeletedResourceResponse;
    },

    deleteCartById: async (_, args) => {
      const { cartId } = args;

      const filePath = path.join(cartsDirectory, `${cartId}.json`);
      const cartExists = await fileExists(filePath);

      if (!cartExists) {
        return new GraphQLError("☠️ This cart does not exist!");
      } else {
        await fsPromises.unlink(filePath);
      }

      let DeletedResourceResponse = {
        deleteMessage: `You removed the cart with id: ${cartId}!`,
        deleteId: cartId,
      };

      return DeletedResourceResponse;
    },
  },
};
