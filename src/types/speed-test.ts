export type RWSpeedTest = {
  mbps: {
    read: number;
    write: number;
  };
};

export type INetSpeedTest = {
  mbps: {
    upload: number;
    download: number;
  };
};
