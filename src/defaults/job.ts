import { Job } from "../types";

export const rwJob: Job[] = [{ bytes: 2000000000, iteration: 1 }];
export const uploadJob: Job[] = [
  {
    bytes: 100000,
    iteration: 4,
  },
  {
    bytes: 10000000,
    iteration: 3,
  },
  {
    bytes: 50000000,
    iteration: 2,
  },
  {
    bytes: 200000000,
    iteration: 1,
  },
];
export const downloadJob: Job[] = [
  {
    bytes: 100000,
    iteration: 4,
  },
  {
    bytes: 10000000,
    iteration: 3,
  },
  {
    bytes: 50000000,
    iteration: 2,
  },
  {
    bytes: 200000000,
    iteration: 1,
  },
];
