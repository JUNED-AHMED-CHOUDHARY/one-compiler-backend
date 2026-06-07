import jwt from "jsonwebtoken";

import ENV from "../config/ENV";

const jwtConfig: jwt.SignOptions = {
  expiresIn: "3d"
};

export const generateJwtToken = (data: Record<string, any>): string => {
  return jwt.sign(data, ENV.JWT_SECRET, jwtConfig);
};

export const verifyJwtToken = (token: string): jwt.JwtPayload | null => {
  try {
    return jwt.verify(token, ENV.JWT_SECRET) as jwt.JwtPayload;
  } catch {
    return null;
  }
};
