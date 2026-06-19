import { useState } from "react";
import { uploadBannerViaApi } from "../../../lib/storage";

interface BannersPageProps {
  banners: any[];
  eventId?: string;
  onBannersChange: (banners: any[]) => void;
}

export default function BannersPage({ banners, eventId, onBannersChange }: BannersPageProps) {
  const [bannerFile, setBannerFile] = useState<File | null>(null);
  const [bannerAlt, setBannerAlt] = useState('');
  const [bannerOrder, setBannerOrder] = useState(0);
  const [uploadingBanner, setUploadingBanner] = useState(false);

  const refreshBanners = async () => {
    if (!eventId) return;
    try {
      const response = await fetch(`/api/banners?eventId=${eventId}`);
      if (response.ok) {
        const data = await response.json();
        onBannersChange(data);
      }
    } catch (error) {
      console.error('Failed to refresh banners:', error);
    }
  };

  const handleBannerUpload = async () => {
    if (!bannerFile) {
      alert('Please select an image file');
      return;
    }
    if (!eventId) {
      alert('Event ID is required');
      return;
    }

    setUploadingBanner(true);

    try {
      await uploadBannerViaApi(eventId, bannerFile);

      setBannerFile(null);
      setBannerAlt('');
      setBannerOrder(0);
      const fileInput = document.getElementById('banner-upload') as HTMLInputElement;
      if (fileInput) fileInput.value = '';

      await refreshBanners();

      alert('Banner uploaded successfully!');
    } catch (error: any) {
      alert(error.message || 'Failed to upload banner');
    } finally {
      setUploadingBanner(false);
    }
  };

  const toggleBannerActive = async (bannerId: string) => {
    try {
      const banner = banners.find((b: any) => b.id === bannerId);
      if (!banner) return;

      const response = await fetch('/api/update-banner', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          bannerId,
          isActive: !banner.isActive,
        }),
      });

      if (response.ok) {
        await refreshBanners();
      }
    } catch (error) {
      console.error('Failed to toggle banner:', error);
    }
  };

  const deleteBanner = async (bannerId: string, imageUrl: string) => {
    if (!confirm('Are you sure you want to delete this banner?')) return;

    try {
      const response = await fetch(`/api/delete-banner?bannerId=${bannerId}&imageUrl=${encodeURIComponent(imageUrl)}`, {
        method: 'DELETE',
      });

      if (response.ok) {
        await refreshBanners();
        alert('Banner deleted successfully!');
      }
    } catch (error) {
      alert('Failed to delete banner');
    }
  };

  if (!eventId) {
    return (
      <div className="card">
        <div className="header-row">
          <div>
            <h2 className="section-title">Banner Images</h2>
            <div className="subtle">Please select an event first to manage banners.</div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <>
      {/* Banner Images */}
      <div className="card">
        <div className="header-row mb-4">
          <div>
            <h2 className="section-title">Banner Images</h2>
            <div className="subtle text-sm">
              Upload banner images untuk event ini. Supported formats: JPG, PNG, GIF
            </div>
          </div>
        </div>

        {/* Desktop Table - hidden on mobile */}
        <div className="hidden md:block table-wrap">
          <table className="f1-table compact">
            <thead>
              <tr>
                <th style={{ width: 120 }}>Preview</th>
                <th>Image URL / Alt Text</th>
                <th style={{ width: 80 }}>Order</th>
                <th style={{ width: 100 }}>Status</th>
                <th style={{ width: 150 }}>Actions</th>
              </tr>
            </thead>
            <tbody>
              {banners.length === 0 ? (
                <tr>
                  <td colSpan={5} className="empty">No banners uploaded yet</td>
                </tr>
              ) : (
                banners
                  .sort((a: any, b: any) => a.order - b.order)
                  .map((banner: any) => (
                    <tr key={banner.id} className="row-hover">
                      <td>
                        <img
                          src={banner.imageUrl}
                          alt={banner.alt || "Banner preview"}
                          style={{ width: "100px", height: "60px", objectFit: "cover", borderRadius: "4px" }}
                        />
                      </td>
                      <td>
                        <div className="mono" style={{ fontSize: "11px", marginBottom: "4px" }}>
                          {banner.imageUrl.slice(0, 50)}...
                        </div>
                        <div className="subtle">{banner.alt || "-"}</div>
                      </td>
                      <td className="mono">{banner.order}</td>
                      <td>
                        <span style={{
                          padding: '4px 8px',
                          borderRadius: '999px',
                          fontSize: '12px',
                          fontWeight: 700,
                          background: banner.isActive ? '#dcfce7' : '#f3f4f6',
                          color: banner.isActive ? '#166534' : '#6b7280',
                        }}>
                          {banner.isActive ? "Active" : "Inactive"}
                        </span>
                      </td>
                      <td>
                        <div style={{ display: "flex", gap: "0.5rem" }}>
                          <button
                            className="btn ghost"
                            onClick={() => toggleBannerActive(banner.id)}
                          >
                            {banner.isActive ? "Hide" : "Show"}
                          </button>
                          <button
                            className="btn ghost"
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
            banners
              .sort((a: any, b: any) => a.order - b.order)
              .map((banner: any) => (
                <div key={banner.id} className="bg-white border border-gray-200 rounded-lg overflow-hidden shadow-sm">
                  {/* Banner Image Preview */}
                  <img
                    src={banner.imageUrl}
                    alt={banner.alt || "Banner preview"}
                    className="w-full h-32 object-cover"
                  />
                  
                  <div className="p-3">
                    <div className="flex justify-between items-start mb-2">
                      <div className="flex-1 min-w-0">
                        <p className="text-sm text-gray-600 truncate">{banner.alt || "No description"}</p>
                        <p className="text-xs text-gray-400 mono">Order: {banner.order}</p>
                      </div>
                      <span
                        className="px-2 py-1 rounded-full text-xs font-bold ml-2"
                        style={{
                          background: banner.isActive ? '#dcfce7' : '#f3f4f6',
                          color: banner.isActive ? '#166534' : '#6b7280',
                        }}
                      >
                        {banner.isActive ? "Active" : "Inactive"}
                      </span>
                    </div>
                    
                    <div className="flex gap-2">
                      <button
                        className="btn ghost flex-1 text-sm"
                        onClick={() => toggleBannerActive(banner.id)}
                      >
                        {banner.isActive ? "Hide" : "Show"}
                      </button>
                      <button
                        className="btn ghost flex-1 text-sm"
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

        {/* Upload Form */}
        <div className="mt-4 pt-4 border-t border-gray-200">
          <div className="subtle mb-3 font-medium">Upload New Banner</div>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            <div className="md:col-span-2">
              <label className="block">
                <span className="sr-only">Choose banner image</span>
                <input
                  id="banner-upload"
                  type="file"
                  accept="image/*"
                  onChange={(e) => setBannerFile(e.target.files?.[0] || null)}
                  className="block w-full text-sm text-gray-500
                    file:mr-4 file:py-2 file:px-4
                    file:rounded-lg file:border-0
                    file:text-sm file:font-medium
                    file:bg-gray-100 file:text-gray-700
                    hover:file:bg-gray-200
                    cursor-pointer"
                />
              </label>
            </div>
            <div>
              <input
                className="search w-full"
                placeholder="Alt text (optional)"
                value={bannerAlt}
                onChange={(e) => setBannerAlt(e.target.value)}
              />
            </div>
            <div className="flex gap-3">
              <input
                type="number"
                className="search w-24"
                placeholder="Order"
                value={bannerOrder}
                onChange={(e) => setBannerOrder(Number(e.target.value))}
              />
              <button
                className="btn flex-1"
                onClick={handleBannerUpload}
                disabled={!bannerFile || uploadingBanner}
              >
                {uploadingBanner ? "Uploading..." : "Upload"}
              </button>
            </div>
          </div>
        </div>
      </div>
    </>
  );
}
