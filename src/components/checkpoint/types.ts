export interface Runner {
  bib: string;
  name: string;
  team?: string;
  category?: string;
}

export interface TimeRecord {
  id: string;
  bib: string;
  name: string;
  timestamp: number; // Elapsed time in milliseconds
  formattedTime: string; // hh:mm:ss:ms
  timeOfDay: string; // Wall clock HH:MM:SS.ms representation
  notes?: string;
}

export interface ClockState {
  isRunning: boolean;
  startTime: number | null; // Date.now() when started
  elapsedTime: number; // Accumulated elapsed time in ms when paused
}
