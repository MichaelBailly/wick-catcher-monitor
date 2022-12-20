export type PredictionModel = {
  hash: string;
  watchers: {
    type: string;
    config: string;
  }[];
  model: {
    [key: string]: {
      [key: string]: {
        [key: string]: boolean | null;
      };
    };
  };
};
