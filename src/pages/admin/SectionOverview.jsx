import React from 'react';
import { useNavigate } from 'react-router-dom';
import { ArrowLeft, ArrowRight, Clock } from 'lucide-react';
import { ADMIN_MENU, ADMIN_MENU_SECTIONS, getMenuForRole } from '../../config/roles';
import { useAuth } from '../../context/AuthContext';

/**
 * Section overview хуудас — reference HTML-ийн загвараар.
 * Sidebar-ын section дээр дарвал энэ render хийгдэнэ.
 * Доорх card-уудаас live-ыг сонгож тухайн хуудас руу шилждэг.
 */
export default function SectionOverview({ sectionKey }) {
    const navigate = useNavigate();
    const { role, roles } = useAuth();
    const section = ADMIN_MENU_SECTIONS.find((s) => s.key === sectionKey);
    const allowedItems = React.useMemo(() => getMenuForRole(role, roles), [role, roles]);

    if (!section) {
        return <div className="admin-page"><h1>Section олдсонгүй</h1></div>;
    }

    const items = ADMIN_MENU.filter((it) => it.section === sectionKey)
        .map((it) => ({ ...it, allowed: allowedItems.some((a) => a.path === it.path) }));

    return (
        <div className="ss-overview">
            <div className="ss-ov-wrap">
                {/* Topbar */}
                <div className="ss-ov-topbar">
                    <button
                        type="button"
                        className="ss-ov-back"
                        onClick={() => navigate('/admin')}
                    >
                        <ArrowLeft size={18} strokeWidth={2.2} />
                        <span>Үндсэн цэс</span>
                    </button>
                    <div className="ss-ov-logo">
                        <span className="ss-ov-mk">SS</span>
                        <span className="ss-ov-wm">Sweet Secret</span>
                    </div>
                </div>

                {/* Hero */}
                <div className="ss-ov-hero">
                    <div className="ss-ov-eyebrow">
                        <span className="ss-ov-ln" />
                        {section.englishLabel} · {section.label}
                        <span className="ss-ov-ln" />
                    </div>
                    <h1 className="ss-ov-h1">
                        <span className="ss-ov-grad">{section.gradTitle}</span>
                        {section.plainTitle ? ` ${section.plainTitle}` : ''}
                    </h1>
                    <p className="ss-ov-desc">{section.heroDesc}</p>
                </div>

                {/* Cards grid */}
                <div className={`ss-ov-grid count-${items.length}`}>
                    {items.map((item, idx) => {
                        const num = String(idx + 1).padStart(2, '0');
                        const isLive = !item.comingSoon && item.allowed;
                        // Тусгай variant байвал хэрэглэнэ, үгүй бол стандарт live/soon-a/soon-b
                        const variant = item.variant
                            || (!item.comingSoon ? 'live' : (idx % 2 === 0 ? 'soon-a' : 'soon-b'));
                        const clickable = isLive;
                        const footText = item.foot || (isLive ? 'Нээх' : 'Тун удахгүй');

                        const onClick = () => {
                            if (!clickable) return;
                            navigate(item.path);
                        };

                        return (
                            <div
                                key={item.key}
                                className={`ss-ov-card ${variant} ${clickable ? 'clickable' : ''}`}
                                onClick={onClick}
                                onKeyDown={(e) => {
                                    if ((e.key === 'Enter' || e.key === ' ') && clickable) {
                                        e.preventDefault();
                                        onClick();
                                    }
                                }}
                                role={clickable ? 'button' : undefined}
                                tabIndex={clickable ? 0 : undefined}
                            >
                                <div className="ss-ov-head">
                                    {!item.hideBadge && (
                                        isLive ? (
                                            <span className="ss-ov-badge live">
                                                <span className="ss-ov-pulse" />
                                                Идэвхтэй
                                            </span>
                                        ) : (
                                            <span className="ss-ov-badge">
                                                <Clock size={12} strokeWidth={2} />
                                                Тун удахгүй
                                            </span>
                                        )
                                    )}
                                    <div className="ss-ov-num">{num}</div>
                                    <div className="ss-ov-keyb">{item.keyb}</div>
                                    <div className="ss-ov-ttl">
                                        <span className="ss-ov-it">{item.cardTitle?.it || item.title}</span>
                                        {item.cardTitle?.rg && <span className="ss-ov-rg">{item.cardTitle.rg}</span>}
                                    </div>
                                </div>
                                <div className="ss-ov-body">
                                    <p>{item.cardDesc}</p>
                                    {item.bullets?.length > 0 && (
                                        <ul>
                                            {item.bullets.map((b, i) => <li key={i}>{b}</li>)}
                                        </ul>
                                    )}
                                    <div className="ss-ov-foot">
                                        <span>{footText}</span>
                                        <ArrowRight size={20} strokeWidth={2} className="ss-ov-arr" />
                                    </div>
                                </div>
                            </div>
                        );
                    })}
                </div>
            </div>
        </div>
    );
}
