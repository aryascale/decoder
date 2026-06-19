import express from 'express';
import cors from 'cors';

const app = express();
const PORT = process.env.PORT || 3069;

app.use(cors({ origin: true, credentials: true }));
app.use(express.json());

const dummyEvents = [
  {
    id: "dummy-event-1",
    name: "Dummy Race 2026",
    slug: "dummy-race-2026",
    description: "This is a dummy event for frontend development. You can edit this in mock-server.js.",
    eventDate: new Date(Date.now() + 86400000 * 30).toISOString(),
    location: "Jakarta, Indonesia",
    latitude: -6.2088,
    longitude: 106.8456,
    status: "upcoming",
    logoUrl: null,
    bannerUrl: "https://images.unsplash.com/photo-1552674605-15cff24c00e8?w=800&q=80",
    homeImageUrl: "https://images.unsplash.com/photo-1552674605-15cff24c00e8?w=400&q=80",
    tshirtSizes: ["S", "M", "L", "XL"],
    bibCustomPrice: 50000,
    isActive: true,
    isDraft: false,
    publishAt: new Date().toISOString(),
    categories: ["5K", "10K", "Half Marathon"],
    content: null,
    participantCount: 42,
    isDeleted: false,
    createdAt: new Date().getTime(),
    cutoffMs: null,
    categoryStartTimes: null,
  },
  {
    id: "dummy-event-2",
    name: "Past Dummy Event",
    slug: "past-dummy-event",
    description: "This event has already finished.",
    eventDate: new Date(Date.now() - 86400000 * 10).toISOString(),
    location: "Bandung, Indonesia",
    latitude: -6.9175,
    longitude: 107.6191,
    status: "finished",
    logoUrl: null,
    bannerUrl: "https://images.unsplash.com/photo-1452626022479-8dba2b63253a?w=800&q=80",
    homeImageUrl: "https://images.unsplash.com/photo-1452626022479-8dba2b63253a?w=400&q=80",
    tshirtSizes: null,
    bibCustomPrice: 0,
    isActive: true,
    isDraft: false,
    publishAt: new Date(Date.now() - 86400000 * 20).toISOString(),
    categories: ["Fun Run"],
    content: null,
    participantCount: 150,
    isDeleted: false,
    createdAt: new Date(Date.now() - 86400000 * 30).getTime(),
    cutoffMs: null,
    categoryStartTimes: null,
  }
];

// Mock API endpoints
app.get('/api/events', (req, res) => {
  const { eventId } = req.query;
  if (eventId) {
    const event = dummyEvents.find(e => e.id === eventId || e.slug === eventId);
    if (event) {
      return res.json(event);
    }
    return res.status(404).json({ error: 'Event not found' });
  }
  res.json(dummyEvents);
});

app.get('/api/auth-me', (req, res) => {
  res.json({ id: 'dummy-user-1', name: 'Dummy User', email: 'dummy@example.com', role: 'user' });
});

app.get('/api/categories', (req, res) => {
  const { eventId } = req.query;
  const event = dummyEvents.find(e => e.id === eventId || e.slug === eventId);
  if (event) {
    return res.json(event.categories.map((c, i) => ({ id: `cat-${i}`, name: c, eventId: event.id })));
  }
  res.json([]);
});

app.get('/api/banners', (req, res) => {
  res.json([]);
});

// Fallback for any other API calls to not crash the FE
app.use('/api', (req, res) => {
  console.log(`[Mock Server] Unhandled ${req.method} request to ${req.originalUrl}`);
  res.status(200).json({});
});

app.listen(PORT, () => {
  console.log(`🏃‍♂️ Mock server is running on http://localhost:${PORT}`);
  console.log(`Frontend will use this data when you run 'npm run dev:mock'`);
});
