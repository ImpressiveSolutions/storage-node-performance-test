import { Command } from "commander";
import { runInetTest, runRwTest } from "./command/runTest";

const program = new Command();
const { version } = require("../package.json");

program
  .name("performance-test-cli")
  .description("Command Line Interface for Performance Test")
  .version(version);

program
  .command("rw")
  .description("perform read/write speed test")
  .action(runRwTest);

program
  .command("inet")
  .description("perform internet speed test")
  .action(runInetTest);

program.parse();
