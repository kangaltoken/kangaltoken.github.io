import dotenv from "dotenv";
dotenv.config();
import { ethers } from "ethers";

import logger from "./logger";
import fetchEvents, { fetchEventsAfterDelay } from "./eventParser";

const provider = new ethers.providers.WebSocketProvider(
  `${process.env.BSC_NODE}`
);

const contractAddress = "0x222dc5cbc4d5082ac181532c01a57cc897ea4f15";
const contractAbi = [
  "event Deposit(address indexed account, uint256 indexed amount)",
  "event Withdrawal(address indexed account, uint256 indexed amount)",
  "event RewardClaim(address indexed account, uint256 indexed amount)",
];

const contract = new ethers.Contract(contractAddress, contractAbi, provider);

fetchEvents();
// contract.on("*", (params: any) => {
//   logger.info("NEW EVENT", { data: params });
//   fetchEventsAfterDelay(params.blockNumber);
// });
