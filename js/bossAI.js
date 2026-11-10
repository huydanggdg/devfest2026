/**
 * Hệ thống AI của các Sếp (Boss FOV 3-Stage Algorithm + Rage Meter + Patrol State Machine)
 */
class BossAI {
    constructor(scene, world, config, labelsContainer) {
        this.scene = scene;
        this.world = world;
        this.id = config.id;
        this.name = config.name;
        this.role = config.role;
        this.suitColor = config.suitColor;
        this.baseSpeed = config.speed;
        this.baseViewRadius = config.viewRadius;
        this.baseFovDeg = config.fovDeg;
        this.waypoints = config.waypoints;
        this.currentWaypointIdx = 0;

        // Chỉ số Nộ Khí (0 -> 100) & Trạng thái AI
        this.rage = 0;
        this.state = 'PATROL'; // 'PATROL' | 'INVESTIGATE_TRAP' | 'STUNNED' | 'BERSERK'
        this.stunTimer = 0;
        this.berserkTimer = 0;
        this.targetTrap = null;
        this.walkCycle = 0;

        this.raycaster = new THREE.Raycaster();
        this.forwardVec = new THREE.Vector3(0, 0, 1);

        this.group = new THREE.Group();
        this.group.position.copy(this.waypoints[0]);
        this.scene.add(this.group);

        this.buildBossMesh();
        this.buildViewConeMesh();
        this.buildFloatingHUD(labelsContainer);
    }

    buildBossMesh() {
        this.bodyGroup = new THREE.Group();
        this.group.add(this.bodyGroup);

        // Thân áo Vest Sếp (To lớn, oai vệ hơn nhân viên)
        const torso = new THREE.Mesh(
            new THREE.BoxGeometry(0.92, 1.1, 0.55),
            new THREE.MeshLambertMaterial({ color: this.suitColor })
        );
        torso.position.y = 1.05;
        torso.castShadow = true;
        this.bodyGroup.add(torso);

        // Cà vạt vàng quyền lực
        const tie = new THREE.Mesh(
            new THREE.BoxGeometry(0.18, 0.65, 0.06),
            new THREE.MeshLambertMaterial({ color: 0xfacc15 })
        );
        tie.position.set(0, 1.08, 0.29);
        this.bodyGroup.add(tie);

        // Đầu Sếp
        this.headMesh = new THREE.Mesh(
            new THREE.BoxGeometry(0.75, 0.75, 0.72),
            new THREE.MeshLambertMaterial({ color: 0xfca5a5 })
        );
        this.headMesh.position.set(0, 1.92, 0);
        this.headMesh.castShadow = true;
        this.bodyGroup.add(this.headMesh);

        // Lông mày dữ dằn chữ V của Sếp
        const browGeo = new THREE.BoxGeometry(0.24, 0.06, 0.06);
        const browMat = new THREE.MeshBasicMaterial({ color: 0x0f172a });
        const leftBrow = new THREE.Mesh(browGeo, browMat);
        leftBrow.position.set(-0.16, 2.02, 0.37);
        leftBrow.rotation.z = -0.35;
        this.bodyGroup.add(leftBrow);

        const rightBrow = new THREE.Mesh(browGeo, browMat);
        rightBrow.position.set(0.16, 2.02, 0.37);
        rightBrow.rotation.z = 0.35;
        this.bodyGroup.add(rightBrow);

        // Chân trái & phải
        const legGeo = new THREE.BoxGeometry(0.32, 0.6, 0.34);
        const legMat = new THREE.MeshLambertMaterial({ color: 0x0f172a });
        this.leftLeg = new THREE.Mesh(legGeo, legMat);
        this.leftLeg.position.set(-0.22, 0.3, 0);
        this.bodyGroup.add(this.leftLeg);

        this.rightLeg = new THREE.Mesh(legGeo, legMat);
        this.rightLeg.position.set(0.22, 0.3, 0);
        this.bodyGroup.add(this.rightLeg);
    }

    /**
     * Tạo hình nón tầm nhìn 3D (View Cone) trải trên mặt sàn
     */
    buildViewConeMesh() {
        const radius = this.baseViewRadius;
        const fovRad = THREE.MathUtils.degToRad(this.baseFovDeg);
        const segments = 24;

        const geometry = new THREE.BufferGeometry();
        const vertices = [0, 0.04, 0]; // Đỉnh hình nón tại chân Sếp

        for (let i = 0; i <= segments; i++) {
            const angle = -fovRad / 2 + (i / segments) * fovRad;
            const x = Math.sin(angle) * radius;
            const z = Math.cos(angle) * radius;
            vertices.push(x, 0.04, z);
        }

        const indices = [];
        for (let i = 1; i <= segments; i++) {
            indices.push(0, i, i + 1);
        }

        geometry.setAttribute('position', new THREE.Float32BufferAttribute(vertices, 3));
        geometry.setIndex(indices);

        this.coneMaterial = new THREE.MeshBasicMaterial({
            color: 0xfacc15,
            transparent: true,
            opacity: 0.24,
            side: THREE.DoubleSide,
            depthWrite: false
        });

        this.viewConeMesh = new THREE.Mesh(geometry, this.coneMaterial);
        this.group.add(this.viewConeMesh);
    }

    buildFloatingHUD(container) {
        this.hudEl = document.createElement('div');
        this.hudEl.className = 'world-label boss-floating-hud';
        this.hudEl.innerHTML = `
            <div class="boss-floating-name">👔 ${this.name}</div>
            <div class="boss-floating-state" id="boss-state-${this.id}">Đang đi tuần</div>
            <div class="boss-rage-track">
                <div class="boss-rage-fill" id="boss-rage-${this.id}"></div>
            </div>
        `;
        container.appendChild(this.hudEl);
    }

    /**
     * THUẬT TOÁN 3 TẦNG KIỂM TRA TẦM NHÌN CỦA SẾP (3-STAGE ENEMY FOV)
     * Trả về mức độ phát hiện (0 = Không thấy/An toàn, >0 = Tốc độ tăng nghi ngờ)
     */
    evaluatePlayerInFOV(player) {
        if (this.state === 'STUNNED') return 0;
        if (player.state === 'HIDING' || player.state === 'WORKING' || player.state === 'FACE_ID') {
            return 0; // Đang trốn trong tủ hoặc đang gõ phím chăm chỉ thì Sếp không nghi ngờ
        }

        // Chỉ bắt lỗi khi người chơi:
        // 1) Đang lén gài bẫy (SABOTAGING), HOẶC
        // 2) Đang đột nhập vào Phòng Giám Đốc (z < -6.5), HOẶC
        // 3) Sếp đang ở trạng thái BERSERK (Bùng nổ 100% Nộ khí - thấy nhân viên lảng vảng gần là mắng!)
        const inCEOForbiddenZone = player.group.position.z < -6.8;
        const isSuspiciousBehavior = (player.state === 'SABOTAGING') || inCEOForbiddenZone || (this.state === 'BERSERK');

        if (!isSuspiciousBehavior) return 0;

        const bossPos = this.group.position;
        const playerPos = player.group.position;

        // --- TẦNG 1: Kiểm tra Khoảng cách (Distance Check) ---
        const dx = playerPos.x - bossPos.x;
        const dz = playerPos.z - bossPos.z;
        const dist = Math.hypot(dx, dz);
        const activeRadius = this.state === 'BERSERK' ? this.baseViewRadius * 1.2 : this.baseViewRadius;

        if (dist > activeRadius || dist < 0.01) return 0;

        // --- TẦNG 2: Kiểm tra Góc hình nón bằng Tích vô hướng (Dot Product Angle Check) ---
        const dirToPlayerX = dx / dist;
        const dirToPlayerZ = dz / dist;

        // Hướng nhìn thẳng hiện tại của Sếp
        const forwardX = Math.sin(this.group.rotation.y);
        const forwardZ = Math.cos(this.group.rotation.y);

        const dot = forwardX * dirToPlayerX + forwardZ * dirToPlayerZ;
        const halfFovRad = THREE.MathUtils.degToRad((this.state === 'BERSERK' ? this.baseFovDeg + 20 : this.baseFovDeg) * 0.5);
        const cosHalfFov = Math.cos(halfFovRad);

        if (dot < cosHalfFov) return 0; // Nằm ngoài góc hình nón

        // --- TẦNG 3: Kiểm tra Vật cản che khuất bằng Raycast 3D (Raycast Occlusion Check) ---
        const eyeOrigin = new THREE.Vector3(bossPos.x, 1.6, bossPos.z);
        const targetChest = new THREE.Vector3(playerPos.x, 1.2, playerPos.z);
        const rayDir = targetChest.sub(eyeOrigin).normalize();

        this.raycaster.set(eyeOrigin, rayDir);
        this.raycaster.far = dist;

        const hits = this.raycaster.intersectObjects(this.world.obstacleMeshes, false);
        if (hits.length > 0) {
            return 0; // Bị tường hoặc vách ngăn Cubicle che khuất!
        }

        // Người chơi bị nhìn thấy! Tính tốc độ tăng thanh Nghi Ngờ dựa theo khoảng cách & hành vi
        const proximityFactor = 1.2 - (dist / activeRadius);
        const actionMultiplier = player.state === 'SABOTAGING' ? 2.4 : 1.15;
        return 55 * proximityFactor * actionMultiplier;
    }

    /**
     * Khi Sếp dẫm phải bẫy của người chơi
     */
    applyPrankHit(rageGain, onMeltdownCallback) {
        this.state = 'STUNNED';
        this.stunTimer = 3.2;
        this.targetTrap = null;

        this.rage = Math.min(100, this.rage + rageGain);
        this.headMesh.material.color.setHex(0xef4444); // Mặt Sếp đỏ gay vì tức

        if (this.rage >= 100) {
            // Kích hoạt sự kiện BÙNG NỔ NỘ KHÍ (MELTDOWN 100%)
            window.GameAudio.playBossMeltdown();
            this.berserkTimer = 14.0;
            if (onMeltdownCallback) onMeltdownCallback(this);
        }
    }

    update(dt, player, prankSystem, camera, onTrapTriggeredByBoss) {
        // Hạ nhiệt Nộ khí tự nhiên chậm rãi theo thời gian
        if (this.state !== 'STUNNED' && this.state !== 'BERSERK' && this.rage > 0) {
            // Nếu Sếp đang ở khu Pantry (x > 12) thì hạ hỏa nhanh hơn
            const decayRate = this.group.position.x > 12 ? 2.2 : 0.8;
            this.rage = Math.max(0, this.rage - decayRate * dt);
        }

        // Xử lý trạng thái Bị choáng do dính bẫy (STUNNED)
        if (this.state === 'STUNNED') {
            this.stunTimer -= dt;
            this.group.rotation.y += dt * 14; // Xoay vòng vòng hài hước
            this.bodyGroup.position.y = Math.abs(Math.sin(this.stunTimer * 12)) * 0.35;
            this.coneMaterial.color.setHex(0xef4444);

            if (this.stunTimer <= 0) {
                this.bodyGroup.position.y = 0;
                if (this.berserkTimer > 0) {
                    this.state = 'BERSERK';
                } else {
                    this.state = 'PATROL';
                    this.headMesh.material.color.setHex(0xfca5a5);
                }
            }
            this.updateHUD(camera);
            return;
        }

        // Xử lý trạng thái Bùng nổ 100% Nộ khí (BERSERK)
        if (this.state === 'BERSERK') {
            this.berserkTimer -= dt;
            this.coneMaterial.color.setHex(0xef4444);
            this.coneMaterial.opacity = 0.38;
            if (this.berserkTimer <= 0) {
                this.state = 'PATROL';
                this.rage = 35; // Sau khi xả giận xong tụt về 35%
                this.headMesh.material.color.setHex(0xfca5a5);
                this.coneMaterial.color.setHex(0xfacc15);
                this.coneMaterial.opacity = 0.24;
            }
        } else {
            this.coneMaterial.color.setHex(this.rage > 60 ? 0xf97316 : 0xfacc15);
        }

        // Kiểm tra xem có bẫy nào ĐÃ GÀI (ARMED) ở gần (< 13m) để Sếp tò mò đi tới kiểm tra không
        if (!this.targetTrap || this.targetTrap.state !== 'ARMED') {
            this.targetTrap = null;
            let closestDist = 13.5;
            prankSystem.traps.forEach(t => {
                if (t.state === 'ARMED') {
                    const d = this.group.position.distanceTo(t.position);
                    if (d < closestDist) {
                        closestDist = d;
                        this.targetTrap = t;
                    }
                }
            });
        }

        // Xác định điểm đến tiếp theo (Bẫy đã gài hoặc Waypoint tuần tra)
        const targetPos = this.targetTrap ? this.targetTrap.position : this.waypoints[this.currentWaypointIdx];
        const dx = targetPos.x - this.group.position.x;
        const dz = targetPos.z - this.group.position.z;
        const dist = Math.hypot(dx, dz);

        if (dist < 1.15) {
            if (this.targetTrap && this.targetTrap.state === 'ARMED') {
                // Sếp đã bước tới bẫy -> KÍCH HOẠT BẪY!
                const triggeredTrap = this.targetTrap;
                this.targetTrap = null;
                if (onTrapTriggeredByBoss) {
                    onTrapTriggeredByBoss(triggeredTrap, this);
                }
                this.updateHUD(camera);
                return;
            } else {
                // Chuyển sang điểm tuần tra tiếp theo
                this.currentWaypointIdx = (this.currentWaypointIdx + 1) % this.waypoints.length;
            }
        } else {
            // Di chuyển Sếp về phía mục tiêu
            const speedMult = this.state === 'BERSERK' ? 1.42 : (1 + (this.rage / 100) * 0.25);
            const moveStep = this.baseSpeed * speedMult * dt;
            this.group.position.x += (dx / dist) * moveStep;
            this.group.position.z += (dz / dist) * moveStep;

            // Xoay hướng nhìn của Sếp mượt mà
            const desiredAngle = Math.atan2(dx, dz);
            this.group.rotation.y = this.lerpAngle(this.group.rotation.y, desiredAngle, dt * 6);

            // Hoạt ảnh bước đi của Sếp
            this.walkCycle += dt * 9 * speedMult;
            this.leftLeg.rotation.x = Math.sin(this.walkCycle) * 0.5;
            this.rightLeg.rotation.x = -Math.sin(this.walkCycle) * 0.5;
        }

        this.updateHUD(camera);
    }

    lerpAngle(a, b, t) {
        let diff = b - a;
        while (diff < -Math.PI) diff += Math.PI * 2;
        while (diff > Math.PI) diff -= Math.PI * 2;
        return a + diff * Math.min(1, t);
    }

    updateHUD(camera) {
        const stateTextEl = document.getElementById(`boss-state-${this.id}`);
        const rageBarEl = document.getElementById(`boss-rage-${this.id}`);

        if (stateTextEl) {
            if (this.state === 'STUNNED') {
                stateTextEl.textContent = '😵 ĐANG DÍNH BẪY!';
                stateTextEl.style.color = '#facc15';
            } else if (this.state === 'BERSERK') {
                stateTextEl.textContent = '🤬 BÙNG NỔ NỘ KHÍ!';
                stateTextEl.style.color = '#ef4444';
            } else if (this.targetTrap) {
                stateTextEl.textContent = '🤨 Đang đi kiểm tra...';
                stateTextEl.style.color = '#fb923c';
            } else {
                stateTextEl.textContent = `Đi tuần (${Math.round(this.rage)}% Nộ)`;
                stateTextEl.style.color = '#38bdf8';
            }
        }

        if (rageBarEl) {
            rageBarEl.style.width = `${Math.round(this.rage)}%`;
        }

        // Chiếu vị trí trên đầu Sếp ra màn hình 2D
        const tempV = this.group.position.clone();
        tempV.y += 2.65;
        tempV.project(camera);

        if (tempV.z > 1) {
            this.hudEl.style.display = 'none';
            return;
        }

        const x = (tempV.x * 0.5 + 0.5) * window.innerWidth;
        const y = (-(tempV.y * 0.5) + 0.5) * window.innerHeight;
        this.hudEl.style.display = 'block';
        this.hudEl.style.left = `${x}px`;
        this.hudEl.style.top = `${y}px`;
    }
}

window.BossAI = BossAI;
