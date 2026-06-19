import 'dotenv/config';
import { query } from '../src/lib/db';

const PORT = process.env.PORT || 3069;

async function main() {
  // Hapus logic seeding otomatis biar database nggak kotor
  // Data dummy udah diinject lewat scripts/inject-registration.ts

  // 4. Fire the HTTP POST request to your backend API
  console.log('\n🚀 Firing POST request to /api/sensor/record...');
  
  const payload = {
    i: 'CP1',
    e: 'RFID_12345',
    t: '06:33:16.562'
  };

  try {
    const response = await fetch(`http://localhost:${PORT}/api/sensor/record`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload)
    });

    const result = await response.json();
    
    if (response.ok) {
      console.log('🎉 SUCCESS! Backend response:');
      console.dir(result, { depth: null });
    } else {
      console.error('❌ FAILED. Backend error:', result);
    }
  } catch (error) {
    console.error('⚠️ Could not connect to backend. Is your server running? (npm run dev:full)');
  }
}

main()
  .catch(e => console.error(e))
  .finally(() => {
    process.exit(0);
  });
