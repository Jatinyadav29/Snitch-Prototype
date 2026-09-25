import { verifyAccessToken } from "../utils/auth.js";

const authenticate = (req, res, next) => {
  const accessToken = req.headers.authorization.split(" ")[1];

  if (!accessToken) {
    return res.status(400).json({
      message: "Unauthorized, access token not found or invalid",
    });
  }

  try {
    const decode = verifyAccessToken(accessToken);

    req.user = decode;
    next();
  } catch (error) {
    res.status(401).json({
      message: "Unauthorized, access token not found or invalid",
    });
  }
};

export default authenticate;
