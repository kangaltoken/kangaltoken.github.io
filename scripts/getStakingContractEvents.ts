import dotenv from "dotenv";
dotenv.config();

import { ethers, BigNumber } from "ethers";

export enum NetworkType {
  bsc,
  polygon,
}

export type StakingContractEvent = {
  block: number;
  name: string;
  address: string;
  amount: BigNumber;
};

const contractAbi = [
  "event Deposit(address indexed account, uint256 indexed amount)",
  "event Withdrawal(address indexed account, uint256 indexed amount)",
  "event RewardClaim(address indexed account, uint256 indexed amount)",
];

async function getStakingContractEvents(
  network: NetworkType,
  fromBlock: number,
  toBlock?: number
) {
  const blockRange = network === NetworkType.polygon ? 10000 : 5000;
  let provider: ethers.providers.JsonRpcProvider;
  let contractAddress: string;

  if (network === NetworkType.bsc) {
    provider = new ethers.providers.JsonRpcProvider(
      `${process.env.BSC_H_NODE}`
    );
    contractAddress = `${process.env.BSC_CONTRACT}`;
  } else {
    provider = new ethers.providers.JsonRpcProvider(
      `${process.env.POLYGON_H_NODE}`
    );
    contractAddress = `${process.env.POLYGON_CONTRACT}`;
  }

  const contract = new ethers.Contract(contractAddress, contractAbi, provider);

  let allEvents: any[] = [];

  let lastProcessedBlock = fromBlock;
  const latestBlock = toBlock ?? (await provider.getBlockNumber());

  while (lastProcessedBlock < latestBlock) {
    console.log(
      "Processing blocks:",
      lastProcessedBlock,
      lastProcessedBlock + blockRange
    );
    try {
      const events = await contract.queryFilter(
        contract.filters,
        lastProcessedBlock,
        lastProcessedBlock + blockRange
      );
      lastProcessedBlock = lastProcessedBlock + blockRange;
      allEvents = [...allEvents, ...events];
    } catch (error) {
      console.log(error);
    }
  }

  const mappedEvents = mapEventsToStakingContractEvents(allEvents);

  return mappedEvents;
}

function mapEventsToStakingContractEvents(
  events: any[]
): StakingContractEvent[] {
  return events.map((value) => {
    return {
      block: value.blockNumber,
      name: value.event,
      address: value.args[0],
      amount: value.args[1],
    };
  });
}

export default getStakingContractEvents;
