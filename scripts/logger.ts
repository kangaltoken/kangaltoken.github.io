import winston from "winston";
import "winston-daily-rotate-file";

const transport = new winston.transports.DailyRotateFile({
  filename: "../logs/%DATE%.log",
  datePattern: "YYYY-MM-DD",
});

const logger: winston.Logger = winston.createLogger({
  transports: [transport],
});

if (process.env.ENV !== "PROD") {
  logger.add(
    new winston.transports.Console({
      format: winston.format.simple(),
    })
  );
}

export default logger;
