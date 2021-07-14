import winston, { format } from "winston";
import "winston-daily-rotate-file";

const { combine, timestamp } = format;

const transport = new winston.transports.DailyRotateFile({
  filename: "../logs/%DATE%.log",
  datePattern: "YYYY-MM-DD",
});

const logger: winston.Logger = winston.createLogger({
  format: format.combine(format.timestamp(), format.json()),
  transports: [transport],
});

if (process.env.ENV !== "PROD") {
  logger.add(new winston.transports.Console());
}

export default logger;
