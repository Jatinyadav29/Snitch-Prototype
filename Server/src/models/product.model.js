import mongoose from "mongoose";

const productSchema = new mongoose.Schema({
  title: {
    type: String,
    required: true,
    minlength: 2,
    maxlength: 100,
  },
  discription: {
    type: String,
    required: true,
    minlength: 20,
    maxlength: 500,
  },
  images: {
    type: [{ type: String }],
    validate: {
      validator: (image) => image.length <= 5,
      message: "A product can at most have 5 images",
    },
  },
  price: {
    amount: {
      type: Number,
      required: true,
    },
    currency: {
      type: String,
      enum: ["INR", "USD"],
      default: "INR",
    },
  },
  sizes: [
    {
      size: {
        type: String,
        enum: ["XS", "S", "M", "L", "XL", "XXL"],
        required: true,
      },
      stock: {
        type: Number,
        min: 0,
        default: 0,
      },
    },
  ],
  seller: {
    type: mongoose.Types.ObjectId,
    ref: "users",
    required: true,
  },
});

const productModel = mongoose.model("product", productSchema);

export default productModel;
