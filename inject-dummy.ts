import fetch from 'node-fetch';

async function injectDummyRecord() {
  // Use the actual EPC from the database. 
  // Let's assume the dummy runner we just saw has EPC "101". 
  // You might need to change this if the EPC is different.
  const epc = "RFID_12345"; 
  const checkpointName = "CP1"; // Must match a Checkpoint identitas in Admin > Checkpoints!
  
  // Format the payload matching your hardware standard
  // The actual endpoint expects: { identitas: string, waktu: string, epc: string }
  // You defined CP identitas in the Admin tab. Let's assume the identitas is "SENSOR_1" 
  // and we mapped it to "CP1" in the Admin panel.
  
  const now = new Date();
  const timeFormatted = `${String(now.getHours()).padStart(2, '0')}:${String(now.getMinutes()).padStart(2, '0')}:${String(now.getSeconds()).padStart(2, '0')}.${String(now.getMilliseconds()).padStart(3, '0')}`;

  const payload = {
    i: "SENSOR_1", // Change this to whatever identitas you set in Admin
    t: timeFormatted,
    e: epc,
  };

  try {
    const res = await fetch('http://localhost:5173/api/sensor-record', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(payload),
    });

    if (res.ok) {
      console.log('Successfully injected record!', await res.json());
      console.log('Check your Leaderboard (Results Tab), it should update automatically!');
    } else {
      console.error('Failed to inject record:', await res.text());
    }
  } catch (error) {
    console.error('Error hitting API:', error);
  }
}

injectDummyRecord();
