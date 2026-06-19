# Panduan Teknis Lengkap & Arsitektur Lumpat Live Timing

Dokumen ini adalah **dokumentasi teknis mendalam** yang merangkum semua perubahan file, penambahan fitur, serta *flow* logika di balik layar untuk sistem Live Timing pada aplikasi Lumpat.

---

## 1. Spesifikasi API Komunikasi Hardware Timing (SANGAT PENTING)

Ini adalah spesifikasi teknis API yang harus digunakan oleh alat hardware (Sensor RFID) di lapangan untuk mengirimkan data secara *real-time* ke server Lumpat.

> [!IMPORTANT]  
> **Endpoint:** `/api/sensor-record`  
> **Method:** `POST`  
> **Content-Type:** `application/json`

### A. Format Request Body (Payload)
Hardware **wajib** mengirimkan JSON dengan 3 *key* (huruf kecil) berikut:

| Key | Tipe Data | Keterangan | Contoh |
| :--- | :--- | :--- | :--- |
| `i` | String | **Identitas Sensor / Checkpoint.** Harus persis sama dengan yang didaftarkan Admin di menu *Checkpoints Management*. | `"SENSOR_1"`, `"CP_TENGAH"` |
| `e` | String | **EPC (Electronic Product Code).** Ini adalah ID unik dari tag RFID yang terbaca dari pelari. | `"RFID_001"`, `"E2000017"` |
| `t` | String | **Waktu Kejadian (Timestamp).** Format harus `HH:MM:SS.mmm` (Jam:Menit:Detik.Milidetik) menggunakan zona waktu lokal alat. | `"14:30:00.123"` |

### B. Contoh Request (cURL)
```bash
curl -X POST http://SERVER_IP:3069/api/sensor-record \
  -H "Content-Type: application/json" \
  -d '{
    "i": "SENSOR_1",
    "e": "RFID_001",
    "t": "07:15:30.500"
  }'
```

### C. Response Server
- **Success (200 OK):** Data berhasil direkam dan di-*broadcast* ke browser.
  ```json
  { "message": "Success", "record": { /* data record */ } }
  ```
- **Error (400 Bad Request):** Jika ada *field* `i`, `e`, atau `t` yang hilang.
- **Error (404 Not Found):** Jika tag EPC (`e`) tidak ditemukan di *event* yang sedang aktif hari ini.

---

## 2. Daftar File yang Ditambahkan & Dimodifikasi

Berikut adalah rincian lengkap file apa saja yang kita sentuh, buat, dan apa peran krusial mereka:

### A. Modifikasi File Inti Aplikasi (Frontend & Backend)
1. **`src/pages/EventPage.tsx` (MODIFIED)**
   - **Tujuan:** Sebelumnya, perubahan UI di file `LeaderboardPage.tsx` tidak berefek karena halaman yang merender *tab* Results untuk sebuah event spesifik adalah `EventPage.tsx`. Ini adalah file terpenting yang merender tabel leaderboard.
   - **Perubahan yang Dilakukan:**
     - Menambahkan *hook* `useLiveTiming(eventId)` untuk membuka koneksi WebSocket.
     - Menangkap event `recordsByEpc` dari *socket* untuk menyimpan data checkpoint terbaru.
     - Menambahkan variabel `overallWithLatestCp` menggunakan `useMemo`. Fungsinya adalah **Dynamic Patching**: menimpa data dasar (`overall`) dengan data checkpoint *real-time* tanpa melakukan *fetch* ulang ke API.
     - **Bug Fix Double Rows:** Mengubah logika filter `finishers` untuk mengecualikan status `"NO START TIME"` dan `"Registered"` sehingga baris data pelari tidak terduplikasi di UI.

2. **`api/sensor-record.ts` (REVIEWED)**
   - **Tujuan:** Merupakan *endpoint* API (Backend) yang menerima tembakan data dari Hardware Sensor (Scanner RFID).
   - **Parsing Waktu:** Mengambil string `t` (misal `06:33:16.562`), memecahnya menjadi jam, menit, detik, dan milidetik, lalu mengkalkulasinya ke objek `Date` untuk hari ini.
   - **Pencarian Event Aktif:** Mencari tabel `RunnerStatus` berdasarkan `e` (EPC), dan mencari event yang sedang `isActive` atau `eventDate`-nya cocok dengan hari ini.

### B. Penambahan File Utility / Testing (Scripts)
Untuk mensimulasikan alat fisik RFID yang belum ada/sedang tidak terhubung, kita membuat 3 script *killer*:

1. **`push-cp.ts` (NEW / REWRITTEN)**
   - **Gunanya:** Script CLI interaktif untuk simulasi alat hardware timing.
   - **Fitur Command:**
     - `start.1` / `start.all`: Mengatur waktu **START** (meng-hit `/api/csv-upload` untuk menimpa `start.csv` dengan waktu saat ini). Mencegah *bug* Race Time negatif.
     - `1.1` / `all.1`: Menembak `/api/sensor-record` untuk mencatat pelari di Checkpoint tertentu (Simulasi *Hit* Hardware).
     - `fin.1` / `fin.all`: Mencatat waktu **FINISH** (menimpa `finish.csv`), sehingga sistem web secara otomatis menampilkan kolom Race Time.

2. **`seed-dummy.ts` (NEW)**
   - **Gunanya:** Secara otomatis men-*seed* (menyuntikkan) data pelari palsu ke dalam tabel `EventRegistration`, `RunnerStatus`, serta menimpa `master.csv`.

3. **`reset.ts` (NEW)**
   - **Gunanya:** Tombol "Reset Kiamat" untuk event balapan. 
   - **Fitur:** Men-`DELETE` semua riwayat `RunnerRecord` di SQLite, dan mengosongkan isi file `start.csv` & `finish.csv`. Mengembalikan semua pelari ke status perawan (`NO START TIME`).

---

## 3. Fitur-Fitur Baru yang Berhasil Diimplementasikan

- **Zero-Reload Live Leaderboard:** UI web secara dinamis mengubah kolom `Latest CP` dan `Time of Day` tepat pada saat `push-cp.ts` (hardware) mengirim data, tanpa pengunjung web harus me-refresh halaman.
- **Race Time Calculation Fix:** Pencegahan waktu *finish* menjadi minus. Mengubah *flow* sehingga start.csv wajib diisi/ditembak dulu. Saat finish, kalkulasi `Waktu Finish - Waktu Start` tereksekusi dengan benar.
- **Deduplikasi Peserta:** Memperbaiki sistem *sorting* di tabel React sehingga pelari yang berstatus *No Start Time* tidak dianggap sebagai *Finisher*, menyelesaikan bug nama pelari muncul ganda.

---

## 4. Flow Sistem (Bagaimana Semua Bekerja Bersama)

### A. Flow Perjalanan Data (Hardware ke Layar Web)
Ini adalah alur pasti dari lapangan hingga ke mata penonton di web:

1. **Hardware Timing Menangkap Tag RFID** 
   - Scanner di checkpoint membaca RFID `RFID_001`.
2. **HTTP POST Request (Ke Endpoint `/api/sensor-record`)**
   - Alat mengirimkan request berformat JSON berisi Identitas Checkpoint, EPC pelari, dan Jam lewat.
3. **Backend Processing (`api/sensor-record.ts`)**
   - API menerima data, mencari event aktif, dan memastikan pelari `RFID_001` sah ikut serta.
   - Menyimpan jejak (`INSERT`) ke SQLite database di tabel `RunnerRecord`.
4. **WebSocket Broadcast (`src/lib/socket.ts`)**
   - Begitu data tersimpan, server Node.js *emit* sinyal berisikan data tersebut ke seluruh web socket (browser pengunjung) via event `new_record`.
5. **Frontend React (`src/hooks/useLiveTiming.ts`)**
   - *Listener* React menangkap `new_record` dan memperbarui state lokal `recordsByEpc`.
6. **Frontend UI Patching (`src/pages/EventPage.tsx`)**
   - UI (Tabel) langsung di-patch menggunakan `useMemo` tanpa melakuan _API request_ lagi. Pelari akan terlihat berpindah ke Checkpoint baru.

### B. Flow Start dan Finish (Arsitektur CSV)
Saat ini Start dan Finish di aplikasi Lumpat **tidak masuk** lewat `/api/sensor-record`, melainkan dicatat berbasis kompilasi file CSV (`start.csv` dan `finish.csv`):
1. **Push Start/Finish (Simulasi via `push-cp.ts`)**
   - Hardware/Admin mengkompilasi file CSV dan mengirim `POST` ke `/api/csv-upload` dengan parameter `kind: 'start'` atau `kind: 'finish'`.
2. **Kalkulasi Front-End**
   - Browser secara berkala (atau via *hard-reload*) mengunduh CSV ini.
   - Frontend mengurangkan nilai dari `finish.csv` dengan `start.csv` untuk mendapatkan **Race Time** (Lama Berlari).

---

## 5. Hasil Akhir (Screenshots)

Berikut adalah bukti visual dari arsitektur dan sistem yang telah diimplementasikan:

### Konfigurasi Checkpoint Hardware
Admin wajib mendaftarkan *Identitas Sensor* (misal: `SENSOR_1`) di Dashboard yang persis sama dengan yang akan ditembakkan oleh alat Hardware.
![Checkpoints Management](C:/Users/LENOVO/.gemini/antigravity-ide/brain/f5d954a4-10f4-4f90-9b1b-d3654cb945c3/media__1781378763373.png)

### Simulasi Hardware di Terminal (`push-cp.ts`)
Tampilan terminal yang interaktif memungkinkan penembakan data checkpoint ke backend secara berurutan.
![Terminal Push CP](C:/Users/LENOVO/.gemini/antigravity-ide/brain/f5d954a4-10f4-4f90-9b1b-d3654cb945c3/media__1781378763402.png)

### Leaderboard dengan Live Patching & Race Time Fix
Browser langsung mengupdate waktu dan posisi tanpa reload. Bug pelari muncul dua kali sudah tidak ada, dan *Race Time* muncul positif karena sinkronisasi waktu start yang benar.
![Leaderboard Real-Time](C:/Users/LENOVO/.gemini/antigravity-ide/brain/f5d954a4-10f4-4f90-9b1b-d3654cb945c3/media__1781378763409.png)

---
*Spesifikasi API Komunikasi dan Alur Arsitektur di atas bersifat final untuk integrasi dengan vendor hardware alat Timing RFID.*
