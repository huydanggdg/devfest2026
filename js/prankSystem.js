/**
 * Hệ thống Bẫy Công Sở (Prank & Trap System)
 * Bao gồm 8 bẫy công nghệ & văn phòng độc đáo với hiệu ứng 3D trực quan.
 */
class PrankSystem {
    constructor(scene, worldLabelsContainer) {
        this.scene = scene;
        this.labelsContainer = worldLabelsContainer;
        this.traps = [];
        this.animatedEffects = [];

        this.initAllPrankTraps();
    }

    initAllPrankTraps() {
        const definitions = [
            {
                id: 'cat_deepfake',
                name: '1. Deepfake Filter Mèo Họp Zoom',
                room: 'Phòng CEO',
                position: new THREE.Vector3(-2, 0, -14.5),
                baseScore: 350,
                baseRage: 34,
                rigTime: 1.4,
                type: 'laptop',
                desc: 'Biến mặt Sếp Tổng thành mèo khóc nhè khi họp cổ đông!'
            },
            {
                id: 'hydraulic_chair',
                name: '2. Ghế Công Thái Học Phóng Tên Lửa',
                room: 'Phòng CEO',
                position: new THREE.Vector3(2.5, 0, -14.5),
                baseScore: 500,
                baseRage: 45,
                rigTime: 1.7,
                type: 'chair',
                desc: 'Bơm quá áp suất bình khí nén làm ghế xoay bắn Sếp lên trần nhà!'
            },
            {
                id: 'phantom_mouse',
                name: '3. USB Chuột Ma & Phím Vũ Trường',
                room: 'Khu Marketing',
                position: new THREE.Vector3(6.8, 0, 4.2),
                baseScore: 250,
                baseRage: 25,
                rigTime: 1.1,
                type: 'pc_rgb',
                desc: 'Làm con trỏ chuột tự xóa báo cáo và nháy đèn RGB loạn xạ!'
            },
            {
                id: 'rogue_speaker',
                name: '4. Loa Trợ Lý Ảo AI "Phản Chủ"',
                room: 'Khu Chung',
                position: new THREE.Vector3(0, 0, -2.5),
                baseScore: 400,
                baseRage: 36,
                rigTime: 1.3,
                type: 'speaker',
                desc: 'Phát loa nhắc Sếp đi bôi thuốc kèm nhạc sàn cực mạnh!'
            },
            {
                id: 'infinite_copier',
                name: '5. Máy Photocopy Phun Meme Vô Hạn',
                room: 'Hành Lang Giữa',
                position: new THREE.Vector3(-7.5, 0, 2.2),
                baseScore: 320,
                baseRage: 30,
                rigTime: 1.4,
                type: 'copier',
                desc: 'In 999 tờ ảnh meme chế mặt Sếp bay ngập kín văn phòng!'
            },
            {
                id: 'server_unplug',
                name: '6. Rút Cáp Quang Máy Chủ Server',
                room: 'Phòng IT',
                position: new THREE.Vector3(-17, 0, -6.5),
                baseScore: 420,
                baseRage: 38,
                rigTime: 1.5,
                type: 'server',
                desc: 'Đánh sập mạng nội bộ khiến Sếp IT hoảng loạn chạy đi sửa!'
            },
            {
                id: 'spicy_coffee',
                name: '7. Máy Pha Cà Phê Muối Ớt Siêu Cay',
                room: 'Khu Pantry',
                position: new THREE.Vector3(17.5, 0, 2.5),
                baseScore: 300,
                baseRage: 32,
                rigTime: 1.2,
                type: 'coffee',
                desc: 'Sếp đi uống cà phê hạ hỏa nhưng lại bị cay xè bốc khói đầu!'
            },
            {
                id: 'meme_projector',
                name: '8. Máy Chiếu Slide Bảng Lương Ảo',
                room: 'Khu Pantry / Họp',
                position: new THREE.Vector3(15.5, 0, -2.8),
                baseScore: 280,
                baseRage: 28,
                rigTime: 1.2,
                type: 'projector',
                desc: 'Chiếu ảnh Sếp đang ngủ gật lên màn hình lớn toàn công ty!'
            }
        ];

        definitions.forEach(def => {
            const trapObj = this.createTrapMesh(def);
            this.traps.push(trapObj);
        });
    }

    createTrapMesh(def) {
        const group = new THREE.Group();
        group.position.copy(def.position);

        // Vòng tròn phát sáng dưới sàn báo hiệu vị trí bẫy
        const ringGeo = new THREE.RingGeometry(0.85, 1.08, 24);
        const ringMat = new THREE.MeshBasicMaterial({
            color: 0x06b6d4,
            side: THREE.DoubleSide,
            transparent: true,
            opacity: 0.7
        });
        const ringMesh = new THREE.Mesh(ringGeo, ringMat);
        ringMesh.rotation.x = -Math.PI / 2;
        ringMesh.position.y = 0.03;
        group.add(ringMesh);

        let mainProp = null;

        // Xây dựng mô hình 3D riêng biệt cho từng loại bẫy công nghệ
        switch (def.type) {
            case 'laptop': {
                const desk = new THREE.Mesh(
                    new THREE.BoxGeometry(2.4, 0.85, 1.2),
                    new THREE.MeshLambertMaterial({ color: 0x78350f })
                );
                desk.position.y = 0.42;
                group.add(desk);

                mainProp = new THREE.Mesh(
                    new THREE.BoxGeometry(0.7, 0.48, 0.08),
                    new THREE.MeshBasicMaterial({ color: 0x38bdf8 })
                );
                mainProp.position.set(0, 1.1, 0);
                group.add(mainProp);
                break;
            }
            case 'chair': {
                mainProp = new THREE.Group();
                const seat = new THREE.Mesh(
                    new THREE.BoxGeometry(0.85, 0.15, 0.85),
                    new THREE.MeshLambertMaterial({ color: 0xdc2626 })
                );
                seat.position.y = 0.65;
                mainProp.add(seat);

                const back = new THREE.Mesh(
                    new THREE.BoxGeometry(0.85, 0.95, 0.15),
                    new THREE.MeshLambertMaterial({ color: 0x991b1b })
                );
                back.position.set(0, 1.15, -0.35);
                mainProp.add(back);

                const cylinder = new THREE.Mesh(
                    new THREE.CylinderGeometry(0.12, 0.12, 0.6, 10),
                    new THREE.MeshLambertMaterial({ color: 0x94a3b8 })
                );
                cylinder.position.y = 0.3;
                mainProp.add(cylinder);
                group.add(mainProp);
                break;
            }
            case 'server': {
                mainProp = new THREE.Mesh(
                    new THREE.BoxGeometry(1.5, 2.5, 1.1),
                    new THREE.MeshLambertMaterial({ color: 0x0f172a })
                );
                mainProp.position.y = 1.25;
                group.add(mainProp);

                // Đèn LED server
                for (let i = 0; i < 4; i++) {
                    const led = new THREE.Mesh(
                        new THREE.BoxGeometry(1.1, 0.12, 0.05),
                        new THREE.MeshBasicMaterial({ color: 0x22d3ee })
                    );
                    led.position.set(0, 0.6 + i * 0.45, 0.56);
                    group.add(led);
                }
                break;
            }
            case 'copier': {
                mainProp = new THREE.Mesh(
                    new THREE.BoxGeometry(1.4, 1.25, 1.1),
                    new THREE.MeshLambertMaterial({ color: 0xe2e8f0 })
                );
                mainProp.position.y = 0.62;
                group.add(mainProp);

                const topCover = new THREE.Mesh(
                    new THREE.BoxGeometry(1.35, 0.12, 1.05),
                    new THREE.MeshLambertMaterial({ color: 0x334155 })
                );
                topCover.position.y = 1.3;
                group.add(topCover);
                break;
            }
            case 'coffee': {
                const counter = new THREE.Mesh(
                    new THREE.BoxGeometry(1.8, 0.9, 1.0),
                    new THREE.MeshLambertMaterial({ color: 0x57534e })
                );
                counter.position.y = 0.45;
                group.add(counter);

                mainProp = new THREE.Mesh(
                    new THREE.BoxGeometry(0.65, 0.75, 0.55),
                    new THREE.MeshLambertMaterial({ color: 0xb91c1c })
                );
                mainProp.position.y = 1.25;
                group.add(mainProp);
                break;
            }
            case 'speaker': {
                const stand = new THREE.Mesh(
                    new THREE.CylinderGeometry(0.45, 0.55, 0.85, 16),
                    new THREE.MeshLambertMaterial({ color: 0x334155 })
                );
                stand.position.y = 0.42;
                group.add(stand);

                mainProp = new THREE.Mesh(
                    new THREE.CylinderGeometry(0.28, 0.28, 0.55, 16),
                    new THREE.MeshBasicMaterial({ color: 0xa855f7 })
                );
                mainProp.position.y = 1.1;
                group.add(mainProp);
                break;
            }
            default: {
                const table = new THREE.Mesh(
                    new THREE.BoxGeometry(1.5, 0.85, 1.0),
                    new THREE.MeshLambertMaterial({ color: 0x475569 })
                );
                table.position.y = 0.42;
                group.add(table);

                mainProp = new THREE.Mesh(
                    new THREE.BoxGeometry(0.95, 0.65, 0.12),
                    new THREE.MeshBasicMaterial({ color: 0x38bdf8 })
                );
                mainProp.position.y = 1.15;
                group.add(mainProp);
                break;
            }
        }

        this.scene.add(group);

        // Tạo nhãn HTML nổi trong không gian 3D
        const labelEl = document.createElement('div');
        labelEl.className = 'world-label trap-floating-tag';
        labelEl.innerHTML = `🔧 ${def.name}`;
        this.labelsContainer.appendChild(labelEl);

        return {
            ...def,
            group,
            ringMesh,
            mainProp,
            labelEl,
            state: 'READY', // 'READY' | 'ARMED' | 'COOLDOWN'
            cooldownTimer: 0
        };
    }

    /**
     * Đặt bẫy (Sau khi người chơi giữ phím E hoàn tất)
     */
    armTrap(trap) {
        if (trap.state !== 'READY') return false;
        trap.state = 'ARMED';
        trap.ringMesh.material.color.setHex(0xf97316); // Đổi vòng tròn sang màu Cam cảnh báo
        trap.labelEl.className = 'world-label trap-floating-tag armed';
        trap.labelEl.innerHTML = `⚡ ĐÃ GÀI: ${trap.name} (Chờ Sếp!)`;
        window.GameAudio.playTrapArm();
        return true;
    }

    /**
     * Kích hoạt hiệu ứng hài hước khi Sếp bước tới bẫy đã gài
     */
    triggerTrapOnBoss(trap, boss) {
        trap.state = 'COOLDOWN';
        trap.cooldownTimer = 18.0; // Sau 18 giây bẫy tự hồi lại để chơi tiếp
        trap.ringMesh.material.color.setHex(0x22c55e);
        trap.labelEl.className = 'world-label trap-floating-tag';
        trap.labelEl.innerHTML = `💥 ĐÃ NỔ! (Hồi sau 18s)`;

        window.GameAudio.playPrankTriggered();

        // Tạo hiệu ứng 3D hài hước tùy loại bẫy
        this.spawnPrankVisualEffect(trap);
    }

    spawnPrankVisualEffect(trap) {
        if (trap.type === 'chair' && trap.mainProp) {
            // Ghế xoay phóng vọt lên trời và xoay 720 độ
            this.animatedEffects.push({
                type: 'chair_launch',
                mesh: trap.mainProp,
                timer: 0,
                duration: 2.2
            });
        } else if (trap.type === 'copier') {
            // Phun 18 tờ giấy meme bay tung tóe
            for (let i = 0; i < 18; i++) {
                const paper = new THREE.Mesh(
                    new THREE.PlaneGeometry(0.42, 0.55),
                    new THREE.MeshBasicMaterial({ color: 0xffffff, side: THREE.DoubleSide })
                );
                paper.position.copy(trap.position).add(new THREE.Vector3(0, 1.3, 0));
                this.scene.add(paper);

                this.animatedEffects.push({
                    type: 'flying_paper',
                    mesh: paper,
                    vel: new THREE.Vector3(
                        (Math.random() - 0.5) * 6,
                        2.5 + Math.random() * 3.5,
                        (Math.random() - 0.5) * 6
                    ),
                    timer: 0,
                    duration: 3.0
                });
            }
        } else {
            // Tạo các hạt khối màu sắc nổ tung vui nhộn
            const colors = [0xfacc15, 0xef4444, 0x22d3ee, 0xa855f7, 0x4ade80];
            for (let i = 0; i < 14; i++) {
                const p = new THREE.Mesh(
                    new THREE.BoxGeometry(0.22, 0.22, 0.22),
                    new THREE.MeshBasicMaterial({ color: colors[i % colors.length] })
                );
                p.position.copy(trap.position).add(new THREE.Vector3(0, 1.4, 0));
                this.scene.add(p);

                this.animatedEffects.push({
                    type: 'spark_cube',
                    mesh: p,
                    vel: new THREE.Vector3(
                        (Math.random() - 0.5) * 5,
                        2 + Math.random() * 4,
                        (Math.random() - 0.5) * 5
                    ),
                    timer: 0,
                    duration: 1.6
                });
            }
        }
    }

    update(dt, camera) {
        // Cập nhật trạng thái hồi chiêu của các bẫy
        this.traps.forEach(trap => {
            if (trap.state === 'ARMED') {
                const pulse = 1 + Math.sin(performance.now() * 0.01) * 0.15;
                trap.ringMesh.scale.set(pulse, pulse, 1);
            } else if (trap.state === 'COOLDOWN') {
                trap.cooldownTimer -= dt;
                trap.labelEl.innerHTML = `⏳ Hồi bẫy: ${Math.ceil(trap.cooldownTimer)}s`;
                if (trap.cooldownTimer <= 0) {
                    trap.state = 'READY';
                    trap.ringMesh.material.color.setHex(0x06b6d4);
                    trap.ringMesh.scale.set(1, 1, 1);
                    trap.labelEl.innerHTML = `🔧 ${trap.name}`;
                }
            }

            // Chiếu tọa độ 3D của bẫy lên màn hình 2D
            this.updateFloatingLabelPosition(trap.position, 2.2, trap.labelEl, camera);
        });

        // Cập nhật các hiệu ứng vật lý 3D đang diễn ra
        for (let i = this.animatedEffects.length - 1; i >= 0; i--) {
            const fx = this.animatedEffects[i];
            fx.timer += dt;

            if (fx.type === 'chair_launch') {
                const t = fx.timer / fx.duration;
                fx.mesh.position.y = Math.sin(t * Math.PI) * 4.5;
                fx.mesh.rotation.y += dt * 18;
                if (fx.timer >= fx.duration) {
                    fx.mesh.position.y = 0;
                    fx.mesh.rotation.y = 0;
                    this.animatedEffects.splice(i, 1);
                }
            } else if (fx.type === 'flying_paper' || fx.type === 'spark_cube') {
                fx.mesh.position.addScaledVector(fx.vel, dt);
                fx.vel.y -= 6.5 * dt;
                fx.mesh.rotation.x += dt * 5;
                fx.mesh.rotation.z += dt * 4;
                if (fx.mesh.position.y < 0.08) {
                    fx.mesh.position.y = 0.08;
                    fx.vel.set(0, 0, 0);
                }
                if (fx.timer >= fx.duration) {
                    this.scene.remove(fx.mesh);
                    this.animatedEffects.splice(i, 1);
                }
            }
        }
    }

    updateFloatingLabelPosition(worldPos, heightOffset, domEl, camera) {
        const tempV = worldPos.clone();
        tempV.y += heightOffset;
        tempV.project(camera);

        if (tempV.z > 1) {
            domEl.style.display = 'none';
            return;
        }

        const x = (tempV.x * 0.5 + 0.5) * window.innerWidth;
        const y = (-(tempV.y * 0.5) + 0.5) * window.innerHeight;
        domEl.style.display = 'block';
        domEl.style.left = `${x}px`;
        domEl.style.top = `${y}px`;
    }
}

window.PrankSystem = PrankSystem;
