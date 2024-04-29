import https from "https";
import { performance } from "perf_hooks";
import { downloadJob, uploadJob } from "../defaults/job";
import { INetSpeedTest, Job } from "../types";
import { average, jitter, measureSpeed, median, quartile } from "../utils";

type CloudflareLocationResponse = {
  iata: string;
  lat: number;
  lon: number;
  cca2: string;
  region: string;
  city: string;
};

type FormattedServerLocation = {
  city: string;
  region: string;
  lat: number;
  lon: number;
};

type Latency = {
  min: number;
  max: number;
  median: number;
  average: number;
  jitter: number;
};

async function get(hostname: string, path: string): Promise<string> {
  return new Promise((resolve, reject) => {
    const req = https.request(
      {
        hostname,
        path,
        method: "GET",
      },
      (res: any) => {
        const body: any[] = [];

        res.on("data", (chunk: any) => {
          body.push(chunk);
        });
        res.on("end", () => {
          try {
            resolve(Buffer.concat(body).toString());
          } catch (e) {
            reject(e);
          }
        });
        req.on("error", (err: any) => {
          reject(err);
        });
      },
    );

    req.end();
  });
}

async function fetchServerLocationData(): Promise<
  Record<string, FormattedServerLocation>
> {
  const res: CloudflareLocationResponse[] = JSON.parse(
    await get("speed.cloudflare.com", "/locations"),
  );

  return res.reduce((acc: Record<string, FormattedServerLocation>, curr) => {
    const data = acc;
    data[curr.iata] = {
      city: curr.city,
      region: curr.region,
      lat: curr.lat,
      lon: curr.lon,
    };

    return data;
  }, {});
}

async function fetchCfCdnCgiTrace(): Promise<{ [x: string]: string }> {
  const parseCfCdnCgiTrace = (text: string) =>
    text
      .split("\n")
      .map((i) => {
        const [key, value] = i.split("=");
        return [key, value];
      })
      .reduce((acc: { [x: string]: string }, [k, v]) => {
        if (!v) return acc;

        const data = acc;
        data[k] = v;

        return data;
      }, {});

  const text = await get("speed.cloudflare.com", "/cdn-cgi/trace");
  return parseCfCdnCgiTrace(text);
}

function request(
  options: string | https.RequestOptions | URL,
  data = "",
): Promise<unknown> {
  let started: number = 0;
  let ended: number = 0;

  let ttfb: number = 0;
  let dnsLookup: number = 0;
  let tcpHandshake: number = 0;
  let sslHandshake: number = 0;

  return new Promise((resolve, reject) => {
    started = performance.now();

    const req = https.request(options, (res: any) => {
      res.once("readable", () => {
        ttfb = performance.now();
      });
      res.on("data", () => {});
      res.on("end", () => {
        ended = performance.now();

        resolve([
          started,
          dnsLookup,
          tcpHandshake,
          sslHandshake,
          ttfb,
          ended,
          parseFloat(
            (res.headers["server-timing"]?.slice(22) as string) ?? "0",
          ),
        ]);
      });
    });

    req.on("socket", (socket: any) => {
      socket.on("lookup", () => {
        dnsLookup = performance.now();
      });
      socket.on("connect", () => {
        tcpHandshake = performance.now();
      });
      socket.on("secureConnect", () => {
        sslHandshake = performance.now();
      });
    });

    req.on("error", (error: any) => {
      reject(error);
    });

    req.write(data);
    req.end();
  });
}

function download(bytes: number): Promise<unknown> {
  const options = {
    hostname: "speed.cloudflare.com",
    path: `/__down?bytes=${bytes}`,
    method: "GET",
  };

  return request(options);
}

function upload(bytes: number): Promise<unknown> {
  const data = "0".repeat(bytes);
  const options = {
    hostname: "speed.cloudflare.com",
    path: "/__up",
    method: "POST",
    headers: {
      "Content-Length": Buffer.byteLength(data),
    },
  };

  return request(options, data);
}

async function measureLatency(): Promise<Latency> {
  const measurements: number[] = [];

  for (let i = 0; i < 20; i += 1) {
    await download(1000).then(
      (response: any) => {
        // TTFB - Server processing time
        const processingTime = response?.[4] - response?.[0] - response?.[6];
        measurements.push(processingTime ?? 0);
      },
      (error) => {
        console.log(`Error: ${error}`);
      },
    );
  }

  return {
    min: Math.min(...measurements),
    max: Math.max(...measurements),
    average: average(measurements),
    median: median(measurements),
    jitter: jitter(measurements),
  };
}

async function measureDownload(bytes: number, iterations: number) {
  const measurements: number[] = [];

  for (let i = 0; i < iterations; i += 1) {
    await download(bytes).then(
      (response: any) => {
        const transferTime = response?.[5] - response?.[4];
        measurements.push(measureSpeed(bytes, transferTime ?? 0));
      },
      (error) => {
        console.log(`Error: ${error}`);
      },
    );
  }

  return measurements;
}

async function measureUpload(bytes: number, iterations: number) {
  const measurements: number[] = [];

  for (let i = 0; i < iterations; i += 1) {
    await upload(bytes).then(
      (response: any) => {
        const transferTime = response?.[6];
        measurements.push(measureSpeed(bytes, transferTime ?? 0));
      },
      (error) => {
        console.log(`Error: ${error}`);
      },
    );
  }

  return measurements;
}

export async function getInternetSpeed(
  jobs: {
    upload: Job[];
    download: Job[];
  } = {
    upload: uploadJob,
    download: downloadJob,
  },
): Promise<{
  ping: Latency;
  serverLocation: FormattedServerLocation;
  speed: INetSpeedTest;
}> {
  const [ping, serverLocationData, { colo }] = await Promise.all([
    measureLatency(),
    fetchServerLocationData(),
    fetchCfCdnCgiTrace(),
  ]);

  const uploadTests = (
    await Promise.all(
      jobs.upload.map((job) => measureUpload(job.bytes, job.iteration)),
    )
  ).flatMap((item) => item);

  const downloadTests = (
    await Promise.all(
      jobs.download.map((job) => measureDownload(job.bytes, job.iteration)),
    )
  ).flatMap((item) => item);

  const uploadSpeed = quartile(uploadTests, 0.9).toFixed(2);
  const downloadSpeed = quartile(downloadTests, 0.9).toFixed(2);

  return {
    ping: ping,
    serverLocation: serverLocationData[colo],
    speed: {
      mbps: {
        upload: Number(uploadSpeed),
        download: Number(downloadSpeed),
      },
    },
  };
}
