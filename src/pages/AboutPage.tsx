import { useEffect } from "react";
import { motion } from "framer-motion";
import AboutNavbar from "../components/landing/AboutNavbar";

export default function AboutPage() {
  // Scroll to top on mount
  useEffect(() => {
    window.scrollTo(0, 0);
  }, []);

  return (
    <div className="min-h-screen bg-[#F5F5F7] font-sans selection:bg-black selection:text-white overflow-x-hidden text-[#1d1d1f]">
      <AboutNavbar />

      {/* HERO SECTION - MASSIVE TYPOGRAPHY */}
      <section className="relative pt-40 pb-20 md:pt-56 md:pb-32 px-6 flex flex-col items-center justify-center text-center">
        <motion.div
          initial={{ opacity: 0, y: 40 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 1.2, ease: [0.16, 1, 0.3, 1] }}
          className="max-w-5xl"
        >
          <h1 className="text-5xl sm:text-7xl md:text-[100px] font-black tracking-[-0.05em] leading-[0.95] text-black">
            Inovasi di setiap <br />
            detik yang berharga.
          </h1>
          <p className="mt-8 md:mt-12 text-xl md:text-3xl font-medium tracking-tight text-[#86868b] max-w-3xl mx-auto leading-snug">
            Satu ekosistem digital terpadu untuk registrasi, distribusi racepack, hingga akurasi live timing tanpa kompromi.
          </p>
        </motion.div>
      </section>

      {/* ASYMMETRIC HARDWARE SECTION */}
      <section className="py-20 md:py-32 px-6 md:px-12 max-w-[1400px] mx-auto">
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-12 lg:gap-8 items-end">
          
          {/* Visual Left (Span 8) */}
          <motion.div 
            initial={{ opacity: 0, scale: 0.95 }}
            whileInView={{ opacity: 1, scale: 1 }}
            viewport={{ once: true, margin: "-100px" }}
            transition={{ duration: 1, ease: [0.16, 1, 0.3, 1] }}
            className="lg:col-span-8 bg-white rounded-[40px] p-10 md:p-20 flex items-center justify-center min-h-[500px] md:min-h-[700px] overflow-hidden relative shadow-[0_20px_40px_rgba(0,0,0,0.04)]"
          >
            <div className="absolute top-10 left-10 text-[10px] md:text-xs font-bold tracking-widest text-[#86868b] uppercase">
              Pro Time Decoder
            </div>
            <img 
              src="/Assets/landing2/PRO TIME DECODER.webp" 
              alt="Pro Time Decoder" 
              className="w-full max-w-[600px] object-contain mix-blend-multiply"
            />
          </motion.div>

          {/* Text Right (Span 4) */}
          <motion.div 
            initial={{ opacity: 0, y: 50 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true, margin: "-100px" }}
            transition={{ duration: 1, delay: 0.2, ease: [0.16, 1, 0.3, 1] }}
            className="lg:col-span-4 flex flex-col justify-end lg:pb-10"
          >
            <h2 className="text-4xl md:text-5xl font-bold tracking-tight text-black mb-6 leading-[1.1]">
              Akurasi absolut. <br/>
              Desain tangguh.
            </h2>
            <p className="text-lg text-[#86868b] font-medium leading-relaxed">
              Dirancang khusus untuk kebutuhan profesional. Dengan sinkronisasi dual-frekuensi dan sistem ketahanan tingkat industri, perangkat kami memastikan tidak ada satupun sinyal yang terlewat di garis finish.
            </p>
          </motion.div>
        </div>
      </section>

      {/* FULL WIDTH BRUTALIST TYPOGRAPHY */}
      <section className="py-32 md:py-48 bg-black text-white px-6">
        <div className="max-w-6xl mx-auto">
          <motion.h2 
            initial={{ opacity: 0, y: 50 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true, margin: "-100px" }}
            transition={{ duration: 1, ease: [0.16, 1, 0.3, 1] }}
            className="text-4xl sm:text-6xl md:text-[80px] font-black tracking-[-0.04em] leading-[1.05]"
          >
            Meninggalkan era lama. <br />
            Mendefinisikan ulang <br />
            standar event olahraga.
          </motion.h2>
          
          <div className="mt-20 grid grid-cols-1 md:grid-cols-3 gap-12 border-t border-[#333] pt-12">
            {[
              { title: "Registrasi Mulus", desc: "Dari pendaftaran hingga pembayaran, semuanya berjalan seketika." },
              { title: "QR Racepack", desc: "Sistem verifikasi instan. Bebas antrean panjang dan salah data." },
              { title: "Live Leaderboard", desc: "Hasil balapan tayang detik itu juga, dapat diakses siapapun." }
            ].map((item, idx) => (
              <motion.div 
                key={idx}
                initial={{ opacity: 0, y: 30 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true, margin: "-50px" }}
                transition={{ duration: 0.8, delay: 0.1 * idx, ease: [0.16, 1, 0.3, 1] }}
              >
                <h4 className="text-xl font-bold mb-3">{item.title}</h4>
                <p className="text-[#86868b] font-medium">{item.desc}</p>
              </motion.div>
            ))}
          </div>
        </div>
      </section>

      {/* FOOTER-LIKE CLOSING */}
      <section className="py-32 text-center px-6">
        <motion.div
          initial={{ opacity: 0, scale: 0.95 }}
          whileInView={{ opacity: 1, scale: 1 }}
          viewport={{ once: true }}
          transition={{ duration: 1 }}
        >
          <img src="/Assets/logo2.png" alt="LUMPAT Logo" className="w-16 h-16 mx-auto mb-8 rounded-2xl shadow-xl" />
          <h2 className="text-3xl md:text-5xl font-bold tracking-tight text-black mb-8">
            Mulai langkah besar Anda.
          </h2>
          <a href="/event" className="inline-block bg-black text-white px-8 py-4 rounded-full font-semibold text-lg hover:scale-105 transition-transform">
            Jelajahi Platform
          </a>
        </motion.div>
      </section>

    </div>
  );
}
