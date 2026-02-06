export interface MinuteDocument {
  ts_minute: Date;
  count_last_minute: number;
}

export function generateMockData(): MinuteDocument[] {
  const now = new Date();
  const data: MinuteDocument[] = [];
  const TOTAL_MINUTES = 24 * 60; // 24 hours back

  for (let i = 0; i < TOTAL_MINUTES; i++) {
    const ts = new Date(now.getTime() - (TOTAL_MINUTES - i) * 60 * 1000);
    
    // Simulate some realistic patterns:
    // More activity during "work hours" (e.g., 8am - 6pm)
    const hour = ts.getHours();
    let baseCount = 0;
    
    if (hour >= 8 && hour <= 18) {
      baseCount = Math.floor(Math.random() * 50) + 20; // 20-70 counts
    } else {
      baseCount = Math.floor(Math.random() * 10); // 0-10 counts (night)
    }

    // Add some noise/spikes
    if (Math.random() > 0.95) {
      baseCount += Math.floor(Math.random() * 100);
    }

    data.push({
      ts_minute: ts,
      count_last_minute: baseCount,
    });
  }

  return data;
}

export const mockMinuteDocs = generateMockData();
