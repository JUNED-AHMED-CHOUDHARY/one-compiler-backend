import ENV from "./ENV";

const Config = {
  isRunningProd: ENV.NODE_ENV === "production",
} as const;

export { Config };
