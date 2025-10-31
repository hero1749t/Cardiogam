/* ============================================
   MAIN.JS - Common JavaScript Functions
   ============================================ */

// ========== ECG ANIMATION (Hero Section) ==========
function initHeroECG() {
    const canvas = document.getElementById('heroEcgCanvas');
    if (!canvas) return;
    
    const ctx = canvas.getContext('2d');
    let x = 0;

    // Set canvas size
    canvas.width = canvas.offsetWidth;
    canvas.height = canvas.offsetHeight;

    function drawECG() {
        // Fade effect
        ctx.fillStyle = 'rgba(0, 0, 0, 0.1)';
        ctx.fillRect(0, 0, canvas.width, canvas.height);

        // Draw ECG line
        ctx.strokeStyle = '#10b981';
        ctx.lineWidth = 2.5;
        ctx.beginPath();

        const centerY = canvas.height / 2;
        let y = centerY + Math.sin(x * 0.05) * 20;

        // Heartbeat spike (P-QRS-T wave simulation)
        if (x % 150 < 5) {
            y = centerY - 15; // P wave
        } else if (x % 150 < 10) {
            y = centerY;
        } else if (x % 150 < 15) {
            y = centerY - 100; // R peak
        } else if (x % 150 < 20) {
            y = centerY + 30; // S wave
        } else if (x % 150 < 30) {
            y = centerY;
        } else if (x % 150 < 40) {
            y = centerY - 25; // T wave
        }

        ctx.moveTo(x - 1, centerY);
        ctx.lineTo(x, y);
        ctx.stroke();

        x += 2;
        if (x > canvas.width) {
            x = 0;
            ctx.fillStyle = 'rgba(0, 0, 0, 0.3)';
            ctx.fillRect(0, 0, canvas.width, canvas.height);
        }

        requestAnimationFrame(drawECG);
    }

    drawECG();

    // Random heart rate update
    setInterval(() => {
        const hrElement = document.getElementById('heartRate');
        if (hrElement) {
            const hr = 68 + Math.floor(Math.random() * 10);
            hrElement.textContent = hr + ' BPM';
        }
    }, 2000);
}

// ========== CONNECTION BUTTONS ==========
function initConnectionButtons() {
    const wifiBtn = document.getElementById('wifiBtn');
    const bleBtn = document.getElementById('bleBtn');

    if (wifiBtn) {
        wifiBtn.addEventListener('click', function() {
            this.classList.toggle('connected');
            const statusText = this.classList.contains('connected') ? 'Connected' : 'Disconnected';
            console.log('WiFi: ' + statusText);
        });
    }

    if (bleBtn) {
        bleBtn.addEventListener('click', function() {
            this.classList.toggle('connected');
            const statusText = this.classList.contains('connected') ? 'Connected' : 'Disconnected';
            console.log('Bluetooth: ' + statusText);
        });
    }
}

// ========== SCROLL ANIMATIONS ==========
function initScrollAnimations() {
    const observerOptions = {
        threshold: 0.1,
        rootMargin: '0px 0px -100px 0px'
    };

    const observer = new IntersectionObserver((entries) => {
        entries.forEach(entry => {
            if (entry.isIntersecting) {
                entry.target.classList.add('visible');
            }
        });
    }, observerOptions);

    // Observe all elements with scroll-animate class
    document.querySelectorAll('.scroll-animate, .flow-step').forEach(el => {
        observer.observe(el);
    });
}

// ========== NAVBAR SCROLL EFFECT ==========
function initNavbarScroll() {
    const navbar = document.getElementById('navbar');
    
    window.addEventListener('scroll', () => {
        if (window.scrollY > 100) {
            navbar.classList.add('scrolled');
        } else {
            navbar.classList.remove('scrolled');
        }
    });
}

// ========== SMOOTH SCROLL ==========
function initSmoothScroll() {
    document.querySelectorAll('a[href^="#"]').forEach(anchor => {
        anchor.addEventListener('click', function (e) {
            e.preventDefault();
            const target = document.querySelector(this.getAttribute('href'));
            if (target) {
                target.scrollIntoView({
                    behavior: 'smooth',
                    block: 'start'
                });
            }
        });
    });
}

// ========== INITIALIZE ALL ON PAGE LOAD ==========
document.addEventListener('DOMContentLoaded', function() {
    console.log('CardioCheck Website Initialized');
    
    // Initialize all functions
    initHeroECG();
    initConnectionButtons();
    initScrollAnimations();
    initNavbarScroll();
    initSmoothScroll();
});

// ========== WINDOW RESIZE (Canvas) ==========
window.addEventListener('resize', function() {
    const canvas = document.getElementById('heroEcgCanvas');
    if (canvas) {
        canvas.width = canvas.offsetWidth;
        canvas.height = canvas.offsetHeight;
    }
});