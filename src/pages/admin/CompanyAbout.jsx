import React from 'react';
import './CompanyAbout.css';

const VALUES = [
    {
        num: '01', icon: '📖', cls: 'v1',
        title: 'Мэдлэг',
        desc: '"Эмч зөвлөж байна" — нотолгоо, мэргэжлийн зөвлөгөөнд суурилсан үнэн зөв мэдээллийг хүн бүрт хүргэнэ.',
    },
    {
        num: '02', icon: '🤍', cls: 'v2',
        title: 'Нандин нууцлал',
        desc: 'Шүүмжлэлгүй, хүндэтгэлтэй, дотно орчин. Үйлчлүүлэгчийн хувийн нууцыг ариглах нь бидний эхний дүрэм.',
    },
    {
        num: '03', icon: '🌷', cls: 'v3',
        title: 'Эмэгтэй хүндлэл',
        desc: 'Бие, сэтгэлийн эрүүл мэндийг эрхэмлэн, эмэгтэй хүн бүрийн өвөрмөц аяллыг хүндэтгэнэ.',
    },
    {
        num: '04', icon: '✨', cls: 'v4',
        title: 'Чанар',
        desc: 'Анхааралтай сонгож, найдвартай эх сурвалжаас нийлүүлсэн чанартай бүтээгдэхүүн л манай тавиур дээр ирнэ.',
    },
];

const BRANCHES = [
    { icon: '🌷', cls: 'b1', name: 'Хан-Уул салбар', meta: 'Шангри-Ла · ирээдүйн флагман төв' },
    { icon: '🛒', cls: 'b2', name: 'Имарт салбар', meta: 'И-Март доторх дэлгүүр' },
    { icon: '🏬', cls: 'b3', name: 'Их дэлгүүр салбар', meta: 'Улсын Их Дэлгүүр (УИД)' },
];

const TIMELINE = [
    {
        year: '2016',
        title: 'Sweet Secret үүсгэн байгуулагдав',
        desc: 'Эмэгтэйчүүдийн дотно эрүүл мэндэд зориулсан Монголын анхны мэргэшсэн дэлгүүр нээгдэв.',
    },
    {
        year: '2019',
        title: 'Салбарын тэлэлт',
        desc: 'Их дэлгүүр, И-Март болон Шангри-Ла дахь салбаруудаар дамжуулан хүртээмжээ нэмэгдүүлэв.',
    },
    {
        year: '2022',
        title: 'Цахим худалдааны өсөлт',
        desc: 'sweetsecret.mn болон хүргэлтийн сувгаар онлайн борлуулалтаа эрчимтэй хөгжүүлж эхлэв.',
    },
    {
        year: '2024',
        title: 'Шинэ брэнд айдентити',
        desc: '"Биеэ хайрлах урлаг" гэсэн үндсэн санаа болон экосистемийн алсын хараагаа тодорхойлов.',
    },
    {
        year: '2026',
        title: 'Экосистем рүү шилжих',
        desc: '"Secret Circle" гишүүнчлэл, захиалгат хайрцаг болон Шангри-Ла флагман төвийн хөгжүүлэлт эхэлж байна.',
    },
];

const CONTACT = [
    { icon: '🌐', label: 'Вэбсайт', value: 'sweetsecret.mn' },
    { icon: '📍', label: 'Салбарууд', value: 'Хан-Уул · Имарт · Их дэлгүүр' },
    { icon: '💌', label: 'Үйлчилгээ', value: 'Дэлгүүр · Хүргэлт · Онлайн' },
];

const DIRECTOR = {
    name: 'Дина',
    role: 'Гүйцэтгэх захирал',
    initial: 'Д',
};

const MGMT_TEAM = {
    label: 'Удирдлагын баг',
    icon: '👑',
    members: [
        { name: 'Уранзаяа', role: 'Менежер', initial: 'У' },
        { name: 'Одмаа', role: 'Маркетинг / Контент', initial: 'О' },
    ],
};

const BRANCH_TEAMS = [
    {
        cls: 'b1', label: 'Хан-Уул салбар', meta: 'Шангри-Ла', icon: '🌷',
        members: [{ name: 'Баби', role: 'Салбарын ахлагч', initial: 'Б' }],
    },
    {
        cls: 'b2', label: 'Имарт салбар', meta: 'И-Март', icon: '🛒',
        members: [{ name: 'Ариунаа', role: 'Салбарын ахлагч', initial: 'А' }],
    },
    {
        cls: 'b3', label: 'Их дэлгүүр салбар', meta: 'УИД', icon: '🏬',
        members: [{ name: 'Одко', role: 'Салбарын ахлагч', initial: 'О' }],
    },
];

function MemberCard({ member, size = 'normal' }) {
    return (
        <div className={`cabt-mc size-${size}`}>
            <div className="cabt-mc-avatar">
                <span className="cabt-mc-initials">{member.initial}</span>
                <span className="cabt-mc-status" />
            </div>
            <div className="cabt-mc-name">{member.name}</div>
            <div className="cabt-mc-role">{member.role}</div>
        </div>
    );
}

export default function CompanyAbout() {
    return (
        <div className="cabt">
            <div className="cabt-wrap">
                {/* HERO */}
                <section className="cabt-hero">
                    <div className="cabt-hero-kicker">About Us · Бидний тухай</div>
                    <h1 className="cabt-hero-title">
                        <em>Биеэ хайрлах</em><br />урлаг
                    </h1>
                    <p className="cabt-hero-sub">
                        Sweet Secret нь 2016 оноос хойш Монголын эмэгтэйчүүдийн дотно эрүүл мэндийн
                        салбарт мэдлэг, чанар, хүндлэлийг тээж яваа анхдагч брэнд. Бид зүгээр нэг
                        дэлгүүр биш — биеэ хайрлах урлагийг түгээдэг орон зай.
                    </p>
                    <div className="cabt-hero-stats">
                        <div>
                            <div className="cabt-hero-stat-num">2016</div>
                            <div className="cabt-hero-stat-label">Үүсгэн байгуулсан</div>
                        </div>
                        <div>
                            <div className="cabt-hero-stat-num">3</div>
                            <div className="cabt-hero-stat-label">Салбар дэлгүүр</div>
                        </div>
                        <div>
                            <div className="cabt-hero-stat-num">10<span className="cabt-hero-stat-suffix">+ жил</span></div>
                            <div className="cabt-hero-stat-label">Туршлага</div>
                        </div>
                    </div>
                </section>

                {/* VISION */}
                <section className="cabt-section">
                    <div className="cabt-section-head">
                        <div>
                            <div className="cabt-section-kicker">Our Vision · Алсын хараа</div>
                            <h2 className="cabt-section-title"><em>Бидний</em> алсын хараа</h2>
                        </div>
                    </div>
                    <div className="cabt-vision-card">
                        <p className="cabt-vision-quote">
                            Sweet Secret-ийг энгийн жижиглэн худалдаанаас{' '}
                            <em>Монголын анхны эмэгтэйчүүдийн дотно эрүүл мэндийн экосистем</em>{' '}
                            болгон хувиргах — мэдлэг түгээх, нийгэмлэг бүрдүүлж, эмэгтэй хүн өөрийгөө
                            хайрлах аяллыг дэмждэг орон зайг бий болгох.
                        </p>
                        <div className="cabt-vision-author">— Sweet Secret ХХК · Брэндийн үндэс</div>
                    </div>
                </section>

                {/* MISSION */}
                <section className="cabt-section">
                    <div className="cabt-section-head">
                        <div>
                            <div className="cabt-section-kicker">Our Mission · Эрхэм зорилго</div>
                            <h2 className="cabt-section-title"><em>Бидний</em> эрхэм зорилго</h2>
                        </div>
                    </div>
                    <div className="cabt-mission-card">
                        <div className="cabt-mission-icon">🌸</div>
                        <div>
                            <div className="cabt-mission-label">Mission statement</div>
                            <p className="cabt-mission-text">
                                Эмэгтэй хүн бүрт ичих, эргэлзэх зүйлгүйгээр, нотолгоонд суурилсан мэдлэг,
                                чанартай бүтээгдэхүүн, дотно зөвлөгөөг хүргэж — биеэ танин мэдэх, хайрлах
                                замд нь итгэлтэй хамтрагч нь байх.
                            </p>
                        </div>
                    </div>
                </section>

                {/* VALUES */}
                <section className="cabt-section">
                    <div className="cabt-section-head">
                        <div>
                            <div className="cabt-section-kicker">Core Values · Үнэт зүйлс</div>
                            <h2 className="cabt-section-title"><em>Бидний</em> үнэт зүйл</h2>
                            <div className="cabt-section-sub">Өдөр бүрийн ажилд маань чиглүүлэгч болдог дөрвөн тулгуур үнэт зүйл.</div>
                        </div>
                    </div>
                    <div className="cabt-values">
                        {VALUES.map((v) => (
                            <div key={v.num} className="cabt-value-card">
                                <div className="cabt-value-num">{v.num}</div>
                                <div className={`cabt-value-icon ${v.cls}`}>{v.icon}</div>
                                <div className="cabt-value-title">{v.title}</div>
                                <div className="cabt-value-desc">{v.desc}</div>
                            </div>
                        ))}
                    </div>
                </section>

                {/* ABOUT + BRANCHES */}
                <section className="cabt-section">
                    <div className="cabt-section-head">
                        <div>
                            <div className="cabt-section-kicker">About Sweet Secret · Компанийн тухай</div>
                            <h2 className="cabt-section-title"><em>Компанийн</em> тухай</h2>
                        </div>
                    </div>
                    <div className="cabt-about-grid">
                        <div className="cabt-about-text">
                            <p>
                                <strong>Sweet Secret</strong> нь 2016 онд Улаанбаатарт үүсгэн байгуулагдсан,
                                эмэгтэйчүүдийн дотно эрүүл мэнд, өөрийгөө хайрлах соёлд зориулсан Монголын
                                анхдагч брэнд юм.
                            </p>
                            <p>
                                Бид жилээс жилд итгэлээ нэмж, өнөөдөр <strong>гурван салбар дэлгүүр</strong>,
                                хүргэлтийн үйлчилгээ, цахим худалдаагаар дамжуулан үйлчилгээгээ өргөжүүлээд
                                байна.
                            </p>
                            <p>
                                Цаашид бид брэндээ <strong>"Биеэ хайрлах урлаг"</strong> гэсэн үндсэн санаан
                                дээр тулгуурлан, сургалт-боловсрол, нийгэмлэг, гишүүнчлэлийн хөтөлбөр болон
                                захиалгат хайрцгийн үйлчилгээтэй бүрэн экосистем болгон хөгжүүлж байна.
                            </p>
                        </div>
                        <div className="cabt-branch-list">
                            {BRANCHES.map((b) => (
                                <div key={b.name} className="cabt-branch-item">
                                    <div className={`cabt-branch-dot ${b.cls}`}>{b.icon}</div>
                                    <div>
                                        <div className="cabt-branch-name">{b.name}</div>
                                        <div className="cabt-branch-meta">{b.meta}</div>
                                    </div>
                                </div>
                            ))}
                        </div>
                    </div>
                </section>

                {/* TIMELINE */}
                <section className="cabt-section">
                    <div className="cabt-section-head">
                        <div>
                            <div className="cabt-section-kicker">Our Journey · Манай түүх</div>
                            <h2 className="cabt-section-title"><em>Манай</em> түүх</h2>
                            <div className="cabt-section-sub">Sweet Secret-ийн замналын чухал мөчүүд.</div>
                        </div>
                    </div>
                    <div className="cabt-timeline">
                        {TIMELINE.map((t) => (
                            <div key={t.year} className="cabt-timeline-item">
                                <div className="cabt-timeline-dot" />
                                <div className="cabt-timeline-year">{t.year}</div>
                                <div className="cabt-timeline-title">{t.title}</div>
                                <div className="cabt-timeline-desc">{t.desc}</div>
                            </div>
                        ))}
                    </div>
                </section>

                {/* TEAM org chart */}
                <section className="cabt-section" id="team">
                    <div className="cabt-section-head">
                        <div>
                            <div className="cabt-section-kicker">Team Structure · Багийн бүтэц</div>
                            <h2 className="cabt-section-title"><em>Манай</em> баг</h2>
                            <div className="cabt-section-sub">Удирдлага болон салбар бүрийн баг.</div>
                        </div>
                    </div>

                    <div className="cabt-org">
                        {/* Director */}
                        <div className="cabt-director-row">
                            <div className="cabt-director-card">
                                <div className="cabt-director-crown">CEO</div>
                                <div className="cabt-mc-avatar director-avatar">
                                    <span className="cabt-mc-initials director-initials">{DIRECTOR.initial}</span>
                                </div>
                                <div className="cabt-director-name">{DIRECTOR.name}</div>
                                <div className="cabt-director-role">{DIRECTOR.role}</div>
                            </div>
                        </div>

                        {/* Connector — director → mgmt */}
                        <div className="cabt-connector" aria-hidden="true" />

                        {/* Management team */}
                        <div className="cabt-mgmt-wrap">
                            <div className="cabt-team-badge mgmt">
                                <div className="cabt-badge-icon">{MGMT_TEAM.icon}</div>
                                <span><em>Удирдлагын</em> баг</span>
                                <span className="cabt-badge-count">{MGMT_TEAM.members.length} хүн</span>
                            </div>
                            <div className="cabt-members mgmt-members">
                                {MGMT_TEAM.members.map((m) => (
                                    <MemberCard key={m.name} member={m} size="mgmt" />
                                ))}
                            </div>
                        </div>

                        {/* Branches row */}
                        <div className="cabt-branches-row">
                            {BRANCH_TEAMS.map((branch) => (
                                <div key={branch.cls} className="cabt-branch-col">
                                    <div className={`cabt-team-badge compact ${branch.cls}`}>
                                        <div className="cabt-badge-icon">{branch.icon}</div>
                                        <span><em>{branch.label.split(' ')[0]}</em> {branch.label.split(' ').slice(1).join(' ')}</span>
                                        <span className="cabt-badge-count">{branch.members.length} хүн</span>
                                    </div>
                                    <div className="cabt-members branch-members">
                                        {branch.members.map((m) => (
                                            <MemberCard key={m.name} member={m} size="branch" />
                                        ))}
                                    </div>
                                </div>
                            ))}
                        </div>
                    </div>
                </section>

                {/* CONTACT */}
                <section className="cabt-section">
                    <div className="cabt-section-head">
                        <div>
                            <div className="cabt-section-kicker">Contact · Холбоо барих</div>
                            <h2 className="cabt-section-title"><em>Холбоо</em> барих</h2>
                        </div>
                    </div>
                    <div className="cabt-contact-grid">
                        {CONTACT.map((c) => (
                            <div key={c.label} className="cabt-contact-card">
                                <div className="cabt-contact-icon">{c.icon}</div>
                                <div className="cabt-contact-label">{c.label}</div>
                                <div className="cabt-contact-value">{c.value}</div>
                            </div>
                        ))}
                    </div>
                </section>

                <footer className="cabt-footer">
                    <div className="cabt-fb">Биеэ хайрлах урлаг</div>
                    <div className="cabt-copy">© 2026 Sweet Secret ХХК</div>
                </footer>
            </div>
        </div>
    );
}
