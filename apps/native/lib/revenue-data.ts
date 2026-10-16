export interface RevenuePoint {
  amount: number;
  date: string;
}

export const revenueByRange: Record<string, readonly RevenuePoint[]> = {
  "7d": [
    { date: "Oct 09", amount: 9200 },
    { date: "Oct 10", amount: 10_450 },
    { date: "Oct 11", amount: 9760 },
    { date: "Oct 12", amount: 11_480 },
    { date: "Oct 13", amount: 10_830 },
    { date: "Oct 14", amount: 12_610 },
    { date: "Oct 15", amount: 13_710 },
  ],
  "30d": [
    { date: "Sep 16", amount: 6200 },
    { date: "Sep 19", amount: 8100 },
    { date: "Sep 22", amount: 7680 },
    { date: "Sep 25", amount: 10_200 },
    { date: "Sep 28", amount: 9310 },
    { date: "Oct 01", amount: 11_000 },
    { date: "Oct 04", amount: 9800 },
    { date: "Oct 07", amount: 11_960 },
    { date: "Oct 10", amount: 10_800 },
    { date: "Oct 13", amount: 12_610 },
    { date: "Oct 15", amount: 13_710 },
  ],
};

export const recentRevenue = [
  { amount: 1290, date: "14:42", id: "pro", label: "Pro plan" },
  { amount: 840, date: "13:10", id: "team", label: "Team plan" },
  { amount: 240, date: "11:28", id: "starter", label: "Starter plan" },
];

export const monthlyTarget = 108_000;
export const currentRevenue = 84_320;
