'use client';

export interface SummaryKpiItem {
  key: string;
  label: string;
  value: number;
  description: string;
  tone: 'volume' | 'mix' | 'workflow';
}

export interface SummaryCategorySlice {
  name: string;
  value: number;
  fill: string;
}

export interface SummaryMonthlyRow {
  month: string;
  shortMonth: string;
  value: number;
}

export interface SummaryAirlineRow {
  id: string;
  branch: string;
  airline: string;
  accident: number;
  complaint: number;
  irregularity: number;
  compliment: number;
  total: number;
}

export interface SummaryMetricRow {
  id: string;
  name: string;
  value: number;
}

export interface SummaryAreaRow {
  id: string;
  category: string;
  classification: string;
  total: number;
}

export interface SummaryMatrixRow {
  id: string;
  label: string;
  values: Record<string, number>;
  total: number;
}

export interface SummaryMatrixData {
  columns: string[];
  rows: SummaryMatrixRow[];
  maxValue: number;
}

export interface SummaryDetailRow {
  id: string;
  date: string;
  rawDate: number;
  branch: string;
  airline: string;
  flight: string;
  category: string;
  breakdown: string;
  rootSummary: string;
  detail: string;
  detailRoot: string;
  action: string;
  preventive: string;
  status: string;
}

export interface SummaryRootCauseAreaRow {
  id: string;
  branch: string;
  airline: string;
  category: string;
  areaCategory: string;
  issueCaused: string;
  breakdownCaused: string;
  rootCause: string;
  total: number;
}
