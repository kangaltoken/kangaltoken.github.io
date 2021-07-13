require("dotenv").config();
const fetch = require("node-fetch");
const util = require("util");
const fs = require("fs");
import simpleGit, { SimpleGit } from "simple-git";
const git: SimpleGit = simpleGit();

function makeQuery(fromBlock: number): string {
  const query = `
  query KangalStakingEvents {
    ethereum(network: bsc) {
      smartContractEvents(
        smartContractAddress: {is: "0x222Dc5CBc4d5082Ac181532C01A57cC897eA4F15"}
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

async function fetchEvents(lastEventBlockNumber?: number) {
  let eventHistory: any;

  try {
    eventHistory = JSON.parse(fs.readFileSync("../apis/staking_events.json"));
  } catch (error) {
    console.log(error);
  }

  let query: string;

  if (eventHistory) {
    console.log(eventHistory[eventHistory.length - 1].block.height);
    const lastItemBlock = eventHistory[eventHistory.length - 1].block.height;
    query = makeQuery(lastItemBlock);
  } else {
    query = makeQuery(0);
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
    console.log(
      util.inspect(
        json.data.ethereum.smartContractEvents,
        false,
        null,
        true /* enable colors */
      )
    );

    const newEvents = json.data.ethereum.smartContractEvents;

    if (newEvents.length > 0) {
      if (lastEventBlockNumber) {
        let containsLastEventBlockNumber = false;
        newEvents.forEach((element: any) => {
          if (element.block.height === lastEventBlockNumber) {
            containsLastEventBlockNumber = true;
          }
        });
        if (containsLastEventBlockNumber === false) {
          fetchEventsAfterDelay(lastEventBlockNumber);
        }
      }
      if (eventHistory) {
        const updatedEventHistory = [
          ...eventHistory,
          ...json.data.ethereum.smartContractEvents,
        ];
        const data = JSON.stringify(updatedEventHistory);
        fs.writeFileSync("../apis/staking_events.json", data);
      } else {
        const data = JSON.stringify(json.data.ethereum.smartContractEvents);
        fs.writeFileSync("../apis/staking_events.json", data);
      }

      git.add("../*").commit("Updated events").push();
    } else {
      if (lastEventBlockNumber) {
        fetchEventsAfterDelay(lastEventBlockNumber);
      }
    }
  } catch (error) {
    console.log(error);
  }
}

export function fetchEventsAfterDelay(lastEventBlockNumber: number) {
  setTimeout(function () {
    fetchEvents(lastEventBlockNumber);
  }, 60000 * 3);
}

export default fetchEvents;
