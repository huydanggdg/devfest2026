/**
 * Game Manager & Main Loop cho "Office Prankster: The Face-ID Menace"
 */
class OfficePranksterGame {
    constructor() {
        this.container = document.getElementById('game-canvas-container');
        this.labelsContainer = document.getElementById('world-labels-container');

        // Khởi tạo Three.js Scene, Camera, Renderer
        this.scene = new THREE.Scene();
        this.scene.background = new THREE.Color(0x0f172a);
        this.scene.fog = new THREE.FogExp2(0x0f172a, 0.014);

        this.camera = new THREE.PerspectiveCamera(50, window.innerWidth / window.innerHeight, 0.1, 120);
        this.camera.position.set(0, 14, 26);

        this.renderer = new THREE.WebGLRenderer({ antialias: true });
        this.renderer.setSize(window.innerWidth, window.innerHeight);
        this.renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
        this.renderer.shadowMap.enabled = true;
        this.renderer.shadowMap.type = THREE.PCFSoftShadowMap;
        this.container.appendChild(this.renderer.domElement);

        // Xây dựng Thế giới 3D, Nhân vật, Bẫy & Sếp
        this.world = new window.OfficeWorld(this.scene);
        this.player = new window.PlayerCharacter(this.scene, this.world);
        this.prankSystem = new window.PrankSystem(this.scene, this.labelsContainer);
        this.bosses = [];
        this.initBosses();

        // Minigame Face-ID
        this.faceIDMinigame = new window.FaceIDMinigame(this.player, this.world, (success, skipped) => {
            this.onFaceIDFinished(success, skipped);
        });

        // Trạng thái Game
        this.gameState = 'MENU'; // 'MENU' | 'FACE_ID' | 'PLAYING' | 'ENDED'
        this.score = 0;
        this.combo = 0;
        this.comboTimer = 0;
        this.trapsTriggeredCount = 0;
        this.meltdownsCount = 0;
        this.strikes = 0;
        this.maxStrikes = 3;
        this.suspicion = 0; // 0 -> 100%

        // Thời gian ca làm việc: 8:30 AM (510 phút) -> 5:00 PM (1020 phút)
        this.workMinutes = 510;
        this.endWorkMinutes = 1020;
        this.minutesPerRealSecond = 2.6; // ~3.2 phút thời gian thực cho 1 ngày làm việc

        // Sabotage (Đang giữ phím E gài bẫy)
        this.activeSabotageTrap = null;
        this.sabotageTimer = 0;

        // Input
        this.keys = {};
        this.bindEvents();
        this.renderSidebarLists();

        this.lastTime = performance.now();
        this.animate = this.animate.bind(this);
        requestAnimationFrame(this.animate);
    }

    initBosses() {
        const bossConfigs = [
            {
                id: 'boss_it',
                name: 'Sếp Hùng (IT Lead)',
                role: 'Trùm Server',
                suitColor: 0x0284c7,
                speed: 3.1,
                viewRadius: 7.5,
                fovDeg: 68,
                waypoints: [
                    new THREE.Vector3(-15, 0, -5),
                    new THREE.Vector3(-15, 0, 5),
                    new THREE.Vector3(-7, 0, 2),
                    new THREE.Vector3(-7, 0, -3)
                ]
            },
            {
                id: 'boss_mkt',
                name: 'Sếp Lan (Marketing)',
                role: 'Bà Hoàng Deadline',
                suitColor: 0x9333ea,
                speed: 3.7,
                viewRadius: 8.0,
                fovDeg: 74,
                waypoints: [
                    new THREE.Vector3(6, 0, 5),
                    new THREE.Vector3(0, 0, -2),
                    new THREE.Vector3(16, 0, 3),
                    new THREE.Vector3(6, 0, -1)
                ]
            },
            {
                id: 'boss_ceo',
                name: 'Sếp Tổng (CEO)',
                role: 'Chủ Tịch Công Ty',
                suitColor: 0xb91c1c,
                speed: 3.4,
                viewRadius: 9.0,
                fovDeg: 80,
                waypoints: [
                    new THREE.Vector3(0, 0, -13),
                    new THREE.Vector3(9, 0, -13),
                    new THREE.Vector3(15, 0, -2),
                    new THREE.Vector3(0, 0, -3),
                    new THREE.Vector3(-4, 0, -13)
                ]
            }
        ];

        bossConfigs.forEach(cfg => {
            this.bosses.push(new window.BossAI(this.scene, this.world, cfg, this.labelsContainer));
        });
    }

    bindEvents() {
        window.addEventListener('resize', () => {
            this.camera.aspect = window.innerWidth / window.innerHeight;
            this.camera.updateProjectionMatrix();
            this.renderer.setSize(window.innerWidth, window.innerHeight);
        });

        window.addEventListener('keydown', (e) => {
            this.keys[e.code] = true;

            if (e.code === 'KeyM') {
                const muted = window.GameAudio.toggleMute();
                this.showToast(muted ? '🔇 Đã tắt âm thanh' : '🔊 Đã bật âm thanh');
            }

            if (this.gameState === 'PLAYING') {
                if (e.code === 'KeyF') {
                    this.handleWorkstationToggle();
                } else if (e.code === 'KeyE' && !e.repeat) {
                    this.handleLockerToggle();
                }
            }
        });

        window.addEventListener('keyup', (e) => {
            this.keys[e.code] = false;
            if (e.code === 'KeyE' && this.player.state === 'SABOTAGING') {
                this.cancelSabotage();
            }
        });

        document.getElementById('btn-start-game').addEventListener('click', () => {
            window.GameAudio.init();
            window.GameAudio.startBGM();
            this.startNewWorkDay();
        });

        document.getElementById('btn-restart-game').addEventListener('click', () => {
            document.getElementById('end-game-modal').classList.add('hidden');
            this.startNewWorkDay();
        });
    }

    startNewWorkDay() {
        document.getElementById('main-menu-modal').classList.add('hidden');
        document.getElementById('game-hud').classList.add('hidden');

        // Reset chỉ số ca làm việc
        this.score = 0;
        this.combo = 0;
        this.comboTimer = 0;
        this.trapsTriggeredCount = 0;
        this.meltdownsCount = 0;
        this.strikes = 0;
        this.suspicion = 0;
        this.workMinutes = 510; // 08:30 AM

        this.bosses.forEach((b, i) => {
            b.rage = 0;
            b.state = 'PATROL';
            b.group.position.copy(b.waypoints[0]);
        });

        this.prankSystem.traps.forEach(t => {
            t.state = 'READY';
            t.cooldownTimer = 0;
        });

        this.updateStrikesUI();
        this.updateScoreUI();
        this.renderSidebarLists();

        // Bước 1: Vào Minigame Chấm Công Khuôn Mặt (Face-ID) ở sảnh
        this.gameState = 'FACE_ID';
        this.faceIDMinigame.start();
    }

    onFaceIDFinished(success, skipped) {
        this.gameState = 'PLAYING';
        document.getElementById('game-hud').classList.remove('hidden');

        if (success && !skipped) {
            this.player.speedBuffTimer = 25.0;
            this.addScore(150, this.player.group.position, '🤳 CHẤM CÔNG FACE-ID HOÀN HẢO! +150');
            this.showToast('🚀 Thưởng "Nhân Viên Gương Mẫu": Tăng 25% tốc độ chạy trong 25 giây!');
        } else if (skipped) {
            this.showToast('🪪 Đã quẹt thẻ nhân viên giả! Cổng sảnh đã mở, vào phá bĩnh thôi!');
        } else {
            this.showToast('⚠️ Máy chấm công nghi ngờ khuôn mặt của bạn, nhưng cổng đã mở!');
        }
    }

    handleWorkstationToggle() {
        if (this.player.state === 'WORKING') {
            this.player.leaveWorkstation();
            return;
        }
        if (this.player.state !== 'NORMAL') return;

        // Tìm bàn làm việc gần nhất
        const nearest = this.findNearest(this.world.workstations, s => s.seatPosition, 2.3);
        if (nearest) {
            this.player.enterWorkstation(nearest);
            this.suspicion = Math.max(0, this.suspicion - 35);
            this.showToast(`⌨️ Đang ngồi giả vờ gõ phím tại: ${nearest.label}`);
        }
    }

    handleLockerToggle() {
        if (this.player.state === 'HIDING') {
            this.player.toggleLockerHide(null);
            return;
        }
        if (this.player.state !== 'NORMAL') return;

        const nearestLocker = this.findNearest(this.world.hidingSpots, l => l.position, 2.2);
        if (nearestLocker) {
            this.player.toggleLockerHide(nearestLocker);
            this.showToast(`🚪 Đã chui vào trốn trong: ${nearestLocker.label}`);
        }
    }

    findNearest(list, getPosFn, maxDist) {
        let best = null;
        let bestDist = maxDist;
        list.forEach(item => {
            const d = this.player.group.position.distanceTo(getPosFn(item));
            if (d < bestDist) {
                bestDist = d;
                best = item;
            }
        });
        return best;
    }

    updateInteractionAndSabotage(dt) {
        const promptEl = document.getElementById('hud-interact-prompt');
        const keyEl = document.getElementById('interact-key');
        const textEl = document.getElementById('interact-text');
        const sabBarWrap = document.getElementById('hud-sabotage-progress');
        const sabFill = document.getElementById('sabotage-bar-fill');

        if (this.player.state === 'HIDING') {
            promptEl.classList.remove('hidden');
            keyEl.textContent = 'E';
            textEl.textContent = 'Chui ra khỏi tủ hồ sơ';
            return;
        }

        if (this.player.state === 'WORKING') {
            promptEl.classList.add('hidden');
            return;
        }

        // Tìm bẫy có thể gài gần nhất
        const readyTrap = this.findNearest(
            this.prankSystem.traps.filter(t => t.state === 'READY'),
            t => t.position,
            2.4
        );

        // Nếu đang giữ phím E để gài bẫy
        if (readyTrap && this.keys['KeyE']) {
            this.player.state = 'SABOTAGING';
            this.activeSabotageTrap = readyTrap;
            this.sabotageTimer += dt;

            sabBarWrap.classList.remove('hidden');
            document.getElementById('sabotage-title').textContent = `🔧 Đang gài: ${readyTrap.name}...`;
            const pct = Math.min(100, (this.sabotageTimer / readyTrap.rigTime) * 100);
            sabFill.style.width = `${pct}%`;

            if (this.sabotageTimer >= readyTrap.rigTime) {
                this.prankSystem.armTrap(readyTrap);
                this.showToast(`⚡ Đã gài bẫy "${readyTrap.name}"! Mau né tầm nhìn và chờ Sếp tới!`);
                this.cancelSabotage();
                this.renderSidebarLists();
            }
            return;
        } else if (this.player.state === 'SABOTAGING') {
            this.cancelSabotage();
        }

        // Hiển thị gợi ý nút tương tác gần nhất
        if (readyTrap) {
            promptEl.classList.remove('hidden');
            keyEl.textContent = 'Giữ E';
            textEl.textContent = `Gài bẫy: ${readyTrap.name} (+${readyTrap.baseScore} Pts)`;
            return;
        }

        const nearStation = this.findNearest(this.world.workstations, s => s.seatPosition, 2.2);
        if (nearStation) {
            promptEl.classList.remove('hidden');
            keyEl.textContent = 'F';
            textEl.textContent = `Ngồi giả vờ gõ phím (${nearStation.label})`;
            return;
        }

        const nearLocker = this.findNearest(this.world.hidingSpots, l => l.position, 2.1);
        if (nearLocker) {
            promptEl.classList.remove('hidden');
            keyEl.textContent = 'E';
            textEl.textContent = `Trốn vào ${nearLocker.label}`;
            return;
        }

        promptEl.classList.add('hidden');
    }

    cancelSabotage() {
        this.player.state = 'NORMAL';
        this.activeSabotageTrap = null;
        this.sabotageTimer = 0;
        document.getElementById('hud-sabotage-progress').classList.add('hidden');
    }

    onBossTriggeredTrap(trap, boss) {
        this.prankSystem.triggerTrapOnBoss(trap, boss);
        this.trapsTriggeredCount++;

        // Tăng Combo
        this.combo++;
        this.comboTimer = 22.0; // Giữ chuỗi combo trong 22 giây

        // Áp dụng công thức điểm thưởng GDD: BaseScore * Combo * (1 + Rage/50)
        const rageBonusMult = 1 + (boss.rage / 50);
        const totalPoints = Math.round(trap.baseScore * (1 + (this.combo - 1) * 0.35) * rageBonusMult);

        this.addScore(totalPoints, boss.group.position, `💥 +${totalPoints} PTS (COMBO x${this.combo})`);
        this.showToast(`😂 ${boss.name} vừa dính bẫy "${trap.name}"! (+${totalPoints} điểm)`);

        boss.applyPrankHit(trap.baseRage * (1 + (this.combo - 1) * 0.15), (meltdownBoss) => {
            this.meltdownsCount++;
            this.addScore(800, meltdownBoss.group.position, `🌋 BÙNG NỔ 100% NỘ KHÍ! JACKPOT +800!`);
            this.showToast(`🌋 JACKPOT! ${meltdownBoss.name} tức điên 100% Nộ Khí! Coi chừng Sếp đi lùng sục!`);
        });

        this.renderSidebarLists();
    }

    handlePlayerCaughtByBoss(boss) {
        window.GameAudio.playCaughtAlert();
        this.strikes++;
        this.suspicion = 0;
        this.cancelSabotage();

        // Trừ 100 điểm nhưng không âm
        this.score = Math.max(0, this.score - 100);
        this.updateScoreUI();
        this.updateStrikesUI();

        this.spawnFloatingPopup(this.player.group.position, `🚨 BỊ BẮT QUẢ TANG! -100 PTS`);
        this.showToast(`🚨 ${boss.name} bắt quả tang bạn đang lén lút! Cảnh cáo lần ${this.strikes}/${this.maxStrikes}!`);

        // Đưa nhân vật về lại khu bàn làm việc chung
        this.player.group.position.set(0, 0, 7.5);

        if (this.strikes >= this.maxStrikes) {
            this.endGame(false, `Bạn đã bị bắt quả tang ${this.maxStrikes} lần và nhận quyết định SA THẢI ngay lập tức!`);
        }
    }

    addScore(points, worldPos, popupText) {
        this.score = Math.max(0, this.score + points);
        this.updateScoreUI();
        if (worldPos && popupText) {
            this.spawnFloatingPopup(worldPos, popupText);
        }
    }

    spawnFloatingPopup(worldPos, text) {
        const el = document.createElement('div');
        el.className = 'world-label score-floating-popup';
        el.textContent = text;
        this.labelsContainer.appendChild(el);

        const tempV = worldPos.clone();
        tempV.y += 2.8;
        tempV.project(this.camera);
        const x = (tempV.x * 0.5 + 0.5) * window.innerWidth;
        const y = (-(tempV.y * 0.5) + 0.5) * window.innerHeight;
        el.style.left = `${x}px`;
        el.style.top = `${y}px`;

        setTimeout(() => el.remove(), 1500);
    }

    updateScoreUI() {
        document.getElementById('hud-score').textContent = this.score.toLocaleString();
        const badge = document.getElementById('hud-combo-badge');
        if (this.combo > 1) {
            badge.classList.remove('hidden');
            badge.textContent = `🔥 COMBO x${this.combo}`;
        } else {
            badge.classList.add('hidden');
        }
    }

    updateStrikesUI() {
        const dots = document.querySelectorAll('#hud-strikes .strike-dot');
        dots.forEach((dot, idx) => {
            if (idx < this.strikes) dot.classList.add('lost');
            else dot.classList.remove('lost');
        });
    }

    updatePlayerStateHUD() {
        const stateEl = document.getElementById('hud-player-state');
        const iconEl = document.getElementById('hud-disguise-icon');

        switch (this.player.state) {
            case 'WORKING':
                iconEl.textContent = '⌨️';
                stateEl.textContent = 'Giả vờ làm việc';
                stateEl.className = 'card-value state-working';
                break;
            case 'HIDING':
                iconEl.textContent = '🗄️';
                stateEl.textContent = 'Đang trốn trong tủ';
                stateEl.className = 'card-value state-hiding';
                break;
            case 'SABOTAGING':
                iconEl.textContent = '🔧';
                stateEl.textContent = 'Đang gài bẫy!';
                stateEl.className = 'card-value state-sabotaging';
                break;
            default:
                if (this.player.group.position.z < -6.8) {
                    iconEl.textContent = '🕵️';
                    stateEl.textContent = 'Đột nhập Phòng CEO!';
                    stateEl.className = 'card-value state-sabotaging';
                } else {
                    iconEl.textContent = '🚶';
                    stateEl.textContent = 'Đang đi dạo';
                    stateEl.className = 'card-value state-normal';
                }
                break;
        }
    }

    renderSidebarLists() {
        const checklistEl = document.getElementById('hud-prank-checklist');
        if (checklistEl) {
            checklistEl.innerHTML = this.prankSystem.traps.map(t => {
                const cls = t.state === 'ARMED' ? 'armed' : (t.state === 'COOLDOWN' ? 'triggered' : '');
                const statusIcon = t.state === 'ARMED' ? '⚡' : (t.state === 'COOLDOWN' ? '✅' : '🔧');
                return `
                    <div class="prank-item ${cls}">
                        <span>${statusIcon} ${t.name}</span>
                        <span class="prank-pts">+${t.baseScore}</span>
                    </div>
                `;
            }).join('');
        }

        const bossListEl = document.getElementById('hud-boss-list');
        if (bossListEl) {
            bossListEl.innerHTML = this.bosses.map(b => `
                <div class="boss-mini-row">
                    <div class="boss-mini-top">
                        <span>${b.name}</span>
                        <span id="sidebar-rage-txt-${b.id}">${Math.round(b.rage)}%</span>
                    </div>
                    <div class="boss-mini-bar-bg">
                        <div class="boss-mini-bar-fill" id="sidebar-rage-bar-${b.id}" style="width: ${b.rage}%"></div>
                    </div>
                </div>
            `).join('');
        }
    }

    updateSidebarRageBars() {
        this.bosses.forEach(b => {
            const txt = document.getElementById(`sidebar-rage-txt-${b.id}`);
            const bar = document.getElementById(`sidebar-rage-bar-${b.id}`);
            if (txt) txt.textContent = `${Math.round(b.rage)}%`;
            if (bar) bar.style.width = `${Math.round(b.rage)}%`;
        });
    }

    showToast(message) {
        const container = document.getElementById('hud-toast-container');
        if (!container) return;
        const toast = document.createElement('div');
        toast.className = 'toast-msg';
        toast.textContent = message;
        container.appendChild(toast);

        setTimeout(() => {
            toast.style.opacity = '0';
            toast.style.transition = 'opacity 0.3s';
            setTimeout(() => toast.remove(), 300);
        }, 3800);
    }

    updateClock(dt) {
        this.workMinutes += this.minutesPerRealSecond * dt;
        const totalMins = Math.floor(this.workMinutes);
        const hours24 = Math.floor(totalMins / 60);
        const mins = totalMins % 60;
        const ampm = hours24 >= 12 ? 'PM' : 'AM';
        const hours12 = hours24 > 12 ? hours24 - 12 : hours24;

        document.getElementById('hud-clock').textContent =
            `${String(hours12).padStart(2, '0')}:${String(mins).padStart(2, '0')} ${ampm}`;

        const shiftPct = Math.min(100, ((this.workMinutes - 510) / (this.endWorkMinutes - 510)) * 100);
        document.getElementById('hud-shift-bar').style.width = `${shiftPct}%`;

        if (this.workMinutes >= this.endWorkMinutes) {
            this.endGame(true, 'Đúng 05:00 PM! Bạn đã hoàn thành một ngày quậy phá tưng bừng và tan làm đúng giờ!');
        }
    }

    endGame(victory, reasonText) {
        this.gameState = 'ENDED';
        document.getElementById('game-hud').classList.add('hidden');
        const modal = document.getElementById('end-game-modal');
        modal.classList.remove('hidden');

        document.getElementById('end-badge').textContent = victory ? '🎉 TAN LÀM THÀNH CÔNG' : '💥 BỊ ĐUỔI VIỆC (GAME OVER)';
        document.getElementById('end-title').textContent = victory ? 'HUYỀN THOẠI PHÁ BĨNH!' : 'BỊ SẾP TỔNG SA THẢI!';
        document.getElementById('end-reason').textContent = reasonText;

        document.getElementById('stat-final-score').textContent = this.score.toLocaleString();
        document.getElementById('stat-traps-triggered').textContent = `${this.trapsTriggeredCount} bẫy`;
        document.getElementById('stat-boss-meltdowns').textContent = `${this.meltdownsCount} lần`;

        let rank = 'Thực Tập Sinh Ngây Thơ';
        if (this.score >= 3000) rank = '👑 Ác Mộng Chốn Công Sở (S-Rank)';
        else if (this.score >= 1800) rank = '🔥 Cao Thủ Chọc Tức Sếp (A-Rank)';
        else if (this.score >= 800) rank = '😈 Nhân Viên Lươn Lẹo (B-Rank)';
        document.getElementById('stat-rank-title').textContent = rank;
    }

    updateCamera(dt) {
        if (this.gameState === 'FACE_ID') {
            // Góc quay cận cảnh 3D trực diện khuôn mặt nhân vật tại cổng Face-ID
            const targetCamPos = new THREE.Vector3(-0.45, 1.82, 15.65);
            const lookTarget = new THREE.Vector3(0.35, 1.72, 13.8);
            this.camera.position.lerp(targetCamPos, dt * 6);
            this.camera.lookAt(lookTarget);
        } else {
            // Góc nhìn Thứ 3 (Third-Person Isometric Follow Camera)
            const p = this.player.group.position;
            const targetCamPos = new THREE.Vector3(p.x, 12.5, p.z + 10.5);
            this.camera.position.lerp(targetCamPos, dt * 6);
            this.camera.lookAt(p.x, 0.8, p.z - 1.2);
        }
    }

    animate(now) {
        requestAnimationFrame(this.animate);
        const dt = Math.min(0.05, (now - this.lastTime) / 1000);
        this.lastTime = now;

        if (this.gameState === 'FACE_ID') {
            this.faceIDMinigame.update(dt, this.keys);
            this.updateCamera(dt);
            this.renderer.render(this.scene, this.camera);
            return;
        }

        if (this.gameState === 'PLAYING') {
            this.updateClock(dt);

            // Giảm thời gian giữ Combo
            if (this.combo > 0) {
                this.comboTimer -= dt;
                if (this.comboTimer <= 0) {
                    this.combo = 0;
                    this.updateScoreUI();
                }
            }

            // Cập nhật Người chơi
            this.player.update(dt, this.keys, () => {
                // Hình phạt hài hước khi ngồi giả vờ làm việc quá lâu -> Vô tình làm xong việc thật!
                this.addScore(-150, this.player.group.position, '📄 LỠ LÀM VIỆC THẬT! -150 PTS');
                this.showToast('😱 Bạn gõ phím nhập tâm quá nên vô tình làm xong báo cáo thật cho công ty! (-150 điểm Prank)');
            });

            this.updatePlayerStateHUD();
            this.updateInteractionAndSabotage(dt);

            // Cập nhật Hệ thống Bẫy
            this.prankSystem.update(dt, this.camera);

            // Cập nhật các Sếp & Kiểm tra FOV
            let maxDetectionRate = 0;
            let detectingBoss = null;

            this.bosses.forEach(boss => {
                boss.update(dt, this.player, this.prankSystem, this.camera, (trap, b) => {
                    this.onBossTriggeredTrap(trap, b);
                });

                const detectionRate = boss.evaluatePlayerInFOV(this.player);
                if (detectionRate > maxDetectionRate) {
                    maxDetectionRate = detectionRate;
                    detectingBoss = boss;
                }
            });

            // Xử lý Thanh Nghi Ngờ (Suspicion Meter)
            const suspBanner = document.getElementById('hud-suspicion-banner');
            if (maxDetectionRate > 0) {
                this.suspicion += maxDetectionRate * dt;
                suspBanner.classList.remove('hidden');
                document.getElementById('hud-suspicion-fill').style.width = `${Math.min(100, this.suspicion)}%`;

                if (this.suspicion >= 100 && detectingBoss) {
                    this.handlePlayerCaughtByBoss(detectingBoss);
                }
            } else {
                this.suspicion = Math.max(0, this.suspicion - 32 * dt);
                if (this.suspicion <= 1) {
                    suspBanner.classList.add('hidden');
                } else {
                    document.getElementById('hud-suspicion-fill').style.width = `${this.suspicion}%`;
                }
            }

            this.updateSidebarRageBars();
            this.updateCamera(dt);
        }

        this.renderer.render(this.scene, this.camera);
    }
}

window.addEventListener('DOMContentLoaded', () => {
    window.GameInstance = new OfficePranksterGame();
});
