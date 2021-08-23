import fs from "fs";
import fetch from "node-fetch";
import simpleGit, { SimpleGit } from "simple-git";
import { BigNumber } from "ethers";

import logger from "./logger";

const git: SimpleGit = simpleGit();

function makeQuery(fromBlock: number, contractAddress: string, network: string): string {
  const query = `
  query KangalStakingEvents {
    ethereum(network: ${network}) {
      smartContractEvents(
        smartContractAddress: {is: "${contractAddress}"}
        smartContractEvent: {in: ["Deposit", "Withdrawal", "RewardClaim"]}
        options: {asc: "block.height"}
        height: {gt: ${fromBlock}}
      ) {
        smartContractEvent {
          name
        }
        transaction {
          hash
        }
        arguments {
          value
          argumentType
        }
        block {
          timestamp {
            unixtime
          }
          height
        }
      }
    }
  }
  `;

  return query;
}

async function fetchEvents(
  contractAddress: string, 
  network: string, 
  eventsFileName: string, 
  balancesFileName: string, 
  receivedEventBlockNumber?: number) {
  let eventHistory: any;

  try {
    const events = fs.readFileSync(`../apis/${eventsFileName}`).toString();
    eventHistory = JSON.parse(events);
  } catch (error) {
    logger.error("READ staking_events.json", error);
  }

  let query: string;

  if (eventHistory) {
    const lastItemBlock = eventHistory[eventHistory.length - 1].block.height;
    query = makeQuery(lastItemBlock, contractAddress, network);
  } else {
    query = makeQuery(0, contractAddress, network);
  }

  const url = "https://graphql.bitquery.io/";
  const opts = {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "X-API-KEY": `${process.env.BITQUERY_API_KEY}`,
    },
    body: JSON.stringify({
      query,
    }),
  };

  try {
    const json = await fetch(url, opts).then((res: { json: () => any }) =>
      res.json()
    );

    const newEvents = json.data.ethereum.smartContractEvents;

    if (newEvents.length > 0) {
      if (eventHistory) {
        const updatedEventHistory = [
          ...eventHistory,
          ...json.data.ethereum.smartContractEvents,
        ];
        const data = JSON.stringify(updatedEventHistory);
        fs.writeFileSync(`../apis/${eventsFileName}`, data);

        const accounts = accountBalances(updatedEventHistory);
        const accountsData = JSON.stringify([...accounts]);
        fs.writeFileSync(`../apis/${balancesFileName}`, accountsData);

        if (receivedEventBlockNumber) {
          let containsLastEventBlockNumber = false;
          updatedEventHistory.forEach((element: any) => {
            if (element.block.height === receivedEventBlockNumber) {
              containsLastEventBlockNumber = true;
            }
          });
          if (containsLastEventBlockNumber === false) {
            fetchEventsAfterDelay(
              contractAddress, 
              network, 
              eventsFileName, 
              balancesFileName, 
              receivedEventBlockNumber
            );
          }
        }
      } else {
        const eventsData = JSON.stringify(newEvents);
        fs.writeFileSync(`../apis/${eventsFileName}`, eventsData);

        const accounts = accountBalances(newEvents);
        const accountsData = JSON.stringify([...accounts]);
        fs.writeFileSync(`../apis/${balancesFileName}`, accountsData);
      }

      //git.add("../*").commit("Updated events").push();
    } else {
      if (receivedEventBlockNumber) {
        fetchEventsAfterDelay(
          contractAddress, 
          network, 
          eventsFileName, 
          balancesFileName, 
          receivedEventBlockNumber
        );
      }
    }
  } catch (error) {
    logger.error("FETCH events", error);
  }
}

export function fetchEventsAfterDelay(  
  contractAddress: string, 
  network: string, 
  eventsFileName: string, 
  balancesFileName: string, 
  lastEventBlockNumber: number) {
  setTimeout(function () {
    fetchEvents(contractAddress, network, eventsFileName, balancesFileName, lastEventBlockNumber);
  }, 60000 * 3);
}

function accountBalances(events: any): Map<string, BigNumber> {
  let accounts = new Map<string, BigNumber>();

  events.forEach((event: any) => {
    const eventType = event.smartContractEvent.name;
    const address = event.arguments[0].value;
    const amount = BigNumber.from(event.arguments[1].value);

    if (eventType === "RewardClaim") {
      return;
    }

    const currentBalance = accounts.get(address);

    if (currentBalance) {
      if (eventType === "Deposit") {
        accounts.set(address, currentBalance.add(amount));
      } else if (eventType === "Withdrawal") {
        accounts.delete(address);
      }
    } else {
      accounts.set(address, amount);
    }
  });

  let sorted = new Map(
    [...accounts.entries()].sort((a, b) => {
      return b[1].gt(a[1]) ? 1 : -1;
    })
  );

  return sorted;
}

export default fetchEvents;
