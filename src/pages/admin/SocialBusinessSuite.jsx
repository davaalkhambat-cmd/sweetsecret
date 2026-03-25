import React, { useEffect, useMemo, useState } from 'react';
import {
    AlertTriangle,
    BadgeCheck,
    BarChart3,
    ExternalLink,
    Eye,
    Heart,
    Link2,
    MessageCircleMore,
    RefreshCcw,
    Users,
} from 'lucide-react';

const CONFIG_STORAGE_KEY = 'social-business-suite-config';
const REPORT_STORAGE_KEY = 'social-business-suite-report';
const GRAPH_VERSION = 'v23.0';

const toInputDate = (date) => {
    const year = date.getFullYear();
    const month = String(date.getMonth() + 1).padStart(2, '0');
    const day = String(date.getDate()).padStart(2, '0');
    return `${year}-${month}-${day}`;
};

const getDefaultConfig = () => {
    const today = new Date();
    const since = new Date(today);
    since.setDate(today.getDate() - 29);

    return {
        pageId: '',
        accessToken: '',
        since: toInputDate(since),
        until: toInputDate(today),
    };
};

const readLocalJson = (key, fallback) => {
    try {
        if (typeof window === 'undefined') return fallback;
        const raw = window.localStorage.getItem(key);
        return raw ? JSON.parse(raw) : fallback;
    } catch {
        return fallback;
    }
};

const writeLocalJson = (key, value) => {
    if (typeof window === 'undefined') return;
    window.localStorage.setItem(key, JSON.stringify(value));
};

const formatNumber = (value) => Number(value || 0).toLocaleString('en-US');
const formatDateTime = (value) => {
    if (!value) return '-';
    const date = new Date(value);
    if (Number.isNaN(date.getTime())) return '-';
    return date.toLocaleString('mn-MN', {
        year: 'numeric',
        month: '2-digit',
        day: '2-digit',
        hour: '2-digit',
        minute: '2-digit',
    });
};

const truncate = (value, max = 130) => {
    const normalized = String(value || '').trim();
    if (normalized.length <= max) return normalized;
    return `${normalized.slice(0, max - 1)}…`;
};

const sumMetricSeries = (metricMap, key) =>
    (metricMap[key]?.values || []).reduce((sum, item) => sum + Number(item?.value || 0), 0);

const buildGraphUrl = (path, params = {}) => {
    const search = new URLSearchParams();
    Object.entries(params).forEach(([key, value]) => {
        if (value !== undefined && value !== null && value !== '') {
            search.set(key, value);
        }
    });
    return `https://graph.facebook.com/${GRAPH_VERSION}/${path}?${search.toString()}`;
};

const fetchGraph = async (path, params = {}) => {
    const response = await fetch(buildGraphUrl(path, params));
    const payload = await response.json();

    if (!response.ok || payload.error) {
        throw new Error(payload.error?.message || 'Meta API хүсэлт амжилтгүй боллоо.');
    }

    return payload;
};

const fetchMetricSeries = async (pageId, metric, accessToken, since, until) => {
    try {
        const payload = await fetchGraph(`${pageId}/insights`, {
            metric,
            period: 'day',
            since,
            until,
            access_token: accessToken,
        });
        return payload.data?.[0] || null;
    } catch {
        return null;
    }
};

const fetchPostInsight = async (postId, accessToken) => {
    const [detailPayload, insightPayload] = await Promise.all([
        fetchGraph(postId, {
            fields: 'id,message,created_time,permalink_url,full_picture,reactions.summary(total_count).limit(0),comments.summary(total_count).limit(0),shares',
            access_token: accessToken,
        }),
        fetchGraph(`${postId}/insights`, {
            metric: 'post_impressions,post_engaged_users',
            access_token: accessToken,
        }).catch(() => ({ data: [] })),
    ]);

    const insights = Object.fromEntries((insightPayload.data || []).map((item) => [item.name, item.values?.[0]?.value || 0]));

    return {
        id: detailPayload.id,
        message: detailPayload.message || '',
        created_time: detailPayload.created_time || '',
        permalink_url: detailPayload.permalink_url || '',
        full_picture: detailPayload.full_picture || '',
        impressions: Number(insights.post_impressions || 0),
        engagedUsers: Number(insights.post_engaged_users || 0),
        reactions: Number(detailPayload.reactions?.summary?.total_count || 0),
        comments: Number(detailPayload.comments?.summary?.total_count || 0),
        shares: Number(detailPayload.shares?.count || 0),
    };
};

const SocialBusinessSuite = () => {
    const [config, setConfig] = useState(() => ({
        ...getDefaultConfig(),
        ...readLocalJson(CONFIG_STORAGE_KEY, {}),
    }));
    const [report, setReport] = useState(() => readLocalJson(REPORT_STORAGE_KEY, null));
    const [loading, setLoading] = useState(false);
    const [errorMessage, setErrorMessage] = useState('');

    useEffect(() => {
        writeLocalJson(CONFIG_STORAGE_KEY, config);
    }, [config]);

    useEffect(() => {
        writeLocalJson(REPORT_STORAGE_KEY, report);
    }, [report]);

    const handleConfigChange = (event) => {
        const { name, value } = event.target;
        setConfig((prev) => ({ ...prev, [name]: value }));
    };

    const handleSync = async () => {
        if (!config.pageId.trim() || !config.accessToken.trim()) {
            setErrorMessage('Page ID болон Access Token хоёрыг бөглөнө үү.');
            return;
        }

        setLoading(true);
        setErrorMessage('');

        try {
            const pageId = config.pageId.trim();
            const accessToken = config.accessToken.trim();
            const since = config.since;
            const until = config.until;

            const [pagePayload, metricResults, postsPayload] = await Promise.all([
                fetchGraph(pageId, {
                    fields: 'name,fan_count,followers_count,link,instagram_business_account{id,username,followers_count,media_count}',
                    access_token: accessToken,
                }),
                Promise.all([
                    fetchMetricSeries(pageId, 'page_impressions', accessToken, since, until),
                    fetchMetricSeries(pageId, 'page_reach', accessToken, since, until),
                    fetchMetricSeries(pageId, 'page_engaged_users', accessToken, since, until),
                    fetchMetricSeries(pageId, 'page_post_engagements', accessToken, since, until),
                    fetchMetricSeries(pageId, 'page_follows', accessToken, since, until),
                ]),
                fetchGraph(`${pageId}/posts`, {
                    fields: 'id',
                    limit: 5,
                    access_token: accessToken,
                }).catch(() => ({ data: [] })),
            ]);

            const postRows = await Promise.all(
                (postsPayload.data || []).map((post) => fetchPostInsight(post.id, accessToken).catch(() => null))
            );

            const metrics = metricResults.filter(Boolean);
            const metricMap = Object.fromEntries(metrics.map((item) => [item.name, item]));

            setReport({
                syncedAt: new Date().toISOString(),
                page: {
                    id: pageId,
                    name: pagePayload.name || 'Facebook Page',
                    link: pagePayload.link || '',
                    fans: Number(pagePayload.fan_count || 0),
                    followers: Number(pagePayload.followers_count || 0),
                },
                instagram: pagePayload.instagram_business_account
                    ? {
                          id: pagePayload.instagram_business_account.id || '',
                          username: pagePayload.instagram_business_account.username || '',
                          followers: Number(pagePayload.instagram_business_account.followers_count || 0),
                          mediaCount: Number(pagePayload.instagram_business_account.media_count || 0),
                      }
                    : null,
                range: {
                    since,
                    until,
                },
                metrics: metricMap,
                posts: postRows.filter(Boolean),
            });
        } catch (error) {
            setErrorMessage(error.message || 'Social Business Suite sync үед алдаа гарлаа.');
        } finally {
            setLoading(false);
        }
    };

    const stats = useMemo(() => {
        if (!report) return null;

        const pageImpressions = sumMetricSeries(report.metrics, 'page_impressions');
        const pageReach = sumMetricSeries(report.metrics, 'page_reach');
        const engagedUsers = sumMetricSeries(report.metrics, 'page_engaged_users');
        const postEngagements = sumMetricSeries(report.metrics, 'page_post_engagements');
        const follows = sumMetricSeries(report.metrics, 'page_follows');
        const reactions = report.posts.reduce((sum, item) => sum + item.reactions, 0);
        const comments = report.posts.reduce((sum, item) => sum + item.comments, 0);

        return {
            pageImpressions,
            pageReach,
            engagedUsers,
            postEngagements,
            follows,
            reactions,
            comments,
        };
    }, [report]);

    return (
        <div className="admin-page social-suite-page">
            <div className="section-card social-suite-hero">
                <div>
                    <p className="social-suite-kicker">Meta Integration</p>
                    <h1>Social Business Suite</h1>
                    <p className="social-suite-subtitle">
                        Facebook Page болон Instagram Business холбоод Meta Graph API-с insight, post performance, audience signal-уудаа шууд татна.
                    </p>
                </div>
                <button className="save-btn social-suite-sync-btn" type="button" onClick={handleSync} disabled={loading}>
                    <RefreshCcw size={16} className={loading ? 'spin' : ''} />
                    <span>{loading ? 'Sync хийж байна...' : 'Одоо sync хийх'}</span>
                </button>
            </div>

            <div className="social-suite-layout">
                <section className="section-card social-suite-config-card">
                    <div className="social-suite-section-head">
                        <h3>Connection</h3>
                        <span>Business Suite холболт</span>
                    </div>

                    <div className="social-suite-form-grid">
                        <label>
                            <span>Facebook Page ID</span>
                            <input
                                className="form-input"
                                name="pageId"
                                value={config.pageId}
                                onChange={handleConfigChange}
                                placeholder="Жишээ: 123456789012345"
                            />
                        </label>
                        <label className="social-suite-token-field">
                            <span>Access Token</span>
                            <input
                                className="form-input"
                                name="accessToken"
                                value={config.accessToken}
                                onChange={handleConfigChange}
                                placeholder="Meta long-lived access token"
                            />
                        </label>
                        <label>
                            <span>Эхлэх огноо</span>
                            <input className="form-input" type="date" name="since" value={config.since} onChange={handleConfigChange} />
                        </label>
                        <label>
                            <span>Дуусах огноо</span>
                            <input className="form-input" type="date" name="until" value={config.until} onChange={handleConfigChange} />
                        </label>
                    </div>

                    <div className="social-suite-note">
                        <Link2 size={16} />
                        <p>
                            Энэ хувилбар нь token-оо browser local storage дээр хадгална. Secure backend sync байхгүй тул production-д урт хугацааны хувилбар биш.
                        </p>
                    </div>

                    {errorMessage ? (
                        <div className="dashboard-alert dashboard-alert-error">
                            <AlertTriangle size={16} />
                            <span>{errorMessage}</span>
                        </div>
                    ) : null}
                </section>

                <section className="section-card social-suite-summary-card">
                    <div className="social-suite-section-head">
                        <h3>Account Summary</h3>
                        <span>Last sync: {formatDateTime(report?.syncedAt)}</span>
                    </div>

                    {report ? (
                        <div className="social-suite-account-grid">
                            <div className="social-suite-account-panel">
                                <div className="social-suite-account-icon facebook">
                                    <BadgeCheck size={18} />
                                </div>
                                <div>
                                    <strong>{report.page.name}</strong>
                                    <small>Facebook Page</small>
                                    <div className="social-suite-account-meta">
                                        <span>{formatNumber(report.page.followers)} followers</span>
                                        <span>{formatNumber(report.page.fans)} fans</span>
                                    </div>
                                    {report.page.link ? (
                                        <a href={report.page.link} target="_blank" rel="noreferrer">
                                            Page руу орох <ExternalLink size={14} />
                                        </a>
                                    ) : null}
                                </div>
                            </div>

                            <div className="social-suite-account-panel">
                                <div className="social-suite-account-icon instagram">
                                    <Users size={18} />
                                </div>
                                <div>
                                    <strong>{report.instagram?.username ? `@${report.instagram.username}` : 'Instagram account холбогдоогүй'}</strong>
                                    <small>Instagram Business</small>
                                    <div className="social-suite-account-meta">
                                        <span>{formatNumber(report.instagram?.followers || 0)} followers</span>
                                        <span>{formatNumber(report.instagram?.mediaCount || 0)} posts</span>
                                    </div>
                                </div>
                            </div>
                        </div>
                    ) : (
                        <p className="social-suite-empty">Connection хийж sync дарсны дараа account summary энд гарна.</p>
                    )}
                </section>
            </div>

            <section className="social-suite-stat-grid">
                <article className="section-card social-suite-stat-card">
                    <div className="social-suite-stat-top">
                        <span>Impressions</span>
                        <Eye size={16} />
                    </div>
                    <strong>{stats ? formatNumber(stats.pageImpressions) : '-'}</strong>
                    <small>{report ? `${report.range.since} - ${report.range.until}` : 'Sync хийгдээгүй'}</small>
                </article>

                <article className="section-card social-suite-stat-card">
                    <div className="social-suite-stat-top">
                        <span>Reach</span>
                        <Users size={16} />
                    </div>
                    <strong>{stats ? formatNumber(stats.pageReach) : '-'}</strong>
                    <small>Unique audience</small>
                </article>

                <article className="section-card social-suite-stat-card">
                    <div className="social-suite-stat-top">
                        <span>Engaged Users</span>
                        <BarChart3 size={16} />
                    </div>
                    <strong>{stats ? formatNumber(stats.engagedUsers) : '-'}</strong>
                    <small>Page interaction</small>
                </article>

                <article className="section-card social-suite-stat-card">
                    <div className="social-suite-stat-top">
                        <span>New Follows</span>
                        <BadgeCheck size={16} />
                    </div>
                    <strong>{stats ? formatNumber(stats.follows) : '-'}</strong>
                    <small>Period дотор нэмэгдсэн</small>
                </article>
            </section>

            <div className="social-suite-layout social-suite-layout-bottom">
                <section className="section-card">
                    <div className="social-suite-section-head">
                        <h3>Performance Insight</h3>
                        <span>Auto summary</span>
                    </div>
                    {stats ? (
                        <div className="social-suite-insight-grid">
                            <div className="social-suite-insight-box">
                                <span>Top signal</span>
                                <strong>
                                    {stats.pageReach >= stats.engagedUsers
                                        ? 'Reach audience сайн тэлж байна'
                                        : 'Engagement reach-ээ давж хүчтэй байна'}
                                </strong>
                                <p>
                                    Reach {formatNumber(stats.pageReach)}, engaged users {formatNumber(stats.engagedUsers)} байна.
                                </p>
                            </div>
                            <div className="social-suite-insight-box">
                                <span>Reaction health</span>
                                <strong>{formatNumber(stats.reactions)} reactions, {formatNumber(stats.comments)} comments</strong>
                                <p>
                                    Хэрэглэгчийн сэтгэгдэл болон reaction-оос контентын resonance-ийг хурдан уншина.
                                </p>
                            </div>
                            <div className="social-suite-insight-box">
                                <span>Action suggestion</span>
                                <strong>
                                    {stats.postEngagements > 0
                                        ? 'Өндөр engagement-тэй post-оо paid boost руу түлх'
                                        : 'Content CTA болон hook-оо дахин шалга'}
                                </strong>
                                <p>
                                    Page post engagements нийт {formatNumber(stats.postEngagements)} байна.
                                </p>
                            </div>
                        </div>
                    ) : (
                        <p className="social-suite-empty">Insight summary харахын тулд эхлээд sync хийнэ үү.</p>
                    )}
                </section>

                <section className="section-card">
                    <div className="social-suite-section-head">
                        <h3>Top Posts</h3>
                        <span>Сүүлийн татсан 5 пост</span>
                    </div>

                    {report?.posts?.length ? (
                        <div className="social-suite-post-list">
                            {report.posts.map((post) => (
                                <article key={post.id} className="social-suite-post-card">
                                    {post.full_picture ? (
                                        <img src={post.full_picture} alt={truncate(post.message || 'post image', 24)} className="social-suite-post-image" />
                                    ) : (
                                        <div className="social-suite-post-image social-suite-post-image-fallback">Post</div>
                                    )}
                                    <div className="social-suite-post-body">
                                        <strong>{truncate(post.message || 'Текстгүй пост', 120)}</strong>
                                        <small>{formatDateTime(post.created_time)}</small>
                                        <div className="social-suite-post-metrics">
                                            <span><Eye size={14} /> {formatNumber(post.impressions)}</span>
                                            <span><BarChart3 size={14} /> {formatNumber(post.engagedUsers)}</span>
                                            <span><Heart size={14} /> {formatNumber(post.reactions)}</span>
                                            <span><MessageCircleMore size={14} /> {formatNumber(post.comments)}</span>
                                        </div>
                                        {post.permalink_url ? (
                                            <a href={post.permalink_url} target="_blank" rel="noreferrer">
                                                Пост нээх <ExternalLink size={14} />
                                            </a>
                                        ) : null}
                                    </div>
                                </article>
                            ))}
                        </div>
                    ) : (
                        <p className="social-suite-empty">Post performance одоогоор байхгүй байна.</p>
                    )}
                </section>
            </div>
        </div>
    );
};

export default SocialBusinessSuite;
