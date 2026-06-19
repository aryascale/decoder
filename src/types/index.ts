export interface Event {
  id: string;
  name: string;
  slug: string;
  description: string;
  eventDate: string;
  location?: string;
  isActive: boolean;
  createdAt: number;
  categories: string[];
  participantCount?: number;
}
