import fs from "fs";
import inquirer from "inquirer";
import { createSpinner } from "nanospinner";
import { getInternetSpeed, getReadWriteSpeed } from "../lib";

export async function runInetTest() {
  const spinner = createSpinner("Performing internet speed test\n").start();
  try {
    const performance = await getInternetSpeed();
    spinner.success({
      text: `Server Location: ${performance.serverLocation.city}, ${performance.serverLocation.region}`,
    });
    spinner.success({
      text: `Latency:\n\tavg: ${performance.ping.average.toFixed(2)} ms\n\tmin: ${performance.ping.min.toFixed(2)} ms\n\tmax: ${performance.ping.max.toFixed(2)} ms`,
    });
    spinner.success({
      text: `upload speed(Mbps): ${performance.speed.mbps.upload.toFixed(2)}`,
    });
    spinner.success({
      text: `Download Speed(Mbps): ${performance.speed.mbps.download.toFixed(2)}`,
    });
  } catch (e) {
    spinner.error({ text: "Inet speed test failed!" });
  }
}

const validatePath = async (input: any) => {
  if (!fs.existsSync(input)) return "path does not exist!";
  return true;
};

export async function runRwTest() {
  const pathInq = await inquirer.prompt({
    name: "value",
    type: "input",
    message: "Path where you want to perform test:",
    validate: validatePath,
  });
  const spinner = createSpinner("Performing read/write speed test").start();

  try {
    const performance = await getReadWriteSpeed(pathInq.value);
    spinner.success({
      text: `Read speed(Mbps): ${performance.mbps.read.toFixed(2)}`,
    });
    spinner.success({
      text: `Write Speed(Mbps): ${performance.mbps.write.toFixed(2)}`,
    });
  } catch (e) {
    spinner.error({ text: "Read/Write test failed" });
  }
}
