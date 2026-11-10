/**
 * Xây dựng Môi trường Văn phòng 3D (Low-poly Stylized Office)
 * Bao gồm: Sảnh Lễ Tân (Cổng Face-ID), Phòng IT, Khu Marketing/Open Office, Khu Pantry, Phòng CEO.
 */
class OfficeWorld {
    constructor(scene) {
        this.scene = scene;
        this.obstacles = [];       // Danh sách Box3 để kiểm tra va chạm & che khuất tầm nhìn (Raycast Occlusion)
        this.obstacleMeshes = [];  // Danh sách Mesh tường/vách ngăn cho Three.Raycaster
        this.workstations = [];    // Bàn làm việc để người chơi ngồi "Giả vờ gõ phím"
        this.hidingSpots = [];     // Tủ tài liệu / Gầm bàn để trốn
        this.turnstileLeft = null;
        this.turnstileRight = null;
        this.gateOpen = false;
        this.gateColliderIndex = -1;

        this.buildLighting();
        this.buildFloorsAndZones();
        this.buildWalls();
        this.buildFaceIDGate();
        this.buildFurnitureAndRooms();
    }

    buildLighting() {
        const ambient = new THREE.AmbientLight(0xe2e8f0, 0.72);
        this.scene.add(ambient);

        const dirLight = new THREE.DirectionalLight(0xfffbeb, 0.85);
        dirLight.position.set(18, 32, 22);
        dirLight.castShadow = true;
        dirLight.shadow.mapSize.width = 2048;
        dirLight.shadow.mapSize.height = 2048;
        dirLight.shadow.camera.near = 1;
        dirLight.shadow.camera.far = 85;
        const d = 30;
        dirLight.shadow.camera.left = -d;
        dirLight.shadow.camera.right = d;
        dirLight.shadow.camera.top = d;
        dirLight.shadow.camera.bottom = -d;
        this.scene.add(dirLight);

        // Ánh sáng xanh công nghệ ở phòng IT
        const itLight = new THREE.PointLight(0x06b6d4, 0.9, 14);
        itLight.position.set(-16, 4, -2);
        this.scene.add(itLight);

        // Ánh sáng ấm ở phòng Giám đốc
        const ceoLight = new THREE.PointLight(0xf59e0b, 0.7, 16);
        ceoLight.position.set(4, 4.5, -14);
        this.scene.add(ceoLight);
    }

    buildFloorsAndZones() {
        // Nền tổng thể
        const baseGeo = new THREE.PlaneGeometry(46, 44);
        const baseMat = new THREE.MeshLambertMaterial({ color: 0x334155 });
        const baseFloor = new THREE.Mesh(baseGeo, baseMat);
        baseFloor.rotation.x = -Math.PI / 2;
        baseFloor.receiveShadow = true;
        this.scene.add(baseFloor);

        // Thảm các phân khu (Zones)
        this.addZoneCarpet(0, 16.5, 22, 10, 0x1e293b);    // Sảnh Lễ tân (Reception)
        this.addZoneCarpet(-16.5, -2, 11, 22, 0x0f172a);  // Phòng IT Server
        this.addZoneCarpet(0, 3, 21, 16, 0x475569);       // Khu Open Office & Marketing
        this.addZoneCarpet(16.5, 4, 11, 16, 0x3f6212);    // Khu Pantry (Nghỉ ngơi)
        this.addZoneCarpet(5, -13, 32, 13, 0x7f1d1d);     // Phòng Tổng Giám Đốc (CEO)

        // Vạch kẻ caro dẫn đường ở sảnh
        const stripGeo = new THREE.PlaneGeometry(3.2, 7);
        const stripMat = new THREE.MeshBasicMaterial({ color: 0x0ea5e9, transparent: true, opacity: 0.25 });
        const strip = new THREE.Mesh(stripGeo, stripMat);
        strip.rotation.x = -Math.PI / 2;
        strip.position.set(0, 0.02, 15.5);
        this.scene.add(strip);
    }

    addZoneCarpet(x, z, w, d, colorHex) {
        const geo = new THREE.PlaneGeometry(w, d);
        const mat = new THREE.MeshLambertMaterial({ color: colorHex });
        const mesh = new THREE.Mesh(geo, mat);
        mesh.rotation.x = -Math.PI / 2;
        mesh.position.set(x, 0.01, z);
        mesh.receiveShadow = true;
        this.scene.add(mesh);
    }

    addWall(x, z, w, d, h = 3.2, color = 0x94a3b8, blocksVision = true) {
        const geo = new THREE.BoxGeometry(w, h, d);
        const mat = new THREE.MeshLambertMaterial({ color });
        const wall = new THREE.Mesh(geo, mat);
        wall.position.set(x, h / 2, z);
        wall.castShadow = true;
        wall.receiveShadow = true;
        this.scene.add(wall);

        const box = new THREE.Box3().setFromObject(wall);
        this.obstacles.push(box);
        if (blocksVision) {
            this.obstacleMeshes.push(wall);
        }
        return wall;
    }

    buildWalls() {
        const wallColor = 0x64748b;
        const glassWallColor = 0x38bdf8;

        // Tường bao quanh tòa nhà
        this.addWall(0, -20.5, 45, 0.8, 3.6, wallColor);   // Bắc
        this.addWall(0, 21.5, 45, 0.8, 3.6, wallColor);    // Nam
        this.addWall(-22.2, 0.5, 0.8, 42, 3.6, wallColor); // Tây
        this.addWall(22.2, 0.5, 0.8, 42, 3.6, wallColor);  // Đông

        // Vách ngăn Sảnh Lễ Tân (z = 11.5), chừa cổng giữa rộng 3.6m
        this.addWall(-12.5, 11.5, 19, 0.6, 3.0, wallColor);
        this.addWall(12.5, 11.5, 19, 0.6, 3.0, wallColor);

        // Vách ngăn Phòng IT (x = -11), chừa cửa ở z = 2
        this.addWall(-11, -5, 0.6, 10, 3.0, wallColor);
        this.addWall(-11, 8, 0.6, 6.5, 3.0, wallColor);

        // Vách ngăn Phòng CEO (z = -6.5), chừa 2 cửa vào
        this.addWall(-6, -6.5, 9, 0.6, 3.0, 0x991b1b);
        this.addWall(7.5, -6.5, 11, 0.6, 3.0, 0x991b1b);

        // Vách ngăn thấp (Cubicles) ở giữa khu làm việc giúp người chơi nấp góc
        this.addWall(-4, 2, 5.5, 0.4, 2.1, 0x475569, true);
        this.addWall(4, 2, 5.5, 0.4, 2.1, 0x475569, true);
        this.addWall(0, 6.5, 0.4, 4.5, 2.1, 0x475569, true);
    }

    buildFaceIDGate() {
        // Trụ máy chấm công Face-ID bên trái cổng
        const kioskGroup = new THREE.Group();
        kioskGroup.position.set(-2.1, 0, 12.3);

        const stand = new THREE.Mesh(
            new THREE.BoxGeometry(0.6, 1.5, 0.5),
            new THREE.MeshLambertMaterial({ color: 0x0f172a })
        );
        stand.position.y = 0.75;
        kioskGroup.add(stand);

        const screen = new THREE.Mesh(
            new THREE.BoxGeometry(0.75, 0.65, 0.12),
            new THREE.MeshBasicMaterial({ color: 0x22d3ee })
        );
        screen.position.set(0, 1.65, 0.2);
        kioskGroup.add(screen);

        this.scene.add(kioskGroup);

        // Cánh cổng từ (Turnstile Flaps) chặn đường khi chưa chấm công
        const flapGeo = new THREE.BoxGeometry(1.45, 1.1, 0.15);
        const flapMat = new THREE.MeshLambertMaterial({ color: 0xef4444, transparent: true, opacity: 0.85 });

        this.turnstileLeft = new THREE.Mesh(flapGeo, flapMat);
        this.turnstileLeft.position.set(-0.75, 0.6, 11.5);
        this.scene.add(this.turnstileLeft);

        this.turnstileRight = new THREE.Mesh(flapGeo, flapMat.clone());
        this.turnstileRight.position.set(0.75, 0.6, 11.5);
        this.scene.add(this.turnstileRight);

        // Box chặn người chơi đi qua khi chưa mở cổng
        const gateBlockBox = new THREE.Box3(
            new THREE.Vector3(-1.8, 0, 11.1),
            new THREE.Vector3(1.8, 3, 11.9)
        );
        this.gateColliderIndex = this.obstacles.push(gateBlockBox) - 1;
    }

    unlockTurnstileGate() {
        if (this.gateOpen) return;
        this.gateOpen = true;

        // Đổi màu cổng sang xanh lá và mở sang 2 bên
        this.turnstileLeft.material.color.setHex(0x22c55e);
        this.turnstileRight.material.color.setHex(0x22c55e);
        this.turnstileLeft.position.x = -2.2;
        this.turnstileRight.position.x = 2.2;

        // Xóa vật cản cổng
        if (this.gateColliderIndex >= 0) {
            this.obstacles[this.gateColliderIndex].makeEmpty();
        }
    }

    buildFurnitureAndRooms() {
        // 1. Bàn làm việc của Người chơi & Đồng nghiệp (Có thể ngồi nhấn F để "Giả vờ làm việc")
        this.createWorkstation(-4, 4.2, "Bàn của bạn (Khu Marketing)");
        this.createWorkstation(4, 4.2, "Bàn Thiết kế (Khu Marketing)");
        this.createWorkstation(-4, -0.5, "Bàn Kế toán");
        this.createWorkstation(-15, 4.5, "Bàn Trực Kỹ Thuật IT");

        // 2. Các Tủ Hồ Sơ Cao (Hiding Lockers - Nhấn E để chui vào trốn Sếp)
        this.createHidingLocker(-9.8, 6.5, "Tủ Hồ Sơ Khu Chung");
        this.createHidingLocker(9.5, -1.5, "Tủ Lưu Trữ Marketing");
        this.createHidingLocker(-19.5, -8.5, "Tủ Thiết Bị Phòng IT");
        this.createHidingLocker(14.5, -17.5, "Tủ Rượu & Tài Liệu Mật CEO");

        // 3. Quầy Lễ Tân & Máy Quẹt Thẻ Tan Làm ở Sảnh
        const receptionDesk = this.addWall(6.5, 16.5, 4.5, 1.4, 1.1, 0x3b82f6, false);
        receptionDesk.userData.name = "Quầy Lễ Tân";
    }

    createWorkstation(x, z, label) {
        const group = new THREE.Group();
        group.position.set(x, 0, z);

        // Mặt bàn
        const desk = new THREE.Mesh(
            new THREE.BoxGeometry(2.2, 0.8, 1.1),
            new THREE.MeshLambertMaterial({ color: 0xd97706 })
        );
        desk.position.y = 0.4;
        desk.castShadow = true;
        group.add(desk);

        // Màn hình máy tính
        const monitor = new THREE.Mesh(
            new THREE.BoxGeometry(0.8, 0.55, 0.08),
            new THREE.MeshLambertMaterial({ color: 0x1e293b })
        );
        monitor.position.set(0, 1.1, -0.25);
        group.add(monitor);

        const screenGlow = new THREE.Mesh(
            new THREE.PlaneGeometry(0.7, 0.45),
            new THREE.MeshBasicMaterial({ color: 0x38bdf8 })
        );
        screenGlow.position.set(0, 1.1, -0.2);
        group.add(screenGlow);

        // Ghế ngồi
        const chair = new THREE.Mesh(
            new THREE.BoxGeometry(0.65, 0.55, 0.65),
            new THREE.MeshLambertMaterial({ color: 0x334155 })
        );
        chair.position.set(0, 0.28, 0.85);
        group.add(chair);

        this.scene.add(group);
        this.obstacles.push(new THREE.Box3().setFromObject(desk));

        this.workstations.push({
            label,
            seatPosition: new THREE.Vector3(x, 0, z + 0.85),
            lookTarget: new THREE.Vector3(x, 0.9, z - 0.5),
            screenMesh: screenGlow
        });
    }

    createHidingLocker(x, z, label) {
        const group = new THREE.Group();
        group.position.set(x, 0, z);

        const locker = new THREE.Mesh(
            new THREE.BoxGeometry(1.3, 2.5, 1.3),
            new THREE.MeshLambertMaterial({ color: 0x475569 })
        );
        locker.position.y = 1.25;
        locker.castShadow = true;
        group.add(locker);

        // Cửa tủ màu xanh/vàng nổi bật
        const door = new THREE.Mesh(
            new THREE.BoxGeometry(1.1, 2.2, 0.08),
            new THREE.MeshLambertMaterial({ color: 0x0284c7 })
        );
        door.position.set(0, 1.25, 0.64);
        group.add(door);

        this.scene.add(group);

        this.hidingSpots.push({
            label,
            position: new THREE.Vector3(x, 0, z + 1.1),
            insidePosition: new THREE.Vector3(x, 0, z),
            doorMesh: door
        });
    }

    /**
     * Kiểm tra một vị trí (x, z) có va chạm với tường hay bàn ghế không
     */
    checkCollision(pos, radius = 0.45) {
        const sphere = new THREE.Sphere(new THREE.Vector3(pos.x, 0.8, pos.z), radius);
        for (let i = 0; i < this.obstacles.length; i++) {
            if (this.obstacles[i].intersectsSphere(sphere)) {
                return true;
            }
        }
        return false;
    }
}

window.OfficeWorld = OfficeWorld;
