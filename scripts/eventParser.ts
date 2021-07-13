require("dotenv").config();
const fetch = require("node-fetch");
const util = require("util");
const fs = require("fs");

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

async function fetchEvents() {
  const eventsHistory = fs.readFileSync("../apis/events.json");

  let query: string;

  if (eventsHistory) {
    query = makeQuery(1);
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

    console.log(util.inspect(json, false, null, true /* enable colors */));
  } catch (error) {
    console.log(error);
  }
}

export default fetchEvents;
