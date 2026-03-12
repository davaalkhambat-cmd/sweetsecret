import React from 'react';
import { Heart, Sparkles, Flower2, Diamond, Check, ArrowRight } from 'lucide-react';

const Loyalty = () => {
    const steps = [
        {
            id: 1,
            title: 'Sweet-д нэгдэх',
            desc: 'sweetsecret.mn платформд бүртгэл үүсгэж, дуртай бүтээгдэхүүнээ худалдан авна.'
        },
        {
            id: 2,
            title: 'Оноо цуглуулах',
            desc: 'Худалдан авалт бүрээс оноо цуглуулж, level ахих бүртээ шинэ урамшуулал, боломжуудыг нээнэ.'
        },
        {
            id: 3,
            title: 'Оноо ашиглах',
            desc: 'Цуглуулсан оноогоороо онооны бүтээгдэхүүн, бэлэг авах, нэмэлт хөнгөлөлт урамшуулал эдэлнэ.'
        }
    ];

    const tiers = [
        {
            name: 'Pink',
            icon: <Heart size={32} color="#FF85A1" fill="#FF85A1" />,
            condition: 'Бүртгүүлсний дараа',
            color: '#FF85A1',
            discount: '30%',
            bonus: '-',
            multiplier: '1x',
            delivery: '250,000₮ дээш',
            earlyAccess: true,
            birthday: true
        },
        {
            name: 'Glow',
            icon: <Sparkles size={32} color="#FFB347" />,
            condition: 'Улиралд 250,000₮-ий худалдан авалт',
            color: '#FFB347',
            discount: '30%',
            bonus: '+2%',
            multiplier: '2x',
            delivery: '250,000₮ дээш',
            earlyAccess: true,
            birthday: true
        },
        {
            name: 'Rouge',
            icon: <Flower2 size={32} color="#8B0000" />,
            condition: 'Улиралд 500,000₮-ий худалдан авалт',
            color: '#8B0000',
            discount: '30%',
            bonus: '+4%',
            multiplier: '3x',
            delivery: 'Үнийн дүн харгалзахгүй',
            earlyAccess: true,
            birthday: true
        },
        {
            name: 'Diamond',
            icon: <Diamond size={32} color="#000" />,
            condition: 'Улиралд 1,000,000₮-ий худалдан авалт',
            color: '#000',
            discount: '30%',
            bonus: '+6%',
            multiplier: '4x',
            delivery: 'Үнийн дүн харгалзахгүй',
            earlyAccess: true,
            birthday: true
        }
    ];

    return (
        <main className="loyalty-page animate-fade-in">
            {/* Header */}
            <section className="loyalty-header-simple container">
                <h1>Гишүүнчлэлийн нөхцөл</h1>
                <div className="wave-divider"></div>
                <p className="loyalty-desc">
                    Нийт дөрвөн түвшний гишүүд байна: Pink, Glow, Rouge болон Diamond. Улирал бүрийн худалдан авалтын дүнгээс хамаарч
                    гишүүнчлэлийн түвшин өөрчлөгдөнө. Түвшин ахих тусам таны боломж нэмэгдэнэ.
                </p>
            </section>

            {/* Tiers Comparison Table-style columns */}
            <section className="tiers-comparison container">
                <div className="comparison-grid">
                    {/* Labels column */}
                    <div className="labels-column">
                        <div className="row-label empty"></div>
                        <div className="row-label">Хямдрах хувь</div>
                        <div className="row-label">Бонус хямдрал</div>
                        <div className="row-label">Оноо үржигдэх</div>
                        <div className="row-label">Үнэгүй хүргэлт</div>
                        <div className="row-label">Хямдрал зарлагдах үед түрүүлж оролцох</div>
                        <div className="row-label">Төрсөн өдрийн бэлэг</div>
                    </div>

                    {/* Tier columns */}
                    {tiers.map((tier) => (
                        <div key={tier.name} className="tier-column">
                            <div className="tier-header-simple" style={{ backgroundColor: `${tier.color}10` }}>
                                <div className="tier-icon-wrapper">{tier.icon}</div>
                                <h3 style={{ color: tier.color }}>{tier.name}</h3>
                                <span className="tier-badge" style={{ backgroundColor: tier.color }}>{tier.condition}</span>
                            </div>
                            <div className="tier-value">{tier.discount}</div>
                            <div className="tier-value">{tier.bonus}</div>
                            <div className="tier-value">{tier.multiplier}</div>
                            <div className="tier-value">{tier.delivery}</div>
                            <div className="tier-value">
                                {tier.earlyAccess && <Check size={20} color={tier.color} />}
                            </div>
                            <div className="tier-value">
                                {tier.birthday && <Check size={20} color={tier.color} />}
                            </div>
                        </div>
                    ))}
                </div>
            </section>

            {/* How it works section */}
            <section className="how-it-works-refined container">
                <h2 className="section-title">Хэрхэн ажиллах вэ?</h2>
                <div className="wave-divider mb-4"></div>

                <div className="steps-wrapper">
                    {steps.map((step, index) => (
                        <React.Fragment key={step.id}>
                            <div className="step-card-refined">
                                <div className="step-number">{step.id}</div>
                                <h3>{step.title}</h3>
                                <p>{step.desc}</p>
                            </div>
                            {index < steps.length - 1 && (
                                <div className="step-connector">
                                    <div className="dot"></div>
                                    <ArrowRight size={24} className="arrow" />
                                </div>
                            )}
                        </React.Fragment>
                    ))}
                </div>
            </section>
        </main>
    );
};

export default Loyalty;
