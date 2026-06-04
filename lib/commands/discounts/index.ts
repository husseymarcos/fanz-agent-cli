export type DiscountStatus = "active" | "paused" | "expired";

export type DiscountData = {
  id: string;
  eventId: string;
  code: string;
  percent: number;
  maxUses?: number;
  uses: number;
  status: DiscountStatus;
};
