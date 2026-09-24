import userModel from "../models/user.model.js";
import bcrypt from "bcryptjs";
import {
  generateToken,
  verifyAccessToken,
  verifyRefreshToken,
} from "../utils/auth.js";

const registerController = async (req, res) => {
  const { email, name, password } = req.body;

  try {
    const ifUserAlreadyExist = await userModel.findOne({ email });

    if (ifUserAlreadyExist) {
      return res.status(400).json({
        message: "User already exist with this email address",
        errors: [
          {
            field: "email",
            message: "user already exist with this email address",
          },
        ],
      });
    }

    const user = await userModel.create({
      email,
      name,
      passwordHash: await bcrypt.hash(password, 10),
    });

    const { accessToken, refreshToken } = generateToken({ userId: user._id });

    user.refreshToken = refreshToken;
    await user.save();

    res.cookie("refreshToken", refreshToken, { httpOnly: true });

    return res.status(201).json({
      message: "User registered successfully",
      data: {
        name: user.name,
        email: user.email,
      },
      accessToken,
    });
  } catch (error) {
    console.log(`Error in register controller - ${error}`);
  }
};

export { registerController };
