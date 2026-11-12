import mongoose from "mongoose";
import { MongoDBSaver } from "@langchain/langgraph-checkpoint-mongodb";

let checkpointer;
let initialization;

export const initializeMongoCheckpointer = async () => {
  if (checkpointer) {
    return checkpointer;
  }

  if (!initialization) {
    initialization = (async () => {
      const { db, readyState } = mongoose.connection;
      if (readyState !== 1 || !db) {
        throw new Error(
          "MongoDB must be connected before initializing the LangGraph checkpointer"
        );
      }

      if (!db.databaseName) {
        throw new Error(
          "The connected MongoDB database name is unavailable for the LangGraph checkpointer"
        );
      }

      const saver = new MongoDBSaver({
        client: mongoose.connection.getClient(),
        dbName: db.databaseName,
      });
      const setupErrors = await saver.setup();

      if (setupErrors.length > 0) {
        throw new AggregateError(
          setupErrors,
          "Failed to set up MongoDB LangGraph checkpoint indexes"
        );
      }

      checkpointer = saver;
      return saver;
    })();
  }

  try {
    return await initialization;
  } catch (error) {
    initialization = undefined;
    throw error;
  }
};
