export type NodeId = {
  space: string;
  externalId: string;
};

export type AssetSummary = {
  id: NodeId;
  name?: string;
  description?: string;
  tags: string[];
  parent?: NodeId;
};

export type Asset = AssetSummary & {
  aliases: string[];
  tags: string[];
  type?: NodeId;
};

export type TimeSeriesType = 'numeric' | 'string' | 'state' | 'unknown';

export type TimeSeriesSummary = {
  id: NodeId;
  name?: string;
  description?: string;
  type: TimeSeriesType;
  isStep?: boolean;
  sourceUnit?: string;
  unit?: NodeId;
};

export type LatestNumericDatapoint = {
  series: NodeId;
  timestamp: string;
  value: number;
};

export type NumericDatapoint = {
  timestamp: string;
  value: number;
};

export type NumericSeriesData = {
  series: NodeId;
  datapoints: NumericDatapoint[];
};

export type TimeRange = {
  start: string;
  end: string;
};

export type Activity = {
  id: NodeId;
  name?: string;
  description?: string;
  tags: string[];
  sourceId?: string;
  sourceContext?: string;
  source?: NodeId;
  sourceCreatedTime?: string;
  sourceUpdatedTime?: string;
  sourceCreatedUser?: string;
  sourceUpdatedUser?: string;
  startTime?: string;
  endTime?: string;
  scheduledStartTime?: string;
  scheduledEndTime?: string;
};
