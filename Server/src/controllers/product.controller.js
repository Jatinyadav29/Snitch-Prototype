import productModel from "../models/product.model.js";
import { uploadFiles } from "../services/storage.service.js";

const createProductController = async (req, res) => {
  try {
    const { title, discription, price, sizes } = req.body;

    // *! use promise.all - research and figure out the problem and update the logic to get fast

    const fileUrls = [];

    for (let i = 0; i < req.files.length; i++) {
      const response = await uploadFiles({
        buffer: req.files[i].buffer,
        fileName: req.files[i].originalname,
      });

      fileUrls.push(response.url);
    }

    const product = await productModel.create({
      title,
      discription,
      price: {
        amount: price.amount,
        currency: price.currency,
      },
      sizes,
      images: fileUrls,
      seller: req.user.id,
    });

    return res.status(201).json({
      message: "Product created successfully",
      data: {
        product,
      },
    });
  } catch (error) {
    console.log(`Error in create product controller - ${error}`);

    return res.status(500).json({
      message: "Internal server error",
    });
  }
};

const getAllProductsController = async (req, res) => {
  try {
    const products = await productModel.find({ published: true });

    return res.status(200).json({
      message: "Products found",
      data: {
        products,
      },
    });
  } catch (error) {
    console.log(`Error in get all products controller - ${error}`);

    return res.status(500).json({
      message: "Internal server error",
    });
  }
};

const sellerGetAllProductsController = async (req, res) => {
  try {
    const products = await productModel.find({});

    return res.status(200).json({
      message: "All products fetched",
      data: {
        products,
      },
    });
  } catch (error) {
    console.log(`Error in seller get all products controller - ${error}`);

    return res.status(500).json({
      message: "Internal server error",
    });
  }
};

const unlistProductController = async (req, res) => {
  try {
    const { id } = req.params;

    const product = await productModel.findById(id);

    if (!product) {
      return res.status(404).json({
        message: "Product not found",
      });
    }

    await productModel.findByIdAndUpdate(id, {
      published: false,
    });

    return res.status(200).json({
      message: "Product unpublished successfully",
    });
  } catch (error) {
    console.log(`Error in unlist product controller - ${error}`);

    return res.status(500).json({
      message: "Internal server error",
    });
  }
};

const listProductController = async (req, res) => {
  try {
    const { id } = req.params;

    const product = await productModel.findById(id);

    if (!product) {
      return res.status(404).json({
        message: "Product not found",
      });
    }

    await productModel.findByIdAndUpdate(id, {
      published: true,
    });

    return res.status(200).json({
      message: "Product published successfully",
    });
  } catch (error) {
    console.log(`Error in list product controller - ${error}`);

    return res.status(500).json({
      message: "Internal server error",
    });
  }
};

export {
  createProductController,
  getAllProductsController,
  sellerGetAllProductsController,
  unlistProductController,
  listProductController,
};
