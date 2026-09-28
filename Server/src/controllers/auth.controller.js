import userModel from "../models/user.model.js";
import bcrypt from "bcryptjs";
import { generateToken, verifyRefreshToken } from "../utils/auth.js";

const registerController = async (req, res) => {
  try {
    const { email, name, password } = req.body;

    const ifUserAlreadyExist = await userModel.findOne({ email });

    if (ifUserAlreadyExist) {
      return res.status(400).json({
        message: "User already exist with this email address",
        errors: [
          {
            feild: "email",
            message: "user already exist with this email address",
          },
        ],
      });
    }

    const user = await userModel.create({
      email,
      name,
      passwordHash: await bcrypt.hash(password, 12),
    });

    const { accessToken, refreshToken } = generateToken({
      userId: user._id,
      role: user.role,
    });

    await userModel.findByIdAndUpdate(user._id, {
      refreshToken,
    });

    res.cookie("refreshToken", refreshToken, { httpOnly: true });

    return res.status(201).json({
      message: "User registered successfully",
      data: {
        user: {
          name: user.name,
          email: user.email,
          id: user._id,
        },
        accessToken,
      },
    });
  } catch (error) {
    console.log(`Error in register controller - ${error}`);

    return res.status(500).json({
      message: "Internal server error",
    });
  }
};

const loginController = async (req, res) => {
  try {
    const { email, password } = req.body;

    const user = await userModel.findOne({ email });

    if (!user) {
      return res.status(400).json({
        message: "Invalid email or password",
      });
    }

    const isPasswordValid = await bcrypt.compare(password, user.passwordHash);

    if (!isPasswordValid) {
      return res.status(400).json({
        message: "Invalid email or password",
      });
    }

    const { accessToken, refreshToken } = generateToken({
      userId: user._id,
      role: user.role,
    });

    await userModel.findByIdAndUpdate(user._id, {
      refreshToken,
    });

    res.cookie("refreshToken", refreshToken, { httpOnly: true });

    return res.status(200).json({
      message: "Login Successful",
      data: {
        user: {
          email: user.email,
          id: user._id,
        },
        accessToken,
      },
    });
  } catch (error) {
    console.log(`Error in login controller - ${error}`);

    return res.status(500).json({
      message: "Internal server error",
    });
  }
};

const refreshTokenController = async (req, res) => {
  const refreshToken = req.cookies.refreshToken;

  if (!refreshToken) {
    return res.status(401).json({
      message: "Refresh token not found",
    });
  }

  try {
    const decode = verifyRefreshToken(refreshToken);

    const user = await userModel.findById(decode.id);

    if (!user) {
      return res.status(404).json({
        message: "User does not exists",
      });
    }

    if (refreshToken !== user.refreshToken) {
      await userModel.findByIdAndUpdate(user._id, {
        refreshToken: null,
      });

      return res.status(400).json({
        message: "Unauthorized, refresh token mismatch",
      });
    }

    const { accessToken, refreshToken: newRefreshToken } = generateToken({
      userId: user._id,
      role: user.role,
    });

    await userModel.findByIdAndUpdate(user._id, {
      refreshToken: newRefreshToken,
    });

    res.cookie("refreshToken", newRefreshToken, { httpOnly: true });

    return res.status(200).json({
      message: "Tokens refreshed successfully",
      accessToken,
    });
  } catch (error) {
    return res
      .status(401)
      .json({ message: "Unauthorized, refresh token expired or invalid" });
  }
};

const getMyInfoController = async (req, res) => {
  try {
    const { id } = req.user;

    const user = await userModel.findById(id);

    if (!user) {
      return res.status(404).json({
        message: "User not found",
      });
    }

    return res.status(200).json({
      message: "User found",
      data: {
        user: {
          name: user.name,
          email: user.email,
          role: user.role,
        },
      },
    });
  } catch (error) {
    console.log(`Error in Get user info controller - ${error}`);

    return res.status(500).json({
      message: "Internal server error",
    });
  }
};

export {
  registerController,
  loginController,
  refreshTokenController,
  getMyInfoController,
};
