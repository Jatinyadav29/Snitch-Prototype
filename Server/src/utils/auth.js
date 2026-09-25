import jwt from "jsonwebtoken";
import config from "../config/config.js";

const generateToken = ({ userId, role }) => {
  const accessToken = jwt.sign(
    { id: userId, role },
    config.ACCESS_TOKEN_SECRET,
    {
      expiresIn: "15m",
    },
  );

  const refreshToken = jwt.sign(
    { id: userId, role },
    config.REFRESH_TOKEN_SECRET,
    {
      expiresIn: "7d",
    },
  );

  return { accessToken, refreshToken };
};

const verifyAccessToken = (token) => {
  const decode = jwt.verify(token, config.ACCESS_TOKEN_SECRET);
  return decode;
};

const verifyRefreshToken = (token) => {
  const decode = jwt.verify(token, config.REFRESH_TOKEN_SECRET);
  return decode;
};

export { generateToken, verifyAccessToken, verifyRefreshToken };
