import { PostgresSaver } from "@langchain/langgraph-checkpoint-postgres";

import { getDatabaseConnectionString } from "@/lib/db/client";

let checkpointer: PostgresSaver | undefined;
let setupPromise: Promise<PostgresSaver> | undefined;

export async function getSalesMissionCheckpointer(): Promise<PostgresSaver> {
  if (checkpointer) {
    return checkpointer;
  }
  setupPromise ??= (async () => {
    const saver = PostgresSaver.fromConnString(getDatabaseConnectionString());
    await saver.setup();
    checkpointer = saver;
    return saver;
  })();
  return setupPromise;
}
