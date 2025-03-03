import jwt from "jsonwebtoken";

export const auth = (req, res, next) => {
  try {
    const token = req.header("Authorization")?.replace("Bearer ", "");

    if (!token) {
      throw new Error();
    }

    const decoded = jwt.verify(
      token,
      process.env.JWT_SECRET || "your-secret-key-change-this-in-production"
    );
    req.user = decoded;
    next();
  } catch (error) {
    res.status(401).json({ error: "Please authenticate." });
  }
};
