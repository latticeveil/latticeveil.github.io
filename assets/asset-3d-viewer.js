(function () {
    const PLAYER_ASSET_IDS = new Set(['player_default']);
    const HD_ASSET_PREFIX = 'hd_';
    const PLAYER_SKIN_SIZE = 64;
    const STANDARD_CUBE_FACE_MAP = [
        { x: 1, y: 0, w: 1 / 3, h: 1 / 2 },
        { x: 1, y: 1, w: 1 / 3, h: 1 / 2 },
        { x: 0, y: 0, w: 1 / 3, h: 1 / 2 },
        { x: 2, y: 0, w: 1 / 3, h: 1 / 2 },
        { x: 0, y: 1, w: 1 / 3, h: 1 / 2 },
        { x: 2, y: 1, w: 1 / 3, h: 1 / 2 }
    ];
    const HD_CUBE_FACE_MAP = [
        { x: 1, y: 1, w: 1 / 3, h: 1 / 2 },
        { x: 1, y: 0, w: 1 / 3, h: 1 / 2 },
        { x: 2, y: 0, w: 1 / 3, h: 1 / 2 },
        { x: 0, y: 1, w: 1 / 3, h: 1 / 2 },
        { x: 0, y: 0, w: 1 / 3, h: 1 / 2 },
        { x: 2, y: 1, w: 1 / 3, h: 1 / 2 }
    ];

    const PLAYER_MODEL_PARTS = [
        {
            name: 'head',
            size: { x: 0.42, y: 0.42, z: 0.42 },
            position: { x: 0.0, y: 0.90, z: 0.0 },
            uv: {
                top: { x: 8, y: 0, w: 8, h: 8 },
                bottom: { x: 16, y: 0, w: 8, h: 8 },
                left: { x: 0, y: 8, w: 8, h: 8 },
                front: { x: 8, y: 8, w: 8, h: 8 },
                right: { x: 16, y: 8, w: 8, h: 8 },
                back: { x: 24, y: 8, w: 8, h: 8 }
            }
        },
        {
            name: 'body',
            size: { x: 0.52, y: 0.70, z: 0.30 },
            position: { x: 0.0, y: 0.38, z: 0.0 },
            uv: {
                top: { x: 20, y: 16, w: 8, h: 4 },
                bottom: { x: 28, y: 16, w: 8, h: 4 },
                left: { x: 16, y: 20, w: 4, h: 12 },
                front: { x: 20, y: 20, w: 8, h: 12 },
                right: { x: 28, y: 20, w: 4, h: 12 },
                back: { x: 32, y: 20, w: 8, h: 12 }
            }
        },
        {
            name: 'leftArm',
            size: { x: 0.24, y: 0.72, z: 0.24 },
            position: { x: -0.38, y: 0.37, z: 0.0 },
            uv: {
                top: { x: 36, y: 48, w: 4, h: 4 },
                bottom: { x: 40, y: 48, w: 4, h: 4 },
                left: { x: 32, y: 52, w: 4, h: 12 },
                front: { x: 36, y: 52, w: 4, h: 12 },
                right: { x: 40, y: 52, w: 4, h: 12 },
                back: { x: 44, y: 52, w: 4, h: 12 }
            }
        },
        {
            name: 'rightArm',
            size: { x: 0.24, y: 0.72, z: 0.24 },
            position: { x: 0.38, y: 0.37, z: 0.0 },
            uv: {
                top: { x: 44, y: 16, w: 4, h: 4 },
                bottom: { x: 48, y: 16, w: 4, h: 4 },
                left: { x: 40, y: 20, w: 4, h: 12 },
                front: { x: 44, y: 20, w: 4, h: 12 },
                right: { x: 48, y: 20, w: 4, h: 12 },
                back: { x: 52, y: 20, w: 4, h: 12 }
            }
        },
        {
            name: 'leftLeg',
            size: { x: 0.22, y: 0.72, z: 0.24 },
            position: { x: -0.13, y: -0.35, z: 0.0 },
            uv: {
                top: { x: 20, y: 48, w: 4, h: 4 },
                bottom: { x: 24, y: 48, w: 4, h: 4 },
                left: { x: 16, y: 52, w: 4, h: 12 },
                front: { x: 20, y: 52, w: 4, h: 12 },
                right: { x: 24, y: 52, w: 4, h: 12 },
                back: { x: 28, y: 52, w: 4, h: 12 }
            }
        },
        {
            name: 'rightLeg',
            size: { x: 0.22, y: 0.72, z: 0.24 },
            position: { x: 0.13, y: -0.35, z: 0.0 },
            uv: {
                top: { x: 4, y: 16, w: 4, h: 4 },
                bottom: { x: 8, y: 16, w: 4, h: 4 },
                left: { x: 0, y: 20, w: 4, h: 12 },
                front: { x: 4, y: 20, w: 4, h: 12 },
                right: { x: 8, y: 20, w: 4, h: 12 },
                back: { x: 12, y: 20, w: 4, h: 12 }
            }
        }
    ];

    class LatticeVeilAsset3DViewer {
        constructor(containerId) {
            this.containerId = containerId || 'three-container';
            this.scene = null;
            this.camera = null;
            this.renderer = null;
            this.currentMesh = null;
            this.currentAssetId = null;
            this.animationId = null;
            this.isInitialized = false;
            this.isDragging = false;
            this.previousPointer = { x: 0, y: 0 };
            this.textureLoader = new THREE.TextureLoader();
            this.boundResize = () => this.resizeRenderer();
            this.baseCameraDistance = null;
            this.currentCameraDistance = null;
            this.cameraTarget = new THREE.Vector3();
            this.minZoomFactor = 0.72;
            this.maxZoomFactor = 1.55;
        }

        init() {
            if (this.isInitialized) {
                return;
            }

            const container = document.getElementById(this.containerId);
            if (!container) {
                console.error('3D container not found');
                return;
            }

            container.innerHTML = '';

            this.scene = new THREE.Scene();
            this.camera = new THREE.PerspectiveCamera(45, 1, 0.1, 1000);
            this.renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true });
            this.renderer.setPixelRatio(window.devicePixelRatio || 1);
            this.renderer.setClearColor(0x000000, 0);
            this.renderer.outputEncoding = THREE.sRGBEncoding;
            this.renderer.domElement.style.display = 'block';
            this.renderer.domElement.style.width = '100%';
            this.renderer.domElement.style.height = '100%';
            this.renderer.domElement.style.margin = '0 auto';
            container.appendChild(this.renderer.domElement);

            this.resizeRenderer();
            this.bindInteraction(container);
            window.addEventListener('resize', this.boundResize);

            const render = () => {
                this.animationId = requestAnimationFrame(render);
                if (this.renderer && this.scene && this.camera) {
                    this.renderer.render(this.scene, this.camera);
                }
            };

            render();
            this.isInitialized = true;
        }

        setAsset(assetId, textureSrc) {
            this.currentAssetId = assetId || null;
            if (!textureSrc) {
                return;
            }

            if (!this.isInitialized) {
                this.init();
            }

            this.textureLoader.load(textureSrc, (texture) => {
                texture.magFilter = THREE.NearestFilter;
                texture.minFilter = THREE.NearestFilter;
                texture.generateMipmaps = false;
                texture.encoding = THREE.sRGBEncoding;

                this.rebuildAsset(texture);
            });
        }

        rebuildAsset(texture) {
            if (!this.scene) {
                return;
            }

            if (this.currentMesh) {
                this.scene.remove(this.currentMesh);
            }

            this.currentMesh = this.isPlayerAsset(this.currentAssetId)
                ? this.createPlayerModel(texture)
                : this.createBlockModel(texture);

            this.scene.add(this.currentMesh);
            this.resetCameraAndPose();
        }

        isPlayerAsset(assetId) {
            return PLAYER_ASSET_IDS.has((assetId || '').toLowerCase());
        }

        isHdAsset(assetId) {
            return (assetId || '').toLowerCase().startsWith(HD_ASSET_PREFIX);
        }

        createMaterial(texture) {
            return new THREE.MeshBasicMaterial({
                map: texture,
                transparent: true,
                alphaTest: 0.05
            });
        }

        createBlockModel(texture) {
            const geometry = new THREE.BoxGeometry(1, 1, 1);
            this.applyCubeNetUv(
                geometry,
                this.isHdAsset(this.currentAssetId) ? HD_CUBE_FACE_MAP : STANDARD_CUBE_FACE_MAP
            );
            return new THREE.Mesh(geometry, this.createMaterial(texture));
        }

        createPlayerModel(texture) {
            const group = new THREE.Group();
            const material = this.createMaterial(texture);

            PLAYER_MODEL_PARTS.forEach((part) => {
                const geometry = new THREE.BoxGeometry(part.size.x, part.size.y, part.size.z);
                this.applySkinBoxUv(geometry, part.uv);

                const mesh = new THREE.Mesh(geometry, material);
                mesh.position.set(part.position.x, part.position.y, part.position.z);
                group.add(mesh);
            });

            return group;
        }

        applyCubeNetUv(geometry, faceMap) {
            const uv = geometry.attributes.uv;
            for (let i = 0; i < faceMap.length; i++) {
                const rect = faceMap[i];
                const u0 = rect.x * rect.w;
                const u1 = u0 + rect.w;
                const v0 = 1 - ((rect.y + 1) * rect.h);
                const v1 = 1 - (rect.y * rect.h);
                this.writeFaceUv(uv, i, u0, v0, u1, v1);
            }
            uv.needsUpdate = true;
        }

        applySkinBoxUv(geometry, rects) {
            const faceRects = [
                rects.right,
                rects.left,
                rects.top,
                rects.bottom,
                rects.front,
                rects.back
            ];

            const uv = geometry.attributes.uv;
            for (let i = 0; i < faceRects.length; i++) {
                const rect = faceRects[i];
                const u0 = rect.x / PLAYER_SKIN_SIZE;
                const u1 = (rect.x + rect.w) / PLAYER_SKIN_SIZE;
                const v0 = 1 - ((rect.y + rect.h) / PLAYER_SKIN_SIZE);
                const v1 = 1 - (rect.y / PLAYER_SKIN_SIZE);
                this.writeFaceUv(uv, i, u0, v0, u1, v1);
            }
            uv.needsUpdate = true;
        }

        writeFaceUv(uvAttribute, faceIndex, u0, v0, u1, v1) {
            const base = faceIndex * 4;
            const epsilon = 0.0008;
            const left = u0 + epsilon;
            const right = u1 - epsilon;
            const bottom = v0 + epsilon;
            const top = v1 - epsilon;

            uvAttribute.setXY(base, left, top);
            uvAttribute.setXY(base + 1, right, top);
            uvAttribute.setXY(base + 2, left, bottom);
            uvAttribute.setXY(base + 3, right, bottom);
        }

        resetCameraAndPose() {
            if (!this.camera || !this.currentMesh) {
                return;
            }

            const isPlayer = this.isPlayerAsset(this.currentAssetId);
            this.currentMesh.rotation.set(isPlayer ? -0.18 : -0.28, 0.72, 0);
            this.currentMesh.position.set(0, 0, 0);

            this.currentMesh.updateMatrixWorld(true);

            const centeredBox = new THREE.Box3().setFromObject(this.currentMesh);
            const centeredBoxCenter = centeredBox.getCenter(new THREE.Vector3());
            this.currentMesh.position.sub(centeredBoxCenter);
            this.currentMesh.updateMatrixWorld(true);

            const box = new THREE.Box3().setFromObject(this.currentMesh);
            const size = box.getSize(new THREE.Vector3());
            const center = box.getCenter(new THREE.Vector3());
            const maxSize = Math.max(size.x, size.y, size.z, 0.01);
            const fitOffset = isPlayer ? 1.14 : 1.08;
            const halfFov = THREE.MathUtils.degToRad(this.camera.fov * 0.5);
            let distance = (maxSize * fitOffset) / Math.tan(halfFov);

            if (this.camera.aspect < 1) {
                distance /= this.camera.aspect;
            }

            this.cameraTarget.copy(center);
            this.baseCameraDistance = distance;
            this.currentCameraDistance = distance;
            this.setCameraDistance(distance);
            this.camera.near = Math.max(0.1, distance / 100);
            this.camera.far = Math.max(1000, distance * 10);
            this.camera.updateProjectionMatrix();
        }

        setCameraDistance(distance) {
            if (!this.camera) {
                return;
            }

            this.currentCameraDistance = distance;
            this.camera.position.set(
                this.cameraTarget.x,
                this.cameraTarget.y,
                this.cameraTarget.z + distance
            );
            this.camera.lookAt(this.cameraTarget.x, this.cameraTarget.y, this.cameraTarget.z);
        }

        resetZoom() {
            if (!this.baseCameraDistance) {
                return;
            }

            this.setCameraDistance(this.baseCameraDistance);
        }

        bindInteraction(container) {
            const startDrag = (x, y) => {
                this.isDragging = true;
                this.previousPointer = { x, y };
            };

            const endDrag = () => {
                this.isDragging = false;
            };

            const moveDrag = (x, y) => {
                if (!this.isDragging || !this.currentMesh) {
                    return;
                }

                const dx = x - this.previousPointer.x;
                const dy = y - this.previousPointer.y;

                this.currentMesh.rotation.y += dx * 0.01;
                this.currentMesh.rotation.x = Math.max(-1.1, Math.min(1.1, this.currentMesh.rotation.x + (dy * 0.01)));
                this.previousPointer = { x, y };
            };

            const handleWheel = (event) => {
                if (!this.camera || !this.currentMesh || !this.baseCameraDistance) {
                    return;
                }

                event.preventDefault();

                const zoomStep = event.deltaY > 0 ? 1.08 : 0.92;
                const minDistance = this.baseCameraDistance * this.minZoomFactor;
                const maxDistance = this.baseCameraDistance * this.maxZoomFactor;
                const nextDistance = THREE.MathUtils.clamp(
                    this.currentCameraDistance * zoomStep,
                    minDistance,
                    maxDistance
                );

                this.setCameraDistance(nextDistance);
            };

            container.onmousedown = (event) => startDrag(event.clientX, event.clientY);
            window.onmouseup = endDrag;
            window.onmousemove = (event) => moveDrag(event.clientX, event.clientY);
            container.onwheel = handleWheel;

            container.ontouchstart = (event) => {
                if (event.target === this.renderer.domElement) {
                    event.preventDefault();
                }
                const touch = event.touches[0];
                startDrag(touch.clientX, touch.clientY);
            };

            window.ontouchend = endDrag;
            window.ontouchmove = (event) => {
                if (!event.touches || event.touches.length === 0) {
                    return;
                }
                const touch = event.touches[0];
                moveDrag(touch.clientX, touch.clientY);
            };
        }

        resizeRenderer() {
            if (!this.renderer || !this.camera) {
                return;
            }

            const container = document.getElementById(this.containerId);
            if (!container) {
                return;
            }

            const bounds = container.getBoundingClientRect();
            const width = Math.max(320, Math.round(bounds.width || 512));
            const height = Math.max(320, Math.round(bounds.height || 512));

            this.renderer.setSize(width, height, true);
            this.camera.aspect = width / height;
            this.camera.updateProjectionMatrix();
        }
    }

    window.LatticeVeilAsset3DViewer = LatticeVeilAsset3DViewer;
})();
