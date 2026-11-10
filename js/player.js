/**
 * Nhân vật Người chơi 3D (Third-Person Controller + 3D Facial BlendShapes + Stealth States)
 */
class PlayerCharacter {
    constructor(scene, world) {
        this.scene = scene;
        this.world = world;

        this.group = new THREE.Group();
        this.group.position.set(0, 0, 17.5); // Bắt đầu ở Sảnh Lễ Tân trước cổng Face-ID
        this.scene.add(this.group);

        // Trạng thái người chơi: 'FACE_ID' | 'NORMAL' | 'SABOTAGING' | 'WORKING' | 'HIDING'
        this.state = 'NORMAL';
        this.moveSpeed = 6.2;
        this.sprintMultiplier = 1.48;
        this.speedBuffTimer = 0;

        // Chỉ số cơ mặt (BlendShapes 0 -> 100) cho Minigame Face-ID
        this.faceWeights = {
            q_smile: 0,
            w_cry: 0,
            e_brow: 0,
            r_winkPuff: 0
        };

        // Cơ chế "Giả vờ làm việc" (Act Busy)
        this.activeWorkstation = null;
        this.realWorkProgress = 0; // 0 -> 100% (Đầy 100% bị trừ điểm vì lỡ làm việc thật!)
        this.activeLocker = null;

        this.walkCycle = 0;
        this.buildCharacterMesh();
    }

    buildCharacterMesh() {
        this.bodyGroup = new THREE.Group();
        this.group.add(this.bodyGroup);

        // Thân áo sơ mi trắng
        const torso = new THREE.Mesh(
            new THREE.BoxGeometry(0.75, 0.95, 0.45),
            new THREE.MeshLambertMaterial({ color: 0xf8fafc })
        );
        torso.position.y = 0.95;
        torso.castShadow = true;
        this.bodyGroup.add(torso);

        // Cà vạt đỏ thanh lịch (nhưng lệch)
        const tie = new THREE.Mesh(
            new THREE.BoxGeometry(0.14, 0.55, 0.06),
            new THREE.MeshLambertMaterial({ color: 0xef4444 })
        );
        tie.position.set(0, 0.98, 0.24);
        this.bodyGroup.add(tie);

        // Quần tây xanh đen (2 chân)
        const legGeo = new THREE.BoxGeometry(0.28, 0.55, 0.3);
        const legMat = new THREE.MeshLambertMaterial({ color: 0x1e293b });
        this.leftLeg = new THREE.Mesh(legGeo, legMat);
        this.leftLeg.position.set(-0.18, 0.28, 0);
        this.bodyGroup.add(this.leftLeg);

        this.rightLeg = new THREE.Mesh(legGeo, legMat);
        this.rightLeg.position.set(0.18, 0.28, 0);
        this.bodyGroup.add(this.rightLeg);

        // 2 Tay
        const armGeo = new THREE.BoxGeometry(0.22, 0.72, 0.22);
        const armMat = new THREE.MeshLambertMaterial({ color: 0xe2e8f0 });
        this.leftArm = new THREE.Mesh(armGeo, armMat);
        this.leftArm.position.set(-0.52, 0.95, 0);
        this.bodyGroup.add(this.leftArm);

        this.rightArm = new THREE.Mesh(armGeo, armMat);
        this.rightArm.position.set(0.52, 0.95, 0);
        this.bodyGroup.add(this.rightArm);

        // ==================== ĐẦU & CƠ MẶT 3D (BLENDSHAPES) ====================
        this.headGroup = new THREE.Group();
        this.headGroup.position.set(0, 1.72, 0);
        this.bodyGroup.add(this.headGroup);

        // Khối đầu
        const headMesh = new THREE.Mesh(
            new THREE.BoxGeometry(0.68, 0.68, 0.65),
            new THREE.MeshLambertMaterial({ color: 0xfde047 }) // Màu da hoạt hình tươi sáng
        );
        headMesh.castShadow = true;
        this.headGroup.add(headMesh);

        // Tóc công sở rẽ ngôi
        const hair = new THREE.Mesh(
            new THREE.BoxGeometry(0.72, 0.22, 0.7),
            new THREE.MeshLambertMaterial({ color: 0x1e1b4b })
        );
        hair.position.set(0, 0.32, -0.02);
        this.headGroup.add(hair);

        // Mắt trái & Mắt phải
        const eyeGeo = new THREE.BoxGeometry(0.12, 0.12, 0.05);
        const eyeMat = new THREE.MeshBasicMaterial({ color: 0x0f172a });
        this.leftEye = new THREE.Mesh(eyeGeo, eyeMat);
        this.leftEye.position.set(-0.16, 0.06, 0.33);
        this.headGroup.add(this.leftEye);

        this.rightEye = new THREE.Mesh(eyeGeo, eyeMat);
        this.rightEye.position.set(0.16, 0.06, 0.33);
        this.headGroup.add(this.rightEye);

        // Lông mày trái & phải (Biến hình khi bấm E - Cool Brow)
        const browGeo = new THREE.BoxGeometry(0.18, 0.045, 0.06);
        const browMat = new THREE.MeshBasicMaterial({ color: 0x0f172a });
        this.leftBrow = new THREE.Mesh(browGeo, browMat);
        this.leftBrow.position.set(-0.16, 0.18, 0.34);
        this.headGroup.add(this.leftBrow);

        this.rightBrow = new THREE.Mesh(browGeo, browMat);
        this.rightBrow.position.set(0.16, 0.18, 0.34);
        this.headGroup.add(this.rightBrow);

        // Miệng & Hàm răng cười (Biến hình khi bấm Q - Smile & W - Cry)
        this.mouthMesh = new THREE.Mesh(
            new THREE.BoxGeometry(0.24, 0.07, 0.05),
            new THREE.MeshBasicMaterial({ color: 0x991b1b })
        );
        this.mouthMesh.position.set(0, -0.14, 0.33);
        this.headGroup.add(this.mouthMesh);

        this.teethMesh = new THREE.Mesh(
            new THREE.BoxGeometry(0.22, 0.05, 0.055),
            new THREE.MeshBasicMaterial({ color: 0xffffff })
        );
        this.teethMesh.position.set(0, -0.14, 0.335);
        this.teethMesh.visible = false;
        this.headGroup.add(this.teethMesh);

        // Nước mắt giàn giụa khi bấm W (Cry)
        const tearGeo = new THREE.BoxGeometry(0.06, 0.18, 0.05);
        const tearMat = new THREE.MeshBasicMaterial({ color: 0x38bdf8 });
        this.leftTear = new THREE.Mesh(tearGeo, tearMat);
        this.leftTear.position.set(-0.16, -0.06, 0.34);
        this.leftTear.visible = false;
        this.headGroup.add(this.leftTear);

        this.rightTear = new THREE.Mesh(tearGeo, tearMat);
        this.rightTear.position.set(0.16, -0.06, 0.34);
        this.rightTear.visible = false;
        this.headGroup.add(this.rightTear);

        // 2 Má phồng (Biến hình khi bấm R - Wink & Puff)
        const cheekGeo = new THREE.SphereGeometry(0.13, 12, 12);
        const cheekMat = new THREE.MeshLambertMaterial({ color: 0xfb7185 });
        this.leftCheek = new THREE.Mesh(cheekGeo, cheekMat);
        this.leftCheek.position.set(-0.26, -0.08, 0.28);
        this.leftCheek.scale.set(0.01, 0.01, 0.01);
        this.headGroup.add(this.leftCheek);

        this.rightCheek = new THREE.Mesh(cheekGeo, cheekMat);
        this.rightCheek.position.set(0.26, -0.08, 0.28);
        this.rightCheek.scale.set(0.01, 0.01, 0.01);
        this.headGroup.add(this.rightCheek);
    }

    /**
     * Cập nhật BlendShapes 3D của khuôn mặt theo các trọng số Q, W, E, R (0 -> 100)
     */
    applyFacialBlendShapes(qSmile, wCry, eBrow, rWinkPuff) {
        this.faceWeights.q_smile = qSmile;
        this.faceWeights.w_cry = wCry;
        this.faceWeights.e_brow = eBrow;
        this.faceWeights.r_winkPuff = rWinkPuff;

        const q = qSmile / 100;
        const w = wCry / 100;
        const e = eBrow / 100;
        const r = rWinkPuff / 100;

        // 1. Q (Cười nhe răng) vs W (Mếu máo)
        const mouthWidth = 1 + q * 1.15 - w * 0.2;
        const mouthHeight = 1 + q * 1.4 + w * 0.9;
        this.mouthMesh.scale.set(mouthWidth, mouthHeight, 1);
        this.mouthMesh.position.y = -0.14 + q * 0.03 - w * 0.04;
        this.mouthMesh.rotation.z = w * 0.25;

        this.teethMesh.visible = q > 0.25;
        this.teethMesh.scale.set(mouthWidth * 0.95, 1 + q * 1.1, 1);
        this.teethMesh.position.y = this.mouthMesh.position.y + 0.01;

        // Nước mắt khi mếu (W)
        this.leftTear.visible = w > 0.3;
        this.rightTear.visible = w > 0.3;
        this.leftTear.scale.y = 0.5 + w * 1.5;
        this.rightTear.scale.y = 0.5 + w * 1.5;

        // 2. E (Nhướn mày cực ngầu / Lông mày chữ V)
        this.leftBrow.position.y = 0.18 + e * 0.08 - w * 0.03;
        this.rightBrow.position.y = 0.18 + e * 0.04 - w * 0.03;
        this.leftBrow.rotation.z = -e * 0.45 + w * 0.35;
        this.rightBrow.rotation.z = e * 0.55 - w * 0.35;

        // 3. R (Nháy mắt & Phồng má)
        this.rightEye.scale.y = Math.max(0.12, 1 - r * 0.9);
        this.leftEye.scale.y = 1 + e * 0.2;
        const cheekScale = 0.1 + r * 1.25;
        this.leftCheek.scale.set(cheekScale, cheekScale, cheekScale);
        this.rightCheek.scale.set(cheekScale, cheekScale, cheekScale);
    }

    resetFace() {
        this.applyFacialBlendShapes(0, 0, 0, 0);
    }

    enterWorkstation(station) {
        this.state = 'WORKING';
        this.activeWorkstation = station;
        this.group.position.copy(station.seatPosition);
        this.group.lookAt(station.lookTarget.x, this.group.position.y, station.lookTarget.z);
        document.getElementById('hud-work-panel').classList.remove('hidden');
    }

    leaveWorkstation() {
        if (this.state !== 'WORKING') return;
        this.state = 'NORMAL';
        this.activeWorkstation = null;
        this.leftArm.rotation.x = 0;
        this.rightArm.rotation.x = 0;
        document.getElementById('hud-work-panel').classList.add('hidden');
    }

    toggleLockerHide(locker) {
        if (this.state === 'HIDING') {
            this.state = 'NORMAL';
            this.group.visible = true;
            this.group.position.copy(this.activeLocker.position);
            this.activeLocker = null;
        } else {
            this.state = 'HIDING';
            this.activeLocker = locker;
            this.group.position.copy(locker.insidePosition);
            this.group.visible = false;
        }
    }

    update(dt, keys, onAccidentalRealWork) {
        if (this.speedBuffTimer > 0) {
            this.speedBuffTimer -= dt;
        }

        // Nếu đang ngồi bàn gõ phím giả vờ làm việc
        if (this.state === 'WORKING') {
            // Nếu bấm WASD thì đứng dậy rời bàn
            if (keys['KeyW'] || keys['KeyA'] || keys['KeyS'] || keys['KeyD']) {
                this.leaveWorkstation();
                return;
            }

            // Gõ phím nhanh khi giữ Space
            const typingSpeed = keys['Space'] ? 35 : 14;
            this.walkCycle += dt * typingSpeed;
            this.leftArm.rotation.x = -0.9 + Math.sin(this.walkCycle) * 0.35;
            this.rightArm.rotation.x = -0.9 + Math.cos(this.walkCycle) * 0.35;

            if (Math.random() < (keys['Space'] ? 0.35 : 0.1)) {
                window.GameAudio.playKeyClack();
            }

            // Tăng thanh "Nguy cơ làm xong việc thật"
            const workRate = keys['Space'] ? 18 : 9;
            this.realWorkProgress += workRate * dt;
            document.getElementById('hud-real-work-fill').style.width = `${Math.min(100, this.realWorkProgress)}%`;

            if (this.realWorkProgress >= 100) {
                this.realWorkProgress = 0;
                if (onAccidentalRealWork) onAccidentalRealWork();
            }
            return;
        } else {
            // Giảm dần thanh năng suất thật khi rời bàn
            this.realWorkProgress = Math.max(0, this.realWorkProgress - dt * 12);
        }

        if (this.state === 'FACE_ID' || this.state === 'HIDING' || this.state === 'SABOTAGING') {
            return;
        }

        // Di chuyển góc nhìn thứ 3 (WASD / Arrow Keys)
        let moveX = 0;
        let moveZ = 0;
        if (keys['KeyW'] || keys['ArrowUp']) moveZ -= 1;
        if (keys['KeyS'] || keys['ArrowDown']) moveZ += 1;
        if (keys['KeyA'] || keys['ArrowLeft']) moveX -= 1;
        if (keys['KeyD'] || keys['ArrowRight']) moveX += 1;

        if (moveX !== 0 || moveZ !== 0) {
            const len = Math.hypot(moveX, moveZ);
            moveX /= len;
            moveZ /= len;

            const isSprinting = keys['ShiftLeft'] || keys['ShiftRight'];
            const buffMult = this.speedBuffTimer > 0 ? 1.25 : 1.0;
            const speed = this.moveSpeed * (isSprinting ? this.sprintMultiplier : 1.0) * buffMult;

            const nextX = this.group.position.x + moveX * speed * dt;
            const nextZ = this.group.position.z + moveZ * speed * dt;

            // Kiểm tra va chạm tách trục X và Z để trượt mượt theo tường
            if (!this.world.checkCollision({ x: nextX, z: this.group.position.z })) {
                this.group.position.x = nextX;
            }
            if (!this.world.checkCollision({ x: this.group.position.x, z: nextZ })) {
                this.group.position.z = nextZ;
            }

            // Xoay nhân vật theo hướng di chuyển
            const targetAngle = Math.atan2(moveX, moveZ);
            this.group.rotation.y = targetAngle;

            // Hoạt ảnh bước chân & vung tay hài hước
            this.walkCycle += dt * (isSprinting ? 18 : 11);
            this.leftLeg.rotation.x = Math.sin(this.walkCycle) * 0.6;
            this.rightLeg.rotation.x = -Math.sin(this.walkCycle) * 0.6;
            this.leftArm.rotation.x = -Math.sin(this.walkCycle) * 0.5;
            this.rightArm.rotation.x = Math.sin(this.walkCycle) * 0.5;
            this.bodyGroup.position.y = Math.abs(Math.sin(this.walkCycle * 2)) * 0.08;
        } else {
            this.leftLeg.rotation.x = 0;
            this.rightLeg.rotation.x = 0;
            this.leftArm.rotation.x = 0;
            this.rightArm.rotation.x = 0;
            this.bodyGroup.position.y = 0;
        }
    }
}

window.PlayerCharacter = PlayerCharacter;
