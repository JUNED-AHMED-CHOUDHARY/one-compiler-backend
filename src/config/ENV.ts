import dotenv from "dotenv";

dotenv.config();
const currentEnvironment: "development" | "production" =
    process.env.NODE_ENV === "production" ? "production" : "development";

dotenv.config({path: `.env.${currentEnvironment}`});

const ENV = {
    PORT : process.env.PORT,
    NODE_ENV : currentEnvironment,
} as const;

export default ENV;