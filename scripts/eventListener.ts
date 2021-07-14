const { ethers, BigNumber, Block, utils } = require("ethers");

import { fetchEventsAfterDelay } from "./eventParser";

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

contract.on("*", (params: any) => {
  console.log(params);
  fetchEventsAfterDelay(params.blockNumber);
});
