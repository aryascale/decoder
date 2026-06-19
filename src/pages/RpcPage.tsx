import React, { useState, useEffect, useRef } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { loadMasterParticipants } from "../lib/data";
import { Html5Qrcode } from "html5-qrcode";
import { Search, X, CheckCircle, AlertTriangle } from "lucide-react";
import type { LeaderRow } from "../components/LeaderboardTable";
import Keyboard from "react-simple-keyboard";
import "react-simple-keyboard/build/css/index.css";
import { useMediaQuery } from 'react-responsive';

export default function RpcPage() {
  const { slug } = useParams();
  const navigate = useNavigate();
  const [eventData, setEventData] = useState<any>(null);
  const [participants, setParticipants] = useState<LeaderRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [query, setQuery] = useState("");
  const [foundParticipant, setFoundParticipant] = useState<LeaderRow | null>(null);
  const [showKeyboard, setShowKeyboard] = useState(false);
  
  const [isScanning, setIsScanning] = useState(false);
  const [scanError, setScanError] = useState("");
  const qrReaderRef = useRef<HTMLDivElement>(null);
  
  const [countdown, setCountdown] = useState(50);
  const [searchErrorMsg, setSearchErrorMsg] = useState("");

  useEffect(() => {
    const fetchEvent = async () => {
      try {
        const res = await fetch(`/api/events?eventId=${slug}`);
        if (!res.ok) throw new Error("Event not found");
        const data = await res.json();
        setEventData(data);

        // Load master data
        if (data && data.id) {
          const loadedParticipants = await loadMasterParticipants(data.id);
          // BUG FIX: loadMasterParticipants returns an object {all, byCategoryKey, ...}
          setParticipants(loadedParticipants.all as any);
        }
      } catch (err) {
        console.error("Error loading RPC data", err);
      } finally {
        setLoading(false);
      }
    };

    fetchEvent();
  }, [slug]);

  // QR Code Scanner Logic
  useEffect(() => {
    let html5QrCode: Html5Qrcode | null = null;

    if (isScanning && qrReaderRef.current) {
      html5QrCode = new Html5Qrcode("rpc-qr-reader");
      html5QrCode.start(
        { facingMode: "environment" },
        { fps: 10, qrbox: { width: 300, height: 300 } },
        (decodedText) => {
          // Find participant
          const p = participants.find(p => p.epc === decodedText || String(p.bib) === decodedText);
          if (p) {
            setFoundParticipant(p);
            // Do not auto stop scanning to allow rapid scanning
          } else {
            setScanError("QR Code tidak cocok dengan data peserta.");
          }
        },
        (error) => {
          // Ignore frequent scan errors
        }
      ).catch(err => {
        console.error("Error starting scanner", err);
        setScanError("Gagal mengakses kamera. Periksa izin browser.");
      });
    }

    return () => {
      if (html5QrCode && html5QrCode.isScanning) {
        html5QrCode.stop().then(() => html5QrCode?.clear()).catch(console.error);
      }
    };
  }, [isScanning, participants]);

  // Auto-hide participant after 50 seconds with countdown
  useEffect(() => {
    let interval: NodeJS.Timeout;
    if (foundParticipant) {
      setShowKeyboard(false);
      setCountdown(50);
      interval = setInterval(() => {
        setCountdown(prev => {
          if (prev <= 1) {
            setFoundParticipant(null);
            setQuery("");
            return 0;
          }
          return prev - 1;
        });
      }, 1000);
    }
    return () => {
      if (interval) clearInterval(interval);
    };
  }, [foundParticipant]);

  // Auto-hide search error
  useEffect(() => {
    let timeout: NodeJS.Timeout;
    if (searchErrorMsg) {
      timeout = setTimeout(() => {
        setSearchErrorMsg("");
      }, 3000);
    }
    return () => {
      if (timeout) clearTimeout(timeout);
    };
  }, [searchErrorMsg]);

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault();
    const q = query.trim().toLowerCase();
    if (!q) return;

    const p = participants.find(p => String(p.bib).toLowerCase() === q || p.name.toLowerCase().includes(q));
    if (p) {
      setFoundParticipant(p);
      setQuery("");
    } else {
      setFoundParticipant(null);
      setSearchErrorMsg("Peserta tidak ditemukan.");
    }
  };

  const isMobile = useMediaQuery({ maxWidth: 768 });

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="animate-pulse text-3xl font-black tracking-widest text-gray-900">LOADING...</div>
      </div>
    );
  }

  if (!eventData) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-3xl font-black text-red-500 uppercase tracking-widest">Event Not Found</div>
      </div>
    );
  }

  // Choose background based on screen size
  const desktopBg = eventData?.content?.rpcBgUrl || eventData?.bannerUrl || eventData?.homeImageUrl;
  const mobileBg = eventData?.content?.rpcBgUrlMobile || desktopBg;
  const bgImage = isMobile ? mobileBg : desktopBg;
  const isVideoBg = typeof bgImage === 'string' && (bgImage.toLowerCase().endsWith('.mp4') || bgImage.toLowerCase().endsWith('.webm') || bgImage.toLowerCase().endsWith('.mov'));

  return (
    <div 
      className="min-h-screen bg-slate-50 text-slate-900 font-sans flex flex-col relative overflow-hidden"
      style={bgImage && !isVideoBg ? { 
        backgroundImage: `url(${bgImage})`, 
        backgroundSize: 'cover', 
        backgroundPosition: 'center', 
        backgroundRepeat: 'no-repeat',
        backgroundColor: '#f8fafc'
      } : {}}
    >
      <style>{`
        .rpc-keyboard-theme .hg-button {
          height: 45px !important;
          font-size: 18px !important;
          font-weight: 600 !important;
          border-radius: 8px !important;
          border-bottom: 3px solid #ccc !important;
          background: white !important;
          color: #333 !important;
        }
        .rpc-keyboard-theme .hg-button:active {
          border-bottom: 0px !important;
          transform: translateY(3px) !important;
        }
        @media (min-width: 640px) {
          .rpc-keyboard-theme .hg-button {
            height: 55px !important;
            font-size: 20px !important;
          }
        }
      `}</style>

      {isVideoBg && (
        <video 
          autoPlay 
          loop 
          muted 
          playsInline
          className="absolute inset-0 w-full h-full object-cover z-0"
          src={bgImage}
        />
      )}
      {/* Removed dark overlay so the background image is 100% clear */}
      {bgImage && <div className="absolute inset-0 bg-transparent z-0" />}
      
      {/* Main Container */}
      <div className="flex flex-col h-screen max-h-screen w-full relative z-10 overflow-hidden">
        
        {/* Top Logo / Title Area - Only show if no banner image is provided, to keep it super clean */}
        {!bgImage && (
          <div className="w-full pt-12 flex flex-col items-center justify-center shrink-0">
             <h1 className="text-4xl md:text-5xl lg:text-6xl font-black uppercase text-white tracking-tight drop-shadow-md">
               {eventData.name}
             </h1>
             <h2 className="text-lg md:text-xl text-red-400 font-bold uppercase tracking-widest mt-2 drop-shadow-md">
               Race Pack Collection
             </h2>
          </div>
        )}

        {/* Floating Bottom Action Bar (Duolingo Style) */}
        {!isScanning && !foundParticipant && (
          <div className="absolute bottom-4 sm:bottom-10 lg:bottom-16 left-1/2 -translate-x-1/2 w-[95%] sm:w-[90%] max-w-3xl z-[150] animate-in slide-in-from-bottom-10 fade-in duration-500 flex flex-col justify-end pointer-events-none max-h-[90vh]">
            <div className="bg-white/90 backdrop-blur-xl p-2 sm:p-3 md:p-4 rounded-[2rem] sm:rounded-[2.5rem] shadow-[0_20px_50px_rgba(0,0,0,0.3)] border-b-[6px] sm:border-b-[8px] border-gray-300 flex flex-col sm:flex-row gap-2 sm:gap-3 md:gap-4 shrink-0 pointer-events-auto">
               
               <form onSubmit={handleSearch} className="flex-1 relative shrink-0 flex flex-col">
                  <input 
                    type="text" 
                    placeholder="Search BIB or Name..." 
                    value={query}
                    onChange={(e) => setQuery(e.target.value)}
                    onFocus={() => setShowKeyboard(true)}
                    readOnly
                    className="w-full flex-1 h-full bg-gray-100 border-2 border-gray-200 border-b-[4px] sm:border-b-[6px] text-gray-900 px-5 sm:px-6 py-3 sm:py-4 md:py-5 rounded-[1.5rem] sm:rounded-[2rem] text-base sm:text-lg md:text-xl font-bold focus:border-blue-400 focus:border-b-[4px] sm:focus:border-b-[6px] focus:translate-y-0 focus:outline-none placeholder-gray-400 transition-all pr-16 sm:pr-20 cursor-pointer"
                  />
                  <div className="absolute right-2 top-0 bottom-[4px] sm:bottom-[6px] flex items-center">
                    <button type="submit" className="bg-blue-500 hover:bg-blue-400 active:border-b-0 active:translate-y-[2px] sm:active:translate-y-[3px] border-blue-700 border-b-[3px] sm:border-b-[4px] text-white p-2 sm:p-3 rounded-xl sm:rounded-2xl transition-all mr-1">
                      <Search className="w-5 h-5 sm:w-6 sm:h-6 stroke-[3]" />
                    </button>
                  </div>
               </form>
            </div>
            
            {showKeyboard && (
              <div className="mt-2 sm:mt-3 bg-gray-200/90 backdrop-blur-xl p-1 sm:p-2 rounded-2xl shadow-xl border border-gray-300 animate-in fade-in slide-in-from-bottom-4 overflow-y-auto no-scrollbar pointer-events-auto shrink w-full">
                <Keyboard
                  onChange={(input) => setQuery(input)}
                  onKeyPress={(button) => {
                    if (button === "{enter}") {
                      handleSearch({ preventDefault: () => {} } as React.FormEvent);
                      setShowKeyboard(false);
                    }
                  }}
                  layout={{
                    default: [
                      "1 2 3 4 5 6 7 8 9 0 {bksp}",
                      "q w e r t y u i o p",
                      "a s d f g h j k l",
                      "z x c v b n m {enter}",
                      "{space}"
                    ]
                  }}
                  display={{
                    "{bksp}": "⌫",
                    "{enter}": "🔍 Search",
                    "{space}": "Space"
                  }}
                  theme={"hg-theme-default hg-layout-default rpc-keyboard-theme"}
                />
              </div>
            )}
          </div>
        )}

        {/* Scanner Area */}
        {isScanning && (
          <div className="absolute bottom-32 lg:bottom-40 left-1/2 -translate-x-1/2 w-[90%] max-w-sm bg-stone-950 rounded-[3rem] p-4 shadow-[0_30px_60px_rgba(0,0,0,0.6)] z-[100] border-[8px] border-stone-800 border-b-[16px] animate-in slide-in-from-bottom-10">
            <div className="flex justify-between items-center px-4 pb-4 pt-2">
              <span className="text-stone-400 font-black tracking-widest text-sm uppercase">Scanner Tiket</span>
              <button 
                className="bg-stone-800 hover:bg-red-500 hover:text-white border-stone-900 border-b-4 active:border-b-0 active:translate-y-[4px] text-stone-400 rounded-full p-2 transition-all"
                onClick={() => {
                  setIsScanning(false);
                  setScanError("");
                }}
              >
                <X className="w-5 h-5 stroke-[3]" />
              </button>
            </div>

            <div className="relative w-full aspect-square bg-black rounded-[2rem] overflow-hidden">
              <div className="absolute inset-0 z-10 pointer-events-none flex items-center justify-center p-8">
                <div className="w-full h-full border-4 border-white/20 rounded-[1.5rem] relative">
                  <div className="absolute -top-1 -left-1 w-8 h-8 border-t-8 border-l-8 border-green-500 rounded-tl-[1.5rem]" />
                  <div className="absolute -top-1 -right-1 w-8 h-8 border-t-8 border-r-8 border-green-500 rounded-tr-[1.5rem]" />
                  <div className="absolute -bottom-1 -left-1 w-8 h-8 border-b-8 border-l-8 border-green-500 rounded-bl-[1.5rem]" />
                  <div className="absolute -bottom-1 -right-1 w-8 h-8 border-b-8 border-r-8 border-green-500 rounded-br-[1.5rem]" />
                </div>
              </div>
              <div id="rpc-qr-reader" ref={qrReaderRef} className="w-full h-full object-cover relative z-0 [&_video]:object-cover [&_video]:w-full [&_video]:h-full" />
            </div>

            {scanError && (
              <div className="mt-4 text-sm font-bold text-white bg-red-500 border-red-700 border-b-[4px] px-4 py-2 rounded-xl text-center animate-in slide-in-from-bottom-2">
                {scanError}
              </div>
            )}
          </div>
        )}

        {/* Participant Data Display */}
        {foundParticipant && (
          <div 
            className="absolute inset-0 z-[120] flex items-center justify-center p-4 animate-in fade-in duration-300 pb-20"
            onClick={(e) => {
              if (e.target === e.currentTarget) {
                setFoundParticipant(null);
                setQuery("");
              }
            }}
          >
            <div className="w-full max-w-2xl flex flex-col items-center animate-in zoom-in-95 duration-300 pointer-events-none mt-32">
              
              <div className="flex flex-col items-center text-center gap-6 mb-8 w-full">
                <div className="flex flex-col items-center flex-1 pointer-events-auto">
                  <span className="text-sm font-bold text-slate-800 drop-shadow-md uppercase tracking-widest mb-1">Nama Peserta</span>
                  <h2 className="text-5xl md:text-7xl font-black text-slate-900 drop-shadow-lg uppercase tracking-tight leading-none text-center">
                    {foundParticipant.name}
                  </h2>
                </div>

                <div className="border-[3px] border-dashed border-red-500 rounded-3xl px-12 py-6 flex flex-col items-center justify-center shrink-0 bg-transparent pointer-events-auto mt-4">
                  <span className="text-red-600 font-bold uppercase tracking-widest text-sm mb-2 drop-shadow-[0_1px_1px_rgba(255,255,255,0.8)]">Nomor BIB</span>
                  <span className="text-7xl md:text-8xl font-black text-red-600 tracking-tighter leading-none drop-shadow-[0_2px_2px_rgba(255,255,255,0.8)]">
                    {foundParticipant.bib}
                  </span>
                </div>
              </div>

              <div className="flex flex-wrap justify-center gap-4 w-full pointer-events-auto max-w-xl">
                <div className="flex-1 min-w-[130px] bg-white/95 backdrop-blur-md border border-slate-200 shadow-xl rounded-2xl p-4 flex flex-col items-center text-center">
                  <span className="text-xs font-bold text-slate-500 uppercase tracking-widest mb-1">Kategori</span>
                  <span className="text-xl md:text-2xl font-black text-slate-900">{foundParticipant.category || foundParticipant.sourceCategoryKey}</span>
                </div>
                
                <div className="flex-1 min-w-[130px] bg-white/95 backdrop-blur-md border border-slate-200 shadow-xl rounded-2xl p-4 flex flex-col items-center text-center">
                  <span className="text-xs font-bold text-slate-500 uppercase tracking-widest mb-1">Gender</span>
                  <span className="text-xl md:text-2xl font-black text-slate-900">{foundParticipant.gender || '-'}</span>
                </div>

                <div className="flex-1 min-w-[130px] bg-emerald-50/95 backdrop-blur-md border border-emerald-200 shadow-xl rounded-2xl p-4 flex flex-col items-center text-center">
                  <span className="text-xs font-bold text-emerald-700 uppercase tracking-widest mb-1">Status</span>
                  <span className="text-xl md:text-2xl font-black text-emerald-700 flex items-center gap-2">
                    <CheckCircle className="w-6 h-6 stroke-[3]" />
                    Verified
                  </span>
                </div>
              </div>

              {/* Digital Countdown Timer */}
              <div className="absolute top-6 right-6 pointer-events-auto">
                <span className="text-4xl md:text-6xl font-black text-slate-800 drop-shadow-[0_2px_4px_rgba(255,255,255,1)]">
                  {countdown}
                </span>
              </div>

            </div>
          </div>
        )}

        {/* Custom Search Error Popup */}
        {searchErrorMsg && (
          <div className="absolute inset-0 z-[200] flex items-center justify-center p-4 animate-in fade-in duration-300">
            <div className="bg-white/80 backdrop-blur-xl border border-white/50 rounded-3xl p-8 max-w-sm w-full shadow-2xl flex flex-col items-center text-center animate-in zoom-in-95">
              <h3 className="text-2xl font-black text-slate-900 mb-2 uppercase tracking-tight">BIP Tidak Ditemukan</h3>
              <p className="text-slate-700 font-medium">{searchErrorMsg}</p>
            </div>
          </div>
        )}

      </div>
    </div>
  );
}
