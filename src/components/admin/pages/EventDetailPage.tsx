// Admin Event Detail Page - for managing individual event data, CSV uploads, banners, categories
import { useState, useEffect, useMemo } from "react";
import { putCsvFile, deleteCsvFile, listCsvMeta } from "../../../lib/idb";
import { parseCsv, countDataRows } from "../../../lib/csvParse";
import { uploadBannerViaApi } from "../../../lib/storage";
import type { CsvKind } from "../../../lib/config";
import { LS_DATA_VERSION } from "../../../lib/config";
import { loadMasterParticipants, loadTimesMap } from "../../../lib/data";
import parseTimeToMs, { extractTimeOfDay, formatDuration } from "../../../lib/time";
import type { LeaderRow } from "../../LeaderboardTable";
import PenaltyPage from "./PenaltyPage";
import ManualStartBibPage from "./ManualStartBibPage";
import CheckpointsPage from "./CheckpointsPage";

interface EventDetailPageProps {
  eventId: string;
  eventSlug: string;
  eventName: string;
  onBack: () => void;
}

interface Banner {
  id: string;
  imageUrl: string;
  alt?: string;
  order: number;
  isActive: boolean;
}

// Helper function for timestamp formatting
function formatNowAsTimestamp(): string {
  const d = new Date();
  const pad = (n: number, len = 2) => String(n).padStart(len, "0");
  const Y = d.getFullYear();
  const M = pad(d.getMonth() + 1);
  const D = pad(d.getDate());
  const h = pad(d.getHours());
  const m = pad(d.getMinutes());
  const s = pad(d.getSeconds());
  const ms = pad(d.getMilliseconds(), 3);
  return `${Y}-${M}-${D} ${h}:${m}:${s}.${ms}`;
}

export default function EventDetailPage({ eventId, eventSlug, eventName, onBack }: EventDetailPageProps) {
  const [activeTab, setActiveTab] = useState<'homepage' | 'data' | 'banners' | 'gallery' | 'categories' | 'route' | 'timing' | 'manual_start' | 'dq' | 'penalty' | 'certified' | 'settings' | 'registration' | 'inventory' | 'checkpoints'>(() => {
    return (localStorage.getItem(`admin_tab_${eventId}`) as any) || 'homepage';
  });

  useEffect(() => {
    localStorage.setItem(`admin_tab_${eventId}`, activeTab);
  }, [activeTab, eventId]);
  const [participants, setParticipants] = useState<any[]>([]);
  const [csvMeta, setCsvMeta] = useState<Array<{ key: CsvKind; filename: string; updatedAt: number; rows: number }>>([]);
  const [banners, setBanners] = useState<Banner[]>([]);
  const [categories, setCategories] = useState<Array<{ id?: string; name: string; price: number; quota: number; isHidden?: boolean; sold?: number }>>([]);
  const [loading, setLoading] = useState(true);

  const [bannerFile, setBannerFile] = useState<File | null>(null);
  const [uploadingBanner, setUploadingBanner] = useState(false);
  const [logoFile, setLogoFile] = useState<File | null>(null);
  const [coverBannerFile, setCoverBannerFile] = useState<File | null>(null);
  const [homeImageFile, setHomeImageFile] = useState<File | null>(null);
  const [rpcBgFile, setRpcBgFile] = useState<File | null>(null);
  const [rpcBgMobileFile, setRpcBgMobileFile] = useState<File | null>(null);
  const [uploadingLogo, setUploadingLogo] = useState(false);
  const [uploadingCover, setUploadingCover] = useState(false);
  const [uploadingHomeImage, setUploadingHomeImage] = useState(false);
  const [uploadingRpcBg, setUploadingRpcBg] = useState(false);
  const [uploadingRpcBgMobile, setUploadingRpcBgMobile] = useState(false);

  const [tncDocFile, setTncDocFile] = useState<File | null>(null);
  const [uploadingTncDoc, setUploadingTncDoc] = useState(false);
  const [uploadingGallery, setUploadingGallery] = useState(false);

  // Category state
  const [newCategory, setNewCategory] = useState('');
  const [newCategoryPrice, setNewCategoryPrice] = useState('');
  const [newCategoryQuota, setNewCategoryQuota] = useState('');

  // Event settings state
  const [tshirtSizes, setTshirtSizes] = useState('');
  const [bibCustomPrice, setBibCustomPrice] = useState('');

  // Homepage content state
  const [homeContent, setHomeContent] = useState<{ about: string; schedule: string; rules: string }>({ about: '', schedule: '', rules: '' });
  const [savingHome, setSavingHome] = useState(false);

  // Registration fields state
  const [regFields, setRegFields] = useState<Array<{ id?: string; label: string; type: string; required: boolean; options: string }>>([]);
  const [savingFields, setSavingFields] = useState(false);

  // T-shirt inventory state
  const [tshirtInventory, setTshirtInventory] = useState<Array<{ id?: string; size: string; quota: number; sold: number; width?: string; height?: string }>>([]);
  const [savingInventory, setSavingInventory] = useState(false);
  const [savingCategories, setSavingCategories] = useState(false);

  // GPX upload state
  const [uploadingGpx, setUploadingGpx] = useState(false);
  const [currentGpxPath, setCurrentGpxPath] = useState<string | null>(null);

  // Timing state
  const [cutoffHours, setCutoffHours] = useState("");
  const [catStart, setCatStart] = useState<Record<string, string>>({});
  const [manualStartTime, setManualStartTime] = useState<string>("");
  const [savingManualStart, setSavingManualStart] = useState(false);
  const [savingTiming, setSavingTiming] = useState(false);

  // DQ state
  const [allRows, setAllRows] = useState<LeaderRow[]>([]);
  const [dqSearch, setDqSearch] = useState("");
  const [dqMap, setDqMap] = useState<Record<string, boolean>>({});
  const [hiddenMap, setHiddenMap] = useState<Record<string, boolean>>({});
  const [eventData, setEventData] = useState<any>(null);

  // Certificate state
  const [certFile, setCertFile] = useState<File | null>(null);
  const [uploadingCert, setUploadingCert] = useState(false);
  const [certData, setCertData] = useState<{ hasCertificate: boolean; files: Array<{ filename: string; url: string; size: number; updatedAt: number }> }>({ hasCertificate: false, files: [] });

  // Load data
  useEffect(() => {
    loadAllData();
  }, [eventId]);

  // Load DQ data when switching to DQ tab
  useEffect(() => {
    if (activeTab === 'dq' || activeTab === 'penalty') {
      loadDQData();
    }
    if (activeTab === 'certified') {
      loadCertData();
    }
  }, [activeTab, eventId]);

  const loadAllData = async () => {
    setLoading(true);
    try {
      // Load CSV meta
      const meta = await listCsvMeta(eventId);
      setCsvMeta(meta as any);

      // Load banners
      const bannersRes = await fetch(`/api/banners?eventId=${eventId}`);
      if (bannersRes.ok) {
        const data = await bannersRes.json();
        setBanners(Array.isArray(data) ? data : []);
      }

      // Load categories
      const catRes = await fetch(`/api/categories?eventId=${eventId}`);
      if (catRes.ok) {
        const data = await catRes.json();
        const cats = (data.categories || []).map((c: any) => typeof c === 'string' ? { name: c, price: 0, quota: 0, isHidden: false } : { id: c.id, name: c.name, price: c.price || 0, quota: c.quota || 0, isHidden: !!c.isHidden, sold: c.sold || 0 });
        setCategories(cats);
      }

      // Load homepage content
      const contentRes = await fetch(`/api/events?eventId=${eventId}`);
      if (contentRes.ok) {
        const evtData = await contentRes.json();
        if (evtData.content) {
          const aboutContent = evtData.content.about || '';
          setHomeContent({
            about: aboutContent,
            schedule: evtData.content.schedule || '',
            rules: evtData.content.rules || '',
          });
        }
        setEventData(evtData);
      }

      // Load registration fields
      const fieldsRes = await fetch(`/api/registration-fields?eventId=${eventId}`);
      if (fieldsRes.ok) {
        const fData = await fieldsRes.json();
        setRegFields((fData.fields || []).map((f: any) => ({ id: f.id, label: f.label, type: f.type || 'text', required: !!f.required, options: f.options || '' })));
      }

      // Load t-shirt inventory
      const invRes = await fetch(`/api/tshirt-inventory?eventId=${eventId}`);
      if (invRes.ok) {
        const iData = await invRes.json();
        setTshirtInventory((iData.inventory || []).map((i: any) => ({ id: i.id, size: i.size, quota: i.quota || 0, sold: i.sold || 0, width: i.width || '', height: i.height || '' })));
      }

      // Load participants
      const pRes = await fetch(`/api/registrations?eventId=${eventId}`);
      if (pRes.ok) {
        const pData = await pRes.json();
        setParticipants(pData.participants || []);
      }

      // Load event data to get GPX file path and timing
      const eventRes = await fetch(`/api/events?eventId=${eventId}`);
      if (eventRes.ok) {
        const eventData = await eventRes.json();
        setEventData(eventData);
        setCurrentGpxPath(eventData.gpxFile || null);
        setTshirtSizes(eventData.tshirtSizes || '');
        setBibCustomPrice(String(eventData.bibCustomPrice || ''));

        // Load timing data
        if (eventData.cutoffMs != null) {
          setCutoffHours(String(eventData.cutoffMs / 3600000));
        } else {
          setCutoffHours("");
        }
        if (eventData.categoryStartTimes) {
          setCatStart(eventData.categoryStartTimes);
        } else {
          setCatStart({});
        }

        try {
          const mRes = await fetch(`/api/manual-start?eventId=${eventId}`);
          if (mRes.ok) {
            const mData = await mRes.json();
            setManualStartTime(mData.manualStartTime || "");
          }
        } catch (e) { }
      }
    } catch (error) {
      console.error('Failed to load event data:', error);
    } finally {
      setLoading(false);
    }
  };

  const loadDQData = async () => {
    try {
      const master = await loadMasterParticipants(eventId);
      const startMap = await loadTimesMap("start", eventId);
      const finishMap = await loadTimesMap("finish", eventId);

      const cutoffMs = eventData?.cutoffMs ?? null;
      const catStartRaw: Record<string, string> = (eventData?.categoryStartTimes as Record<string, string>) ?? {};

      // Load runner status map from API
      let dqData: Record<string, boolean> = {};
      let hiddenData: Record<string, boolean> = {};
      try {
        const res = await fetch(`/api/runner-status?eventId=${eventId}`);
        if (res.ok) {
          const data = await res.json();
          if (Array.isArray(data)) {
            data.forEach((s: any) => {
              if (s.isDQ) dqData[s.epc] = true;
              if (s.isHidden) hiddenData[s.epc] = true;
            });
          }
        }
      } catch (e) {
        console.error("Failed to load runner status:", e);
      }
      setDqMap(dqData);
      setHiddenMap(hiddenData);

      const absOverrideMs: Record<string, number | null> = {};
      const timeOnlyStr: Record<string, string | null> = {};

      Object.entries(catStartRaw).forEach(([key, raw]) => {
        const s = String(raw || "").trim();
        if (!s) {
          absOverrideMs[key] = null;
          timeOnlyStr[key] = null;
          return;
        }
        if (/\d{4}-\d{2}-\d{2}/.test(s)) {
          const parsed = parseTimeToMs(s);
          absOverrideMs[key] = parsed.ms;
          timeOnlyStr[key] = null;
        } else {
          absOverrideMs[key] = null;
          timeOnlyStr[key] = s;
        }
      });

      function buildOverrideFromFinishDate(finishMs: number, timeStr: string): number | null {
        const m = timeStr.match(/(\d{1,2}):(\d{2})(?::(\d{2}))?(?:\.(\d{1,3}))?/);
        if (!m) return null;

        const h = Number(m[1] || 0);
        const mi = Number(m[2] || 0);
        const se = Number(m[3] || 0);
        const ms = m[4] ? Number(String(m[4]).padEnd(3, "0").slice(0, 3)) : 0;

        const d = new Date(finishMs);
        const override = new Date(d.getFullYear(), d.getMonth(), d.getDate(), h, mi, se, ms);
        return override.getTime();
      }

      const baseRows: LeaderRow[] = [];

      master.all.forEach((p) => {
        const finishEntry = finishMap.get(p.epc);
        if (!finishEntry?.ms) return;

        const catKey = p.sourceCategoryKey;
        const absMs = absOverrideMs[catKey] ?? null;
        const timeOnly = timeOnlyStr[catKey] ?? null;

        let total: number | null = null;

        if (absMs != null && Number.isFinite(absMs)) {
          const delta = finishEntry.ms - absMs;
          if (Number.isFinite(delta) && delta >= 0) {
            total = delta;
          } else {
            const startEntry = startMap.get(p.epc);
            if (!startEntry?.ms) return;
            total = finishEntry.ms - startEntry.ms;
          }
        } else if (timeOnly) {
          const builtOverride = buildOverrideFromFinishDate(finishEntry.ms, timeOnly);
          if (builtOverride != null) {
            const delta = finishEntry.ms - builtOverride;
            if (Number.isFinite(delta) && delta >= 0) {
              total = delta;
            } else {
              const startEntry = startMap.get(p.epc);
              if (!startEntry?.ms) return;
              total = finishEntry.ms - startEntry.ms;
            }
          } else {
            const startEntry = startMap.get(p.epc);
            if (!startEntry?.ms) return;
            total = finishEntry.ms - startEntry.ms;
          }
        } else {
          const startEntry = startMap.get(p.epc);
          if (!startEntry?.ms) return;
          total = finishEntry.ms - startEntry.ms;
        }

        if (!Number.isFinite(total) || total == null || total < 0) return;

        const isDQ = !!dqData[p.epc];
        const isDNF = cutoffMs != null && total > cutoffMs;

        baseRows.push({
          rank: null,
          bib: p.bib,
          name: p.name,
          gender: p.gender,
          category: p.category || p.sourceCategoryKey,
          sourceCategoryKey: p.sourceCategoryKey,
          finishTimeRaw: extractTimeOfDay(finishEntry.raw),
          totalTimeMs: total,
          totalTimeDisplay: isDQ ? "DSQ" : isDNF ? "DNF" : formatDuration(total),
          epc: p.epc,
        });
      });

      setAllRows(baseRows);
    } catch (error) {
      console.error('Failed to load DQ data:', error);
    }
  };

  const bumpDataVersion = () => {
    localStorage.setItem(LS_DATA_VERSION, String(Date.now()));
  };

  // CSV Upload handlers
  const uploadCsv = async (kind: CsvKind, file: File) => {
    const text = await file.text();
    const grid = parseCsv(text);

    if (!grid || grid.length === 0) {
      alert(`CSV '${kind}': File kosong atau tidak valid.`);
      return;
    }

    const headers = (grid[0] || []).map((x) => String(x || "").trim());
    const headersNorm = headers.map((s) => s.toLowerCase().replace(/\s+/g, " ").trim());

    const headerAliases: Record<string, string[]> = {
      epc: ["epc", "uid", "tag", "rfid", "chip epc", "epc code"],
      times: ["times", "time", "timestamp", "start time", "finish time", "jam"],
    };

    if (kind === "master") {
      const epcAliases = headerAliases.epc.map((s) => s.toLowerCase());
      const hasEpc = headersNorm.some((h) => epcAliases.some((alias) => h === alias || h.includes(alias)));
      if (!hasEpc) {
        alert(`CSV '${kind}': kolom EPC tidak ditemukan.\nFormat Master CSV harus memiliki kolom EPC.`);
        return;
      }
    }

    if (kind !== "master") {
      const epcAliases = headerAliases.epc.map((s) => s.toLowerCase());
      const timesAliases = headerAliases.times.map((s) => s.toLowerCase());
      const hasEpc = headersNorm.some((h) => epcAliases.some((alias) => h === alias || h.includes(alias)));
      const hasTimes = headersNorm.some((h) => timesAliases.some((alias) => h === alias || h.includes(alias)));

      if (!hasEpc || !hasTimes) {
        alert(`CSV '${kind}': kolom EPC atau Times tidak ditemukan.`);
        return;
      }
    }

    const rows = countDataRows(grid);
    await putCsvFile({ kind, text, filename: file.name, rows, eventId });
    bumpDataVersion();

    // Reload CSV meta
    const meta = await listCsvMeta(eventId);
    setCsvMeta(meta as any);

    alert(`'${kind}' berhasil diupload (${rows} baris)`);
  };

  const clearCsv = async (kind: CsvKind) => {
    if (!confirm(`Reset CSV '${kind}'?`)) return;
    await deleteCsvFile(kind, eventId);
    bumpDataVersion();
    const meta = await listCsvMeta(eventId);
    setCsvMeta(meta as any);
    alert(`CSV '${kind}' telah dihapus`);
  };

  const clearAllCsv = async () => {
    if (!confirm("Reset semua CSV yang sudah diupload?")) return;
    for (const k of ["master", "start", "finish", "checkpoint"] as CsvKind[]) {
      await deleteCsvFile(k, eventId);
    }
    bumpDataVersion();
    const meta = await listCsvMeta(eventId);
    setCsvMeta(meta as any);
    alert("Semua CSV telah dihapus");
  };

  const exportMasterTemplate = () => {
    if (!participants || participants.length === 0) {
      alert("Tidak ada peserta terdaftar untuk diekspor.");
      return;
    }
    const settled = participants.filter(p => p.paymentStatus === 'settlement');
    if (settled.length === 0) {
      alert("Tidak ada peserta yang sudah melakukan pembayaran (settlement).");
      return;
    }

    const headers = ['Nama', 'Kategori', 'Kelamin', 'BIB Number', 'Warna BIB', 'EPC'];
    const rows = settled.map(p => {
      const name = `"${(p.name || '').replace(/"/g, '""')}"`;
      const category = `"${(p.category?.name || '').replace(/"/g, '""')}"`;
      const gender = `"${(p.gender || '').replace(/"/g, '""')}"`;
      const epc = `""`;
      return [name, category, gender, '""', '""', epc].join(',');
    });

    const csvContent = [headers.join(','), ...rows].join('\n');
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.setAttribute("href", url);
    link.setAttribute("download", `Master_Template_${eventData?.name || 'Event'}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  // Banner handlers
  const handleBannerUpload = async () => {
    if (!bannerFile) {
      alert('Please select an image file');
      return;
    }

    setUploadingBanner(true);
    try {
      await uploadBannerViaApi(eventId, bannerFile);
      setBannerFile(null);
      const fileInput = document.getElementById('banner-upload') as HTMLInputElement;
      if (fileInput) fileInput.value = '';

      // Reload banners
      const res = await fetch(`/api/banners?eventId=${eventId}`);
      if (res.ok) {
        const data = await res.json();
        setBanners(Array.isArray(data) ? data : []);
      }
      alert('Banner uploaded successfully!');
    } catch (error: any) {
      alert(error.message || 'Failed to upload banner');
    } finally {
      setUploadingBanner(false);
    }
  };

  const handleMediaUpload = async (type: 'logo' | 'banner' | 'home_image' | 'rpc_bg' | 'rpc_bg_mobile' | 'tnc_doc') => {
    let file = null;
    if (type === 'logo') file = logoFile;
    else if (type === 'banner') file = coverBannerFile;
    else if (type === 'home_image') file = homeImageFile;
    else if (type === 'rpc_bg') file = rpcBgFile;
    else if (type === 'rpc_bg_mobile') file = rpcBgMobileFile;
    else if (type === 'tnc_doc') file = tncDocFile;

    if (!file) {
      alert('Please select a file');
      return;
    }

    if (type === 'logo') setUploadingLogo(true);
    else if (type === 'banner') setUploadingCover(true);
    else if (type === 'home_image') setUploadingHomeImage(true);
    else if (type === 'rpc_bg') setUploadingRpcBg(true);
    else if (type === 'rpc_bg_mobile') setUploadingRpcBgMobile(true);
    else if (type === 'tnc_doc') setUploadingTncDoc(true);

    try {
      const formData = new FormData();
      formData.append('file', file);
      formData.append('eventId', eventId);
      formData.append('field', type);

      const res = await fetch('/api/upload-event-media', {
        method: 'POST',
        body: formData,
      });

      if (!res.ok) {
        let errorMsg = 'Failed to upload media';
        if (res.status === 413) {
          errorMsg = 'File is too large. Maximum allowed size is 4.5MB.';
        } else {
          try {
            const err = await res.json();
            errorMsg = err.error || errorMsg;
          } catch (e) {
            errorMsg = `Server error (${res.status}): The file might be too large.`;
          }
        }
        throw new Error(errorMsg);
      }

      const result = await res.json();
      setEventData(result.event);

      if (type === 'logo') {
        setLogoFile(null);
        const fileInput = document.getElementById('logo-upload') as HTMLInputElement;
        if (fileInput) fileInput.value = '';
      } else if (type === 'home_image') {
        setHomeImageFile(null);
        const fileInput = document.getElementById('home-image-upload') as HTMLInputElement;
        if (fileInput) fileInput.value = '';
      } else if (type === 'rpc_bg') {
        setRpcBgFile(null);
        const fileInput = document.getElementById('rpc-bg-upload') as HTMLInputElement;
        if (fileInput) fileInput.value = '';
      } else if (type === 'rpc_bg_mobile') {
        setRpcBgMobileFile(null);
        const fileInput = document.getElementById('rpc-bg-mobile-upload') as HTMLInputElement;
        if (fileInput) fileInput.value = '';
      } else if (type === 'tnc_doc') {
        setTncDocFile(null);
        const fileInput = document.getElementById('tnc-doc-upload') as HTMLInputElement;
        if (fileInput) fileInput.value = '';
      }

      alert('Media uploaded successfully!');
    } catch (error: any) {
      alert(error.message || 'Failed to upload media');
    } finally {
      if (type === 'logo') setUploadingLogo(false);
      else if (type === 'banner') setUploadingCover(false);
      else if (type === 'home_image') setUploadingHomeImage(false);
      else if (type === 'rpc_bg') setUploadingRpcBg(false);
      else if (type === 'rpc_bg_mobile') setUploadingRpcBgMobile(false);
      else if (type === 'tnc_doc') setUploadingTncDoc(false);
    }
  };

  const toggleBannerActive = async (bannerId: string) => {
    const banner = banners.find((b) => b.id === bannerId);
    if (!banner) return;

    try {
      await fetch('/api/update-banner', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ bannerId, isActive: !banner.isActive }),
      });

      const res = await fetch(`/api/banners?eventId=${eventId}`);
      if (res.ok) {
        const data = await res.json();
        setBanners(Array.isArray(data) ? data : []);
      }
    } catch (error) {
      console.error('Failed to toggle banner:', error);
    }
  };

  const deleteBanner = async (bannerId: string, imageUrl: string) => {
    if (!confirm('Delete this banner?')) return;

    try {
      await fetch(`/api/delete-banner?bannerId=${bannerId}&imageUrl=${encodeURIComponent(imageUrl)}`, {
        method: 'DELETE',
      });

      const res = await fetch(`/api/banners?eventId=${eventId}`);
      if (res.ok) {
        const data = await res.json();
        setBanners(Array.isArray(data) ? data : []);
      }
      alert('Banner deleted!');
    } catch (error) {
      alert('Failed to delete banner');
    }
  };

  // Category handlers
  const handleGalleryUpload = async (files: FileList | null) => {
    if (!files || files.length === 0) return;
    setUploadingGallery(true);
    let uploadedCount = 0;
    try {
      for (let i = 0; i < files.length; i++) {
        const file = files[i];
        const formData = new FormData();
        formData.append('file', file);
        formData.append('eventId', eventId);
        formData.append('field', 'gallery');

        const res = await fetch('/api/upload-event-media', {
          method: 'POST',
          body: formData,
        });
        if (res.ok) {
          const result = await res.json();
          setEventData(result.event);
          uploadedCount++;
        }
      }
      alert(`Successfully uploaded ${uploadedCount} photos to the gallery!`);
    } catch (error: any) {
      alert(error.message || 'Failed to upload some gallery photos');
    } finally {
      setUploadingGallery(false);
      const fileInput = document.getElementById('gallery-upload') as HTMLInputElement;
      if (fileInput) fileInput.value = '';
    }
  };

  const deleteGalleryImage = async (imageUrl: string) => {
    if (!confirm('Delete this photo from the gallery?')) return;
    try {
      const res = await fetch(`/api/delete-gallery-image?eventId=${eventId}&imageUrl=${encodeURIComponent(imageUrl)}`, {
        method: 'DELETE',
      });
      if (!res.ok) throw new Error('Failed to delete');
      const result = await res.json();
      setEventData((prev: any) => ({ ...prev, content: result.content }));
    } catch (error) {
      alert('Failed to delete gallery image');
    }
  };
  const addCategory = async () => {
    const trimmed = newCategory.trim();
    if (!trimmed) return;
    if (categories.some(c => c.name === trimmed)) {
      alert('Category already exists');
      return;
    }

    const price = parseInt(newCategoryPrice) || 0;
    const quota = parseInt(newCategoryQuota) || 0;
    const updated = [...categories, { name: trimmed, price, quota, isHidden: false }];
    await saveCategories(updated);
    setNewCategory('');
    setNewCategoryPrice('');
    setNewCategoryQuota('');
  };

  const removeCategory = async (catName: string) => {
    if (!confirm(`Remove category "${catName}"?`)) return;
    const updated = categories.filter((c) => c.name !== catName);
    await saveCategories(updated);
  };

  const updateCategoryQuota = (catName: string, quota: number) => {
    const updated = categories.map(c => c.name === catName ? { ...c, quota } : c);
    setCategories(updated);
  };

  const updateCategoryPrice = (catName: string, price: number) => {
    const updated = categories.map(c => c.name === catName ? { ...c, price } : c);
    setCategories(updated);
  };

  const toggleCategoryHidden = async (catName: string) => {
    const updated = categories.map(c => c.name === catName ? { ...c, isHidden: !c.isHidden } : c);
    setCategories(updated);
    await saveCategories(updated);
  };

  // Homepage content save
  const saveHomeContent = async () => {
    setSavingHome(true);
    try {
      const res = await fetch(`/api/events?eventId=${eventId}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          content: {
            ...(eventData?.content || {}),
            about: homeContent.about || eventData?.content?.about || '',
            schedule: homeContent.schedule || eventData?.content?.schedule || '',
            rules: homeContent.rules || eventData?.content?.rules || '',
            allowBulkNoOtp: eventData?.content?.allowBulkNoOtp || false
          }
        }),
      });
      if (res.ok) {
        alert('Homepage content saved!');
        await loadAllData();
      } else alert('Failed to save homepage content');
    } catch {
      alert('Failed to save homepage content');
    } finally {
      setSavingHome(false);
    }
  };

  const handleHtmlFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = (event) => {
      const htmlString = event.target?.result as string;
      setHomeContent(prev => ({ ...prev, about: htmlString }));
    };
    reader.readAsText(file);
  };

  // Registration fields save
  const saveRegFields = async () => {
    setSavingFields(true);
    try {
      const res = await fetch(`/api/registration-fields?eventId=${eventId}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ fields: regFields }),
      });
      if (res.ok) {
        const data = await res.json();
        setRegFields((data.fields || []).map((f: any) => ({ id: f.id, label: f.label, type: f.type || 'text', required: !!f.required, options: f.options || '' })));
        alert('Registration fields saved!');
      } else alert('Failed to save registration fields');
    } catch {
      alert('Failed to save registration fields');
    } finally {
      setSavingFields(false);
    }
  };

  // T-shirt inventory save
  const saveTshirtInventory = async () => {
    setSavingInventory(true);
    try {
      const res = await fetch(`/api/tshirt-inventory?eventId=${eventId}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ inventory: tshirtInventory }),
      });
      if (res.ok) {
        const data = await res.json();
        setTshirtInventory((data.inventory || []).map((i: any) => ({
          id: i.id,
          size: i.size,
          quota: i.quota || 0,
          sold: i.sold || 0,
          width: i.width || '',
          height: i.height || ''
        })));
        alert('T-shirt inventory saved!');
      } else alert('Failed to save inventory');
    } catch {
      alert('Failed to save inventory');
    } finally {
      setSavingInventory(false);
    }
  };

  const saveCategories = async (cats: Array<{ name: string; price: number; quota: number; isHidden?: boolean }>) => {
    setSavingCategories(true);
    try {
      const res = await fetch(`/api/categories?eventId=${eventId}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ categories: cats }),
      });

      if (res.ok) {
        const data = await res.json();
        setCategories(data.categories || cats);
        bumpDataVersion();
        alert('Categories saved!');
      } else {
        alert('Failed to save categories');
      }
    } catch (error) {
      alert('Failed to save categories');
    } finally {
      setSavingCategories(false);
    }
  };

  const saveEventSettings = async () => {
    try {
      const res = await fetch(`/api/events?eventId=${eventId}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ tshirtSizes: tshirtSizes || null, bibCustomPrice: parseInt(bibCustomPrice) || 0 }),
      });
      if (res.ok) {
        alert('Event settings saved!');
      } else {
        alert('Failed to save event settings');
      }
    } catch {
      alert('Failed to save event settings');
    }
  };

  // GPX Upload handler
  const handleGpxUpload = async (categoryName: string, file: File | null) => {
    if (!file) return;

    setUploadingGpx(true);
    try {
      const content = await file.text();

      const response = await fetch('/api/gpx-upload', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          eventId,
          content,
          filename: file.name,
          categoryName
        }),
      });

      if (!response.ok) {
        let errorMsg = 'Failed to upload GPX';
        if (response.status === 413) {
          errorMsg = 'File is too large. Maximum allowed size is 4.5MB.';
        } else {
          try {
            const err = await response.json();
            errorMsg = err.error || errorMsg;
          } catch (e) {
            errorMsg = `Server error (${response.status}): The file might be too large.`;
          }
        }
        throw new Error(errorMsg);
      }

      await loadAllData();
      alert('GPX file uploaded successfully!');
    } catch (error: any) {
      alert(error.message || 'Failed to upload GPX file');
    } finally {
      setUploadingGpx(false);
    }
  };

  const clearGpxFile = async (categoryName: string) => {
    if (!confirm(`Remove GPX route file for category ${categoryName}?`)) return;

    try {
      const updatedContent = { ...(eventData?.content || {}) };
      if (updatedContent.routeGpxFiles) {
        delete updatedContent.routeGpxFiles[categoryName];
      }

      const response = await fetch(`/api/events/${eventId}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ content: updatedContent }),
      });

      if (response.ok) {
        await loadAllData();
        alert('GPX file removed successfully!');
      } else {
        alert('Failed to remove GPX file');
      }
    } catch (error: any) {
      alert(error.message || 'Failed to remove GPX file');
    }
  };

  // Download CSV
  const downloadCsv = async (kind: string) => {
    try {
      const res = await fetch(`/api/csv-read?eventId=${eventId}&kind=${kind}`);
      if (!res.ok) throw new Error('Failed to fetch CSV');
      const data = await res.json();
      if (!data.text) {
        alert('File not found or empty');
        return;
      }

      const blob = new Blob([data.text], { type: 'text/csv;charset=utf-8;' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = data.filename || `${eventId}-${kind}.csv`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
    } catch (err) {
      alert('Error downloading CSV');
    }
  };

  // Save timing rules
  const saveTiming = async () => {
    setSavingTiming(true);
    try {
      const h = Number(cutoffHours);
      let cutoffMs: number | null = null;
      if (Number.isFinite(h) && h > 0) {
        cutoffMs = h * 3600000;
      }

      const res = await fetch(`/api/timing?eventId=${eventId}`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ cutoffMs, categoryStartTimes: catStart }),
      });

      if (!res.ok) {
        let errorMsg = "Failed to save";
        try {
          const err = await res.json();
          errorMsg = err.error || errorMsg;
        } catch (e) {
          errorMsg = `Server error (${res.status}).`;
        }
        throw new Error(errorMsg);
      }

      bumpDataVersion();
      alert("Timing rules berhasil disimpan!");
    } catch (error: any) {
      alert(`Error: ${error.message}`);
    } finally {
      setSavingTiming(false);
    }
  };

  const saveManualStartDirectly = async (timeStr: string) => {
    if (!confirm(timeStr ? "Simpan Manual Start ini?" : "Hapus Manual Start?")) return;
    setSavingManualStart(true);
    try {
      const manualRes = await fetch(`/api/manual-start?eventId=${eventId}`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ manualStartTime: timeStr || null }),
      });
      if (!manualRes.ok) throw new Error("Gagal menyimpan waktu start.");
      setManualStartTime(timeStr);
      bumpDataVersion();
      alert(timeStr ? "Manual Start berhasil di-set!" : "Manual Start berhasil dihapus!");
    } catch (e: any) {
      alert(e.message);
    } finally {
      setSavingManualStart(false);
    }
  };

  // Toggle DQ
  const toggleDQ = async (epc: string, bib: string) => {
    const nextVal = !dqMap[epc];
    const next = { ...dqMap, [epc]: nextVal };
    if (!nextVal) delete next[epc];
    setDqMap(next);

    try {
      await fetch('/api/runner-status', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ eventId, epc, bib, isDQ: nextVal, isHidden: !!hiddenMap[epc] })
      });
    } catch (e) { console.error(e); }

    bumpDataVersion();
  };

  const toggleHide = async (epc: string, bib: string) => {
    const nextVal = !hiddenMap[epc];
    const next = { ...hiddenMap, [epc]: nextVal };
    if (!nextVal) delete next[epc];
    setHiddenMap(next);

    try {
      await fetch('/api/runner-status', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ eventId, epc, bib, isDQ: !!dqMap[epc], isHidden: nextVal })
      });
    } catch (e) { console.error(e); }

    bumpDataVersion();
  };

  // Certificate handlers
  const loadCertData = async () => {
    try {
      const res = await fetch(`/api/certificate?eventId=${eventId}`);
      if (res.ok) {
        const data = await res.json();
        setCertData(data);
      }
    } catch (error) {
      console.error('Failed to load certificate data:', error);
    }
  };

  const handleCertUpload = async () => {
    if (!certFile) {
      alert('Please select a certificate template file');
      return;
    }

    setUploadingCert(true);
    try {
      const formData = new FormData();
      formData.append('file', certFile);
      formData.append('eventId', eventId);

      const res = await fetch('/api/upload-certificate', {
        method: 'POST',
        body: formData,
      });

      if (!res.ok) {
        let errorMsg = 'Failed to upload certificate';
        if (res.status === 413) {
          errorMsg = 'File is too large. Maximum allowed size is 4.5MB.';
        } else {
          try {
            const err = await res.json();
            errorMsg = err.error || errorMsg;
          } catch (e) {
            errorMsg = `Server error (${res.status}): The file might be too large.`;
          }
        }
        throw new Error(errorMsg);
      }

      setCertFile(null);
      const fileInput = document.getElementById('cert-upload') as HTMLInputElement;
      if (fileInput) fileInput.value = '';

      await loadCertData();
      alert('Certificate template uploaded!');
    } catch (error: any) {
      alert(error.message || 'Failed to upload certificate');
    } finally {
      setUploadingCert(false);
    }
  };

  const deleteCert = async (filename: string) => {
    if (!confirm('Delete this certificate template?')) return;

    try {
      const res = await fetch(`/api/certificate?eventId=${eventId}&filename=${encodeURIComponent(filename)}`, {
        method: 'DELETE',
      });

      if (res.ok) {
        await loadCertData();
        alert('Certificate template deleted!');
      }
    } catch (error) {
      alert('Failed to delete certificate');
    }
  };

  // Filter rows for DQ tab
  const filteredDqRows = useMemo(() => {
    const query = dqSearch.trim().toLowerCase();
    if (!query) return allRows;
    return allRows.filter(
      (r) =>
        (r.bib || "").toLowerCase().includes(query) ||
        (r.name || "").toLowerCase().includes(query)
    );
  }, [dqSearch, allRows]);

  const metaByKind: Partial<Record<CsvKind, { filename: string; updatedAt: number; rows: number }>> = {};
  csvMeta.forEach((x) => {
    metaByKind[x.key] = { filename: x.filename, updatedAt: x.updatedAt, rows: x.rows };
  });

  if (loading) {
    return (
      <div className="text-center py-8">
        <div className="inline-block h-8 w-8 animate-spin rounded-full border-4 border-solid border-red-500 border-r-transparent"></div>
        <p className="mt-4">Loading event data...</p>
      </div>
    );
  }

  return (
    <div className="event-detail-page">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center gap-3 mb-4 pb-4 border-b border-gray-200">
        <button className="btn ghost" onClick={onBack}>
          ← Back
        </button>
        <div className="flex-1 min-w-0">
          <h1 className="text-lg md:text-xl font-bold text-gray-900 truncate">{eventName}</h1>
          <span className="text-gray-500 text-sm">/{eventSlug}</span>
        </div>
        <button
          className="btn w-full sm:w-auto"
          onClick={() => window.open(`/event/${eventSlug}`, '_blank')}
        >
          View Public Page
        </button>
      </div>

      {/* Tabs - scrollable on mobile */}
      <div className="flex gap-1 mb-4 overflow-x-auto pb-2 border-b-2 border-gray-200 -mx-3 px-3 md:mx-0 md:px-0">
        <button
          className={`detail-tab whitespace-nowrap ${activeTab === 'homepage' ? 'active' : ''}`}
          onClick={() => setActiveTab('homepage')}
        >
          Homepage
        </button>
        <button
          className={`detail-tab whitespace-nowrap ${activeTab === 'registration' ? 'active' : ''}`}
          onClick={() => setActiveTab('registration')}
        >
          Registration ({regFields.length})
        </button>
        <button
          className={`detail-tab whitespace-nowrap ${activeTab === 'inventory' ? 'active' : ''}`}
          onClick={() => setActiveTab('inventory')}
        >
          Inventory ({tshirtInventory.length})
        </button>
        <button
          className={`detail-tab whitespace-nowrap ${activeTab === 'banners' ? 'active' : ''}`}
          onClick={() => setActiveTab('banners')}
        >
          Banners & Media
        </button>
        <button
          className={`detail-tab whitespace-nowrap ${activeTab === 'gallery' ? 'active' : ''}`}
          onClick={() => setActiveTab('gallery')}
        >
          Gallery
        </button>
        <button
          className={`detail-tab whitespace-nowrap ${activeTab === 'categories' ? 'active' : ''}`}
          onClick={() => setActiveTab('categories')}
        >
          Categories ({categories.length})
        </button>
        <button
          className={`detail-tab whitespace-nowrap ${activeTab === 'route' ? 'active' : ''}`}
          onClick={() => setActiveTab('route')}
        >
          Route {currentGpxPath ? '(1)' : '(0)'}
        </button>
        <button
          className={`detail-tab whitespace-nowrap ${activeTab === 'data' ? 'active' : ''}`}
          onClick={() => setActiveTab('data')}
        >
          Data Upload
        </button>
        <button
          className={`detail-tab whitespace-nowrap ${activeTab === 'checkpoints' ? 'active' : ''}`}
          onClick={() => setActiveTab('checkpoints')}
        >
          Checkpoints
        </button>
        <button
          className={`detail-tab whitespace-nowrap ${activeTab === 'timing' ? 'active' : ''}`}
          onClick={() => setActiveTab('timing')}
        >
          Timing Rules
        </button>
        <button
          className={`detail-tab whitespace-nowrap ${activeTab === 'manual_start' ? 'active' : ''}`}
          onClick={() => setActiveTab('manual_start')}
        >
          Manual Start
        </button>
        <button
          className={`detail-tab whitespace-nowrap ${activeTab === 'dq' ? 'active' : ''}`}
          onClick={() => setActiveTab('dq')}
        >
          DQ / DNF
        </button>
        <button
          className={`detail-tab whitespace-nowrap ${activeTab === 'penalty' ? 'active' : ''}`}
          onClick={() => setActiveTab('penalty')}
        >
          Penalty
        </button>
        <button
          className={`detail-tab whitespace-nowrap ${activeTab === 'certified' ? 'active' : ''}`}
          onClick={() => setActiveTab('certified')}
        >
          Certified {certData.hasCertificate ? '✓' : ''}
        </button>
        <button
          className={`detail-tab whitespace-nowrap ${activeTab === 'settings' ? 'active' : ''}`}
          onClick={() => setActiveTab('settings')}
        >
          Settings
        </button>
      </div>


      {/* Data Upload Tab */}
      {activeTab === 'data' && (
        <div className="card">
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 mb-4">
            <div>
              <h2 className="section-title">CSV Upload</h2>
              <div className="subtle text-sm">
                Upload CSV data untuk event ini. Master & Finish wajib.
              </div>
            </div>
            <div className="flex gap-2 w-full sm:w-auto">
              <button className="btn secondary w-full sm:w-auto border border-stone-200" onClick={exportMasterTemplate}>
                Export Master Template
              </button>
              <button className="btn ghost w-full sm:w-auto" onClick={clearAllCsv}>
                Reset All CSV
              </button>
            </div>
          </div>

          {/* Desktop Table - hidden on mobile */}
          <div className="hidden md:block table-wrap">
            <table className="f1-table compact">
              <thead>
                <tr>
                  <th style={{ width: 140 }}>Type</th>
                  <th>Upload</th>
                  <th style={{ width: 280 }}>Current File</th>
                  <th style={{ width: 100 }}>Rows</th>
                  <th style={{ width: 150 }}>Updated</th>
                  <th style={{ width: 100 }}>Actions</th>
                </tr>
              </thead>
              <tbody>
                {(["master", "start", "finish", "checkpoint"] as CsvKind[]).map((kind) => {
                  const meta = metaByKind[kind];
                  return (
                    <tr key={kind} className="row-hover">
                      <td className="mono strong">{kind.toUpperCase()}</td>
                      <td>
                        <input
                          type="file"
                          accept=".csv,text/csv"
                          onChange={(e) => {
                            const f = (e.target as HTMLInputElement).files?.[0];
                            if (f) uploadCsv(kind, f);
                          }}
                        />
                      </td>
                      <td className="mono">{meta?.filename || "-"}</td>
                      <td className="mono">{meta?.rows ?? "-"}</td>
                      <td className="mono">
                        {meta?.updatedAt ? new Date(meta.updatedAt).toLocaleString() : "-"}
                      </td>
                      <td>
                        {meta && (
                          <div style={{ display: 'flex', gap: '0.5rem' }}>
                            <button className="btn ghost" onClick={() => downloadCsv(kind)}>
                              Download
                            </button>
                            <button className="btn ghost" style={{ color: '#dc2626' }} onClick={() => clearCsv(kind)}>
                              Clear
                            </button>
                          </div>
                        )}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>

          {/* Mobile Cards - visible only on mobile */}
          <div className="md:hidden space-y-3">
            {(["master", "start", "finish", "checkpoint"] as CsvKind[]).map((kind) => {
              const meta = metaByKind[kind];
              const isRequired = kind === "master" || kind === "finish";
              return (
                <div key={kind} className="bg-white border border-gray-200 rounded-lg p-3 shadow-sm">
                  <div className="flex justify-between items-center mb-2">
                    <div className="flex items-center gap-2">
                      <span className="mono font-bold">{kind.toUpperCase()}</span>
                      {isRequired && (
                        <span className="px-2 py-0.5 bg-red-100 text-red-700 text-xs rounded-full">Required</span>
                      )}
                    </div>
                    {meta ? (
                      <span className="px-2 py-1 bg-green-100 text-green-700 text-xs rounded-full font-medium">
                        Uploaded
                      </span>
                    ) : (
                      <span className="px-2 py-1 bg-gray-100 text-gray-500 text-xs rounded-full">
                        Empty
                      </span>
                    )}
                  </div>

                  {meta && (
                    <div className="text-sm text-gray-600 mb-2 space-y-1">
                      <div className="flex justify-between">
                        <span className="text-gray-500">File:</span>
                        <span className="mono truncate max-w-[150px]">{meta.filename}</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-gray-500">Rows:</span>
                        <span className="mono">{meta.rows}</span>
                      </div>
                    </div>
                  )}

                  <div className="flex gap-2">
                    <label className="flex-1">
                      <input
                        type="file"
                        accept=".csv,text/csv"
                        className="block w-full text-sm text-gray-500
                          file:mr-2 file:py-2 file:px-3
                          file:rounded-lg file:border-0
                          file:text-xs file:font-medium
                          file:bg-gray-100 file:text-gray-700
                          hover:file:bg-gray-200
                          cursor-pointer"
                        onChange={(e) => {
                          const f = (e.target as HTMLInputElement).files?.[0];
                          if (f) uploadCsv(kind, f);
                        }}
                      />
                    </label>
                    {meta && (
                      <>
                        <button className="btn ghost text-sm" onClick={() => downloadCsv(kind)}>
                          Download
                        </button>
                        <button className="btn ghost text-sm" style={{ color: '#dc2626' }} onClick={() => clearCsv(kind)}>
                          Clear
                        </button>
                      </>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* Checkpoints Tab */}
      {activeTab === 'checkpoints' && (
        <CheckpointsPage eventId={eventId} />
      )}

      {/* Banners Tab */}
      {activeTab === 'banners' && (
        <div className="card">
          <div className="header-row mb-4">
            <div>
              <h2 className="section-title">Media & Banners</h2>
              <div className="subtle text-sm">
                Upload Event Logo, Cover Banner, and rotating carousel banners.
              </div>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-8">
            {/* Logo Upload */}
            <div className="p-4 bg-gray-50 border border-gray-200 rounded-lg">
              <div className="font-bold text-gray-900 mb-1">Event Logo</div>
              <div className="text-xs text-gray-500 mb-3">Square image (e.g. 500x500). Used for event page header.</div>
              {eventData?.logoUrl && (
                <img src={eventData.logoUrl} alt="Logo" className="w-16 h-16 object-contain bg-white rounded shadow-sm mb-3 border border-gray-200" />
              )}
              <div className="flex gap-2">
                <input
                  id="logo-upload"
                  type="file"
                  accept="image/*"
                  onChange={(e) => setLogoFile(e.target.files?.[0] || null)}
                  className="flex-1 text-sm block w-full text-gray-500 file:mr-2 file:py-1 file:px-2 file:rounded file:border-0 file:text-xs file:font-medium file:bg-gray-200 file:text-gray-700 hover:file:bg-gray-300"
                />
                <button
                  className="btn"
                  onClick={() => handleMediaUpload('logo')}
                  disabled={!logoFile || uploadingLogo}
                >
                  {uploadingLogo ? 'Uploading...' : 'Upload'}
                </button>
              </div>
            </div>

            {/* Cover Banner Upload */}
            <div className="p-4 bg-gray-50 border border-gray-200 rounded-lg">
              <div className="font-bold text-gray-900 mb-1">Cover Banner</div>
              <div className="text-xs text-gray-500 mb-3">Wide image (e.g. 1920x1080). Used for card background and hero.</div>
              {eventData?.bannerUrl && (
                <img src={eventData.bannerUrl} alt="Cover Banner" className="w-32 h-16 object-cover bg-white rounded shadow-sm mb-3 border border-gray-200" />
              )}
              <div className="flex gap-2">
                <input
                  id="cover-banner-upload"
                  type="file"
                  accept="image/*"
                  onChange={(e) => setCoverBannerFile(e.target.files?.[0] || null)}
                  className="flex-1 text-sm block w-full text-gray-500 file:mr-2 file:py-1 file:px-2 file:rounded file:border-0 file:text-xs file:font-medium file:bg-gray-200 file:text-gray-700 hover:file:bg-gray-300"
                />
                <button
                  className="btn"
                  onClick={() => handleMediaUpload('banner')}
                  disabled={!coverBannerFile || uploadingCover}
                >
                  {uploadingCover ? 'Uploading...' : 'Upload'}
                </button>
              </div>
            </div>
          </div>

          <h3 className="font-bold text-gray-900 mb-3">Carousel Banners ({banners.length})</h3>

          {/* Banner Upload */}
          <div className="mb-4 p-3 bg-gray-50 rounded-lg">
            <div className="subtle mb-2 font-medium text-sm">Upload New Carousel Banner</div>
            <div className="flex flex-col sm:flex-row gap-2">
              <input
                id="banner-upload"
                type="file"
                accept="image/*"
                onChange={(e) => setBannerFile(e.target.files?.[0] || null)}
                className="flex-1 text-sm block w-full text-gray-500 file:mr-2 file:py-1 file:px-2 file:rounded file:border-0 file:text-xs file:font-medium file:bg-gray-200 file:text-gray-700 hover:file:bg-gray-300"
              />
              <button
                className="btn w-full sm:w-auto"
                onClick={handleBannerUpload}
                disabled={!bannerFile || uploadingBanner}
              >
                {uploadingBanner ? 'Uploading...' : 'Upload'}
              </button>
            </div>
          </div>

          {/* Desktop Table - hidden on mobile */}
          <div className="hidden md:block table-wrap">
            <table className="f1-table compact">
              <thead>
                <tr>
                  <th style={{ width: 120 }}>Preview</th>
                  <th>URL</th>
                  <th style={{ width: 100 }}>Status</th>
                  <th style={{ width: 150 }}>Actions</th>
                </tr>
              </thead>
              <tbody>
                {banners.length === 0 ? (
                  <tr>
                    <td colSpan={4} className="empty">No banners uploaded yet</td>
                  </tr>
                ) : (
                  banners.map((banner) => (
                    <tr key={banner.id} className="row-hover">
                      <td>
                        <img
                          src={banner.imageUrl}
                          alt={banner.alt || "Banner"}
                          style={{ width: '100px', height: '60px', objectFit: 'cover', borderRadius: '4px' }}
                        />
                      </td>
                      <td className="mono" style={{ fontSize: '11px' }}>
                        {banner.imageUrl.slice(0, 50)}...
                      </td>
                      <td>
                        <span style={{
                          padding: '4px 8px',
                          borderRadius: '999px',
                          fontSize: '12px',
                          fontWeight: 700,
                          background: banner.isActive ? '#dcfce7' : '#f3f4f6',
                          color: banner.isActive ? '#166534' : '#6b7280',
                        }}>
                          {banner.isActive ? "Active" : "Hidden"}
                        </span>
                      </td>
                      <td>
                        <div style={{ display: 'flex', gap: '0.5rem' }}>
                          <button className="btn ghost" onClick={() => toggleBannerActive(banner.id)}>
                            {banner.isActive ? 'Hide' : 'Show'}
                          </button>
                          <button
                            className="btn ghost"
                            style={{ color: '#dc2626' }}
                            onClick={() => deleteBanner(banner.id, banner.imageUrl)}
                          >
                            Delete
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>

          {/* Mobile Cards - visible only on mobile */}
          <div className="md:hidden space-y-3">
            {banners.length === 0 ? (
              <div className="text-center text-gray-500 py-8">No banners uploaded yet</div>
            ) : (
              banners.map((banner) => (
                <div key={banner.id} className="bg-white border border-gray-200 rounded-lg overflow-hidden shadow-sm">
                  <img
                    src={banner.imageUrl}
                    alt={banner.alt || "Banner"}
                    className="w-full h-32 object-cover"
                  />
                  <div className="p-3">
                    <div className="flex justify-between items-center mb-2">
                      <span
                        className="px-2 py-1 rounded-full text-xs font-bold"
                        style={{
                          background: banner.isActive ? '#dcfce7' : '#f3f4f6',
                          color: banner.isActive ? '#166534' : '#6b7280',
                        }}
                      >
                        {banner.isActive ? "Active" : "Hidden"}
                      </span>
                    </div>
                    <div className="flex gap-2">
                      <button className="btn ghost flex-1 text-sm" onClick={() => toggleBannerActive(banner.id)}>
                        {banner.isActive ? 'Hide' : 'Show'}
                      </button>
                      <button
                        className="btn ghost flex-1 text-sm"
                        style={{ color: '#dc2626' }}
                        onClick={() => deleteBanner(banner.id, banner.imageUrl)}
                      >
                        Delete
                      </button>
                    </div>
                  </div>
                </div>
              ))
            )}
          </div>
        </div>
      )}

      {/* Categories Tab */}
      {activeTab === 'gallery' && (
        <div className="tab-pane active fade-in">
          <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 mb-6">
            <div>
              <h2 className="text-xl font-bold">Event Gallery</h2>
              <p className="text-stone-500 text-sm mt-1">Upload max 20 photos. These will be displayed on the public event page.</p>
            </div>
            <div className="flex gap-2">
              <input type="file" id="gallery-upload" multiple accept="image/*" className="hidden" onChange={(e) => handleGalleryUpload(e.target.files)} />
              <button
                onClick={() => document.getElementById('gallery-upload')?.click()}
                disabled={uploadingGallery}
                className="bg-stone-900 hover:bg-black text-white font-bold py-2 px-6 rounded-xl flex items-center gap-2 transition-all shadow-md active:scale-95"
              >
                {uploadingGallery ? 'Uploading...' : 'Upload Photos'}
              </button>
            </div>
          </div>

          {eventData?.content?.galleryUrls && eventData.content.galleryUrls.length > 0 ? (
            <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-4">
              {eventData.content.galleryUrls.map((url: string, idx: number) => (
                <div key={idx} className="relative group rounded-2xl overflow-hidden shadow-sm border border-stone-200 aspect-square bg-stone-100">
                  <img src={url} alt={`Gallery ${idx}`} className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-110" loading="lazy" />
                  <div className="absolute inset-0 bg-black/60 opacity-0 group-hover:opacity-100 transition-opacity duration-300 flex items-center justify-center backdrop-blur-[2px]">
                    <button
                      onClick={() => deleteGalleryImage(url)}
                      className="bg-red-500 hover:bg-red-600 text-white font-bold py-1.5 px-4 rounded-full text-xs shadow-lg transform translate-y-4 group-hover:translate-y-0 transition-all duration-300"
                    >
                      Hapus
                    </button>
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <div className="text-center py-20 bg-stone-50 rounded-3xl border-2 border-dashed border-stone-200 flex flex-col items-center justify-center">
              <div className="w-16 h-16 bg-white rounded-full flex items-center justify-center shadow-sm mb-4">
                <svg className="w-8 h-8 text-stone-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
                </svg>
              </div>
              <p className="text-stone-500 font-medium text-lg">Belum ada foto di galeri.</p>
              <p className="text-stone-400 text-sm mt-1">Klik tombol Upload Photos di atas untuk menambahkan.</p>
            </div>
          )}
        </div>
      )}

      {activeTab === 'categories' && (
        <div className="card">
          <div className="header-row mb-4">
            <div>
              <h2 className="section-title">Race Categories & Pricing</h2>
              <div className="subtle text-sm">
                Kelola kategori lomba dan harga tiket per kategori.
              </div>
            </div>
            <button
              className="btn"
              onClick={() => saveCategories(categories)}
              disabled={savingCategories || categories.length === 0}
            >
              {savingCategories ? 'Saving...' : 'Save Categories'}
            </button>
          </div>

          {/* Add Category */}
          <div className="flex flex-col sm:flex-row gap-2 mb-4">
            <input
              className="search flex-1"
              placeholder="e.g., 10K Laki-laki"
              value={newCategory}
              onChange={(e) => setNewCategory(e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && addCategory()}
            />
            <input
              className="search"
              style={{ width: 140 }}
              placeholder="Harga (Rp)"
              type="number"
              value={newCategoryPrice}
              onChange={(e) => setNewCategoryPrice(e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && addCategory()}
            />
            <input
              className="search"
              style={{ width: 120 }}
              placeholder="Kuota (0=∞)"
              type="number"
              value={newCategoryQuota}
              onChange={(e) => setNewCategoryQuota(e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && addCategory()}
            />
            <button className="btn w-full sm:w-auto" onClick={addCategory} disabled={!newCategory.trim()}>
              + Add Category
            </button>
          </div>

          {/* Desktop Table */}
          <div className="hidden md:block table-wrap">
            <table className="f1-table compact">
              <thead>
                <tr>
                  <th style={{ width: 60 }}>#</th>
                  <th>Category Name</th>
                  <th style={{ width: 140 }}>Harga (Rp)</th>
                  <th style={{ width: 100 }}>Kuota</th>
                  <th style={{ width: 80 }}>Sold</th>
                  <th style={{ width: 100 }}>Actions</th>
                </tr>
              </thead>
              <tbody>
                {categories.length === 0 ? (
                  <tr>
                    <td colSpan={5} className="empty">No categories yet</td>
                  </tr>
                ) : (
                  categories.map((cat, index) => (
                    <tr key={cat.name} className="row-hover">
                      <td className="mono">{index + 1}</td>
                      <td className="name-cell">{cat.name}</td>
                      <td>
                        <input
                          className="search text-right"
                          style={{ width: 130 }}
                          type="number"
                          value={cat.price}
                          onChange={(e) => updateCategoryPrice(cat.name, parseInt(e.target.value) || 0)}
                        />
                      </td>
                      <td>
                        <input
                          className="search text-right"
                          style={{ width: 90 }}
                          type="number"
                          value={cat.quota}
                          placeholder="0=∞"
                          onChange={(e) => updateCategoryQuota(cat.name, parseInt(e.target.value) || 0)}
                        />
                      </td>
                      <td className="text-center font-bold text-red-600">
                        {(cat as any).sold || 0}
                      </td>
                      <td>
                        <div className="flex gap-2">
                          <button
                            className="btn ghost text-sm px-2 py-1"
                            style={{ color: cat.isHidden ? '#10b981' : '#f59e0b' }}
                            onClick={() => toggleCategoryHidden(cat.name)}
                          >
                            {cat.isHidden ? 'Show' : 'Hide'}
                          </button>
                          <button
                            className="btn ghost text-sm px-2 py-1"
                            style={{ color: '#dc2626' }}
                            onClick={() => removeCategory(cat.name)}
                          >
                            Remove
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>

          {/* Mobile Cards */}
          <div className="md:hidden space-y-2">
            {categories.length === 0 ? (
              <div className="text-center text-gray-500 py-8">No categories yet</div>
            ) : (
              categories.map((cat, index) => (
                <div key={cat.name} className="bg-white border border-gray-200 rounded-lg p-3 shadow-sm">
                  <div className="flex justify-between items-center mb-2">
                    <div>
                      <span className="font-medium text-gray-900">{cat.name}</span>
                      <span className="text-xs text-gray-400 ml-2">#{index + 1}</span>
                    </div>
                    <div className="flex gap-2">
                      <button
                        className="btn ghost text-sm"
                        style={{ color: cat.isHidden ? '#10b981' : '#f59e0b' }}
                        onClick={() => toggleCategoryHidden(cat.name)}
                      >
                        {cat.isHidden ? 'Show' : 'Hide'}
                      </button>
                      <button
                        className="btn ghost text-sm"
                        style={{ color: '#dc2626' }}
                        onClick={() => removeCategory(cat.name)}
                      >
                        Remove
                      </button>
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    <span className="text-xs text-gray-500">Harga:</span>
                    <input
                      className="search text-right flex-1"
                      type="number"
                      value={cat.price}
                      onChange={(e) => updateCategoryPrice(cat.name, parseInt(e.target.value) || 0)}
                    />
                  </div>
                </div>
              ))
            )}
          </div>
        </div>
      )}

      {/* Route Tab */}
      {activeTab === 'route' && (
        <div className="card">
          <div className="header-row mb-4">
            <div>
              <h2 className="section-title">GPX Route File</h2>
              <div className="subtle text-sm">
                Upload file GPX untuk menampilkan rute lomba di peta.
              </div>
            </div>
          </div>

          {/* GPX Routes per Category */}
          <div className="flex flex-col gap-4">
            {categories.length === 0 && (
              <div className="text-center text-gray-500 py-8 border border-dashed border-gray-300 rounded-lg">
                Belum ada kategori lomba. Tambahkan kategori terlebih dahulu.
              </div>
            )}
            {categories.map(cat => {
              const routeUrl = eventData?.content?.routeGpxFiles?.[cat.name];
              return (
                <div key={cat.name} className="border border-gray-200 rounded-lg p-4 bg-gray-50">
                  <div className="flex items-center justify-between mb-2">
                    <h3 className="font-bold text-gray-700">Kategori: {cat.name}</h3>
                    {routeUrl && <span className="px-2 py-1 bg-green-100 text-green-700 text-xs rounded-full font-bold">Uploaded</span>}
                  </div>
                  <div className="flex flex-col sm:flex-row gap-2 items-center">
                    {routeUrl ? (
                      <>
                        <p className="mono text-xs text-gray-600 truncate flex-1">{routeUrl}</p>
                        <button className="btn ghost text-xs flex-1 sm:flex-none" onClick={() => window.open(routeUrl, '_blank')}>View</button>
                        <button className="btn ghost text-xs flex-1 sm:flex-none" style={{ color: '#dc2626' }} onClick={() => clearGpxFile(cat.name)}>Remove</button>
                      </>
                    ) : (
                      <>
                        <input
                          type="file"
                          accept=".gpx,application/gpx+xml"
                          onChange={(e) => handleGpxUpload(cat.name, e.target.files?.[0] || null)}
                          className="flex-1 text-sm bg-white p-2 border border-gray-300 rounded"
                          disabled={uploadingGpx}
                        />
                      </>
                    )}
                  </div>
                </div>
              );
            })}
          </div>

          {/* Info box */}
          <div className="mt-4 p-3 bg-blue-50 border border-blue-400 rounded text-blue-900 text-sm">
            <strong>Info:</strong> File GPX akan ditampilkan sebagai rute di halaman event publik sesuai kategorinya.
          </div>
        </div>
      )}

      {/* Timing Rules Tab */}
      {activeTab === 'timing' && (
        <div className="space-y-4">
          {/* Cut Off Time */}
          <div className="card">
            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 mb-4">
              <div>
                <h2 className="section-title">Cut Off Settings</h2>
                <div className="subtle text-sm">
                  Cut off time dihitung dari start masing-masing pelari / kategori.
                </div>
              </div>
              <button className="btn w-full sm:w-auto" onClick={saveTiming} disabled={savingTiming}>
                {savingTiming ? "Saving..." : "Save Timing Rules"}
              </button>
            </div>

            <div className="admin-cutoff">
              <div className="label font-medium text-sm mb-1">Cut Off Duration (hours)</div>
              <div className="tools">
                <input
                  className="search w-full"
                  placeholder="e.g. 3.5"
                  value={cutoffHours}
                  onChange={(e) => setCutoffHours(e.target.value)}
                />
              </div>
              <div className="subtle text-sm mt-2">Jika kosong / 0 → cut off nonaktif.</div>
            </div>
          </div>

          {/* Category Start Time Overrides */}
          <div className="card">
            <div className="mb-4">
              <h2 className="section-title">Category Start Times</h2>
              <div className="subtle text-sm">
                Set start time per kategori. Jika diisi, sistem akan menghitung{" "}
                <b>total time = finish time - start time kategori</b>.
              </div>
            </div>

            {/* Desktop Table - hidden on mobile */}
            <div className="hidden md:block table-wrap">
              <table className="f1-table compact">
                <thead>
                  <tr>
                    <th>Category</th>
                    <th>Start Time (datetime)</th>
                    <th style={{ width: 200 }}>Action</th>
                  </tr>
                </thead>
                <tbody>
                  {categories.length === 0 ? (
                    <tr>
                      <td colSpan={3} className="empty">No categories defined yet. Add categories first.</td>
                    </tr>
                  ) : (
                    categories.map((cat) => (
                      <tr key={cat.name} className="row-hover">
                        <td className="name-cell">{cat.name}</td>
                        <td>
                          <input
                            className="search"
                            style={{ width: "100%" }}
                            placeholder="contoh: 2025-11-23 07:00:00.000"
                            value={catStart[cat.name] || ""}
                            onChange={(e) =>
                              setCatStart((prev) => ({
                                ...prev,
                                [cat.name]: e.target.value,
                              }))
                            }
                          />
                        </td>
                        <td>
                          <div style={{ display: "flex", gap: 8, justifyContent: "flex-end" }}>
                            <button
                              className="btn ghost"
                              onClick={() =>
                                setCatStart((prev) => ({
                                  ...prev,
                                  [cat.name]: formatNowAsTimestamp(),
                                }))
                              }
                            >
                              Set Now
                            </button>
                            <button
                              className="btn ghost"
                              onClick={() =>
                                setCatStart((prev) => ({
                                  ...prev,
                                  [cat.name]: "",
                                }))
                              }
                            >
                              Clear
                            </button>
                          </div>
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>

            {/* Mobile Cards - visible only on mobile */}
            <div className="md:hidden space-y-3">
              {categories.length === 0 ? (
                <div className="text-center text-gray-500 py-8">No categories defined yet. Add categories first.</div>
              ) : (
                categories.map((cat) => (
                  <div key={cat.name} className="bg-white border border-gray-200 rounded-lg p-3 shadow-sm">
                    <div className="font-medium text-gray-900 mb-2">{cat.name}</div>
                    <input
                      className="search w-full mb-2 text-sm"
                      placeholder="2025-11-23 07:00:00.000"
                      value={catStart[cat.name] || ""}
                      onChange={(e) =>
                        setCatStart((prev) => ({
                          ...prev,
                          [cat.name]: e.target.value,
                        }))
                      }
                    />
                    <div className="flex gap-2">
                      <button
                        className="btn ghost flex-1 text-sm"
                        onClick={() =>
                          setCatStart((prev) => ({
                            ...prev,
                            [cat.name]: formatNowAsTimestamp(),
                          }))
                        }
                      >
                        Set Now
                      </button>
                      <button
                        className="btn ghost flex-1 text-sm"
                        onClick={() =>
                          setCatStart((prev) => ({
                            ...prev,
                            [cat.name]: "",
                          }))
                        }
                      >
                        Clear
                      </button>
                    </div>
                  </div>
                ))
              )}
            </div>

            <div className="subtle text-sm mt-4">
              Gunakan format tanggal &amp; jam yang sama dengan di CSV timing
              (misal: <code>2025-11-23 07:00:00.000</code>). Kamu juga bisa klik <b>Set Now</b>
              untuk mengisi otomatis berdasarkan jam saat ini.
            </div>
          </div>
        </div>
      )}

      {activeTab === 'manual_start' && (
        <div className="tab-pane active fade-in mt-6">
          <div className="card border-blue-500 border-2 bg-blue-50/10">
            <div className="mb-4">
              <h2 className="section-title text-blue-600">Global Manual Start</h2>
              <div className="subtle text-sm">
                Set waktu start untuk seluruh peserta sekaligus. Ini akan digunakan sebagai waktu awal (T0) jika tidak ada waktu spesifik untuk BIB atau Kategori.
              </div>
            </div>
            <div className="admin-cutoff">
              <div className="label font-medium text-sm mb-1">Manual Start Time (ISO Format)</div>
              <div className="flex flex-col sm:flex-row gap-2">
                <input
                  className="search w-full"
                  placeholder="e.g. 2025-06-15T06:00:00.000Z"
                  value={manualStartTime}
                  onChange={(e) => setManualStartTime(e.target.value)}
                />
                <button
                  className="btn primary whitespace-nowrap"
                  disabled={savingManualStart}
                  onClick={() => saveManualStartDirectly(manualStartTime)}
                >
                  {savingManualStart ? "Saving..." : "Save Time"}
                </button>
                <button
                  className="btn ghost whitespace-nowrap border border-blue-500 text-blue-600"
                  disabled={savingManualStart}
                  onClick={() => {
                    const nowStr = new Date().toISOString();
                    setManualStartTime(nowStr);
                    saveManualStartDirectly(nowStr);
                  }}
                >
                  Start Now!
                </button>
                <button
                  className="btn ghost whitespace-nowrap text-red-500 border border-red-200"
                  disabled={savingManualStart}
                  onClick={() => {
                    setManualStartTime("");
                    saveManualStartDirectly("");
                  }}
                >
                  Clear
                </button>
              </div>
            </div>
          </div>

          <ManualStartBibPage
            allRows={allRows}
            onDataVersionBump={bumpDataVersion}
            eventId={eventId}
          />
        </div>
      )}

      {/* DQ / DNF Tab */}
      {activeTab === 'dq' && (
        <div className="card">
          <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-3 mb-4">
            <div>
              <h2 className="section-title">Disqualification (Manual)</h2>
              <div className="subtle text-sm">
                Toggle DSQ per runner (by EPC). DSQ tetap tampil di tabel tapi tanpa rank.
              </div>
            </div>
            <input
              className="search w-full sm:w-64"
              placeholder="Search BIB / Name…"
              value={dqSearch}
              onChange={(e) => setDqSearch(e.target.value)}
            />
          </div>

          {/* Desktop Table - hidden on mobile */}
          <div className="hidden md:block table-wrap">
            <table className="f1-table">
              <thead>
                <tr>
                  <th className="col-bib">BIB</th>
                  <th>NAME</th>
                  <th className="col-gender">GENDER</th>
                  <th className="col-cat">CATEGORY</th>
                  <th style={{ width: 120 }}>STATUS</th>
                  <th style={{ width: 120 }}>ACTION</th>
                </tr>
              </thead>
              <tbody>
                {filteredDqRows.map((r) => {
                  const isDQ = !!dqMap[r.epc];
                  return (
                    <tr key={r.epc} className="row-hover">
                      <td className="mono">{r.bib}</td>
                      <td className="name-cell">{r.name}</td>
                      <td>{r.gender}</td>
                      <td>
                        <div>{r.category}</div>
                        {r.ageCategory && (
                          <div className="text-[10px] font-bold bg-purple-100 text-purple-700 px-1.5 py-0.5 rounded mt-1 inline-block">
                            {r.ageCategory}
                          </div>
                        )}
                      </td>
                      <td className="mono strong">{isDQ ? "DSQ" : "OK"}</td>
                      <td>
                        <div className="flex gap-1">
                          <button
                            className="btn ghost sm"
                            onClick={() => toggleDQ(r.epc, r.bib || '')}
                          >
                            {isDQ ? "Undo DSQ" : "Disqualify"}
                          </button>
                          <button
                            className="btn ghost sm"
                            style={{ color: '#dc2626' }}
                            onClick={() => toggleHide(r.epc, r.bib || '')}
                          >
                            {hiddenMap[r.epc] ? "Unhide" : "Hide"}
                          </button>
                        </div>
                      </td>
                    </tr>
                  );
                })}
                {filteredDqRows.length === 0 && (
                  <tr>
                    <td colSpan={6} className="empty">
                      {allRows.length === 0
                        ? "Upload data CSV terlebih dahulu di tab Data Upload."
                        : "Tidak ada peserta yang cocok."}
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>

          {/* Mobile Cards - visible only on mobile */}
          <div className="md:hidden space-y-3">
            {filteredDqRows.length === 0 ? (
              <div className="text-center text-gray-500 py-8">
                {allRows.length === 0
                  ? "Upload data CSV terlebih dahulu di tab Data Upload."
                  : "Tidak ada peserta yang cocok."}
              </div>
            ) : (
              filteredDqRows.map((r) => {
                const isDQ = !!dqMap[r.epc];
                return (
                  <div key={r.epc} className="bg-white border border-gray-200 rounded-lg p-3 shadow-sm">
                    <div className="flex justify-between items-start mb-2">
                      <div>
                        <div className="font-semibold text-gray-900">{r.name}</div>
                        <div className="text-sm text-gray-500">
                          <span className="mono">BIB: {r.bib}</span>
                          <span className="mx-2">·</span>
                          <span>{r.gender}</span>
                        </div>
                        <div className="text-xs text-gray-400">
                          {r.category}
                          {r.ageCategory && <span className="ml-2 bg-purple-100 text-purple-700 px-1.5 py-0.5 rounded text-[9px] font-bold">{r.ageCategory}</span>}
                        </div>
                      </div>
                      <span
                        className={`px-2 py-1 rounded-full text-xs font-bold ${isDQ
                          ? 'bg-red-100 text-red-700'
                          : 'bg-green-100 text-green-700'
                          }`}
                      >
                        {isDQ ? "DSQ" : "OK"}
                      </span>
                    </div>
                    <div className="flex gap-2">
                      <button
                        className={`btn w-full text-xs font-bold uppercase ${isDQ ? '' : 'ghost'}`}
                        onClick={() => toggleDQ(r.epc, r.bib || '')}
                      >
                        {isDQ ? "Undo DSQ" : "Disqualify"}
                      </button>
                      <button
                        className={`btn w-full text-xs font-bold uppercase ghost`}
                        style={{ color: '#dc2626' }}
                        onClick={() => toggleHide(r.epc, r.bib || '')}
                      >
                        {hiddenMap[r.epc] ? "Unhide" : "Hide"}
                      </button>
                    </div>
                  </div>
                );
              })
            )}
          </div>

          <div className="mt-4 p-3 bg-blue-50 border border-blue-400 rounded-lg text-blue-900 text-sm">
            <strong>Info:</strong> Total {Object.values(dqMap).filter(Boolean).length} peserta di-DSQ.
          </div>
        </div>
      )}

      {/* Penalty Tab */}
      {activeTab === 'penalty' && (
        <PenaltyPage
          allRows={allRows}
          onDataVersionBump={bumpDataVersion}
          eventId={eventId}
        />
      )}

      {/* Certified Tab */}
      {activeTab === 'certified' && (
        <div className="card">
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 mb-4">
            <div>
              <h2 className="section-title">Certificate Template</h2>
              <div className="subtle text-sm">
                Upload template sertifikat untuk event ini. Setiap event memiliki template sertifikat sendiri.
              </div>
            </div>
          </div>

          {/* Upload Area */}
          <div className="mb-4 p-4 bg-gray-50 rounded-lg">
            <div className="subtle mb-2 font-medium text-sm">Upload Template Sertifikat</div>
            <div className="text-xs text-gray-500 mb-3">
              Format yang didukung: PNG, JPG, PDF. Template akan digunakan sebagai background sertifikat peserta.
            </div>
            <div className="flex flex-col sm:flex-row gap-2">
              <input
                id="cert-upload"
                type="file"
                accept="image/*,.pdf"
                onChange={(e) => setCertFile(e.target.files?.[0] || null)}
                className="flex-1 text-sm"
              />
              <button
                className="btn w-full sm:w-auto"
                onClick={handleCertUpload}
                disabled={!certFile || uploadingCert}
              >
                {uploadingCert ? 'Uploading...' : 'Upload Template'}
              </button>
            </div>
          </div>

          {/* Current Template */}
          {certData.hasCertificate && certData.files.length > 0 ? (
            <div className="space-y-3">
              {certData.files.map((file) => (
                <div key={file.filename} className="bg-white border border-gray-200 rounded-lg p-4">
                  <div className="flex flex-col sm:flex-row sm:items-center gap-4">
                    {/* Preview */}
                    <div className="flex-shrink-0">
                      {file.filename.match(/\.(png|jpg|jpeg|gif|webp)$/i) ? (
                        <img
                          src={file.url}
                          alt="Certificate template"
                          className="w-full sm:w-48 h-32 object-contain bg-gray-100 rounded border"
                        />
                      ) : (
                        <div className="w-full sm:w-48 h-32 bg-gray-100 rounded border flex items-center justify-center">
                          <div className="text-center">
                            <svg width="32" height="32" viewBox="0 0 24 24" fill="#9ca3af" className="mx-auto mb-1">
                              <path d="M14 2H6c-1.1 0-1.99.9-1.99 2L4 20c0 1.1.89 2 1.99 2H18c1.1 0 2-.9 2-2V8l-6-6zm2 16H8v-2h8v2zm0-4H8v-2h8v2zm-3-5V3.5L18.5 9H13z" />
                            </svg>
                            <span className="text-xs text-gray-500">PDF</span>
                          </div>
                        </div>
                      )}
                    </div>

                    {/* File Info */}
                    <div className="flex-1">
                      <div className="font-semibold text-gray-900 mb-1">{file.filename}</div>
                      <div className="text-sm text-gray-500 space-y-1">
                        <div>Size: {(file.size / 1024).toFixed(1)} KB</div>
                        <div>Updated: {new Date(file.updatedAt).toLocaleString()}</div>
                      </div>
                      <div className="flex gap-2 mt-3">
                        <a
                          href={file.url}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="btn ghost text-sm"
                        >
                          Preview
                        </a>
                        <button
                          className="btn ghost text-sm"
                          onClick={() => deleteCert(file.filename)}
                          style={{ color: '#dc2626' }}
                        >
                          Delete
                        </button>
                      </div>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <div className="text-center py-8 text-gray-400">
              <svg width="48" height="48" viewBox="0 0 24 24" fill="#d1d5db" className="mx-auto mb-3">
                <path d="M14 2H6c-1.1 0-1.99.9-1.99 2L4 20c0 1.1.89 2 1.99 2H18c1.1 0 2-.9 2-2V8l-6-6zm2 16H8v-2h8v2zm0-4H8v-2h8v2zm-3-5V3.5L18.5 9H13z" />
              </svg>
              <p className="text-gray-600 font-medium">Belum ada template sertifikat</p>
              <p className="text-sm text-gray-400 mt-1">Upload template sertifikat untuk event ini</p>
            </div>
          )}

          <div className="mt-4 p-3 bg-blue-50 border border-blue-400 rounded-lg text-blue-900 text-sm">
            <strong>Info:</strong> Template sertifikat akan digunakan sebagai background. Nama dan waktu peserta akan di-overlay secara otomatis.
          </div>
        </div>
      )}

      {/* Homepage Content Tab */}
      {activeTab === 'homepage' && (
        <div className="card">
          <div className="header-row mb-6">
            <div>
              <h2 className="section-title">Homepage Content</h2>
              <div className="subtle text-sm">Kelola konten yang tampil di halaman Home event (blog-style landing page).</div>
            </div>
            <button className="btn" onClick={saveHomeContent} disabled={savingHome}>
              {savingHome ? 'Saving...' : 'Save Content'}
            </button>
          </div>

          <div className="mb-8 p-4 bg-gray-50 border border-gray-200 rounded-lg">
            <div className="font-bold text-gray-900 mb-1">Homepage Summary Image</div>
            <div className="text-xs text-gray-500 mb-3">Large image for the event summary section (blog-style).</div>
            {eventData?.homeImageUrl && (
              <div className="relative inline-block mb-3">
                <img src={eventData.homeImageUrl} alt="Home Image" className="w-full max-w-md h-48 object-cover bg-white rounded shadow-sm border border-gray-200" />
                <button
                  className="absolute top-2 right-2 w-7 h-7 bg-red-600 text-white rounded-full flex items-center justify-center text-xs font-bold hover:bg-red-700 shadow-md"
                  title="Hapus gambar"
                  onClick={async () => {
                    if (!confirm('Hapus gambar homepage?')) return;
                    try {
                      await fetch(`/api/events?eventId=${eventData.id}`, {
                        method: 'PUT',
                        headers: { 'Content-Type': 'application/json' },
                        body: JSON.stringify({ homeImageUrl: null }),
                      });
                      setEventData((prev: any) => prev ? { ...prev, homeImageUrl: null } : prev);
                    } catch (e) {
                      alert('Gagal menghapus gambar');
                    }
                  }}
                >✕</button>
              </div>
            )}
            <div className="flex gap-2">
              <input
                id="home-image-upload"
                type="file"
                accept="image/*"
                onChange={(e) => setHomeImageFile(e.target.files?.[0] || null)}
                className="flex-1 text-sm block w-full text-gray-500 file:mr-2 file:py-1 file:px-2 file:rounded file:border-0 file:text-xs file:font-medium file:bg-gray-200 file:text-gray-700 hover:file:bg-gray-300"
              />
              <button
                className="btn"
                onClick={() => handleMediaUpload('home_image')}
                disabled={!homeImageFile || uploadingHomeImage}
              >
                {uploadingHomeImage ? 'Uploading...' : 'Upload Image'}
              </button>
            </div>
          </div>

          <div className="space-y-6">
            <div>
              <div className="flex flex-col sm:flex-row justify-between items-start sm:items-end mb-2 gap-3">
                <label className="block text-sm font-bold text-gray-700">Konten HTML Halaman Home</label>
                <div className="flex flex-col items-end gap-2">
                  <div className="flex items-center gap-2">
                    <span className="text-xs text-gray-500 font-bold hidden sm:inline">Upload File HTML:</span>
                    <input
                      type="file"
                      accept=".html"
                      onChange={handleHtmlFileUpload}
                      className="text-[10px] file:mr-2 file:py-1 file:px-2 file:rounded file:border-0 file:bg-gray-200 file:font-bold file:text-gray-700 cursor-pointer hover:file:bg-gray-300 w-[180px]"
                    />
                  </div>
                  <span className="text-[10px] text-gray-500 font-medium">
                    (Paste kode HTML utuh atau upload file HTML dari Figma)
                  </span>
                </div>
              </div>
              <div className="bg-white border border-gray-200 rounded-lg overflow-hidden pb-12">
                <textarea
                  value={homeContent.about}
                  onChange={(e) => setHomeContent({ ...homeContent, about: e.target.value })}
                  className="w-full h-[442px] p-4 font-mono text-xs bg-gray-900 text-green-400 border-none focus:ring-0 outline-none resize-y"
                  placeholder="<!-- Paste kode HTML di sini... -->"
                  spellCheck="false"
                />
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Registration Fields Tab */}
      {activeTab === 'registration' && (
        <div className="card">
          <div className="header-row mb-6">
            <div>
              <h2 className="section-title">Custom Registration Fields</h2>
              <div className="subtle text-sm">Tambahkan field custom di form registrasi event ini (selain field standar: nama, email, dll).</div>
            </div>
            <button className="btn" onClick={saveRegFields} disabled={savingFields}>
              {savingFields ? 'Saving...' : 'Save Fields'}
            </button>
          </div>

          {/* Add Field */}
          <div className="flex flex-col sm:flex-row gap-2 mb-6">
            <button
              className="btn w-full sm:w-auto"
              onClick={() => setRegFields([...regFields, { label: '', type: 'text', required: false, options: '' }])}
            >
              + Add Field
            </button>
          </div>

          {regFields.length === 0 ? (
            <div className="text-center text-gray-400 py-8">
              <p className="text-gray-600 font-medium">Belum ada custom field</p>
              <p className="text-sm text-gray-400 mt-1">Klik "+ Add Field" untuk menambahkan field baru di form registrasi.</p>
            </div>
          ) : (
            <div className="space-y-4">
              {regFields.map((field, idx) => (
                <div key={idx} className="border border-gray-200 rounded-lg p-4 bg-gray-50">
                  <div className="flex items-start justify-between gap-3 mb-3">
                    <span className="text-xs font-bold text-gray-400 uppercase">Field #{idx + 1}</span>
                    <div className="flex gap-2">
                      <button
                        className="btn ghost text-xs px-2 disabled:opacity-30 disabled:cursor-not-allowed"
                        disabled={idx === 0}
                        onClick={() => {
                          const updated = [...regFields];
                          [updated[idx - 1], updated[idx]] = [updated[idx], updated[idx - 1]];
                          setRegFields(updated);
                        }}
                        title="Move Up"
                      >
                        ↑
                      </button>
                      <button
                        className="btn ghost text-xs px-2 disabled:opacity-30 disabled:cursor-not-allowed"
                        disabled={idx === regFields.length - 1}
                        onClick={() => {
                          const updated = [...regFields];
                          [updated[idx + 1], updated[idx]] = [updated[idx], updated[idx + 1]];
                          setRegFields(updated);
                        }}
                        title="Move Down"
                      >
                        ↓
                      </button>
                      <button
                        className="btn ghost text-xs"
                        style={{ color: '#dc2626' }}
                        onClick={() => setRegFields(regFields.filter((_, i) => i !== idx))}
                      >
                        Remove
                      </button>
                    </div>
                  </div>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    <div>
                      <label className="block text-xs font-bold text-gray-600 mb-1">Label</label>
                      <input
                        className="search w-full"
                        placeholder="e.g., Komunitas"
                        value={field.label}
                        onChange={(e) => {
                          const updated = [...regFields];
                          updated[idx] = { ...updated[idx], label: e.target.value };
                          setRegFields(updated);
                        }}
                      />
                    </div>
                    <div>
                      <label className="block text-xs font-bold text-gray-600 mb-1">Type</label>
                      <select
                        className="search w-full"
                        value={field.type}
                        onChange={(e) => {
                          const updated = [...regFields];
                          updated[idx] = { ...updated[idx], type: e.target.value };
                          setRegFields(updated);
                        }}
                      >
                        <option value="text">Text</option>
                        <option value="number">Number</option>
                        <option value="tel">Phone Number</option>
                        <option value="date">Date of Birth</option>
                        <option value="email">Email</option>
                        <option value="textarea">Textarea</option>
                        <option value="dropdown">Dropdown</option>
                        <option value="nationality">Nationality</option>
                        <option value="nik">NIK</option>
                      </select>
                    </div>
                    {field.type === 'dropdown' && (
                      <div className="sm:col-span-2">
                        <label className="block text-xs font-bold text-gray-600 mb-1">Options (pisahkan dengan koma)</label>
                        <input
                          className="search w-full"
                          placeholder="e.g., Option A, Option B, Option C"
                          value={field.options}
                          onChange={(e) => {
                            const updated = [...regFields];
                            updated[idx] = { ...updated[idx], options: e.target.value };
                            setRegFields(updated);
                          }}
                        />
                      </div>
                    )}
                    <div className="flex items-center gap-2">
                      <label className="flex items-center gap-2 cursor-pointer">
                        <input
                          type="checkbox"
                          checked={field.required}
                          onChange={(e) => {
                            const updated = [...regFields];
                            updated[idx] = { ...updated[idx], required: e.target.checked };
                            setRegFields(updated);
                          }}
                          className="w-4 h-4"
                        />
                        <span className="text-sm font-medium text-gray-700">Required</span>
                      </label>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}

          <div className="mt-4 p-3 bg-blue-50 border border-blue-400 rounded-lg text-blue-900 text-sm">
            <strong>Info:</strong> Field custom akan muncul di bawah form registrasi standar. Data yang diisi peserta akan tersimpan di customData.
          </div>
        </div>
      )}

      {/* T-shirt Inventory Tab */}
      {activeTab === 'inventory' && (
        <div className="card">
          <div className="header-row mb-6">
            <div>
              <h2 className="section-title">T-shirt / Jersey Inventory</h2>
              <div className="subtle text-sm">Kelola stok jersey per ukuran. Set kuota 0 untuk unlimited.</div>
            </div>
            <button className="btn" onClick={saveTshirtInventory} disabled={savingInventory}>
              {savingInventory ? 'Saving...' : 'Save Inventory'}
            </button>
          </div>

          {/* Add Size */}
          <div className="flex flex-col sm:flex-row gap-2 mb-6">
            <button
              className="btn w-full sm:w-auto"
              onClick={() => setTshirtInventory([...tshirtInventory, { size: '', quota: 0, sold: 0, width: '', height: '' }])}
            >
              + Add Size
            </button>
          </div>

          <div className="mt-4 p-3 bg-blue-50 border border-blue-400 rounded-lg text-blue-900 text-sm mb-6">
            <strong>Tips:</strong> Pastikan ukuran jersey sesuai dengan yang di-setting di tab Settings (T-shirt Sizes). Data "Terjual" akan terupdate otomatis saat peserta membayar.
          </div>

          {tshirtInventory.length === 0 ? (
            <div className="text-center text-gray-400 py-8">
              <p className="text-gray-600 font-medium">Belum ada data inventory</p>
              <p className="text-sm text-gray-400 mt-1">Klik "+ Add Size" untuk menambahkan ukuran jersey baru.</p>
            </div>
          ) : (
            <div className="hidden md:block table-wrap">
              <table className="f1-table compact">
                <thead>
                  <tr>
                    <th style={{ width: 60 }}>#</th>
                    <th>Size</th>
                    <th>Lebar (cm)</th>
                    <th>Tinggi (cm)</th>
                    <th style={{ width: 140 }}>Kuota</th>
                    <th style={{ width: 100 }}>Terjual</th>
                    <th style={{ width: 120 }}>Status</th>
                    <th style={{ width: 100 }}>Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {tshirtInventory.map((item, idx) => (
                    <tr key={idx} className="row-hover">
                      <td className="mono">{idx + 1}</td>
                      <td>
                        <input
                          className="search"
                          style={{ width: 120 }}
                          placeholder="e.g., XL"
                          value={item.size}
                          onChange={(e) => {
                            const updated = [...tshirtInventory];
                            updated[idx] = { ...updated[idx], size: e.target.value };
                            setTshirtInventory(updated);
                          }}
                        />
                      </td>
                      <td>
                        <input
                          className="search"
                          style={{ width: 80 }}
                          placeholder="Lebar"
                          value={item.width || ''}
                          onChange={(e) => {
                            const updated = [...tshirtInventory];
                            updated[idx] = { ...updated[idx], width: e.target.value };
                            setTshirtInventory(updated);
                          }}
                        />
                      </td>
                      <td>
                        <input
                          className="search"
                          style={{ width: 80 }}
                          placeholder="Tinggi"
                          value={item.height || ''}
                          onChange={(e) => {
                            const updated = [...tshirtInventory];
                            updated[idx] = { ...updated[idx], height: e.target.value };
                            setTshirtInventory(updated);
                          }}
                        />
                      </td>
                      <td>
                        <input
                          className="search text-right"
                          style={{ width: 110 }}
                          type="number"
                          placeholder="0=∞"
                          value={item.quota}
                          onChange={(e) => {
                            const updated = [...tshirtInventory];
                            updated[idx] = { ...updated[idx], quota: parseInt(e.target.value) || 0 };
                            setTshirtInventory(updated);
                          }}
                        />
                      </td>
                      <td className="mono text-center">{item.sold}</td>
                      <td>
                        {item.quota > 0 ? (
                          <span
                            className="px-2 py-1 rounded-full text-xs font-bold"
                            style={{
                              background: item.sold >= item.quota ? '#fee2e2' : '#dcfce7',
                              color: item.sold >= item.quota ? '#dc2626' : '#166534',
                            }}
                          >
                            {item.sold >= item.quota ? 'HABIS' : `${item.quota - item.sold} tersisa`}
                          </span>
                        ) : (
                          <span className="text-xs text-gray-400">Unlimited</span>
                        )}
                      </td>
                      <td>
                        <button
                          className="btn ghost"
                          style={{ color: '#dc2626' }}
                          onClick={() => setTshirtInventory(tshirtInventory.filter((_, i) => i !== idx))}
                        >
                          Remove
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}

          {/* Mobile Cards */}
          {tshirtInventory.length > 0 && (
            <div className="md:hidden space-y-3">
              {tshirtInventory.map((item, idx) => (
                <div key={idx} className="border border-gray-200 rounded-lg p-4 bg-gray-50">
                  <div className="flex items-center justify-between mb-2">
                    <span className="text-xs font-bold text-gray-400 uppercase">Size #{idx + 1}</span>
                    <button
                      className="btn ghost text-xs"
                      style={{ color: '#dc2626' }}
                      onClick={() => setTshirtInventory(tshirtInventory.filter((_, i) => i !== idx))}
                    >
                      Remove
                    </button>
                  </div>
                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <label className="block text-xs font-bold text-gray-600 mb-1">Size</label>
                      <input
                        className="search w-full"
                        placeholder="e.g., XL"
                        value={item.size}
                        onChange={(e) => {
                          const updated = [...tshirtInventory];
                          updated[idx] = { ...updated[idx], size: e.target.value };
                          setTshirtInventory(updated);
                        }}
                      />
                    </div>
                    <div>
                      <label className="block text-xs font-bold text-gray-600 mb-1">Kuota</label>
                      <input
                        className="search w-full"
                        type="number"
                        placeholder="0=∞"
                        value={item.quota}
                        onChange={(e) => {
                          const updated = [...tshirtInventory];
                          updated[idx] = { ...updated[idx], quota: parseInt(e.target.value) || 0 };
                          setTshirtInventory(updated);
                        }}
                      />
                    </div>
                  </div>
                  <div className="flex items-center justify-between mt-2 text-sm">
                    <span className="text-gray-500">Terjual: <strong>{item.sold}</strong></span>
                    {item.quota > 0 ? (
                      <span
                        className="px-2 py-1 rounded-full text-xs font-bold"
                        style={{
                          background: item.sold >= item.quota ? '#fee2e2' : '#dcfce7',
                          color: item.sold >= item.quota ? '#dc2626' : '#166534',
                        }}
                      >
                        {item.sold >= item.quota ? 'HABIS' : `${item.quota - item.sold} tersisa`}
                      </span>
                    ) : (
                      <span className="text-xs text-gray-400">Unlimited</span>
                    )}
                  </div>
                </div>
              ))}
            </div>
          )}

          <div className="mt-4 p-3 bg-blue-50 border border-blue-400 rounded-lg text-blue-900 text-sm">
            <strong>Tips:</strong> Pastikan ukuran jersey sesuai dengan yang di-setting di tab Settings (T-shirt Sizes). Data "Terjual" akan terupdate otomatis saat peserta membayar.
          </div>
        </div>
      )}

      {/* Settings Tab */}
      {activeTab === 'settings' && (
        <div className="card">
          <div className="header-row mb-6">
            <div>
              <h2 className="section-title">Event Status & Schedule</h2>
              <div className="subtle">Kelola status publikasi dan jadwal rilis event.</div>
            </div>
            <div className="flex gap-2 flex-col sm:flex-row">
              <a
                href={`/rpc/${eventSlug}`}
                target="_blank"
                rel="noreferrer"
                className="btn text-white w-full sm:w-auto text-center flex items-center justify-center font-bold px-4"
                style={{ backgroundColor: '#dc2626', borderColor: '#b91c1c' }}
              >
                Buka Layar RPC
              </a>
              <button
                className="btn"
                onClick={async () => {
                  try {
                    const res = await fetch(`/api/events?eventId=${eventId}`, {
                      method: 'PUT',
                      headers: { 'Content-Type': 'application/json' },
                      body: JSON.stringify({
                        isDraft: eventData.isDraft,
                        publishAt: eventData.publishAt,
                        name: eventData.name,
                        eventDate: eventData.eventDate,
                        location: eventData.location,
                        content: {
                          ...(eventData.content || {}),
                          about: homeContent.about || eventData.content?.about || '',
                          schedule: homeContent.schedule || eventData.content?.schedule || '',
                          rules: homeContent.rules || eventData.content?.rules || '',
                          allowBulkNoOtp: eventData.content?.allowBulkNoOtp || false,
                          enableRegisteredScan: eventData.content?.enableRegisteredScan !== false,
                          rpcBgUrl: eventData.content?.rpcBgUrl || '',
                          rpcBgUrlMobile: eventData.content?.rpcBgUrlMobile || '',
                          isDateTBA: eventData.content?.isDateTBA || false,
                          tncUrl: eventData.content?.tncUrl || '',
                          tncUrls: eventData.content?.tncUrls || undefined,
                          autoGenerateBibs: eventData.content?.autoGenerateBibs || undefined,
                        }
                      }),
                    });
                    if (res.ok) {
                      alert('Settings saved!');
                      await loadAllData();
                    } else alert('Failed to save settings');
                  } catch {
                    alert('Failed to save settings');
                  }
                }}
              >
                Save Settings
              </button>
            </div>
          </div>

          <div className="space-y-6">
            <div className="admin-cutoff">
              <div className="label">Event Details</div>
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 items-start">
                <div>
                  <label className="block text-sm font-bold text-gray-700 mb-1">Event Name</label>
                  <input
                    type="text"
                    className="search w-full"
                    value={eventData?.name || ''}
                    onChange={(e) => setEventData({ ...eventData, name: e.target.value })}
                  />
                </div>
                <div>
                  <label className="block text-sm font-bold text-gray-700 mb-1">Event Date</label>
                  <input
                    type="date"
                    className="search w-full"
                    value={eventData?.eventDate ? new Date(eventData.eventDate).toISOString().split('T')[0] : ''}
                    onChange={(e) => setEventData({ ...eventData, eventDate: e.target.value })}
                  />
                  <label className="flex items-center gap-2 mt-2 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={eventData?.content?.isDateTBA || false}
                      onChange={(e) => setEventData({
                        ...eventData,
                        content: { ...(eventData?.content || {}), isDateTBA: e.target.checked }
                      })}
                      className="w-4 h-4"
                    />
                    <span className="text-sm font-medium text-gray-700">Tanggal Belum Fix (Tampilkan Bulan & Tahun Saja)</span>
                  </label>
                </div>
                <div>
                  <label className="block text-sm font-bold text-gray-700 mb-1">Location</label>
                  <input
                    type="text"
                    className="search w-full"
                    value={eventData?.location || ''}
                    onChange={(e) => setEventData({ ...eventData, location: e.target.value })}
                  />
                </div>
              </div>
            </div>

            <div className="admin-cutoff border-t border-gray-100 pt-6">
              <div className="label">Publication Status</div>
              <div className="tools">
                <label className="flex items-center gap-3 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={eventData?.isDraft}
                    onChange={(e) => setEventData({ ...eventData, isDraft: e.target.checked })}
                    className="w-5 h-5"
                  />
                  <div className="flex flex-col">
                    <span className="font-bold text-gray-900">{eventData?.isDraft ? 'Draft Mode' : 'Live Mode'}</span>
                    <span className="text-xs text-gray-500">
                      {eventData?.isDraft
                        ? 'Event disembunyikan dari halaman publik dan pendaftaran ditutup.'
                        : 'Event tampil di halaman publik dan pendaftaran dibuka.'}
                    </span>
                  </div>
                </label>
              </div>
            </div>

            {eventData?.isDraft && (
              <div className="admin-cutoff">
                <div className="label">Scheduled Publication</div>
                <div className="tools">
                  <input
                    type="datetime-local"
                    className="search w-full"
                    value={eventData?.publishAt ? new Date(new Date(eventData.publishAt).getTime() - (new Date().getTimezoneOffset() * 60000)).toISOString().slice(0, 16) : ''}
                    onChange={(e) => setEventData({ ...eventData, publishAt: e.target.value || null })}
                  />
                  <div className="text-xs text-gray-500 mt-2">
                    Event akan otomatis dipublish pada waktu yang ditentukan di atas. Biarkan kosong untuk publikasi manual.
                  </div>
                </div>
              </div>
            )}

            <div className="admin-cutoff border-t border-gray-100 pt-6">
              <div className="label">Pendaftaran Massal (Bulk)</div>
              <div className="tools">
                <label className="flex items-center gap-3 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={eventData?.content?.allowBulkNoOtp || false}
                    onChange={(e) => setEventData({
                      ...eventData,
                      content: { ...(eventData?.content || {}), allowBulkNoOtp: e.target.checked }
                    })}
                    className="w-5 h-5"
                  />
                  <div className="flex flex-col">
                    <span className="font-bold text-gray-900">Izinkan Bulk Registration (Tanpa OTP)</span>
                    <span className="text-xs text-gray-500">
                      Jika diaktifkan, peserta dapat membeli tiket lebih dari 1 tanpa verifikasi email OTP.
                    </span>
                  </div>
                </label>
              </div>
            </div>

            <div className="admin-cutoff border-t border-gray-100 pt-6">
              <div className="label">Auto Generate BIB</div>
              <div className="tools">
                <label className="flex items-center gap-3 cursor-pointer mb-4">
                  <input
                    type="checkbox"
                    checked={eventData?.content?.autoGenerateBibs?.enabled || false}
                    onChange={(e) => setEventData({
                      ...eventData,
                      content: {
                        ...(eventData?.content || {}),
                        autoGenerateBibs: { ...(eventData?.content?.autoGenerateBibs || {}), enabled: e.target.checked }
                      }
                    })}
                    className="w-5 h-5"
                  />
                  <div className="flex flex-col">
                    <span className="font-bold text-gray-900">Aktifkan Auto Generate BIB</span>
                    <span className="text-xs text-gray-500">
                      Nomor BIB akan dibuat otomatis setelah peserta sukses membayar (PAID).
                    </span>
                  </div>
                </label>

                {eventData?.content?.autoGenerateBibs?.enabled && (
                  <div className="bg-stone-50 border border-stone-200 p-4 rounded-xl space-y-4">
                    <div className="text-sm font-bold text-stone-700">Nomor Mulai (Start Number) per Kategori</div>
                    {categories.length === 0 ? (
                      <div className="text-xs text-stone-500 italic">Belum ada kategori yang ditambahkan.</div>
                    ) : (
                      categories.map(cat => (
                        <div key={cat.id} className="flex flex-col sm:flex-row sm:items-center gap-2">
                          <div className="text-xs font-bold w-1/3">{cat.name}</div>
                          <input
                            type="text"
                            placeholder="Contoh: 5001"
                            className="search flex-1 text-sm"
                            value={eventData?.content?.autoGenerateBibs?.categories?.[cat.id!] || ''}
                            onChange={(e) => {
                              const val = e.target.value;
                              const catId = cat.id!;
                              setEventData((prev: any) => ({
                                ...prev,
                                content: {
                                  ...(prev?.content || {}),
                                  autoGenerateBibs: {
                                    ...(prev?.content?.autoGenerateBibs || {}),
                                    categories: {
                                      ...(prev?.content?.autoGenerateBibs?.categories || {}),
                                      [catId]: val
                                    }
                                  }
                                }
                              }));
                            }}
                          />
                        </div>
                      ))
                    )}
                  </div>
                )}
              </div>
            </div>

            <div className="admin-cutoff border-t border-gray-100 pt-6">
              <div className="label">Peringatan Checkout (Step 3)</div>
              <div className="tools">
                <div className="text-sm font-bold text-gray-700 mb-2">Teks Peringatan Kustom</div>
                <input
                  type="text"
                  className="search w-full"
                  placeholder="Pastikan data dan kategori yang Anda pilih sudah sesuai."
                  value={eventData?.content?.checkoutWarningText || ''}
                  onChange={(e) => setEventData({
                    ...eventData,
                    content: { ...(eventData?.content || {}), checkoutWarningText: e.target.value }
                  })}
                />
                <div className="text-xs text-gray-500 mt-2">
                  Pesan ini akan muncul dalam kotak peringatan kuning sebelum peserta melakukan checkout / pembayaran.
                </div>
              </div>
            </div>

            <div className="admin-cutoff border-t border-gray-100 pt-6">
              <div className="label">Syarat & Ketentuan (T&C)</div>
              <div className="tools">
                <div className="mb-4">
                  <div className="text-sm font-bold text-gray-700 mb-1">Dokumen T&C (Khusus PDF, Maks 5)</div>
                  {(() => {
                    const tncUrls = eventData?.content?.tncUrls || (eventData?.content?.tncUrl ? [eventData.content.tncUrl] : []);
                    return (
                      <div className="space-y-2 mb-2">
                        {tncUrls.map((url: string, idx: number) => (
                          <div key={idx} className="flex gap-2 items-center">
                            <input
                              type="text"
                              className="search flex-1"
                              placeholder={`URL Syarat & Ketentuan ${idx + 1}`}
                              value={url}
                              onChange={(e) => {
                                const newUrls = [...tncUrls];
                                newUrls[idx] = e.target.value;
                                setEventData({
                                  ...eventData,
                                  content: { ...(eventData?.content || {}), tncUrls: newUrls, tncUrl: newUrls[0] || '' }
                                });
                              }}
                            />
                            <button
                              className="btn ghost !text-red-500 !px-2"
                              onClick={() => {
                                const newUrls = tncUrls.filter((_: any, i: number) => i !== idx);
                                setEventData({
                                  ...eventData,
                                  content: { ...(eventData?.content || {}), tncUrls: newUrls, tncUrl: newUrls[0] || '' }
                                });
                              }}
                            >
                              ✕
                            </button>
                          </div>
                        ))}
                        {tncUrls.length < 5 && (
                          <button
                            className="text-xs text-blue-600 font-bold hover:underline mb-2 block"
                            onClick={() => {
                              const newUrls = [...tncUrls, ''];
                              setEventData({
                                ...eventData,
                                content: { ...(eventData?.content || {}), tncUrls: newUrls }
                              });
                            }}
                          >
                            + Tambah Link T&C Manual
                          </button>
                        )}
                        {tncUrls.length < 5 && (
                          <div className="flex gap-2 mt-2">
                            <input
                              id="tnc-doc-upload"
                              type="file"
                              accept=".pdf"
                              onChange={(e) => setTncDocFile(e.target.files?.[0] || null)}
                              className="flex-1 text-sm block w-full text-gray-500 file:mr-2 file:py-1 file:px-2 file:rounded file:border-0 file:text-xs file:font-medium file:bg-gray-200 file:text-gray-700 hover:file:bg-gray-300"
                            />
                            <button
                              className="btn w-full sm:w-auto text-xs"
                              onClick={() => handleMediaUpload('tnc_doc')}
                              disabled={!tncDocFile || uploadingTncDoc}
                            >
                              {uploadingTncDoc ? 'Uploading...' : 'Upload Dokumen'}
                            </button>
                          </div>
                        )}
                      </div>
                    );
                  })()}
                  <div className="text-xs text-gray-500 mt-2">
                    Peserta harus menyetujui dokumen ini sebelum melakukan pembayaran.
                  </div>
                </div>
              </div>
            </div>

            <div className="admin-cutoff border-t border-gray-100 pt-6">
              <div className="label">Background Image/Video RPC</div>
              <div className="tools">
                <div className="mb-4">
                  <div className="text-sm font-bold text-gray-700 mb-1">Background Landscape (Desktop/Tablet)</div>
                  <input
                    type="text"
                    className="search w-full mb-2"
                    placeholder="https://example.com/image-landscape.jpg atau MP4"
                    value={eventData?.content?.rpcBgUrl || ''}
                    onChange={(e) => setEventData({
                      ...eventData,
                      content: { ...(eventData?.content || {}), rpcBgUrl: e.target.value }
                    })}
                  />
                  <div className="flex gap-2">
                    <input
                      id="rpc-bg-upload"
                      type="file"
                      accept="image/*,video/mp4"
                      onChange={(e) => setRpcBgFile(e.target.files?.[0] || null)}
                      className="flex-1 text-sm block w-full text-gray-500 file:mr-2 file:py-1 file:px-2 file:rounded file:border-0 file:text-xs file:font-medium file:bg-gray-200 file:text-gray-700 hover:file:bg-gray-300"
                    />
                    <button
                      className="btn"
                      onClick={() => handleMediaUpload('rpc_bg')}
                      disabled={!rpcBgFile || uploadingRpcBg}
                    >
                      {uploadingRpcBg ? 'Uploading...' : 'Upload Landscape'}
                    </button>
                  </div>
                </div>

                <div className="mb-2">
                  <div className="text-sm font-bold text-gray-700 mb-1">Background Portrait (Mobile HP)</div>
                  <input
                    type="text"
                    className="search w-full mb-2"
                    placeholder="https://example.com/image-portrait.jpg atau MP4"
                    value={eventData?.content?.rpcBgUrlMobile || ''}
                    onChange={(e) => setEventData({
                      ...eventData,
                      content: { ...(eventData?.content || {}), rpcBgUrlMobile: e.target.value }
                    })}
                  />
                  <div className="flex gap-2">
                    <input
                      id="rpc-bg-mobile-upload"
                      type="file"
                      accept="image/*,video/mp4"
                      onChange={(e) => setRpcBgMobileFile(e.target.files?.[0] || null)}
                      className="flex-1 text-sm block w-full text-gray-500 file:mr-2 file:py-1 file:px-2 file:rounded file:border-0 file:text-xs file:font-medium file:bg-gray-200 file:text-gray-700 hover:file:bg-gray-300"
                    />
                    <button
                      className="btn"
                      onClick={() => handleMediaUpload('rpc_bg_mobile')}
                      disabled={!rpcBgMobileFile || uploadingRpcBgMobile}
                    >
                      {uploadingRpcBgMobile ? 'Uploading...' : 'Upload Portrait'}
                    </button>
                  </div>
                </div>

                <div className="text-xs text-gray-500 mt-2">
                  Paste URL atau Upload file untuk background halaman validasi RPC. Sangat disarankan mengupload 2 gambar (landscape & portrait) agar tidak kepotong di HP.
                </div>
              </div>
            </div>

            <div className="admin-cutoff border-t border-gray-100 pt-6">
              <div className="label">Fitur Scan Validasi Peserta</div>
              <div className="tools">
                <label className="flex items-center gap-3 cursor-pointer">
                  <div className="relative">
                    <input
                      type="checkbox"
                      className="sr-only"
                      checked={eventData?.content?.enableRegisteredScan !== false}
                      onChange={(e) => setEventData({
                        ...eventData,
                        content: { ...(eventData?.content || {}), enableRegisteredScan: e.target.checked }
                      })}
                    />
                    <div className={`block w-14 h-8 rounded-full transition-colors ${eventData?.content?.enableRegisteredScan !== false ? 'bg-green-500' : 'bg-gray-300'}`}></div>
                    <div className={`absolute left-1 top-1 bg-white w-6 h-6 rounded-full transition-transform ${eventData?.content?.enableRegisteredScan !== false ? 'transform translate-x-6' : ''}`}></div>
                  </div>
                  <span className="text-sm font-medium text-gray-700">Tampilkan tombol Scan Peserta di tab Registered</span>
                </label>
              </div>
            </div>

            <div className="mt-12 pt-12 border-t border-red-100">
              <div className="flex items-center justify-between">
                <div>
                  <h3 className="text-red-600 font-bold">Danger Zone</h3>
                  <div className="text-sm text-gray-500">Hapus event secara permanen. Tindakan ini tidak dapat dibatalkan.</div>
                </div>
                <button
                  className="btn"
                  style={{ backgroundColor: '#fee2e2', color: '#dc2626', border: 'none' }}
                  onClick={async () => {
                    if (confirm(`Hapus event "${eventName}"? Semua data akan hilang permanen.`)) {
                      try {
                        const res = await fetch(`/api/events?eventId=${eventId}`, { method: 'DELETE' });
                        if (res.ok) {
                          alert('Event deleted');
                          onBack();
                        }
                      } catch {
                        alert('Failed to delete');
                      }
                    }
                  }}
                >
                  Delete Event
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      <style>{`
        .event-detail-page {
          padding: 0;
        }

        .detail-tab {
          padding: 0.5rem 1rem;
          background: none;
          border: none;
          font-size: 0.875rem;
          font-weight: 500;
          color: #6b7280;
          cursor: pointer;
          position: relative;
          transition: color 0.2s;
        }

        .detail-tab:hover {
          color: #111827;
        }

        .detail-tab.active {
          color: #dc2626;
        }

        .detail-tab.active::after {
          content: '';
          position: absolute;
          bottom: -2px;
          left: 0;
          right: 0;
          height: 2px;
          background: #dc2626;
        }
      `}</style>
    </div>
  );
}
