import { query } from '../src/lib/db.js';

async function injectFullRegistration() {
  const evId = '2d913990-5b89-4f7c-8f09-454169634ab2'; // Event ID yang tadi
  
  console.log('🔄 Memulai injeksi data full registration...');

  // 1. Buat Kategori Race
  const categoryId = `cat-${Date.now()}`;
  await query(
    `INSERT INTO Category (id, name, eventId, \`order\`, createdAt, price, quota, isHidden) 
     VALUES (?, '10K', ?, 1, NOW(), 150000, 100, false)`,
    [categoryId, evId]
  );
  console.log('✅ Kategori 10K berhasil dibuat');

  // 2. Buat Registrasi Peserta (Dapat BIB dan tercatat namanya)
  const regId = `reg-${Date.now()}`;
  await query(
    `INSERT INTO EventRegistration 
      (id, eventId, categoryId, createdAt, updatedAt, bibNumber, email, gender, name, orderId, paymentStatus, phoneNumber, grossAmount) 
     VALUES 
      (?, ?, ?, NOW(), NOW(), '101', 'pelari@lumpat.com', 'male', 'Pelari Dummy 01', ?, 'settlement', '081234567890', 150000)`,
    [regId, evId, categoryId, `order-${Date.now()}`]
  );
  console.log('✅ Data Registrasi peserta berhasil dimasukkan (Name: Pelari Dummy 01, BIB: 101)');

  // 3. Mapping EPC RFID ke BIB (RunnerStatus)
  // (Hapus data status/epc lama biar nggak bentrok)
  await query(`DELETE FROM RunnerStatus WHERE eventId = ?`, [evId]);
  
  await query(
    `INSERT INTO RunnerStatus (id, eventId, epc, bib, isDQ, isHidden, createdAt, updatedAt) 
     VALUES (UUID(), ?, 'RFID_12345', '101', false, false, NOW(), NOW())`,
    [evId]
  );
  console.log('✅ Mapping EPC RFID_12345 ke BIB 101 berhasil');

  console.log('🎉 SEMUA DATA REGISTRASI & EPC SUDAH SIAP! Silakan test sensor timmingnya sekarang.');
  process.exit(0);
}

injectFullRegistration().catch(console.error);
