import fs from "fs";
import path from "path";
import { rwJob } from "../defaults/job";
import { RWSpeedTest, Job } from "../types";
import { average, measureSpeed, timeit } from "../utils";

function generateMockData(bytes: number) {
  const randomArray = new Uint8Array(bytes);
  for (let i = 0; i < bytes; i++) {
    randomArray[i] = Math.floor(Math.random() * 256); // Generate a random byte value (0-255)
  }
  return randomArray;
}

function measureWrite(filepath: string, fileSizeBytes: number) {
  const content = generateMockData(fileSizeBytes);
  const writeTimeit = timeit(fs.writeFileSync, filepath, content);
  const writeSpeedMbps = measureSpeed(fileSizeBytes, writeTimeit.timeit.delta);
  return writeSpeedMbps;
}

function measureRead(filepath: string) {
  const readTimeit = timeit<Buffer>(fs.readFileSync, filepath);
  const bytesRead = readTimeit.fnRet.byteLength;
  const readSpeedMbps = measureSpeed(bytesRead, readTimeit.timeit.delta);
  return readSpeedMbps;
}

export async function getReadWriteSpeed(
  testPath: string,
  jobs: Job[] = rwJob,
): Promise<RWSpeedTest> {
  const readpaths: string[] = [];
  const writes = jobs
    .map((job) => {
      const writes = Array.from({ length: job.iteration })
        .fill(0)
        .map((_, index) => {
          const writePath = path.join(testPath, `eval-rw-${job.bytes}${index}`);
          readpaths.push(writePath);
          return measureWrite(writePath, job.bytes);
        });

      return writes;
    })
    .flatMap((item) => item);
  const reads = readpaths.map((filepath) => measureRead(filepath));

  const writeSpeed = average(writes);
  const readSpeed = average(reads);

  readpaths.forEach((filepath) =>
    fs.unlink(filepath, (error) => {
      if (error) console.log(`File '${filepath}' deletion failed.`);
    }),
  );

  return {
    mbps: {
      read: readSpeed,
      write: writeSpeed,
    },
  };
}
