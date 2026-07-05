const http = require('http');
http.createServer((req, res) => res.end('Bot Çalışıyor!')).listen(process.env.PORT || 3000);

// İŞTE EKSİK VEYA YANLIŞ YERDE OLAN SATIR BU:
const { Client, LocalAuth } = require('whatsapp-web.js'); 

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

// Kodunuzun geri kalanı buradan devam edecek...
