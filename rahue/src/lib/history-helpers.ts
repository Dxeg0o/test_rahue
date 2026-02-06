
import { differenceInDays, endOfDay, endOfWeek, format, isWithinInterval, startOfDay, startOfWeek, subDays } from "date-fns";
import { es } from "date-fns/locale";
import { mockOTs, type OTDocument } from "./mockOtData";

export type PeriodFilter = "today" | "week" | "month";

export function getOtsByPeriod(period: PeriodFilter, customStart?: Date, customEnd?: Date) {
  const now = new Date();
  let start: Date;
  let end: Date;

  if (period === "today") {
    start = startOfDay(now);
    end = endOfDay(now);
  } else if (period === "week") {
    start = startOfWeek(now, { weekStartsOn: 1 });
    end = endOfWeek(now, { weekStartsOn: 1 });
  } else if (period === "month") {
    start = subDays(now, 30); // simplistic "last 30 days" for now, or use startOfMonth
    end = endOfDay(now);
  } else {
    // Custom fallback
    start = customStart || subDays(now, 7);
    end = customEnd || now;
  }

  const filteredOts = mockOTs.filter((ot) => {
    const otDate = new Date(ot.startTime);
    return isWithinInterval(otDate, { start, end });
  });

  return { ots: filteredOts, start, end };
}

export function getStatsByTime(ots: OTDocument[]) {
  if (ots.length === 0) return null;

  const totalUnits = ots.reduce((acc, ot) => acc + ot.unitsProduced, 0);
  const totalOts = ots.length;
  const avgEfficiency = Math.round(
    ots.reduce((acc, ot) => acc + (ot.unitsProduced / (ot.targetUnits || 1)) * 100, 0) / totalOts
  );
  
  // Chart Data Preparation
  // We'll group by "Day" if range > 24h, else by "Hour"
  const isDaily = differenceInDays(new Date(ots[0].startTime), new Date(ots[ots.length - 1].startTime)) > 1 || ots.length > 20;
  
  const groups = new Map<string, number>();

  ots.forEach(ot => {
    const date = new Date(ot.startTime);
    // Sort keys based on granularity
    const key = isDaily ? format(date, "yyyy-MM-dd") : format(date, "HH:00");
    groups.set(key, (groups.get(key) || 0) + ot.unitsProduced);
  });

  const chartData = Array.from(groups.entries()).map(([key, value]) => ({
    name: isDaily ? format(new Date(key), "dd MMM", { locale: es }) : key,
    fullName: isDaily ? format(new Date(key), "PPP", { locale: es }) : key,
    units: value,
    originalKey: key // for sorting
  })).sort((a,b) => a.originalKey.localeCompare(b.originalKey));

  return {
    totalUnits,
    totalOts,
    avgEfficiency,
    chartData
  };
}
