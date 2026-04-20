import React, { useEffect, useState } from 'react';
import {
    getSheetConfig,
    saveSheetConfig,
    syncMonth,
} from '../../../utils/sales/salesSheetSync';

const emptyMonth = () => ({ yearMonth: '', gid: '', label: '' });

export default function SyncModal({ user, initialYearMonth, onClose, onSynced }) {
    const [sheetId, setSheetId] = useState('');
    const [months, setMonths] = useState([emptyMonth()]);
    const [loading, setLoading] = useState(true);
    const [saving, setSaving] = useState(false);
    const [syncing, setSyncing] = useState(null); // yearMonth being synced
    const [error, setError] = useState(null);
    const [success, setSuccess] = useState(null);

    useEffect(() => {
        (async () => {
            try {
                const cfg = await getSheetConfig();
                if (cfg.sheetId) setSheetId(cfg.sheetId);
                if (cfg.months && cfg.months.length) {
                    setMonths(cfg.months.map((m) => ({
                        yearMonth: m.yearMonth || '',
                        gid: m.gid || '',
                        label: m.label || '',
                    })));
                } else {
                    setMonths([emptyMonth()]);
                }
            } catch (e) {
                setError(`Тохиргоог уншихад алдаа гарлаа: ${e.message}`);
            } finally {
                setLoading(false);
            }
        })();
    }, []);

    const updateMonth = (idx, patch) => {
        setMonths((prev) => prev.map((m, i) => (i === idx ? { ...m, ...patch } : m)));
    };

    const addMonth = () => setMonths((prev) => [...prev, emptyMonth()]);
    const removeMonth = (idx) => setMonths((prev) => prev.filter((_, i) => i !== idx));

    const handleSaveConfig = async () => {
        setError(null);
        setSuccess(null);
        setSaving(true);
        try {
            const cleanMonths = months
                .filter((m) => m.yearMonth && m.gid)
                .map((m) => ({
                    yearMonth: m.yearMonth.trim(),
                    gid: m.gid.trim(),
                    label: (m.label || '').trim() || null,
                }));
            await saveSheetConfig({ sheetId: sheetId.trim(), months: cleanMonths, user });
            setSuccess('Тохиргоог хадгаллаа.');
        } catch (e) {
            setError(`Хадгалахад алдаа гарлаа: ${e.message}`);
        } finally {
            setSaving(false);
        }
    };

    const handleSync = async (yearMonth, gid) => {
        console.log('[sync] button clicked', { yearMonth, gid, sheetId: sheetId?.slice(0, 10) + '…' });
        setError(null);
        setSuccess(null);

        // Validate inputs before sync
        const ym = String(yearMonth || '').trim();
        const g = String(gid || '').trim();
        const sid = String(sheetId || '').trim();
        if (!sid) {
            setError('SHEET_ID талбарыг бөглөнө үү');
            return;
        }
        if (!ym || !/^\d{4}-\d{2}$/.test(ym)) {
            setError(`Огноо талбарыг "2026-04" хэлбэрээр бөглөнө үү (одоогийн утга: "${ym}")`);
            return;
        }
        if (!g) {
            setError('GID талбарыг бөглөнө үү (Sheet tab-ын #gid= хэсэг)');
            return;
        }

        setSyncing(yearMonth);
        try {
            console.log('[sync] fetching CSV from Google Sheets…');
            const report = await syncMonth({
                yearMonth,
                sheetId: sheetId.trim(),
                gid: String(gid).trim(),
                user,
            });
            console.log('[sync] success', report.kpis);
            const k = report.kpis;
            setSuccess(
                `✓ ${yearMonth} сар амжилттай синк боллоо: ${k.total_receipts} чек, ` +
                `₮${k.total_sales.toLocaleString('mn-MN')}`
            );
            onSynced && onSynced(yearMonth);
        } catch (e) {
            console.error('[sync] failed', e);
            setError(`Sync амжилтгүй: ${e.message || e.code || String(e)}`);
        } finally {
            setSyncing(null);
        }
    };

    if (loading) {
        return (
            <div className="sd-modal-backdrop">
                <div className="sd-modal">
                    <p>Ачааллаж байна…</p>
                </div>
            </div>
        );
    }

    return (
        <div className="sd-modal-backdrop" onClick={(e) => e.target === e.currentTarget && onClose()}>
            <div className="sd-modal" onClick={(e) => e.stopPropagation()}>
                <h2>Google Sheet синк тохируулах</h2>
                <p className="sd-help">
                    Санхүүгээс ирсэн Excel-ээ Google Sheet-ийн сар бүрийн tab-т paste хийснийх нь дараа
                    энд SHEET_ID + сар бүрийн GID-г оруулаад &quot;Синк&quot; дарна.
                </p>

                <label>SHEET_ID</label>
                <input
                    type="text"
                    value={sheetId}
                    onChange={(e) => setSheetId(e.target.value)}
                    placeholder="1sav99hvmxSEAyyuOm-DaEbijUiDJx2g9AQUcw3ResNE"
                />
                <div className="sd-help">
                    Google Sheet URL-ийн <code>/d/</code> болон <code>/edit</code> хоёрын хоорондох хэсэг.
                </div>

                <label style={{ marginTop: 18 }}>Сар тутмын tab-ууд</label>
                <div className="sd-help" style={{ marginBottom: 8 }}>
                    Мөр бүрийн <strong>Синк</strong> товчийг дарахад тухайн сарын өгөгдлийг Sheet-ээс уншиж,
                    Firestore-д хадгална. Тохиргоо өөрчилсөн бол эхлээд <strong>Тохиргоог хадгалах</strong>.
                </div>
                <div className="sd-months-list">
                    <div className="sd-month-row" style={{ color: 'var(--sd-text-dim)', fontSize: 11, gridTemplateColumns: '1fr 1fr 1fr auto auto' }}>
                        <div>Огноо (YYYY-MM)</div>
                        <div>Tab нэр / GID</div>
                        <div>Товч нэр</div>
                        <div></div>
                        <div></div>
                    </div>
                    {months.map((m, idx) => {
                        const canSync = !!(sheetId && m.yearMonth && m.gid);
                        return (
                            <div
                                key={idx}
                                className="sd-month-row"
                                style={{ gridTemplateColumns: '1fr 1fr 1fr auto auto' }}
                            >
                                <input
                                    type="text"
                                    value={m.yearMonth}
                                    onChange={(e) => updateMonth(idx, { yearMonth: e.target.value })}
                                    placeholder="2026-04"
                                />
                                <input
                                    type="text"
                                    value={m.gid}
                                    onChange={(e) => updateMonth(idx, { gid: e.target.value })}
                                    placeholder="2026-04 эсвэл 0"
                                />
                                <input
                                    type="text"
                                    value={m.label}
                                    onChange={(e) => updateMonth(idx, { label: e.target.value })}
                                    placeholder="4-р сар"
                                />
                                <button
                                    type="button"
                                    className="sd-btn sd-btn-primary"
                                    onClick={(e) => {
                                        e.preventDefault();
                                        e.stopPropagation();
                                        console.log('[sync-btn] clicked', { canSync, yearMonth: m.yearMonth, gid: m.gid });
                                        handleSync(m.yearMonth, m.gid);
                                    }}
                                    disabled={syncing === m.yearMonth || saving}
                                    style={{ padding: '6px 12px', fontSize: 12, pointerEvents: 'auto', position: 'relative', zIndex: 10 }}
                                >
                                    {syncing === m.yearMonth ? 'Синк…' : '🔄 Синк'}
                                </button>
                                <button
                                    type="button"
                                    className="sd-del"
                                    onClick={() => removeMonth(idx)}
                                    disabled={months.length === 1}
                                >
                                    ✕
                                </button>
                            </div>
                        );
                    })}
                </div>
                <button type="button" className="sd-btn" onClick={addMonth} style={{ marginTop: 8 }}>
                    + Сар нэмэх
                </button>

                <div className="sd-help" style={{ marginTop: 10 }}>
                    💡 <strong>Амархан арга</strong>: Tab-ийн нэрийг (жишээ <code>2026-04</code>) гараар бичвэл хангалттай
                    — GID хэрэггүй. Tab-ийн нэр YYYY-MM хэлбэртэй адил байвал &quot;Огноо&quot; талбартай ижил утгыг энд бас бичнэ.
                    <br />
                    Эсвэл GID: Google Sheet-ийн тухайн tab дээр байхдаа URL-ын төгсгөлийн{' '}
                    <code>#gid=XXXXX</code>.
                </div>

                {error && <div className="sd-error">{error}</div>}
                {success && <div className="sd-success">{success}</div>}

                <div className="sd-modal-actions">
                    <button type="button" className="sd-btn" onClick={onClose}>
                        Хаах
                    </button>
                    <button
                        type="button"
                        className="sd-btn"
                        onClick={handleSaveConfig}
                        disabled={saving || !sheetId}
                    >
                        {saving ? 'Хадгалж байна…' : 'Тохиргоог хадгалах'}
                    </button>
                </div>
            </div>
        </div>
    );
}
