import fs from "fs";
import simpleGit, { SimpleGit } from "simple-git";
import { BigNumber } from "ethers";

import logger from "./logger";
import getStakingContractEvents, {
  NetworkType,
  StakingContractEvent,
} from "./getStakingContractEvents";

const git: SimpleGit = simpleGit();

async function processEvents(
  network: NetworkType,
  eventsFileName: string,
  balancesFileName: string
) {
  let eventHistory: StakingContractEvent[] = [];
  let newEvents: StakingContractEvent[] = [];

  try {
    const events = fs.readFileSync(`../apis/${eventsFileName}`).toString();
    eventHistory = JSON.parse(events);
  } catch (error) {
    logger.error("READ eventsFileName", eventsFileName, error);
  }

  try {
    if (eventHistory.length > 0) {
      const lastItemBlock = eventHistory[eventHistory.length - 1].block;
      newEvents = await getStakingContractEvents(network, lastItemBlock + 1);
    } else {
      let fromBlock = 0;
      if (network == NetworkType.bsc) {
        fromBlock = 8608240;
      } else {
        fromBlock = 18170790;
      }
      newEvents = await getStakingContractEvents(network, fromBlock);
    }

    if (newEvents.length > 0) {
      if (eventHistory.length > 0) {
        const updatedEventHistory = [...eventHistory, ...newEvents];
        const data = JSON.stringify(updatedEventHistory);
        fs.writeFileSync(`../apis/${eventsFileName}`, data);

        const accounts = accountBalances(updatedEventHistory);
        const accountsData = JSON.stringify([...accounts]);
        fs.writeFileSync(`../apis/${balancesFileName}`, accountsData);
      } else {
        const eventsData = JSON.stringify(newEvents);
        fs.writeFileSync(`../apis/${eventsFileName}`, eventsData);

        const accounts = accountBalances(newEvents);
        const accountsData = JSON.stringify([...accounts]);
        fs.writeFileSync(`../apis/${balancesFileName}`, accountsData);
      }

      git.add("../*").commit("Updated events").push();
    }
  } catch (error) {
    logger.error("FETCH events", error);
  }
}

function accountBalances(
  events: StakingContractEvent[]
): Map<string, BigNumber> {
  let accounts = new Map<string, BigNumber>();

  events.forEach((event: StakingContractEvent) => {
    if (event.name === "RewardClaim") {
      return;
    }

    const currentBalance = accounts.get(event.address) ?? BigNumber.from(0);

    if (currentBalance) {
      if (event.name === "Deposit") {
        accounts.set(event.address, currentBalance.add(event.amount));
      } else if (event.name === "Withdrawal") {
        accounts.delete(event.address);
      }
    } else {
      accounts.set(event.address, event.amount);
    }
  });

  let sorted = new Map(
    [...accounts.entries()].sort((a, b) => {
      return b[1].gt(a[1]) ? 1 : -1;
    })
  );

  return sorted;
}

export default processEvents;
