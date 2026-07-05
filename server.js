const http = require('http');
http.createServer((req, res) => res.end('Bot Çalışıyor!')).listen(process.env.PORT || 3000);

const { Client, LocalAuth } = require('whatsapp-web.js');
const qrcode = require('qrcode-terminal');

// Geçici bellek (Firebase bağlayana kadar sistemi test etmek için)
let dbMock = {
    odalar: {
        "1": { isim: "Oda 1", kullanici: null, baslangicZamani: null },
        "2": { isim: "Oda 2", kullanici: null, baslangicZamani: null },
        "3": { isim: "Oda 3", kullanici: null, baslangicZamani: null }
    },
    adminNumarasi: "905XXXXXXXXX@c.us" // BURAYI KENDİ NUMARANIZLA DEĞİŞTİRİN
};

const client = new Client({
    authStrategy: new LocalAuth(),
    puppeteer: {
        headless: true,
        args: [
            '--no-sandbox',
            '--disable-setuid-sandbox',
            '--disable-dev-shm-usage',
            '--disable-accelerated-2d-canvas',
            '--no-first-run',
            '--no-zygote',
            '--single-process', 
            '--disable-gpu'
        ]
    }
});

// QR Kodu terminalde göster
client.on('qr', (qr) => {
    console.log('TELEFONUNUZDAN BU QR KODU OKUTUN:');
    qrcode.generate(qr, { small: true });
});

// Başarıyla bağlandığında
client.on('ready', () => {
    console.log('✅ Bot başarıyla WhatsApp ağına bağlandı ve hazır!');
});

// Gelen mesajları dinle
client.on('message', async (message) => {
    const icerik = message.body.trim().toLowerCase();
    const gonderen = message.from;
    const gonderenIsim = message._data.notifyName || "Kullanıcı";
    
    if (message.isGroupMsg) return;

    // KOMUT 1: Durum Sorgulama
    if (icerik === "durum" || icerik === "durumum") {
        let durumMesaji = "*📋 Güncel Oda Durumları*\n\n";
        let aktifOdaVarMi = false;

        for (const [odaId, odaBilgisi] of Object.entries(dbMock.odalar)) {
            if (odaBilgisi.kullanici) {
                aktifOdaVarMi = true;
                const simdi = new Date().getTime();
                const farkDakika = Math.floor((simdi - odaBilgisi.baslangicZamani) / 60000);
                
                const saat = Math.floor(farkDakika / 60);
                const dakika = farkDakika % 60;
                const sureMetni = saat > 0 ? `${saat} saat ${dakika} dakika` : `${dakika} dakika`;

                durumMesaji += `🟢 *${odaBilgisi.isim}:* ${odaBilgisi.kullanici} (${sureMetni} süredir içeride)\n`;
            } else {
                durumMesaji += `⚪ *${odaBilgisi.isim}:* Boş\n`;
            }
        }
        if (!aktifOdaVarMi) { durumMesaji = "Şu an tüm odalar boş görünmektedir."; }
        message.reply(durumMesaji);
        return;
    }

    // KOMUT 2: Admin Oda Değiştirme
    if (icerik.startsWith("!admin")) {
        if (gonderen !== dbMock.adminNumarasi) {
            message.reply("❌ Bu komutu kullanma yetkiniz yok.");
            return;
        }
        const parcalar = message.body.split(" ");
        if (parcalar.length >= 3) {
            const odaId = parcalar[1];
            const yeniIsim = parcalar.slice(2).join(" "); 
            if (dbMock.odalar[odaId]) {
                dbMock.odalar[odaId].isim = yeniIsim;
                message.reply(`✅ Başarılı. Oda ${odaId} ismi "${yeniIsim}" olarak güncellendi.`);
            } else {
                message.reply(`❌ "${odaId}" ID'sine sahip bir oda bulunamadı.`);
            }
        }
        return;
    }

    // KOMUT 3: Odaya Giriş
    let islenecekMesaj = icerik;
    if (islenecekMesaj.startsWith("oda ")) islenecekMesaj = islenecekMesaj.replace("oda ", "");
    const kelimeler = islenecekMesaj.split(" ");
    const girilenOdaId = kelimeler[0];

    if (dbMock.odalar[girilenOdaId]) {
        let geriyeDonukDakika = 0;
        if (kelimeler.includes("dk") && kelimeler.includes("önce")) {
            const dkIndeksi = kelimeler.indexOf("dk");
            if (dkIndeksi > 0 && !isNaN(parseInt(kelimeler[dkIndeksi - 1]))) {
                geriyeDonukDakika = parseInt(kelimeler[dkIndeksi - 1]);
            }
        }
        const baslangicTarihi = new Date();
        baslangicTarihi.setMinutes(baslangicTarihi.getMinutes() - geriyeDonukDakika);
        dbMock.odalar[girilenOdaId].kullanici = gonderenIsim;
        dbMock.odalar[girilenOdaId].baslangicZamani = baslangicTarihi.getTime();

        const saatGosterimi = baslangicTarihi.toLocaleTimeString('tr-TR', { hour: '2-digit', minute: '2-digit' });
        let mesajTepkisi = (geriyeDonukDakika > 0) 
            ? `Tamamdır ${gonderenIsim}, *${dbMock.odalar[girilenOdaId].isim}* için sayacın ${geriyeDonukDakika} dakika öncesinden (${saatGosterimi}) başlatıldı. Kolay gelsin!`
            : `Tamamdır ${gonderenIsim}, *${dbMock.odalar[girilenOdaId].isim}* için sayacın şu an (${saatGosterimi}) itibarıyla başlatıldı. Kolay gelsin!`;
        
        message.reply(mesajTepkisi);
    } 
});

client.initialize();
