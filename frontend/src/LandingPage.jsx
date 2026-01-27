import React from 'react';

export default function LandingPage({ onEnterApp }) {
  return (
    <div style={{ paddingBottom: 100 }}>
      {/* Navbar */}
      <nav style={{ padding: '25px 50px', display: 'flex', justifyContent: 'space-between', alignItems: 'center', position:'absolute', top:0, left:0, right:0, zIndex: 20 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 15 }}>
           
           {/* LOGO - Public klasöründen okur */}
           <img 
                src="/heptapus-logo.png" 
                alt="Heptapus Group" 
                className="nav-logo-img"
                style={{ height: 40 }}
            />
            
            {/* Logo yazısı (Opsiyonel, resim yüklenmezse diye değil, tasarımın parçası olarak kalsın istersen) */}
           <div style={{ display: 'flex', alignItems: 'center', gap:10 }}>
                <span style={{ fontWeight: 900, fontSize: '1.5rem', letterSpacing: -1, color:'#fff', fontFamily: 'Inter, sans-serif' }}>
                    HEPTAPUS <span style={{color:'var(--tr-red)'}}>GROUP</span>
                </span>
           </div>
        </div>
        <div>
            <button className="btn secondary" onClick={onEnterApp} style={{ padding: '10px 24px', fontSize: '0.9rem', borderWidth: 2, fontWeight: 700, borderColor: 'rgba(255,255,255,0.3)' }}>PANELE GİRİŞ</button>
        </div>
      </nav>

      {/* Hero Section */}
      <div className="landing-hero">
        
        {/* --- LOCAL VİDEO --- */}
        {/* Dosya adı: public/turkbayragi.mp4 olmalı */}
        <div className="video-background-container">
            <div className="video-overlay"></div>
            <video autoPlay loop muted playsInline className="video-background">
                <source src={`${import.meta.env.BASE_URL}turkbayragi.mp4`} type="video/mp4" />
                Tarayıcınız video etiketini desteklemiyor.
            </video>
        </div>

        {/* İçerik */}
        <div className="landing-content-wrapper">
            <div style={{ marginBottom: 20, color: '#ff4d4d', fontWeight: 800, letterSpacing: 3, textTransform: 'uppercase', display:'flex', alignItems:'center', justifyContent:'center', gap:10, textShadow: '0 0 10px rgba(255,0,0,0.5)' }}>
                <span style={{fontSize:'1.5em'}}>🇹🇷</span> HeptaBot'a Hoş Geldiniz
            </div>
            <h1 className="landing-title">
              Kitlesel İletişim İçin <br/>
              <span style={{ color: 'var(--tr-red)', textShadow: '0 0 40px rgba(227,10,23,0.8)' }}>Nihai Çözüm.</span>
            </h1>
            <p className="landing-subtitle">
              Heptapus Mailbot, kurumsal sponsorluk görüşmelerinizi ve toplu duyurularınızı 
              tek bir komuta merkezinden yönetmenizi sağlayan, yüksek performanslı e-posta otomasyon sistemidir.
            </p>
            <button className="btn" onClick={onEnterApp} style={{ fontSize: '1.2rem', padding: '18px 45px', boxShadow: '0 10px 40px -10px var(--tr-red)', border: '1px solid rgba(255,255,255,0.2)' }}>
              OPERASYONU BAŞLAT
            </button>
        </div>
      </div>

      {/* Features Section */}
      <div className="container" style={{position:'relative', zIndex: 2}}>
        <div className="features-grid">
            <div className="feature-box">
                <div style={{ fontSize: 40, marginBottom: 15 }}>🚀</div>
                <h3>Yüksek Performans</h3>
                <p>
                    React ve FastAPI üzerinde çalışan, asenkron ve kuyruk tabanlı gönderim altyapısı ile kesintisiz iletişim.
                </p>
            </div>
            <div className="feature-box">
                <div style={{ fontSize: 40, marginBottom: 15 }}>🛡️</div>
                <h3>Yerli & Güvenli</h3>
                <p>
                    Türkiye'de geliştirilen, dışa bağımlılığı olmayan, verilerinizi koruyan güvenli yerli yazılım altyapısı.
                </p>
            </div>
            <div className="feature-box">
                <div style={{ fontSize: 40, marginBottom: 15 }}>🎯</div>
                <h3>Kişiselleştirilmiş Hedefleme</h3>
                <p>
                    Excel listelerinizi analiz edin, dinamik değişkenlerle ({'{FirmaAdı}'} gibi) kurumsal ve kişiye özel mailler gönderin.
                </p>
            </div>
        </div>

        {/* --- ATATÜRK KÖŞESİ --- */}
        <div className="ataturk-footer">
            {/* Sol taraf: Portre - Local Dosya */}
            {/* Dosya adı: public/mka.jpg olmalı */}
            <div className="ataturk-portrait-container">
                <img 
                    src="/mka.jpg" 
                    alt="Mustafa Kemal Atatürk" 
                    className="ataturk-portrait"
                />
            </div>
            {/* Sağ taraf: Söz ve İmza */}
            <div className="ataturk-quote-box">
                <p className="ataturk-quote">
                    "Vatanını en çok seven, görevini en iyi yapandır."
                </p>
                {/* İmza - Local Dosya */}
                {/* Dosya adı: public/ataturk-imza.svg olmalı */}
                <img 
                    src="/ataturk-imza.png" 
                    alt="K.Atatürk İmza" 
                    className="ataturk-signature"
                    style={{ filter: 'invert(1)', opacity: 0.9 }} 
                />
            </div>
        </div>
      </div>
    </div>
  );
}