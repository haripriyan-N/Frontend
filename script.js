document.addEventListener('DOMContentLoaded', function () {

    // Vault
    const preloader = document.querySelector('.preloader');
    const preloaderContent = document.querySelector('.preloader-content');
    const vaultContainer = document.querySelector('.vault-perspective-container');
    const vaultDoor = document.querySelector('.vault-door');
    const mainContent = document.querySelector('.main-content');
    const handle = document.querySelector('.vault-handle');
    const scanner = document.querySelector('.fingerprint-scanner');
    const securityPanel = document.querySelector('.security-panel');
    const statusText = document.querySelector('.status-text');
    const instructions = document.querySelector('.vault-instructions p');
    const fingerprintLines = document.querySelector('.fingerprint-lines');
    const scanLine = document.querySelector('.scan-line');
    const successMark = document.querySelector('.success-mark');

    // --- State Variables ---
    let scanComplete = false;
    let isUnlocked = false;
    let scanTimeline; // To hold the GSAP timeline

    // --- Audio Synthesis ---
    const successSynth = new Tone.PolySynth(Tone.Synth, { volume: -8, oscillator: { type: "sine" }, envelope: { attack: 0.005, decay: 0.1, sustain: 0.3, release: 1 } }).toDestination();
    const boltSynth = new Tone.MetalSynth({ frequency: 80, envelope: { attack: 0.001, decay: 0.1, release: 0.05 }, harmonicity: 3.1, modulationIndex: 40, resonance: 3000, octaves: 1.5 }).toDestination();
    const doorSynth = new Tone.NoiseSynth({ noise: { type: 'brown' }, envelope: { attack: 0.1, decay: 1.4, sustain: 0, release: 0.1 } }).toDestination();
    const scannerSynth = new Tone.AMSynth({ harmonicity: 1.5, envelope: { attack: 0.01, decay: 0.2, sustain: 0.1, release: 0.1 }, modulationEnvelope: { attack: 0.1, decay: 0.1, sustain: 0.2, release: 0.1 } }).toDestination();
    const failSynth = new Tone.Synth({ oscillator: { type: "square" }, envelope: { attack: 0.01, decay: 0.2, sustain: 0, release: 0.1 } }).toDestination();


    // --- Event Listeners ---
    scanner.addEventListener('mousedown', startScan);
    scanner.addEventListener('touchstart', startScan);
    scanner.addEventListener('mouseup', cancelScan);
    scanner.addEventListener('mouseleave', cancelScan);
    scanner.addEventListener('touchend', cancelScan);
    handle.addEventListener('click', handleHandleTurn);

    function startScan(e) {
        e.preventDefault();
        if (scanComplete || isUnlocked) return;

        scannerSynth.triggerAttack("C2");
        statusText.textContent = "Scanning...";
        scanner.classList.add('scanning');

        // Create and play the GSAP timeline
        scanTimeline = gsap.timeline({
            onComplete: () => {
                scanSuccess();
            }
        });

        scanTimeline.to(scanLine, { opacity: 1, duration: 0.2 })
            .set(fingerprintLines, { filter: 'brightness(1.5)' })
            .to(fingerprintLines, {
                clipPath: 'polygon(0% 0%, 100% 0%, 100% 100%, 0% 100%)',
                duration: 2.0, // Slower scan for hold effect
                ease: 'power1.inOut'
            }, "-=0.2")
            .to(scanLine, { y: '80px', duration: 2.0, ease: 'power1.inOut' }, "<");
    }

    function cancelScan() {
        if (scanComplete || isUnlocked) return;
        if (scanTimeline && scanTimeline.isActive()) {
            scannerSynth.triggerRelease();
            failSynth.triggerAttackRelease("A2", "0.1", "+0.05");

            scanTimeline.kill();
            gsap.to([fingerprintLines, scanLine], {
                clearProps: "all",
                duration: 0.3
            });

            scanner.classList.add('fail');
            statusText.textContent = "Scan Failed";

            setTimeout(() => {
                scanner.classList.remove('scanning')
                scanner.classList.remove('fail');
                statusText.textContent = "Awaiting Scan";
            }, 1000);
        }
    }

    function scanSuccess() {
        if (scanComplete) return;
        scanComplete = true;
        scanner.style.cursor = 'default';
        scannerSynth.triggerRelease();

        const tl = gsap.timeline({ onComplete: activateHandle });

        tl.to(fingerprintLines, { filter: 'brightness(1)', duration: 0.3 })
            .to(scanLine, { opacity: 0, duration: 0.3 })
            .set(statusText, { textContent: "Verified" })
            .fromTo(successMark,
                { scale: 0, opacity: 0 },
                { scale: 1, opacity: 1, duration: 0.5, ease: 'back.out(1.7)' }
            )
            .to(securityPanel, {
                opacity: 0,
                scale: 0.9,
                duration: 0.5,
                ease: "power2.in",
                onComplete: () => {
                    securityPanel.style.display = "none";
                }
            })
            .fromTo(vaultContainer,
                { display: "none", opacity: 0, scale: 0.9 },
                { display: "block", opacity: 1, scale: 1, duration: 0.6, ease: "power2.out" }
            );

    }


    function activateHandle() {
        successSynth.triggerAttackRelease(["C4", "E4", "G4"], "0.5", Tone.now());
        instructions.textContent = "Click Handle to Open";
        handle.classList.add('active');
    }

    function handleHandleTurn() {
        if (!scanComplete || isUnlocked) return;
        isUnlocked = true;

        handle.classList.remove('active');

        const tl = gsap.timeline();
        tl.to(handle, {
            rotation: 120,
            duration: 0.5,
            ease: 'power2.inOut'
        }, "-=0.2")
            .call(() => boltSynth.triggerAttackRelease("C2", "0.2", Tone.now()))
            .call(openDoor);

        securityPanel.style.display = "none";
    }

    function openDoor() {
        doorSynth.triggerAttack(Tone.now());

        vaultDoor.classList.add('is-unlocked');
        setTimeout(() => {
            mainContent.style.display = 'block';

            const revealTl = gsap.timeline({
                onComplete: () => {
                    setTimeout(() => preloader.remove(), 500);
                }
            });

            revealTl.to(preloaderContent, {
                scale: 15,
                duration: 1.0,
                ease: 'power3.in'
            })
                .to(mainContent, {
                    opacity: 1,
                    duration: 1.0,
                    ease: 'power1.out'
                })
                .to(preloader, {
                    opacity: 0,
                    duration: 0.5
                }, "<");

        }, 600);
    }

    // Mobile Menu
    const hamburger = document.querySelector('.hamburger');
    const mobileMenu = document.querySelector('.mobile-menu');
    const closeMobileMenu = document.querySelector('.close-mobile-menu');
    const mobileMenuLinks = document.querySelectorAll('.mobile-nav-link');

    hamburger.addEventListener('click', function () {
        this.classList.toggle('active');
        mobileMenu.classList.toggle('active');
        document.body.classList.toggle('no-scroll');
    });

    closeMobileMenu.addEventListener('click', function () {
        hamburger.classList.remove('active');
        mobileMenu.classList.remove('active');
        document.body.classList.remove('no-scroll');
    });

    mobileMenuLinks.forEach(link => {
        link.addEventListener('click', function () {
            hamburger.classList.remove('active');
            mobileMenu.classList.remove('active');
            document.body.classList.remove('no-scroll');
        });
    });

    // Sticky Header
    const header = document.querySelector('.header');

    window.addEventListener('scroll', function () {
        if (window.scrollY > 100) {
            header.classList.add('scrolled');
        } else {
            header.classList.remove('scrolled');
        }
    });

    // Back to Top Button
    const backToTopBtn = document.querySelector('.back-to-top');

    window.addEventListener('scroll', function () {
        if (window.scrollY > 300) {
            backToTopBtn.classList.add('active');
        } else {
            backToTopBtn.classList.remove('active');
        }
    });

    backToTopBtn.addEventListener('click', function (e) {
        e.preventDefault();
        window.scrollTo({
            top: 0,
            behavior: 'smooth'
        });
    });

    // Smooth Scrolling for Navigation Links
    const navLinks = document.querySelectorAll('.nav-link, .mobile-nav-link');

    navLinks.forEach(link => {
        link.addEventListener('click', function (e) {
            if (this.getAttribute('href').startsWith('#')) {
                e.preventDefault();

                const targetId = this.getAttribute('href');
                const targetElement = document.querySelector(targetId);

                if (targetElement) {
                    window.scrollTo({
                        top: targetElement.offsetTop - 80,
                        behavior: 'smooth'
                    });
                }
            }
        });
    });

    // Account Tabs
    const tabBtns = document.querySelectorAll('.tab-btn');
    const tabPanes = document.querySelectorAll('.tab-pane');

    tabBtns.forEach(btn => {
        btn.addEventListener('click', function () {
            const tabId = this.getAttribute('data-tab');

            // Remove active class from all buttons and panes
            tabBtns.forEach(btn => btn.classList.remove('active'));
            tabPanes.forEach(pane => pane.classList.remove('active'));

            // Add active class to clicked button and corresponding pane
            this.classList.add('active');
            document.getElementById(tabId).classList.add('active');
        });
    });

    // Initialize Swiper Sliders
    const accountSwiper = new Swiper('.account-cards-slider', {
        slidesPerView: 1,
        spaceBetween: 20,
        pagination: {
            el: '.swiper-pagination',
            clickable: true,
        },
        breakpoints: {
            768: {
                slidesPerView: 2,
            },
            1024: {
                slidesPerView: 3,
            }
        }
    });

    const testimonialSwiper = new Swiper('.testimonials-slider', {
        slidesPerView: 1,
        spaceBetween: 30,
        pagination: {
            el: '.swiper-pagination',
            clickable: true,
        },
        breakpoints: {
            768: {
                slidesPerView: 2,
            }
        }
    });

    const appScreenSwiper = new Swiper('.app-screen-slider', {
        slidesPerView: 1,
        spaceBetween: 10,
        loop: true,
        autoplay: {
            delay: 3000,
            disableOnInteraction: false,
        },
        pagination: {
            el: '.swiper-pagination',
            clickable: true,
        }
    });

    // Animated Counter for Stats
    const statNumbers = document.querySelectorAll('.stat-number');

    function animateCounters() {
        statNumbers.forEach(stat => {
            const target = parseInt(stat.getAttribute('data-count'));
            const suffix = stat.getAttribute('data-suffix') || '';
            const duration = 2000;
            const step = target / (duration / 16);
            let current = 0;

            const counter = setInterval(() => {
                current += step;
                if (current >= target) {
                    clearInterval(counter);
                    current = target;
                }

                if (target % 1 === 0) {
                    stat.textContent = Math.floor(current) + suffix;
                } else {
                    stat.textContent = current.toFixed(1) + suffix;
                }
            }, 16);
        });
    }

    // Intersection Observer for Animations
    const observerOptions = {
        threshold: 0.1
    };

    const observer = new IntersectionObserver((entries) => {
        entries.forEach(entry => {
            if (entry.isIntersecting) {
                if (entry.target.querySelector('.stats-grid')) {
                    animateCounters();
                }
                entry.target.classList.add('fade-in');
                observer.unobserve(entry.target);
            }
        });
    }, observerOptions);

    document.querySelectorAll('section').forEach(section => {
        observer.observe(section);
    });

    // Initialize Chart.js
    const investmentChart = document.getElementById('investmentChart');

    if (investmentChart) {
        const ctx = investmentChart.getContext('2d');
        const chart = new Chart(ctx, {
            type: 'doughnut',
            data: {
                labels: ['Stocks', 'Bonds', 'Real Estate', 'Commodities', 'Cash'],
                datasets: [{
                    data: [35, 25, 20, 15, 5],
                    backgroundColor: [
                        '#2563EB',
                        '#3B82F6',
                        '#60A5FA',
                        '#93C5FD',
                        '#BFDBFE'
                    ],
                    borderWidth: 0
                }]
            },
            options: {
                responsive: true,
                maintainAspectRatio: false,
                cutout: '70%',
                plugins: {
                    legend: {
                        display: false
                    },
                    tooltip: {
                        callbacks: {
                            label: function (context) {
                                return `${context.label}: ${context.raw}%`;
                            }
                        }
                    }
                }
            }
        });
    }

    // Form Submission
    const contactForm = document.getElementById('bankContactForm');

    if (contactForm) {
        contactForm.addEventListener('submit', function (e) {
            e.preventDefault();

            // Simulate form submission
            const submitBtn = this.querySelector('button[type="submit"]');
            const originalText = submitBtn.textContent;

            submitBtn.disabled = true;
            submitBtn.textContent = 'Sending...';

            setTimeout(() => {
                submitBtn.textContent = 'Message Sent!';
                this.reset();

                setTimeout(() => {
                    submitBtn.textContent = originalText;
                    submitBtn.disabled = false;
                }, 2000);
            }, 1500);
        });
    }
});