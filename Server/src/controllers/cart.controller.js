import cartModel from "../models/cart.model.js";
import productModel from "../models/product.model.js";

const addToCartController = async (req, res) => {
  try {
    const { productId, quantity, size } = req.body;

    const product = await productModel.findById(productId);

    if (!product) {
      return res.status(404).json({
        message: "Product not found",
      });
    }

    const selectedSize = product.sizes.find((s) => s.size === size);

    if (!selectedSize) {
      return res.status(400).json({
        message: "Invalid size",
      });
    }

    if (selectedSize.stock < quantity) {
      return res.status(400).json({
        message: "Insufficient stock",
      });
    }

    const cart =
      (await cartModel.findOne({ user: req.user.id })) ??
      (await cartModel.create({ user: req.user.id }));

    const productInCart = cart.products.find(
      ((p) => p.product.toString() === productId) && p.size === size,
    );

    if (productInCart) {
      if (productInCart.quantity + quantity > selectedSize.stock) {
        return res.status(400).json({
          message: "Insufficient stock",
        });
      }

      await cartModel.updateOne(
        {
          user: req.user.id,
          "products.product": productId,
          "products.size": size,
        },
        {
          $inc: {
            "products.$.quantity": quantity,
          },
        },
      );

      return res.status(200).json({
        message: "Product quantity updated in cart",
      });
    }

    await cartModel.updateOne(
      {
        user: req.user.id,
      },
      {
        $push: {
          products: {
            product: productId,
            quantity: quantity,
            size: size,
          },
        },
      },
    );

    return res.status(200).json({
      message: "Product added to cart successfully",
    });
  } catch (error) {
    console.log(`Error in add to cart controller - ${error}`);

    return res.status(500).json({
      message: "Internal server error",
    });
  }
};

const getCartItemsController = async (req, res) => {
  try {
    const cart =
      (await cartModel.findOne({ user: req.user.id })) ??
      (await cartModel.create({ user: req.user.id }));

    return res.status(200).json({
      message: "Cart retrived sucessfully",
      data: {
        cart: cart,
      },
    });
  } catch (error) {
    console.log(`Error in get cart items controller - ${error}`);

    return res.status(500).json({
      message: "Internal server error",
    });
  }
};

export { addToCartController, getCartItemsController };
