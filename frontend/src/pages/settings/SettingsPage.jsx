import { useState, useEffect, useCallback, useRef } from 'react';
import useApi from '../../hooks/useApi';
import { useAuth } from '../../context/AuthContext';
import api from '../../api/axios';
import toast from 'react-hot-toast';
import {
  HiOutlineCamera, HiOutlineAcademicCap, HiOutlineColorSwatch,
  HiOutlineCheck, HiOutlineRefresh, HiOutlineEye,
  HiOutlineChartBar, HiOutlineUserGroup, HiOutlineBookOpen,
  HiOutlineUsers, HiOutlineClock, HiOutlineShieldCheck,
} from 'react-icons/hi';
import {
  THEME_PRESETS, DEFAULT_PRIMARY, DEFAULT_ACCENT, DEFAULT_FONT, DEFAULT_FONT_STYLE,
  AVAILABLE_FONTS, FONT_STYLE_OPTIONS, parseFontStyle, serializeFontStyle,
  applyTheme, applyFont, applyFontStyle, saveAndApplyTheme,
  generatePalette, hexToRgbString,
} from '../../utils/themeUtils';

const API_BASE = import.meta.env.VITE_API_BASE_URL || (import.meta.env.DEV ? 'http://localhost:5000' : '');

/* ─── Small colour swatch ─── */
const Swatch = ({ color, size = 'w-6 h-6', className = '' }) => (
  <span className={`${size} rounded-full border border-gray-200 shadow-inner inline-block flex-shrink-0 ${className}`} style={{ backgroundColor: color }} />
);

/* ─── Palette preview strip ─── */
const PaletteStrip = ({ baseHex, label }) => {
  const palette = generatePalette(baseHex);
  return (
    <div>
      <p className="text-xs text-gray-400 mb-1 font-medium">{label}</p>
      <div className="flex rounded-lg overflow-hidden h-8 shadow-inner">
        {[50, 100, 200, 300, 400, 500, 600, 700, 800, 900].map((shade) => (
          <div
            key={shade}
            className="flex-1 relative group cursor-default"
            style={{ backgroundColor: palette[shade] }}
            title={`${shade}: ${palette[shade]}`}
          >
            <span className="absolute inset-0 flex items-center justify-center text-[8px] font-bold opacity-0 group-hover:opacity-100 transition-opacity"
              style={{ color: shade >= 500 ? '#fff' : '#333' }}>
              {shade}
            </span>
          </div>
        ))}
      </div>
    </div>
  );
};

const SettingsPage = () => {
  const { get, put, loading } = useApi();
  const { user, updateUser, isPremium } = useAuth();
  const [school, setSchool] = useState(null);
  const [form, setForm] = useState({ name: '', email: '', phone: '', address: '', district: '', region: '', motto: '' });
  const [uploading, setUploading] = useState(false);
  const fileInputRef = useRef(null);

  /* ─── Plan usage state ─── */
  const [planUsage, setPlanUsage] = useState(null);

  /* ─── Theme state ─── */
  const [primaryColor, setPrimaryColor] = useState(DEFAULT_PRIMARY);
  const [accentColor, setAccentColor] = useState(DEFAULT_ACCENT);
  const [fontFamily, setFontFamily] = useState(DEFAULT_FONT);
  const [fontStyleStr, setFontStyleStr] = useState(DEFAULT_FONT_STYLE);
  const [savedPrimary, setSavedPrimary] = useState(DEFAULT_PRIMARY);
  const [savedAccent, setSavedAccent] = useState(DEFAULT_ACCENT);
  const [savedFont, setSavedFont] = useState(DEFAULT_FONT);
  const [savedFontStyle, setSavedFontStyle] = useState(DEFAULT_FONT_STYLE);
  const [savingTheme, setSavingTheme] = useState(false);

  const themeChanged = primaryColor !== savedPrimary || accentColor !== savedAccent || fontFamily !== savedFont || fontStyleStr !== savedFontStyle;

  /* ─── Fetch school data ─── */
  const fetchSchool = useCallback(async () => {
    try {
      const res = await get('/schools/me', null, { silent: true });
      const s = res.data;
      setSchool(s);
      setForm({
        name: s.name || '', email: s.email || '', phone: s.phone || '',
        address: s.address || '', district: s.district || '', region: s.region || '', motto: s.motto || '',
      });
      // Load existing branding
      const pc = s.primary_color || DEFAULT_PRIMARY;
      const ac = s.secondary_color || DEFAULT_ACCENT;
      const ff = s.font_family || DEFAULT_FONT;
      const fs = s.font_style || DEFAULT_FONT_STYLE;
      setPrimaryColor(pc);
      setAccentColor(ac);
      setFontFamily(ff);
      setFontStyleStr(fs);
      setSavedPrimary(pc);
      setSavedAccent(ac);
      setSavedFont(ff);
      setSavedFontStyle(fs);
    } catch { /* handled */ }
  }, [get]);

  /* ─── Fetch plan usage ─── */
  const fetchPlanUsage = useCallback(async () => {
    try {
      const res = await get('/schools/me/plan-usage', null, { silent: true });
      setPlanUsage(res.data);
    } catch { /* handled */ }
  }, [get]);

  useEffect(() => { fetchSchool(); fetchPlanUsage(); }, [fetchSchool, fetchPlanUsage]);

  /* ─── School info submit ─── */
  const handleSubmit = async (e) => {
    e.preventDefault();
    try {
      await put('/schools/me', form);
      toast.success('School settings updated');
      updateUser({ school_name: form.name });
    } catch { /* handled */ }
  };

  /* ─── Badge upload ─── */
  const handleBadgeUpload = async (e) => {
    const file = e.target.files?.[0];
    if (!file) return;
    if (file.size > 5 * 1024 * 1024) return toast.error('Image must be under 5 MB');

    const formData = new FormData();
    formData.append('badge', file);
    setUploading(true);
    try {
      const { data } = await api.put('/schools/me/badge', formData, {
        headers: { 'Content-Type': 'multipart/form-data' },
      });
      const badgeUrl = data.data.badge_url;
      setSchool((prev) => ({ ...prev, badge_url: badgeUrl }));
      updateUser({ school_badge_url: badgeUrl });
      toast.success('School badge updated!');
    } catch (err) {
      toast.error(err.response?.data?.message || 'Badge upload failed');
    } finally {
      setUploading(false);
      if (fileInputRef.current) fileInputRef.current.value = '';
    }
  };

  /* ─── Live preview (apply instantly while picking) ─── */
  const handlePrimaryChange = (hex) => {
    setPrimaryColor(hex);
    applyTheme(hex, null);
  };

  const handleAccentChange = (hex) => {
    setAccentColor(hex);
    applyTheme(null, hex);
  };

  /* ─── Font change (live preview) ─── */
  const handleFontChange = (newFont) => {
    setFontFamily(newFont);
    applyFont(newFont);
  };

  /* ─── Font style toggle (live preview) ─── */
  const handleFontStyleToggle = (styleKey) => {
    const currentStyles = parseFontStyle(fontStyleStr);
    let newStyles;
    if (currentStyles.includes(styleKey)) {
      newStyles = currentStyles.filter(s => s !== styleKey);
    } else {
      newStyles = [...currentStyles, styleKey];
    }
    const newStyleStr = serializeFontStyle(newStyles);
    setFontStyleStr(newStyleStr);
    applyFontStyle(newStyleStr);
  };

  /* ─── Apply preset ─── */
  const handlePreset = (preset) => {
    setPrimaryColor(preset.primary);
    setAccentColor(preset.accent);
    applyTheme(preset.primary, preset.accent, null);
  };

  /* ─── Save theme ─── */
  const handleSaveTheme = async () => {
    setSavingTheme(true);
    try {
      await put('/schools/me/branding', {
        primary_color: primaryColor,
        secondary_color: accentColor,
        font_family: fontFamily,
        font_style: fontStyleStr,
      });
      saveAndApplyTheme(primaryColor, accentColor, fontFamily, fontStyleStr);
      setSavedPrimary(primaryColor);
      setSavedAccent(accentColor);
      setSavedFont(fontFamily);
      setSavedFontStyle(fontStyleStr);
      updateUser({ primary_color: primaryColor, secondary_color: accentColor, font_family: fontFamily, font_style: fontStyleStr });
      toast.success('Theme saved! All users will see the new look.');
    } catch (err) {
      toast.error(err.response?.data?.message || 'Failed to save theme');
    }
    setSavingTheme(false);
  };

  /* ─── Reset theme to default ─── */
  const handleResetTheme = () => {
    setPrimaryColor(DEFAULT_PRIMARY);
    setAccentColor(DEFAULT_ACCENT);
    setFontFamily(DEFAULT_FONT);
    setFontStyleStr(DEFAULT_FONT_STYLE);
    applyTheme(DEFAULT_PRIMARY, DEFAULT_ACCENT, DEFAULT_FONT, DEFAULT_FONT_STYLE);
  };

  /* ─── Cancel changes ─── */
  const handleCancelTheme = () => {
    setPrimaryColor(savedPrimary);
    setAccentColor(savedAccent);
    setFontFamily(savedFont);
    setFontStyleStr(savedFontStyle);
    applyTheme(savedPrimary, savedAccent, savedFont, savedFontStyle);
  };

  if (!school) {
    return (
      <div className="flex justify-center py-12">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary-500" />
      </div>
    );
  }

  return (
    <div className="max-w-3xl mx-auto space-y-6">
      <h1 className="text-2xl font-bold text-gray-900">School Settings</h1>

      {/* ─── Subscription & Plan Usage ─── */}
      <div className="card space-y-5">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-primary-100 flex items-center justify-center">
            <HiOutlineShieldCheck className="w-5 h-5 text-primary-600" />
          </div>
          <div>
            <h3 className="font-semibold text-gray-800">Subscription & Plan</h3>
            <p className="text-xs text-gray-400">Your current plan limits and usage</p>
          </div>
        </div>

        {/* Plan header */}
        <div className="flex flex-wrap items-center gap-4 bg-primary-50 rounded-xl p-4">
          <div className="flex-1 min-w-0">
            <p className="text-xs text-gray-500">Current Plan</p>
            <p className="text-xl font-bold text-primary-700 capitalize">{planUsage?.plan_type || school.plan_type}</p>
          </div>
          <div>
            <p className="text-xs text-gray-500">Status</p>
            <span className={`px-3 py-1 rounded-full text-sm font-bold capitalize ${
              (planUsage?.subscription_status || school.subscription_status) === 'active' ? 'bg-emerald-100 text-emerald-700' :
              (planUsage?.subscription_status || school.subscription_status) === 'trial' ? 'bg-blue-100 text-blue-700' :
              'bg-red-100 text-red-700'
            }`}>{planUsage?.subscription_status || school.subscription_status}</span>
          </div>
          {(() => {
            const status = planUsage?.subscription_status || school.subscription_status;
            const endDate = status === 'trial' ? (planUsage?.trial_ends_at || school.trial_ends_at) : (planUsage?.subscription_expires_at || school.subscription_expires_at);
            if (!endDate) return null;
            const daysLeft = Math.max(0, Math.ceil((new Date(endDate) - new Date()) / 86400000));
            return (
              <div className="text-right">
                <p className="text-xs text-gray-500 flex items-center gap-1"><HiOutlineClock className="w-3.5 h-3.5" /> {status === 'trial' ? 'Trial ends' : 'Expires'}</p>
                <p className={`text-sm font-bold ${daysLeft <= 7 ? 'text-red-600' : 'text-gray-700'}`}>
                  {daysLeft} day{daysLeft !== 1 ? 's' : ''} left
                </p>
                <p className="text-[10px] text-gray-400">{new Date(endDate).toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' })}</p>
              </div>
            );
          })()}
        </div>

        {/* Usage meters */}
        {planUsage && (
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            {[
              { key: 'pupils',   label: 'Pupils',   icon: HiOutlineUserGroup, limit: planUsage.limits.max_pupils,   used: planUsage.usage.pupils },
              { key: 'teachers', label: 'Teachers',  icon: HiOutlineAcademicCap, limit: planUsage.limits.max_teachers, used: planUsage.usage.teachers },
              { key: 'classes',  label: 'Classes',   icon: HiOutlineBookOpen, limit: planUsage.limits.max_classes,  used: planUsage.usage.classes },
              { key: 'parents',  label: 'Parents',   icon: HiOutlineUsers, limit: planUsage.limits.max_parents,  used: planUsage.usage.parents },
            ].map(({ key, label, icon: Icon, limit, used }) => {
              const isUnlimited = limit === -1;
              const pct = isUnlimited ? 0 : Math.min(100, Math.round((used / limit) * 100));
              const isNearLimit = !isUnlimited && pct >= 80;
              const isAtLimit = !isUnlimited && used >= limit;
              return (
                <div key={key} className="bg-gray-50 rounded-xl p-3 space-y-2">
                  <div className="flex items-center gap-2 text-xs text-gray-500">
                    <Icon className="w-4 h-4" />
                    {label}
                  </div>
                  <div className="flex items-baseline gap-1">
                    <span className={`text-lg font-bold ${isAtLimit ? 'text-red-600' : 'text-gray-800'}`}>{used}</span>
                    <span className="text-xs text-gray-400">/ {isUnlimited ? '∞' : limit}</span>
                  </div>
                  {!isUnlimited && (
                    <div className="h-1.5 bg-gray-200 rounded-full overflow-hidden">
                      <div
                        className={`h-full rounded-full transition-all ${
                          isAtLimit ? 'bg-red-500' : isNearLimit ? 'bg-amber-500' : 'bg-primary-500'
                        }`}
                        style={{ width: `${pct}%` }}
                      />
                    </div>
                  )}
                  {isUnlimited && (
                    <p className="text-[10px] text-emerald-600 font-medium">Unlimited</p>
                  )}
                  {isAtLimit && (
                    <p className="text-[10px] text-red-600 font-medium">Limit reached — upgrade plan</p>
                  )}
                </div>
              );
            })}
          </div>
        )}

        {/* Feature flags */}
        {planUsage?.limits && (
          <div className="grid grid-cols-2 md:grid-cols-3 gap-2">
            {[
              { label: 'PDF Export', enabled: planUsage.limits.pdf_export },
              { label: 'Excel Export', enabled: planUsage.limits.excel_export },
              { label: 'Theme Customization', enabled: planUsage.limits.theme_customization },
              { label: 'Custom Report Branding', enabled: planUsage.limits.custom_report_branding },
              { label: 'SMS Notifications', enabled: planUsage.limits.sms_notifications },
              { label: 'API Access', enabled: planUsage.limits.api_access },
            ].map(({ label, enabled }) => (
              <div key={label} className={`flex items-center gap-2 text-xs rounded-lg px-3 py-2 ${enabled ? 'bg-emerald-50 text-emerald-700' : 'bg-gray-100 text-gray-400'}`}>
                {enabled ? <HiOutlineCheck className="w-3.5 h-3.5" /> : <span className="w-3.5 h-3.5 inline-flex items-center justify-center text-[10px]">✕</span>}
                {label}
              </div>
            ))}
          </div>
        )}
      </div>

      {/* ─── School Badge Upload ─── */}
      <div className="card">
        <h3 className="font-semibold text-gray-800 mb-4">School Badge / Logo</h3>
        <div className="flex items-center gap-5">
          <div className="relative group">
            {school.badge_url ? (
              <img
                src={`${API_BASE}${school.badge_url}`}
                alt="School Badge"
                className="w-24 h-24 rounded-xl object-cover border-2 border-gray-200 bg-white"
              />
            ) : (
              <div className="w-24 h-24 bg-accent-100 rounded-xl flex items-center justify-center border-2 border-dashed border-gray-300">
                <HiOutlineAcademicCap className="w-10 h-10 text-accent-400" />
              </div>
            )}
            <button
              type="button"
              onClick={() => fileInputRef.current?.click()}
              disabled={uploading}
              className="absolute inset-0 bg-black/40 rounded-xl flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity cursor-pointer"
            >
              {uploading ? (
                <div className="w-6 h-6 border-2 border-white/30 border-t-white rounded-full animate-spin" />
              ) : (
                <HiOutlineCamera className="w-6 h-6 text-white" />
              )}
            </button>
          </div>
          <div>
            <p className="text-sm text-gray-600">Upload your school badge or crest.</p>
            <p className="text-xs text-gray-400 mt-1">Recommended: Square image, 512×512 px. Max 5 MB.</p>
            <button
              type="button"
              onClick={() => fileInputRef.current?.click()}
              disabled={uploading}
              className="text-sm text-primary-500 hover:text-primary-600 font-medium mt-2"
            >
              {uploading ? 'Uploading...' : school.badge_url ? 'Change Badge' : 'Upload Badge'}
            </button>
          </div>
          <input ref={fileInputRef} type="file" accept="image/*" onChange={handleBadgeUpload} className="hidden" />
        </div>
      </div>

      {/* ═══════════════════════════════════════════
       *  THEME & APPEARANCE
       * ═══════════════════════════════════════════ */}
      <div className="card space-y-6 relative">
        {!isPremium && (
          <div className="absolute inset-0 z-10 bg-white/80 backdrop-blur-[2px] rounded-2xl flex flex-col items-center justify-center text-center p-6">
            <div className="w-14 h-14 rounded-full bg-amber-100 flex items-center justify-center mb-3">
              <HiOutlineColorSwatch className="w-7 h-7 text-amber-600" />
            </div>
            <h3 className="text-lg font-bold text-gray-800 mb-1">Theme Customization</h3>
            <p className="text-sm text-gray-500 max-w-xs mb-4">Upgrade to the Standard or Pro plan to customize your school's colors, fonts, and appearance.</p>
            <a href="/subscribe" className="btn-primary text-sm !py-2 !px-6">Upgrade Plan</a>
          </div>
        )}
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-primary-500 to-accent-400 flex items-center justify-center">
              <HiOutlineColorSwatch className="w-5 h-5 text-white" />
            </div>
            <div>
              <h3 className="font-semibold text-gray-800">Theme & Appearance</h3>
              <p className="text-xs text-gray-400">Customize colors &amp; fonts for your school's look</p>
            </div>
          </div>
          {themeChanged && (
            <span className="text-xs bg-amber-100 text-amber-700 px-2 py-1 rounded-full font-medium animate-pulse">
              Unsaved changes
            </span>
          )}
        </div>

        {/* Colour pickers side by side */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
          {/* Primary Colour */}
          <div className="space-y-3">
            <label className="label flex items-center gap-2">
              <Swatch color={primaryColor} size="w-5 h-5" />
              Primary Colour
            </label>
            <div className="flex items-center gap-3">
              <input
                type="color"
                value={primaryColor}
                onChange={(e) => handlePrimaryChange(e.target.value)}
                className="w-12 h-12 rounded-lg border-2 border-gray-200 cursor-pointer hover:border-primary-400 transition-colors"
                style={{ padding: '2px' }}
              />
              <input
                type="text"
                value={primaryColor}
                onChange={(e) => {
                  const v = e.target.value;
                  if (/^#[0-9a-fA-F]{6}$/.test(v)) handlePrimaryChange(v);
                  else setPrimaryColor(v);
                }}
                onBlur={() => {
                  if (!/^#[0-9a-fA-F]{6}$/.test(primaryColor)) setPrimaryColor(savedPrimary);
                }}
                className="input-field !w-32 font-mono text-xs"
                placeholder="#1e3a5f"
                maxLength={7}
              />
            </div>
            <p className="text-xs text-gray-400">Sidebar, buttons, headers</p>
          </div>

          {/* Accent / Secondary Colour */}
          <div className="space-y-3">
            <label className="label flex items-center gap-2">
              <Swatch color={accentColor} size="w-5 h-5" />
              Accent Colour
            </label>
            <div className="flex items-center gap-3">
              <input
                type="color"
                value={accentColor}
                onChange={(e) => handleAccentChange(e.target.value)}
                className="w-12 h-12 rounded-lg border-2 border-gray-200 cursor-pointer hover:border-accent-400 transition-colors"
                style={{ padding: '2px' }}
              />
              <input
                type="text"
                value={accentColor}
                onChange={(e) => {
                  const v = e.target.value;
                  if (/^#[0-9a-fA-F]{6}$/.test(v)) handleAccentChange(v);
                  else setAccentColor(v);
                }}
                onBlur={() => {
                  if (!/^#[0-9a-fA-F]{6}$/.test(accentColor)) setAccentColor(savedAccent);
                }}
                className="input-field !w-32 font-mono text-xs"
                placeholder="#f0ad4e"
                maxLength={7}
              />
            </div>
            <p className="text-xs text-gray-400">Highlights, badges, accents</p>
          </div>
        </div>

        {/* ─── Font Family Picker ─── */}
        <div className="space-y-4">
          <label className="label">Font Family</label>
          <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
            {AVAILABLE_FONTS.map((font) => {
              const isActive = fontFamily === font.value;
              return (
                <button
                  key={font.value}
                  type="button"
                  onClick={() => handleFontChange(font.value)}
                  className={`relative text-left p-3 rounded-xl border-2 transition-all hover:shadow-md ${
                    isActive
                      ? 'border-primary-500 bg-primary-50 ring-2 ring-primary-200'
                      : 'border-gray-200 hover:border-gray-300 bg-white'
                  }`}
                >
                  <p className="font-semibold text-sm text-gray-800" style={{ fontFamily: `'${font.value}', sans-serif` }}>
                    {font.name}
                  </p>
                  <p className="text-[10px] text-gray-400 mt-0.5">{font.description}</p>
                  <p className="text-xs text-gray-600 mt-1" style={{ fontFamily: `'${font.value}', sans-serif` }}>
                    Aa Bb Cc 123
                  </p>
                  {isActive && (
                    <HiOutlineCheck className="w-4 h-4 text-primary-500 absolute top-2 right-2" />
                  )}
                </button>
              );
            })}
          </div>
          <p className="text-xs text-gray-400">The font will be applied across the entire application for your school.</p>
        </div>

        {/* ─── Heading Text Style ─── */}
        <div className="space-y-4">
          <label className="label">Heading Text Style</label>
          <p className="text-xs text-gray-400 -mt-2">Apply Bold, Italic, or Uppercase styles to headings and titles.</p>
          <div className="flex flex-wrap gap-3">
            {FONT_STYLE_OPTIONS.map(({ key, label, icon, description }) => {
              const active = parseFontStyle(fontStyleStr).includes(key);
              return (
                <button
                  key={key}
                  type="button"
                  onClick={() => handleFontStyleToggle(key)}
                  className={`flex items-center gap-3 px-5 py-3 rounded-xl border-2 transition-all hover:shadow-md ${
                    active
                      ? 'border-primary-500 bg-primary-50 ring-2 ring-primary-200'
                      : 'border-gray-200 hover:border-gray-300 bg-white'
                  }`}
                  title={description}
                >
                  <span
                    className={`text-lg leading-none ${
                      key === 'bold' ? 'font-black' : key === 'italic' ? 'italic font-serif' : 'text-sm tracking-widest font-semibold'
                    } ${active ? 'text-primary-600' : 'text-gray-500'}`}
                  >
                    {icon}
                  </span>
                  <div className="text-left">
                    <p className={`text-sm font-medium ${active ? 'text-primary-700' : 'text-gray-700'}`}>{label}</p>
                    <p className="text-[10px] text-gray-400">{description}</p>
                  </div>
                  {active && (
                    <HiOutlineCheck className="w-4 h-4 text-primary-500 ml-auto" />
                  )}
                </button>
              );
            })}
          </div>
        </div>

        {/* Palette preview */}
        <div className="space-y-3 bg-gray-50 rounded-xl p-4">
          <div className="flex items-center gap-2 text-xs font-medium text-gray-500">
            <HiOutlineEye className="w-4 h-4" />
            Live Palette Preview
          </div>
          <PaletteStrip baseHex={primaryColor} label="Primary" />
          <PaletteStrip baseHex={accentColor} label="Accent" />
        </div>

        {/* Preview Card */}
        <div className="rounded-xl border border-gray-200 overflow-hidden">
          <div className="text-xs font-medium text-gray-400 px-4 py-2 bg-gray-50 border-b border-gray-200 flex items-center gap-2">
            <HiOutlineEye className="w-3.5 h-3.5" />
            Live Preview — <span style={{ fontFamily: `'${fontFamily}', sans-serif` }}>{fontFamily}</span>
            {parseFontStyle(fontStyleStr).length > 0 && (
              <span className="text-[10px] bg-primary-100 text-primary-600 px-1.5 py-0.5 rounded-full ml-1">
                {parseFontStyle(fontStyleStr).join(' + ')}
              </span>
            )}
          </div>
          <div className="p-4 space-y-3" style={{ fontFamily: `'${fontFamily}', sans-serif` }}>
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-full bg-primary-500 flex items-center justify-center text-white font-bold text-sm">SM</div>
              <div>
                <p className="text-gray-800" style={{
                  fontWeight: parseFontStyle(fontStyleStr).includes('bold') ? '800' : '600',
                  fontStyle: parseFontStyle(fontStyleStr).includes('italic') ? 'italic' : 'normal',
                  textTransform: parseFontStyle(fontStyleStr).includes('uppercase') ? 'uppercase' : 'none',
                  fontSize: '1rem',
                }}>
                  {form.name || 'School Name'}
                </p>
                <p className="text-xs text-gray-400">Preview of your school's look &amp; font</p>
              </div>
            </div>
            <h3 className="text-lg text-gray-800" style={{
              fontWeight: parseFontStyle(fontStyleStr).includes('bold') ? '800' : '600',
              fontStyle: parseFontStyle(fontStyleStr).includes('italic') ? 'italic' : 'normal',
              textTransform: parseFontStyle(fontStyleStr).includes('uppercase') ? 'uppercase' : 'none',
            }}>
              Dashboard — Heading Preview
            </h3>
            <p className="text-sm text-gray-600">
              The quick brown fox jumps over the lazy dog. <strong>Bold text.</strong> <em>Italic text.</em> 0123456789
            </p>
            <div className="flex gap-2 flex-wrap">
              <button className="btn-primary text-xs !py-2 !px-4">Primary Button</button>
              <button className="btn-accent text-xs !py-2 !px-4">Accent Button</button>
              <button className="btn-secondary text-xs !py-2 !px-4">Secondary</button>
            </div>
            <div className="flex gap-2 flex-wrap">
              <span className="px-2 py-1 rounded bg-primary-50 text-primary-700 text-xs font-medium">Tag Primary</span>
              <span className="px-2 py-1 rounded bg-accent-50 text-accent-700 text-xs font-medium">Tag Accent</span>
              <span className="px-2 py-1 rounded bg-primary-100 text-primary-600 text-xs font-medium">Badge</span>
            </div>
            <div className="h-2 rounded-full bg-primary-100 overflow-hidden">
              <div className="h-full w-2/3 bg-primary-500 rounded-full" />
            </div>
          </div>
        </div>

        {/* Theme Presets */}
        <div>
          <p className="label mb-3">Quick Presets</p>
          <div className="grid grid-cols-2 sm:grid-cols-5 gap-2">
            {THEME_PRESETS.map((preset) => {
              const isActive = primaryColor === preset.primary && accentColor === preset.accent;
              return (
                <button
                  key={preset.name}
                  onClick={() => handlePreset(preset)}
                  className={`relative flex items-center gap-2 p-2.5 rounded-xl border-2 text-left transition-all hover:shadow-md ${
                    isActive
                      ? 'border-primary-500 bg-primary-50 ring-2 ring-primary-200'
                      : 'border-gray-200 hover:border-gray-300 bg-white'
                  }`}
                >
                  <div className="flex -space-x-1 flex-shrink-0">
                    <Swatch color={preset.primary} size="w-5 h-5" />
                    <Swatch color={preset.accent} size="w-5 h-5" />
                  </div>
                  <span className="text-xs font-medium text-gray-700 truncate">{preset.name}</span>
                  {isActive && (
                    <HiOutlineCheck className="w-4 h-4 text-primary-500 absolute top-1 right-1" />
                  )}
                </button>
              );
            })}
          </div>
        </div>

        {/* Action buttons */}
        <div className="flex items-center justify-between pt-2 border-t border-gray-100">
          <button
            onClick={handleResetTheme}
            className="flex items-center gap-2 text-sm text-gray-500 hover:text-gray-700 transition-colors"
          >
            <HiOutlineRefresh className="w-4 h-4" />
            Reset to Default
          </button>
          <div className="flex gap-2">
            {themeChanged && (
              <button onClick={handleCancelTheme} className="btn-secondary text-sm !py-2">
                Cancel
              </button>
            )}
            <button
              onClick={handleSaveTheme}
              disabled={!themeChanged || savingTheme}
              className="btn-primary text-sm !py-2 flex items-center gap-2"
            >
              {savingTheme ? (
                <><div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" /> Saving...</>
              ) : (
                <><HiOutlineCheck className="w-4 h-4" /> Save Theme</>
              )}
            </button>
          </div>
        </div>
      </div>

      {/* ─── School Information Form ─── */}
      <form onSubmit={handleSubmit} className="card space-y-4">
        <h3 className="font-semibold text-gray-800">School Information</h3>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div className="md:col-span-2">
            <label className="label">School Name</label>
            <input value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} className="input-field" />
          </div>
          <div>
            <label className="label">Email</label>
            <input type="email" value={form.email} onChange={(e) => setForm({ ...form, email: e.target.value })} className="input-field" />
          </div>
          <div>
            <label className="label">Phone</label>
            <input value={form.phone} onChange={(e) => setForm({ ...form, phone: e.target.value })} className="input-field" />
          </div>
          <div>
            <label className="label">District</label>
            <input value={form.district} onChange={(e) => setForm({ ...form, district: e.target.value })} className="input-field" />
          </div>
          <div>
            <label className="label">Region</label>
            <input value={form.region} onChange={(e) => setForm({ ...form, region: e.target.value })} className="input-field" />
          </div>
          <div className="md:col-span-2">
            <label className="label">Address</label>
            <input value={form.address} onChange={(e) => setForm({ ...form, address: e.target.value })} className="input-field" />
          </div>
          <div className="md:col-span-2">
            <label className="label">Motto</label>
            <input value={form.motto} onChange={(e) => setForm({ ...form, motto: e.target.value })} className="input-field" />
          </div>
        </div>
        <div className="flex justify-end gap-3 pt-2">
          <button type="submit" disabled={loading} className="btn-primary">
            {loading ? 'Saving...' : 'Save Changes'}
          </button>
        </div>
      </form>
    </div>
  );
};

export default SettingsPage;
