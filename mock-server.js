import express from 'express';
import cors from 'cors';

const app = express();
const PORT = process.env.PORT || 3069;

app.use(cors({ origin: true, credentials: true }));
app.use(express.json());

const dummyEvents = [
  {
    id: "dummy-event-1",
    name: "Lumpat Jakarta Half Marathon 2026",
    slug: "lumpat-jakarta-half-marathon-2026",
    description: "Nikmati rute steril di jantung kota Jakarta dengan kearifan lokal dan cheering point yang meriah.",
    eventDate: new Date(Date.now() + 86400000 * 30).toISOString(),
    location: "Gelora Bung Karno, Jakarta",
    latitude: -6.2183,
    longitude: 106.8025,
    status: "upcoming",
    logoUrl: null,
    bannerUrl: "https://images.unsplash.com/photo-1517649763962-0c623066013b?w=1200&q=85",
    homeImageUrl: "https://images.unsplash.com/photo-1517649763962-0c623066013b?w=600&q=80",
    tshirtSizes: ["S", "M", "L", "XL"],
    bibCustomPrice: 50000,
    isActive: true,
    isDraft: false,
    publishAt: new Date().toISOString(),
    categories: ["5K", "10K", "Half Marathon"],
    content: null,
    participantCount: 1420,
    isDeleted: false,
    createdAt: new Date().getTime(),
    cutoffMs: null,
    categoryStartTimes: null,
  },
  {
    id: "dummy-event-2",
    name: "Borobudur Trail Run & Ultra 2026",
    slug: "borobudur-trail-run-ultra-2026",
    description: "Jelajahi perbukitan Menoreh dan desa wisata di sekitar Candi Borobudur dengan pemandangan magis matahari terbit.",
    eventDate: new Date(Date.now() + 86400000 * 60).toISOString(),
    location: "Candi Borobudur, Magelang",
    latitude: -7.6079,
    longitude: 110.1211,
    status: "upcoming",
    logoUrl: null,
    bannerUrl: "https://images.unsplash.com/photo-1571008887538-b36bb32f4571?w=1200&q=85",
    homeImageUrl: "https://images.unsplash.com/photo-1571008887538-b36bb32f4571?w=600&q=80",
    tshirtSizes: ["S", "M", "L", "XL", "XXL"],
    bibCustomPrice: 65000,
    isActive: true,
    isDraft: false,
    publishAt: new Date().toISOString(),
    categories: ["Trail Run", "15K", "30K"],
    content: null,
    participantCount: 850,
    isDeleted: false,
    createdAt: new Date().getTime(),
    cutoffMs: null,
    categoryStartTimes: null,
  },
  {
    id: "dummy-event-3",
    name: "Bali Coastal Cycling Challenge",
    slug: "bali-coastal-cycling-challenge",
    description: "Gowes menyusuri garis pantai Bali yang eksotis dengan angin laut dan rute flat yang menyenangkan.",
    eventDate: new Date(Date.now() + 86400000 * 90).toISOString(),
    location: "Kuta Beach, Bali",
    latitude: -8.7185,
    longitude: 115.1686,
    status: "upcoming",
    logoUrl: null,
    bannerUrl: "https://images.unsplash.com/photo-1534787238827-db1cac7a97cb?w=1200&q=85",
    homeImageUrl: "https://images.unsplash.com/photo-1534787238827-db1cac7a97cb?w=600&q=80",
    tshirtSizes: ["M", "L", "XL"],
    bibCustomPrice: 40000,
    isActive: true,
    isDraft: false,
    publishAt: new Date().toISOString(),
    categories: ["Cycling", "Fun Ride", "Gran Fondo"],
    content: null,
    participantCount: 540,
    isDeleted: false,
    createdAt: new Date().getTime(),
    cutoffMs: null,
    categoryStartTimes: null,
  },
  {
    id: "dummy-event-4",
    name: "Bandung Highlands Marathon 2026",
    slug: "bandung-highlands-marathon-2026",
    description: "Tantang diri Anda di rute menanjak Dago Pakar dengan udara Bandung yang sejuk dan pemandangan lembah hijau.",
    eventDate: new Date(Date.now() + 86400000 * 120).toISOString(),
    location: "Dago Pakar, Bandung",
    latitude: -6.8679,
    longitude: 107.6358,
    status: "upcoming",
    logoUrl: null,
    bannerUrl: "https://images.unsplash.com/photo-1502904550040-7534597429ae?w=1200&q=85",
    homeImageUrl: "https://images.unsplash.com/photo-1502904550040-7534597429ae?w=600&q=80",
    tshirtSizes: ["S", "M", "L", "XL"],
    bibCustomPrice: 50000,
    isActive: true,
    isDraft: false,
    publishAt: new Date().toISOString(),
    categories: ["Marathon", "Half Marathon", "10K"],
    content: null,
    participantCount: 920,
    isDeleted: false,
    createdAt: new Date().getTime(),
    cutoffMs: null,
    categoryStartTimes: null,
  },
  {
    id: "dummy-event-5",
    name: "Surabaya Independence Fun Run 2025",
    slug: "surabaya-independence-fun-run-2025",
    description: "Lari santai bersama keluarga merayakan hari kemerdekaan dengan berbagai kostum unik dan medali eksklusif.",
    eventDate: new Date(Date.now() - 86400000 * 15).toISOString(),
    location: "Tunjungan Plaza, Surabaya",
    latitude: -7.2624,
    longitude: 112.7394,
    status: "completed",
    logoUrl: null,
    bannerUrl: "https://images.unsplash.com/photo-1491493065055-c2a4b4d93a3f?w=1200&q=85",
    homeImageUrl: "https://images.unsplash.com/photo-1491493065055-c2a4b4d93a3f?w=600&q=80",
    tshirtSizes: null,
    bibCustomPrice: 0,
    isActive: true,
    isDraft: false,
    publishAt: new Date(Date.now() - 86400000 * 30).toISOString(),
    categories: ["Fun Run", "5K"],
    content: null,
    participantCount: 1800,
    isDeleted: false,
    createdAt: new Date(Date.now() - 86400000 * 40).getTime(),
    cutoffMs: null,
    categoryStartTimes: null,
  },
  {
    id: "dummy-event-6",
    name: "Bromo Sunrise Trail Marathon 2025",
    slug: "bromo-sunrise-trail-marathon-2025",
    description: "Sensasi lari di lautan pasir Bromo dan menyusuri kaldera gunung berapi aktif di pagi hari yang menakjubkan.",
    eventDate: new Date(Date.now() - 86400000 * 45).toISOString(),
    location: "Taman Nasional Bromo, Probolinggo",
    latitude: -7.9425,
    longitude: 112.9530,
    status: "completed",
    logoUrl: null,
    bannerUrl: "https://images.unsplash.com/photo-1484417894907-623942c8ee29?w=1200&q=85",
    homeImageUrl: "https://images.unsplash.com/photo-1484417894907-623942c8ee29?w=600&q=80",
    tshirtSizes: null,
    bibCustomPrice: 0,
    isActive: true,
    isDraft: false,
    publishAt: new Date(Date.now() - 86400000 * 60).toISOString(),
    categories: ["Trail Run", "Marathon"],
    content: null,
    participantCount: 1250,
    isDeleted: false,
    createdAt: new Date(Date.now() - 86400000 * 90).getTime(),
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
