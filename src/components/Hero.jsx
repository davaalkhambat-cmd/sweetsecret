import React from 'react';
import { ArrowRight, Sparkles, ShieldCheck } from 'lucide-react';

const Hero = () => {
    return (
        <section className="ss-hero">
            <div className="container ss-hero-grid animate-up">
                <div className="ss-hero-copy">
                    <span className="ss-hero-kicker">Sweet Secret Exclusive</span>
                    <h1>Эрүүл, гэрэлтсэн арьсны таны өдөр тутмын шийдэл</h1>
                    <p>
                        Оригинал брэндийн арьс арчилгаа, нүүр будалт, үс арчилгааны бүтээгдэхүүнүүдийг
                        албан ёсны баталгаатайгаар хүргэж байна.
                    </p>
                    <div className="ss-hero-actions">
                        <button className="btn btn-primary">
                            Бүтээгдэхүүн үзэх <ArrowRight size={16} style={{ marginLeft: '8px' }} />
                        </button>
                        <button className="ss-hero-outline-btn">Шинэ хямдрал харах</button>
                    </div>
                    <div className="ss-hero-badges">
                        <span><ShieldCheck size={14} /> Албан ёсны эрхтэй</span>
                        <span><Sparkles size={14} /> Өдөр бүр шинэ санал</span>
                    </div>
                </div>
                <div className="ss-hero-media">
                    <img
                        src="https://images.unsplash.com/photo-1522335789203-aabd1fc54bc9?auto=format&fit=crop&w=1400&q=80"
                        alt="Sweet Secret beauty"
                        className="ss-hero-image"
                    />
                    <div className="ss-hero-float-card">
                        <p>Шинэ хэрэглэгчийн урамшуулал</p>
                        <strong>-10%</strong>
                        <span>WELCOME10 код ашиглана уу</span>
                    </div>
                </div>
            </div>
        </section>
    );
};

export default Hero;
