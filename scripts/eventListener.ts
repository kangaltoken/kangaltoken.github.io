import dotenv from "dotenv";
dotenv.config();
import { ethers } from "ethers";

import logger from "./logger";
import fetchEvents, { fetchEventsAfterDelay } from "./eventParser";

const provider = new ethers.providers.WebSocketProvider(
  `${process.env.BSC_NODE}`
);
const providerPolygon = new ethers.providers.WebSocketProvider(
  `${process.env.POLYGON_NODE}`
);

const contractAbi = [
  "event Deposit(address indexed account, uint256 indexed amount)",
  "event Withdrawal(address indexed account, uint256 indexed amount)",
  "event RewardClaim(address indexed account, uint256 indexed amount)",
];

const contract = new ethers.Contract(
  `${process.env.BSC_CONTRACT}`,
  contractAbi,
  provider
);
const contractPolygon = new ethers.Contract(
  `${process.env.POLYGON_CONTRACT}`,
  contractAbi,
  providerPolygon
);

// contract.on("*", (params: any) => {
//   logger.info("NEW EVENT", { data: params });
//   fetchEventsAfterDelay(`${process.env.BSC_CONTRACT}`, "bsc", "staking_events.json", "staking_balances.json", params.blockNumber);
// });

// contractPolygon.on("*", (params: any) => {
//   logger.info("NEW EVENT", { data: params });
//   fetchEventsAfterDelay(`${process.env.POLYGON_CONTRACT}`, "matic", "staking_events_polygon.json", "staking_balances_polygon.json", params.blockNumber);
// });

fetchEvents(
  `${process.env.POLYGON_CONTRACT}`,
  "matic",
  "staking_events_polygon.json",
  "staking_balances_polygon.json",
  18121769
);
