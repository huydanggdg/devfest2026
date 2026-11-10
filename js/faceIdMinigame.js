/**
 * Cơ chế Chấm công Khuôn mặt 3D (Face-ID Check-in Minigame)
 * Người chơi nhấn giữ / nhấp nhả các phím Q, W, E, R để điều chỉnh cơ mặt 3D khớp với trạng thái yêu cầu.
 */
class FaceIDMinigame {
    constructor(player, world, onCompleted) {
        this.player = player;
        this.world = world;
        this.onCompleted = onCompleted;

        this.active = false;
        this.blendSpeed = 135;       // Tốc độ tăng/giảm cơ mặt mỗi giây
        this.tolerance = 26;         // Độ rộng vùng mục tiêu xanh lá (±26%)
        this.requiredHoldTime = 1.4; // Giữ khớp trong 1.4 giây để mở cổng
        this.holdTimer = 0;
        this.remainingTime = 25.0;

        // Danh sách biểu cảm hài hước máy chấm công yêu cầu ngẫu nhiên
        this.expressions = [
            {
                name: '😁 "Nụ Cười Công Nghiệp Đầu Tuần"',
                desc: 'Giữ phím [Q] để cười thật tươi và nhấp nhẹ [E] để nhướn mày tự tin!',
                q: 82, w: 0, e: 55, r: 0
            },
            {
                name: '😎 "Thần Thái Sếp Tổng Đi Làm"',
                desc: 'Giữ phím [E] nhướn mày cực ngầu kết hợp giữ [R] nháy mắt phồng má!',
                q: 0, w: 0, e: 85, r: 78
            },
            {
                name: '😭 "Nỗi Đau Chạy Deadline Cuối Tháng"',
                desc: 'Giữ phím [W] để mếu máo khóc lóc và nhấp [R] phồng má uất ức!',
                q: 0, w: 85, e: 0, r: 65
            },
            {
                name: '🤪 "Biểu Cảm Lươn Lẹo Xin Nghỉ Phép"',
                desc: 'Kết hợp giữ [Q] cười tươi + giữ [R] nháy mắt tinh quái!',
                q: 80, w: 0, e: 0, r: 80
            }
        ];

        this.currentTarget = this.expressions[0];
        this.weights = { q: 0, w: 0, e: 0, r: 0 };

        // Nút bỏ qua nhanh bằng thẻ giả
        const skipBtn = document.getElementById('btn-skip-faceid');
        if (skipBtn) {
            skipBtn.addEventListener('click', () => {
                if (this.active) this.finishMinigame(true, true);
            });
        }
    }

    start() {
        this.active = true;
        this.player.state = 'FACE_ID';
        this.player.group.position.set(0, 0, 13.8);
        this.player.group.rotation.y = 0; // Quay mặt về phía Camera 3D của máy chấm công

        this.weights = { q: 0, w: 0, e: 0, r: 0 };
        this.holdTimer = 0;
        this.remainingTime = 25.0;

        // Chọn ngẫu nhiên biểu cảm của ngày hôm nay
        const idx = Math.floor(Math.random() * this.expressions.length);
        this.currentTarget = this.expressions[idx];

        // Hiển thị UI
        document.getElementById('faceid-overlay').classList.remove('hidden');
        document.getElementById('faceid-target-title').textContent = `Biểu cảm: ${this.currentTarget.name}`;
        document.getElementById('faceid-target-desc').textContent = this.currentTarget.desc;

        this.renderTargetZones();
    }

    renderTargetZones() {
        const axes = ['q', 'w', 'e', 'r'];
        axes.forEach(k => {
            const targetVal = this.currentTarget[k];
            const minPct = Math.max(0, targetVal - this.tolerance);
            const maxPct = Math.min(100, targetVal + this.tolerance);
            const zoneEl = document.getElementById(`zone-${k}`);
            if (zoneEl) {
                zoneEl.style.left = `${minPct}%`;
                zoneEl.style.width = `${maxPct - minPct}%`;
            }
        });
    }

    update(dt, keys) {
        if (!this.active) return;

        this.remainingTime -= dt;
        document.getElementById('faceid-timer').textContent = `${Math.max(0, this.remainingTime).toFixed(1)}s`;

        if (this.remainingTime <= 0) {
            // Nếu hết giờ, tự động cho qua với cảnh báo hài hước để không làm gián đoạn trải nghiệm
            this.finishMinigame(false, false);
            return;
        }

        // Đọc phím Q, W, E, R để điều khiển cơ mặt
        const targetQ = keys['KeyQ'] ? 100 : 0;
        const targetW = keys['KeyW'] ? 100 : 0;
        const targetE = keys['KeyE'] ? 100 : 0;
        const targetR = keys['KeyR'] ? 100 : 0;

        const step = this.blendSpeed * dt;
        this.weights.q = this.moveTowards(this.weights.q, targetQ, step);
        this.weights.w = this.moveTowards(this.weights.w, targetW, step);
        this.weights.e = this.moveTowards(this.weights.e, targetE, step);
        this.weights.r = this.moveTowards(this.weights.r, targetR, step);

        // Áp dụng lên khuôn mặt 3D của nhân vật
        this.player.applyFacialBlendShapes(this.weights.q, this.weights.w, this.weights.e, this.weights.r);

        // Cập nhật UI thanh trượt & kiểm tra số trục khớp
        let matchedCount = 0;
        ['q', 'w', 'e', 'r'].forEach(k => {
            const val = this.weights[k];
            const target = this.currentTarget[k];
            const isMatch = Math.abs(val - target) <= this.tolerance;
            if (isMatch) matchedCount++;

            document.getElementById(`bar-${k}`).style.width = `${val}%`;
            document.getElementById(`val-${k}`).textContent = `${Math.round(val)}%`;

            const rowEl = document.getElementById(`muscle-row-${k}`);
            if (isMatch) {
                rowEl.classList.add('matched');
            } else {
                rowEl.classList.remove('matched');
            }
        });

        // Nếu cả 4 cơ mặt đều nằm trong vùng xanh lá (hoặc ít nhất 3/4 khớp sát)
        if (matchedCount === 4) {
            this.holdTimer += dt;
            if (Math.random() < 0.35) window.GameAudio.playFaceScanTick();
        } else {
            this.holdTimer = Math.max(0, this.holdTimer - dt * 0.6);
        }

        const progressPct = Math.min(100, (this.holdTimer / this.requiredHoldTime) * 100);
        document.getElementById('faceid-scan-bar-fill').style.width = `${progressPct}%`;
        document.getElementById('faceid-scan-pct').textContent = `${Math.round(progressPct)}%`;

        if (this.holdTimer >= this.requiredHoldTime) {
            this.finishMinigame(true, false);
        }
    }

    moveTowards(current, target, maxDelta) {
        if (Math.abs(target - current) <= maxDelta) return target;
        return current + Math.sign(target - current) * maxDelta;
    }

    finishMinigame(success, skipped) {
        this.active = false;
        document.getElementById('faceid-overlay').classList.add('hidden');
        this.player.resetFace();
        this.player.state = 'NORMAL';

        // Mở cổng xoay 3D ở sảnh
        this.world.unlockTurnstileGate();
        window.GameAudio.playGateSuccess();

        if (this.onCompleted) {
            this.onCompleted(success, skipped);
        }
    }
}

window.FaceIDMinigame = FaceIDMinigame;
