import React, { Suspense, useEffect, useMemo } from "react";
import { Canvas, useFrame, useLoader } from "@react-three/fiber";
import {
    OrbitControls,
    useAnimations,
    Html,
    useProgress,
    Grid,
    TransformControls,
    Center,
} from "@react-three/drei";
import * as THREE from "three";
import { FBXLoader, GLTFLoader, SkeletonUtils, BVHLoader } from "three-stdlib";
import { Loader2 } from "lucide-react";

// --- Types ---
export interface UnifiedModelViewerProps {
    url: string;
    type?: "fbx" | "glb" | "gltf" | "bvh";
    scale?: number;
    showSkeleton?: boolean;
    isPlaying?: boolean;
    activeAnimation?: string;
    color?: string;
    transformMode?: "translate" | "rotate" | null;
    onAnimationsLoaded?: (animations: string[]) => void;
    autoRotate?: boolean;
    interactive?: boolean;
    performanceMode?: boolean;
    onLoaded?: () => void;
}

// --- Helper Components ---
function ViewerLoader() {
    const { progress } = useProgress();
    return (
        <Html center>
            <div className="flex flex-col items-center justify-center p-4 bg-black/80 rounded-lg backdrop-blur-md">
                <Loader2 className="w-8 h-8 animate-spin text-blue-500 mb-2" />
                <span className="text-white font-medium">{progress.toFixed(0)}% Loaded</span>
            </div>
        </Html>
    );
}

// --- Inner Model Implementation ---
const ModelContent = React.memo(({
    url,
    type = "fbx",
    scale = 1,
    showSkeleton = false,
    isPlaying = true,
    activeAnimation,
    color,
    transformMode,
    onAnimationsLoaded,
    onLoaded,
}: UnifiedModelViewerProps) => {
    // 1. Load
    // 1. Load
    const LoaderClass = useMemo(() => {
        if (type === "fbx" || type.endsWith('fbx')) return FBXLoader;
        if (type === "bvh" || type.endsWith('bvh')) return BVHLoader;
        return GLTFLoader;
    }, [type]);
    const rawLoaded = useLoader(LoaderClass as any, url);

    // 2. Clone
    const scene = useMemo(() => {
        if (type === "bvh" || type.endsWith('bvh')) {
            const { skeleton } = rawLoaded as any;
            const rootBone = skeleton.bones[0];
            const group = new THREE.Group();
            group.add(rootBone);
            // Create a visual representation for the bones since they are invisible by default
            // logic handled by showSkeleton, but for BVH we might always want it or use SkeletonHelper
            return group;
        }
        const base = (type === "fbx" || type.endsWith('fbx')) ? (rawLoaded as THREE.Group) : (rawLoaded as any).scene;
        return SkeletonUtils.clone(base);
    }, [rawLoaded, type]);

    // 3. Animations
    const animations = useMemo(() => {
        if (type === "bvh" || type.endsWith('bvh')) {
            return [(rawLoaded as any).clip];
        }
        return ((rawLoaded as any).animations || []);
    }, [rawLoaded, type]);

    const { actions, names } = useAnimations(animations, scene);

    useEffect(() => {
        if (onAnimationsLoaded) {
            onAnimationsLoaded(names);
        }
        if (onLoaded) {
            onLoaded();
        }
    }, [names]); // eslint-disable-line

    // 4. Playback
    useEffect(() => {
        names.forEach((name) => actions[name]?.fadeOut(0.3).stop());
        if (isPlaying) {
            const animToPlay = activeAnimation || names[0];
            if (animToPlay && actions[animToPlay]) {
                const action = actions[animToPlay];
                action?.reset().fadeIn(0.3).play();
                action!.clampWhenFinished = false;
                action!.enabled = true;
            }
        }
    }, [isPlaying, activeAnimation, actions, names]);

    // 5. Color
    useEffect(() => {
        if (scene) {
            scene.traverse((child: any) => {
                if (child.isMesh) {
                    if (!child.userData.originalMaterial) {
                        if (Array.isArray(child.material)) {
                            child.userData.originalMaterial = child.material.map((m: any) => m.clone());
                        } else {
                            child.userData.originalMaterial = child.material.clone();
                        }
                    }

                    if (color) {
                        if (Array.isArray(child.userData.originalMaterial)) {
                            child.material = child.userData.originalMaterial.map((m: any) => {
                                const newMat = m.clone();
                                newMat.color.set(color);
                                return newMat;
                            });
                        } else {
                            const newMat = child.userData.originalMaterial.clone();
                            newMat.color.set(color);
                            child.material = newMat;
                        }
                    } else {
                        child.material = child.userData.originalMaterial;
                    }
                }
            });
        }
    }, [scene, color]);

    // 6. Auto Size / Center
    useEffect(() => {
        if (!scene) return;
        scene.position.set(0, 0, 0);
        scene.scale.set(1, 1, 1);
        scene.updateMatrixWorld(true);

        const box = new THREE.Box3().setFromObject(scene);
        const size = new THREE.Vector3();
        const centerV = new THREE.Vector3();
        box.getSize(size);
        box.getCenter(centerV);

        const maxDim = Math.max(size.x, size.y, size.z);
        const targetSize = 2;
        const scaleFactor = maxDim > 0 ? targetSize / maxDim : 1;

        scene.position.x = -centerV.x * scaleFactor;
        scene.position.y = -box.min.y * scaleFactor;
        scene.position.z = -centerV.z * scaleFactor;

        scene.scale.setScalar(scaleFactor);

        scene.traverse((child) => {
            if ((child as THREE.Mesh).isMesh) {
                child.castShadow = true;
                child.receiveShadow = true;
            }
        });
    }, [scene]);

    // 7. Skeleton
    const skeletonHelper = useMemo(() => {
        if (!showSkeleton) return null;
        return new THREE.SkeletonHelper(scene);
    }, [scene, showSkeleton]);

    useFrame(() => {
        if (skeletonHelper) (skeletonHelper as any).update();
    });

    return (
        <group scale={[scale, scale, scale]} dispose={null}>
            {transformMode ? (
                <TransformControls mode={transformMode}>
                    <primitive object={scene} />
                </TransformControls>
            ) : (
                <primitive object={scene} />
            )}
            {skeletonHelper && <primitive object={skeletonHelper} />}
        </group>
    );
});

// --- Main Exported Component ---
export default function UnifiedModelViewer(props: UnifiedModelViewerProps) {
    const { performanceMode = false, onLoaded } = props;
    const [isReady, setIsReady] = React.useState(false);

    const handleLoaded = () => {
        setIsReady(true);
        if (onLoaded) onLoaded();
    };

    return (
        <div
            className={`h-full w-full bg-gradient-to-br from-gray-900 to-gray-800 transition-opacity duration-700 ease-in-out ${isReady ? "opacity-100" : "opacity-0"
                }`}
        >
            <Canvas
                shadows={!performanceMode}
                dpr={performanceMode ? [1, 1] : [1, 2]}
                camera={{ position: [0, 1.5, 4], fov: 50 }}
                gl={{ preserveDrawingBuffer: !performanceMode }} // Optimization
            >
                {/* Standard Light Setup */}
                <ambientLight intensity={0.6} />
                <directionalLight
                    position={[5, 10, 5]}
                    intensity={1.5}
                    castShadow={!performanceMode}
                    shadow-mapSize={[1024, 1024]}
                />
                <directionalLight position={[-5, 5, -5]} intensity={0.5} color="#b0cdff" />

                <Grid
                    position={[0, 0, 0]}
                    args={[20, 20]}
                    cellColor="#6f6f6f"
                    sectionColor="#9d9d9d"
                    fadeDistance={25}
                    infiniteGrid
                />

                <Suspense fallback={<ViewerLoader />}>
                    <ModelContent {...props} onLoaded={handleLoaded} />
                </Suspense>

                <OrbitControls
                    makeDefault
                    target={[0, 1, 0]}
                    minDistance={1}
                    maxDistance={10}
                    enableDamping={true}
                    dampingFactor={0.05}
                    autoRotate={props.autoRotate}
                    enabled={!props.transformMode}
                    enableZoom={props.interactive !== false}
                    enablePan={props.interactive !== false}
                />
            </Canvas>
        </div>
    );
}
