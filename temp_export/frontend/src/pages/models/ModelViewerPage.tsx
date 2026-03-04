import React, { Suspense, useEffect, useMemo, useState } from "react";
import { Canvas, useFrame, useLoader } from "@react-three/fiber";
import {
    OrbitControls,
    useAnimations,
    Html,
    useProgress,
    Grid,
    TransformControls,
} from "@react-three/drei";
import * as THREE from "three";
import { FBXLoader, GLTFLoader, SkeletonUtils, BVHLoader } from "three-stdlib";
import { retargetClip } from "@/utils/retargeting";
import { GLTFExporter } from "three-stdlib";
import { useLocation, useNavigate, useParams } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Slider } from "@/components/ui/slider";
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from "@/components/ui/select";
import { ArrowLeft, Loader2, Play, Pause, Bone, Move, RotateCw, MousePointer2, RefreshCw, Upload, Download } from "lucide-react";
import api from "@/lib/api";
import { toast } from "sonner";
import { exportCharacterWithAnimation, downloadExport, ExportResult } from "@/lib/exportApi";

// --- Types ---
interface ModelViewerProps {
    url: string;
    type: "fbx" | "glb" | "gltf" | "bvh";
    scale?: number;
    showSkeleton?: boolean;
    isPlaying?: boolean;
    activeAnimation?: string;
    color?: string;
    transformMode?: "translate" | "rotate" | null;
    onAnimationsLoaded?: (animations: string[], clips?: THREE.AnimationClip[]) => void;
    onLoaded?: () => void;
    extraAnimations?: { name: string; clip: THREE.AnimationClip }[];
    onExport?: () => void;
}

// --- Helper Components ---
function Loader() {
    const { progress } = useProgress();
    return (
        <Html center>
            <div className="flex flex-col items-center justify-center p-4 bg-black/80 rounded-lg backdrop-blur-md">
                <Loader2 className="w-8 h-8 animate-spin text-white mb-2" />
                <span className="text-white font-medium">{progress.toFixed(0)}% Loaded</span>
            </div>
        </Html>
    );
}

// --- Main Model Component ---
const ModelContent = React.memo(({
    url,
    type,
    scale = 1,
    showSkeleton = false,
    isPlaying = true,
    activeAnimation,
    color,
    transformMode,
    onAnimationsLoaded,
    onLoaded,
    extraAnimations,
    onExport,
}: ModelViewerProps) => {
    // 1. Load the Model
    // 1. Load the Model
    const LoaderClass = useMemo(() => {
        if (type === "fbx" || type.endsWith('fbx')) return FBXLoader;
        if (type === "bvh" || type.endsWith('bvh')) return BVHLoader;
        return GLTFLoader;
    }, [type]);
    // We use useLoader for suspense support.
    const rawLoaded = useLoader(LoaderClass as any, url);

    // 2. Clone using SkeletonUtils to ensure SkinnedMeshes and Bone relationships are preserved uniquely
    // 2. Clone using SkeletonUtils to ensure SkinnedMeshes and Bone relationships are preserved uniquely
    // 2. Scene Preparation (Fix: "PropertyBinding: Can not bind to bones")
    // Goal: Ensure we always return a structure with a SkinnedMesh if possible,
    // or at least a structure where the Mixer can find the tracks.
    // BVH usually returns { skeleton, clip } but NO mesh. Mixer fails to bind tracks to 'bones' if root isn't a SkinnedMesh or compatible.
    const { scene, mixerRoot } = useMemo(() => {
        let finalScene: THREE.Object3D;
        let rootForMixer: THREE.Object3D;

        if (type === "bvh" || type.endsWith('bvh')) {
            // --- BVH Handling: Create Dummy Mesh ---
            const { skeleton, clip } = rawLoaded as any;

            // Create a dummy geometry
            const geometry = new THREE.BoxGeometry(0.5, 0.5, 0.5);
            // Create skin indices/weights (just bind all to root bone for dummy visual)
            const count = geometry.attributes.position.count;
            const skinIndices = [];
            const skinWeights = [];
            for (let i = 0; i < count; i++) {
                skinIndices.push(0, 0, 0, 0);
                skinWeights.push(1, 0, 0, 0);
            }
            geometry.setAttribute('skinIndex', new THREE.Uint16BufferAttribute(skinIndices, 4));
            geometry.setAttribute('skinWeight', new THREE.Float32BufferAttribute(skinWeights, 4));

            const material = new THREE.MeshStandardMaterial({ color: "gray", wireframe: true, transparent: true, opacity: 0.5 });
            const skinnedMesh = new THREE.SkinnedMesh(geometry, material);

            // 重要: BVH skeleton needs to be cloned if we want unique instances, 
            // but BVHLoader returns a fresh skeleton usually.

            const rootBone = skeleton.bones[0];
            skinnedMesh.add(rootBone); // Add bone hierarchy to mesh
            skinnedMesh.bind(skeleton); // Bind

            finalScene = new THREE.Group();
            finalScene.add(skinnedMesh);

            // If we use SkinnedMesh as root, PropertyBinding finds the skeleton.
            rootForMixer = skinnedMesh;

        } else {
            // --- FBX / GLTF Handling ---
            const base = (type === "fbx" || type.endsWith('fbx')) ? (rawLoaded as THREE.Group) : (rawLoaded as any).scene;
            finalScene = SkeletonUtils.clone(base);

            // Find the best root for mixer to avoid "node does not have a skeleton"
            // Ideally, we find the main SkinnedMesh.
            let firstSkinnedMesh: THREE.SkinnedMesh | undefined;
            finalScene.traverse((child) => {
                if (child.type === "SkinnedMesh") firstSkinnedMesh = child as THREE.SkinnedMesh;
            });

            if (firstSkinnedMesh) {
                rootForMixer = finalScene;
            } else {
                rootForMixer = finalScene;
            }
        }

        return { scene: finalScene, mixerRoot: rootForMixer };
    }, [rawLoaded, type]);

    // 3. Setup Animations
    // React-three/drei's useAnimations handles the Mixer and Clock internally, synced with the Fiber render loop.
    // We extract animations from the loaded asset.
    // We extract animations from the loaded asset.
    // 3. Prepare Animations
    const animations = useMemo(() => {
        let baseAnims: THREE.AnimationClip[] = [];

        if (type === "bvh" || type.endsWith('bvh')) {
            baseAnims = [(rawLoaded as any).clip];
        } else {
            baseAnims = ((type === "fbx" || type.endsWith('fbx')) ? (rawLoaded as any).animations : (rawLoaded as any).animations) || [];
        }

        // --- Retargeting Extra Animations ---
        // We need detailed bone map *of the current scene*.
        const processedExtra = (extraAnimations || []).map((anim) => {
            const clip = anim.clip.clone();

            // Find Skeleton in the scene we constructed
            let skeleton: THREE.Skeleton | undefined;
            scene.traverse((o) => {
                if (o.type === "SkinnedMesh" && (o as THREE.SkinnedMesh).skeleton) {
                    skeleton = (o as THREE.SkinnedMesh).skeleton;
                }
            });

            // Fallback for non-skinned visualization
            if (!skeleton) {
                const bones: THREE.Bone[] = [];
                scene.traverse(b => { if ((b as THREE.Bone).isBone) bones.push(b as THREE.Bone) });
                if (bones.length > 0) skeleton = new THREE.Skeleton(bones);
            }

            if (!skeleton) return clip; // Cancel retarget if no skeleton

            return retargetClip(skeleton, clip, { name: anim.name, hipScale: true });
        });

        return [...baseAnims, ...processedExtra];
    }, [rawLoaded, type, extraAnimations, scene]);

    // 4. Hook default mixer
    // Important: We pass 'mixerRoot' not 'scene' if we want strictly bound skeletons for BVH
    const { actions, names, mixer } = useAnimations(animations, mixerRoot);

    // Notify parent about available animations
    useEffect(() => {
        if (onAnimationsLoaded) {
            onAnimationsLoaded(names, animations); // Pass clips too
        }
        if (onLoaded) {
            onLoaded();
        }
    }, [names]); // eslint-disable-line react-hooks/exhaustive-deps

    // 4. Handle Animation Playback
    useEffect(() => {
        // Stop all first
        names.forEach((name) => actions[name]?.fadeOut(0.3).stop());

        if (isPlaying) {
            const animToPlay = activeAnimation || names[0];
            if (animToPlay && actions[animToPlay]) {
                const action = actions[animToPlay];
                action?.reset().fadeIn(0.3).play();
                // Ensure loop mode is correct (usually LoopRepeat by default)
                action!.clampWhenFinished = false;
                action!.enabled = true;
            }
        }

    }, [isPlaying, activeAnimation, actions, names]);

    // 5. Apply Color
    useEffect(() => {
        if (scene) {
            scene.traverse((child: any) => {
                if (child.isMesh) {
                    // Clone material to avoid affecting shared instances if any
                    // We store original material in userData to revert if needed
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


    // 6. Auto Sizing and Centering Logic
    // We run this once when the scene changes to "Normalize" the model.
    useEffect(() => {
        if (!scene) return;

        // Reset Scale/Position first to get accurate bounds
        scene.position.set(0, 0, 0);
        scene.scale.set(1, 1, 1);
        scene.updateMatrixWorld(true);

        const box = new THREE.Box3().setFromObject(scene);
        const size = new THREE.Vector3();
        const center = new THREE.Vector3();
        box.getSize(size);
        box.getCenter(center);

        const maxDim = Math.max(size.x, size.y, size.z);
        const targetSize = 2; // Target ~2 units (Human height roughly)

        // Avoid division by zero
        const scaleFactor = maxDim > 0 ? targetSize / maxDim : 1;

        // Apply centering and scaling
        // We move the scene so its center is at (0,0,0)
        scene.position.x = -center.x * scaleFactor;
        scene.position.y = -box.min.y * scaleFactor; // Sit on the floor
        scene.position.z = -center.z * scaleFactor;

        scene.scale.setScalar(scaleFactor);

        // Shadow Config (Optional but good for visuals)
        scene.traverse((child) => {
            if ((child as THREE.Mesh).isMesh) {
                child.castShadow = true;
                child.receiveShadow = true;
            }
        });

    }, [scene]);

    // Skeleton Helper
    // We add a helper primitive if requested
    const skeletonHelper = useMemo(() => {
        if (!showSkeleton) return null;
        return new THREE.SkeletonHelper(scene);
    }, [scene, showSkeleton]);

    // Expose scene to parent for export if needed via ref (advanced) or just handle export here?
    // Actually, parent requested pure logic. We can use a ref but we are React.memo...
    // Let's attach the scene to a global variable or custom event for the Exporter to grab? 
    // Or better, we just use a small effect to update a Ref passed in props.
    // For simplicity in this "Copy Mixamo" task, let's implemented Export trigger here or in parent.
    // Parent has the buttons. Parent needs access to 'scene' and 'animations'.
    useFrame(() => {
        if (skeletonHelper) (skeletonHelper as any).update();

        // Blending Logic:
        // transition logic is handled by useAnimations if we use fadeTo
        // transition logic is handled by useAnimations if we use fadeTo
    });

    // --- Export Logic ---
    useEffect(() => {
        const handleExport = () => {
            if (!scene) return;
            const exporter = new GLTFExporter();
            exporter.parse(
                scene,
                (result) => {
                    if (result instanceof ArrayBuffer) {
                        const blob = new Blob([result], { type: "application/octet-stream" });
                        const url = URL.createObjectURL(blob);
                        const link = document.createElement("a");
                        link.href = url;
                        link.download = "model_export.glb";
                        link.click();
                        URL.revokeObjectURL(url);
                    } else {
                        const output = JSON.stringify(result, null, 2);
                        const blob = new Blob([output], { type: "text/plain" });
                        const url = URL.createObjectURL(blob);
                        const link = document.createElement("a");
                        link.href = url;
                        link.download = "model_export.gltf";
                        link.click();
                        URL.revokeObjectURL(url);
                    }
                    toast.success("Model exported successfully!");
                },
                (err) => {
                    console.error(err);
                    toast.error("Export failed");
                },
                {
                    animations: animations,
                    binary: true, // Export as GLB
                }
            );
        };

        window.addEventListener("trigger-export-glb", handleExport);
        return () => window.removeEventListener("trigger-export-glb", handleExport);
    }, [scene, animations]);

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


export default function ModelViewerPage() {
    const { id } = useParams();
    const navigate = useNavigate();
    const location = useLocation();

    // -- State --
    const [modelData, setModelData] = useState<any>(location.state?.model || null);

    // UI Controls
    const [userScale, setUserScale] = useState([1]);
    const [isPlaying, setIsPlaying] = useState(false); // Start false to prevent premature accumulation
    const [showSkeleton, setShowSkeleton] = useState(modelData?.type === "bvh" || modelData?.type?.endsWith("bvh") || false);
    const [animationsList, setAnimationsList] = useState<string[]>([]);
    const [animationsClips, setAnimationsClips] = useState<THREE.AnimationClip[]>([]); // Store actual clips
    const [currentAnim, setCurrentAnim] = useState<string>("");

    // New Features
    const [color, setColor] = useState<string>("");
    const [transformMode, setTransformMode] = useState<"translate" | "rotate" | null>(null);
    const [extraAnimations, setExtraAnimations] = useState<{ name: string, clip: THREE.AnimationClip }[]>([]);
    const [isProcessingBVH, setIsProcessingBVH] = useState(false);

    // -- Preview Side Panel State --
    const [previewUrl, setPreviewUrl] = useState<string | null>(null);
    const [previewFile, setPreviewFile] = useState<File | null>(null);
    const [previewPlaying, setPreviewPlaying] = useState(true);

    const handlePreviewUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
        if (e.target.files && e.target.files[0]) {
            const file = e.target.files[0];
            const url = URL.createObjectURL(file);
            setPreviewUrl(url);
            setPreviewFile(file);
        }
    };

    // Sync animations from Main Model to Preview Model
    const syncedPreviewAnimations = useMemo(() => {
        if (!currentAnim || animationsClips.length === 0) return [];
        const activeClip = animationsClips.find(c => c.name === currentAnim);
        return activeClip ? [{ name: `Synced-${currentAnim}`, clip: activeClip }] : [];
    }, [currentAnim, animationsClips]);

    // -- Server-Side Export State --
    const [isExporting, setIsExporting] = useState(false);
    const [exportResult, setExportResult] = useState<ExportResult | null>(null);
    const [exportProgress, setExportProgress] = useState(0);

    // Server-Side Export Handler
    const handleServerExport = async () => {
        if (!previewFile) {
            toast.error("Please upload a character file first");
            return;
        }

        if (!currentAnim) {
            toast.error("Please select an animation first");
            return;
        }

        try {
            setIsExporting(true);
            setExportProgress(0);
            setExportResult(null);

            // Get the current animation file
            // We need to fetch the animation file from the main model
            const animationPath = modelData.path.replace(/\\/g, "/");
            const animationUrl = `/${animationPath}`;

            // Fetch animation file
            const animResponse = await fetch(animationUrl);
            const animBlob = await animResponse.blob();
            const animFile = new File([animBlob], modelData.name, { type: 'application/octet-stream' });

            // Call export API
            const result = await exportCharacterWithAnimation(
                previewFile,
                animFile,
                (progress) => setExportProgress(progress)
            );

            setExportResult(result);
            toast.success("Export completed! Click download to get your file.");
        } catch (error: any) {
            console.error("Export failed:", error);
            toast.error(error.response?.data?.error || "Export failed. Please try again.");
        } finally {
            setIsExporting(false);
        }
    };



    // -- Data Fetching --
    useEffect(() => {
        if (!modelData && id) {
            api.get(`/models`)
                .then((res) => {
                    const found = res.data.find((m: any) => m.id === parseInt(id));
                    if (found) setModelData(found);
                    else toast.error("Model not found");
                })
                .catch((err) => {
                    console.error(err);
                    toast.error("Failed to load model details");
                });
        }
    }, [id, modelData]);

    useEffect(() => {
        if (modelData?.type === "bvh" || modelData?.type?.endsWith("bvh")) {
            setShowSkeleton(true);
        }
    }, [modelData]);


    const handleBVHUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
        if (!e.target.files || !e.target.files[0]) return;

        const file = e.target.files[0];
        setIsProcessingBVH(true);

        try {
            const reader = new FileReader();
            reader.onload = (event) => {
                const content = event.target?.result as string;
                const loader = new BVHLoader();
                const result = loader.parse(content);

                // 1. Set explicit name
                const clipName = file.name.replace(/\.[^/.]+$/, "");
                result.clip.name = clipName;

                // 2. Update logic: Add to list -> Auto Select -> Auto Play
                // Check if name exists
                let finalName = clipName;
                let counter = 1;
                while (extraAnimations.some(a => a.name === finalName)) {
                    finalName = `${clipName} (${counter++})`;
                }
                result.clip.name = finalName;

                setExtraAnimations((prev) => [...prev, { name: finalName, clip: result.clip }]);

                // Use a timeout to ensure the state update processes before we select it (React batching)
                // Although currentAnim is a string, ModelContent uses it to verify presence.
                setTimeout(() => {
                    setCurrentAnim(finalName);
                    setIsPlaying(true);
                }, 100);

                toast.success(`Playing: ${clipName}`);
                setIsProcessingBVH(false);
            };
            reader.readAsText(file);
        } catch (err) {
            console.error(err);
            toast.error("Failed to load BVH file");
            setIsProcessingBVH(false);
        }
    };

    if (!modelData) {
        return (
            <div className="flex h-screen w-full items-center justify-center bg-gray-900 text-white">
                <Loader2 className="h-8 w-8 animate-spin" />
            </div>
        );
    }

    const modelUrl = `/${modelData.path.replace(/\\/g, "/")}`;

    return (
        <div className="relative h-[calc(100vh-4rem)] w-full bg-gradient-to-br from-gray-900 to-gray-800 text-white overflow-hidden">

            {/* --- Header / Back Button --- */}
            <div className="absolute left-4 top-4 z-10 flex items-center gap-4">
                <Button variant="secondary" size="icon" onClick={() => navigate(-1)} className="bg-black/40 hover:bg-black/60 backdrop-blur-md border-white/10">
                    <ArrowLeft className="h-5 w-5" />
                </Button>
                <div className="rounded-lg bg-black/40 px-4 py-2 backdrop-blur-md border border-white/10">
                    <h1 className="text-lg font-bold text-gray-100">{modelData.name}</h1>
                </div>
            </div>

            {/* --- Controls Bar (Bottom) --- */}
            <Card className="absolute bottom-6 left-1/2 -translate-x-1/2 z-20 w-[95%] max-w-7xl border-white/10 bg-black/60 backdrop-blur-md text-white shadow-2xl">
                <CardContent className="flex items-center justify-between p-4 gap-4">

                    {/* Group 1: Tools & Size */}
                    <div className="flex items-center gap-4 border-r border-white/10 pr-4">
                        <div className="flex flex-col gap-1">
                            <span className="text-[10px] uppercase font-bold text-gray-400 tracking-wider">Transform</span>
                            <div className="flex bg-black/30 p-1 rounded-md">
                                <Button
                                    variant={transformMode === null ? "secondary" : "ghost"}
                                    size="icon"
                                    onClick={() => setTransformMode(null)}
                                    className="h-7 w-7 rounded-sm hover:bg-white/20"
                                    title="Selection Mode"
                                >
                                    <MousePointer2 className="h-4 w-4" />
                                </Button>
                                <Button
                                    variant={transformMode === 'translate' ? "secondary" : "ghost"}
                                    size="icon"
                                    onClick={() => setTransformMode('translate')}
                                    className="h-7 w-7 rounded-sm hover:bg-white/20"
                                    title="Move Mode"
                                >
                                    <Move className="h-4 w-4" />
                                </Button>
                                <Button
                                    variant={transformMode === 'rotate' ? "secondary" : "ghost"}
                                    size="icon"
                                    onClick={() => setTransformMode('rotate')}
                                    className="h-7 w-7 rounded-sm hover:bg-white/20"
                                    title="Rotate Mode"
                                >
                                    <RotateCw className="h-4 w-4" />
                                </Button>
                            </div>
                        </div>

                        <div className="flex flex-col gap-1 min-w-[100px]">
                            <span className="text-[10px] uppercase font-bold text-gray-400 tracking-wider flex justify-between">
                                Size <span>{userScale[0].toFixed(1)}x</span>
                            </span>
                            <Slider
                                value={userScale}
                                min={0.1}
                                max={3}
                                step={0.1}
                                onValueChange={setUserScale}
                                className="w-full py-1"
                            />
                        </div>
                    </div>

                    {/* Group 2: Color */}
                    <div className="flex flex-col gap-1 border-r border-white/10 pr-4">
                        <span className="text-[10px] uppercase font-bold text-gray-400 tracking-wider">Style</span>
                        <div className="flex items-center gap-2">
                            <div className="relative w-8 h-8 rounded overflow-hidden ring-1 ring-white/20">
                                <input
                                    type="color"
                                    value={color || "#ffffff"}
                                    onChange={(e) => setColor(e.target.value)}
                                    className="absolute -top-1 -left-1 w-[150%] h-[150%] cursor-pointer p-0 m-0 border-0"
                                    title="Change Base Color"
                                />
                            </div>
                            {color && (
                                <Button
                                    variant="ghost"
                                    size="icon"
                                    className="h-8 w-8 text-white/70 hover:text-white"
                                    onClick={() => setColor("")}
                                    title="Reset Color"
                                >
                                    <RefreshCw className="h-4 w-4" />
                                </Button>
                            )}
                        </div>
                    </div>

                    {/* Group 3: Animation */}
                    <div className="flex items-center gap-4 flex-1 border-r border-white/10 pr-4">
                        <div className="flex flex-col gap-1 flex-1">
                            <span className="text-[10px] uppercase font-bold text-gray-400 tracking-wider flex items-center justify-between">
                                Animation
                                <span className="text-xs font-normal normal-case text-gray-500">
                                    {extraAnimations.length > 0 ? `${extraAnimations.length} uploaded` : ""}
                                </span>
                            </span>
                            <div className="flex items-center gap-2">
                                <Button
                                    variant="outline"
                                    size="icon"
                                    onClick={() => setIsPlaying(!isPlaying)}
                                    className="h-8 w-8 border-white/20 bg-transparent text-white hover:bg-white/10 shrink-0"
                                >
                                    {isPlaying ? <Pause className="h-4 w-4" /> : <Play className="h-4 w-4" />}
                                </Button>

                                <div className="flex-1 max-w-xs">
                                    {animationsList.length > 0 ? (
                                        <Select value={currentAnim} onValueChange={setCurrentAnim}>
                                            <SelectTrigger className="w-full h-8 bg-black/30 border-white/10 text-white text-xs">
                                                <SelectValue placeholder="Select Action" />
                                            </SelectTrigger>
                                            <SelectContent className="bg-gray-800 text-white border-white/10">
                                                <SelectItem value="none" disabled className="text-gray-500 text-xs font-bold">Base Animations</SelectItem>
                                                {animationsList.map((anim) => (
                                                    <SelectItem key={anim} value={anim}>{anim}</SelectItem>
                                                ))}
                                                {extraAnimations.length > 0 && (
                                                    <>
                                                        <SelectItem value="sep" disabled className="text-gray-500 text-xs font-bold border-t border-white/10 mt-1 pt-1">Uploaded</SelectItem>
                                                        {extraAnimations.map((anim) => (
                                                            <SelectItem key={anim.name} value={anim.name}>{anim.name}</SelectItem>
                                                        ))}
                                                    </>
                                                )}
                                            </SelectContent>
                                        </Select>
                                    ) : (
                                        <div className="text-xs text-gray-500 italic">No animations</div>
                                    )}
                                </div>

                                <div className="relative">
                                    <Button
                                        variant="ghost"
                                        size="sm"
                                        className="h-8 px-2 text-xs border border-white/10 hover:bg-white/10 text-gray-300"
                                        disabled={isProcessingBVH}
                                        title="Upload BVH Animation"
                                    >
                                        {isProcessingBVH ? <Loader2 className="w-3 h-3 animate-spin" /> : <Upload className="w-3 h-3 mr-1" />}
                                        Add BVH
                                    </Button>
                                    <input
                                        type="file"
                                        accept=".bvh"
                                        className="absolute inset-0 opacity-0 cursor-pointer"
                                        onChange={handleBVHUpload}
                                        disabled={isProcessingBVH}
                                    />
                                </div>
                            </div>
                        </div>
                    </div>

                    {/* Group 4: Actions */}
                    <div className="flex items-center gap-2 pl-2">
                        <Button
                            variant={showSkeleton ? "secondary" : "ghost"}
                            size="icon"
                            className={`h-9 w-9 ${showSkeleton ? 'bg-white text-black' : 'text-gray-400 hover:text-white hover:bg-white/10'}`}
                            onClick={() => setShowSkeleton(!showSkeleton)}
                            title="Toggle Skeleton"
                        >
                            <Bone className="w-5 h-5" />
                        </Button>

                        {/* Export with Animation Button */}
                        {exportResult ? (
                            <a href={downloadExport(exportResult.filename)} download>
                                <Button
                                    variant="default"
                                    className="bg-green-600 hover:bg-green-700 text-white h-9 px-4"
                                >
                                    <Download className="w-4 h-4 mr-2" /> Download FBX
                                </Button>
                            </a>
                        ) : (
                            <Button
                                variant="default"
                                className="bg-blue-600 hover:bg-blue-700 text-white h-9 px-4"
                                onClick={handleServerExport}
                                disabled={isExporting || !previewFile}
                                title={!previewFile ? "Upload a character first" : "Export with animation using Blender"}
                            >
                                {isExporting ? (
                                    <><Loader2 className="w-4 h-4 mr-2 animate-spin" /> Exporting...</>
                                ) : (
                                    <><Download className="w-4 h-4 mr-2" /> Export with Animation</>
                                )}
                            </Button>
                        )}

                        <div className="flex flex-col gap-1 ml-2">
                            <Button
                                variant="outline"
                                size="sm"
                                disabled={isExporting || !previewFile}
                                className="h-4 text-[10px] px-1 border-white/20 hover:bg-white/10"
                                onClick={async () => {
                                    if (!previewFile) return;
                                    setIsExporting(true);
                                    try {
                                        toast.info("Stealing skeleton from Main Character... 🦴");

                                        // 1. Fetch Main Model (Source)
                                        const response = await fetch(modelUrl);
                                        const blob = await response.blob();
                                        const mainModelFile = new File([blob], "source_model.fbx", { type: "application/octet-stream" });

                                        // 2. Call Smart Export (Retarget/AutoRig)
                                        const m = await import("@/lib/exportApi");
                                        // We pass the main model as the 'animation' source, because it HAS the skeleton/anim we want.
                                        // The backend will detect 'No Armature' on target and steal the rig from this source.
                                        const result = await m.exportCharacterWithAnimation(previewFile, mainModelFile);

                                        // 3. Update Preview to show the result
                                        setExportResult(result); // Enable download
                                        setPreviewUrl(`${result.download_url}`); // Update View

                                        toast.success("Auto-Rig Logic Applied! Preview updated. 🎭");
                                    } catch (e) {
                                        console.error(e);
                                        toast.error("Auto-Rig failed: " + e);
                                    } finally {
                                        setIsExporting(false);
                                    }
                                }}
                            >
                                <Bone className="w-3 h-3 mr-1" /> Auto-Rig
                            </Button>
                            <Button
                                variant="outline"
                                size="sm"
                                disabled={isExporting || !previewFile}
                                className="h-4 text-[10px] px-1 border-white/20 hover:bg-white/10"
                                onClick={async () => {
                                    if (!previewFile) return;
                                    setIsExporting(true);
                                    try {
                                        const m = await import("@/lib/exportApi");
                                        const result = await m.generateSprintAnimation(previewFile);
                                        window.open(`/api/export/download/${result.filename}`, '_blank');
                                        toast.success("Sprint Added! Downloading...");
                                    } catch (e) {
                                        toast.error("Sprint Generation failed");
                                    } finally {
                                        setIsExporting(false);
                                    }
                                }}
                            >
                                <Move className="w-3 h-3 mr-1" /> Add Sprint
                            </Button>
                        </div>
                    </div>



                </CardContent>
            </Card>

            {/* --- Split Screen Layout --- */}
            <div className="flex h-full w-full">
                {/* --- Left Screen: Main Model --- */}
                <div className="relative w-1/2 h-full border-r border-white/10">
                    <Canvas shadows camera={{ position: [0, 1.5, 4], fov: 50 }}>
                        <ambientLight intensity={0.6} />
                        <directionalLight position={[5, 10, 5]} intensity={1.5} castShadow shadow-mapSize={[1024, 1024]} />
                        <directionalLight position={[-5, 5, -5]} intensity={0.5} color="#b0cdff" />
                        <Grid position={[0, 0, 0]} args={[20, 20]} cellColor="#6f6f6f" sectionColor="#9d9d9d" fadeDistance={25} infiniteGrid />

                        <Suspense fallback={<Loader />}>
                            <ModelContent
                                url={modelUrl}
                                type={modelData.type || "fbx"}
                                scale={userScale[0]}
                                showSkeleton={showSkeleton}
                                isPlaying={isPlaying}
                                activeAnimation={currentAnim}
                                color={color}
                                transformMode={transformMode}
                                extraAnimations={extraAnimations}
                                onAnimationsLoaded={(anims, clips) => {
                                    setAnimationsList(anims);
                                    if (clips) setAnimationsClips(clips);
                                    if (!currentAnim && anims.length > 0) setCurrentAnim(anims[0]);
                                }}
                                onLoaded={() => setIsPlaying(true)}
                            />
                        </Suspense>

                        <OrbitControls makeDefault target={[0, 1, 0]} minDistance={1} maxDistance={10} enableDamping={true} dampingFactor={0.05} enabled={!transformMode} />
                    </Canvas>
                </div>

                {/* --- Right Screen: Preview Model --- */}
                <div className="relative w-1/2 h-full bg-black/20">
                    {previewUrl ? (
                        <>
                            <Canvas shadows camera={{ position: [0, 1.5, 4], fov: 50 }}>
                                <ambientLight intensity={0.6} />
                                <directionalLight position={[5, 10, 5]} intensity={1.5} castShadow />
                                <directionalLight position={[-5, 5, -5]} intensity={0.5} color="#b0cdff" />
                                <Grid position={[0, 0, 0]} args={[20, 20]} cellColor="#6f6f6f" sectionColor="#9d9d9d" fadeDistance={25} infiniteGrid />

                                <Suspense fallback={<Loader />}>
                                    <ModelContent
                                        url={previewUrl}
                                        type="fbx"
                                        scale={1}
                                        isPlaying={isPlaying} // Sync playing state
                                        // Pass the CURRENTLY PLAYING clip from Main Model as an "extra" animation to the preview
                                        // effectively retargeting it.
                                        activeAnimation={currentAnim ? `Synced-${currentAnim}` : undefined}
                                        extraAnimations={syncedPreviewAnimations}
                                        showSkeleton={false}
                                        onLoaded={() => setPreviewPlaying(true)}
                                    />
                                </Suspense>

                                <OrbitControls makeDefault target={[0, 1, 0]} minDistance={1} maxDistance={10} enableDamping={true} dampingFactor={0.05} />
                            </Canvas>

                            {/* Floating Controls for Preview */}
                            <div className="absolute top-4 right-4 flex flex-col gap-2 z-10">
                                <div className="bg-black/60 backdrop-blur-md p-2 rounded-lg border border-white/10">
                                    <div className="text-xs font-medium text-gray-300 mb-2 px-1">Preview Controls</div>
                                    <div className="flex gap-2">
                                        <Button
                                            variant="ghost"
                                            size="sm"
                                            onClick={() => setPreviewPlaying(!previewPlaying)}
                                            className="h-8 px-2 text-white hover:bg-white/20"
                                        >
                                            {previewPlaying ? <><Pause className="w-4 h-4 mr-1" /> Pause</> : <><Play className="w-4 h-4 mr-1" /> Play</>}
                                        </Button>
                                        <div className="relative">
                                            <Button variant="outline" size="sm" className="h-8 border-white/20 text-white bg-transparent hover:bg-white/10">
                                                <Upload className="w-3 h-3 mr-1" /> Replace
                                            </Button>
                                            <input type="file" accept=".fbx" className="absolute inset-0 opacity-0 cursor-pointer" onChange={handlePreviewUpload} />
                                        </div>
                                    </div>
                                    <div className="mt-2 text-xs text-gray-400 px-1 truncate max-w-[200px]">
                                        {previewFile?.name}
                                    </div>
                                </div>
                            </div>
                        </>
                    ) : (
                        <div className="flex flex-col items-center justify-center h-full text-gray-400">
                            <div className="bg-black/40 p-8 rounded-xl border border-white/10 backdrop-blur-md flex flex-col items-center gap-4">
                                <Upload className="w-12 h-12 opacity-50" />
                                <h2 className="text-xl font-semibold text-gray-200">Upload Character Preview</h2>
                                <p className="text-sm text-gray-500 max-w-xs text-center">
                                    Upload an FBX file to preview it side-by-side with your main model.
                                </p>
                                <div className="relative w-full">
                                    <Button className="w-full bg-blue-600 hover:bg-blue-700">
                                        Select FBX File
                                    </Button>
                                    <input type="file" accept=".fbx" className="absolute inset-0 opacity-0 cursor-pointer" onChange={handlePreviewUpload} />
                                </div>
                            </div>
                        </div>
                    )}
                </div>
            </div>
        </div >
    );
}
