import { useState, useRef, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Slider } from "@/components/ui/slider";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import {
    Upload, Loader2, Maximize, Palette, Move, RotateCw,
    MousePointer2, RefreshCw, Play, Pause, Bone, Download, Box
} from "lucide-react";
import UnifiedModelViewer from "@/components/3d/UnifiedModelViewer";
import { toast } from "sonner";
import api from "@/lib/api";

type TaskStatus = "IDLE" | "UPLOADING" | "QUEUED" | "RUNNING" | "SUCCESS" | "FAILED";

export default function ThreeDAILabPage() {
    // -- State: Generation Process --
    const [status, setStatus] = useState<TaskStatus>("IDLE");
    const [taskId, setTaskId] = useState<string | null>(null);
    const [progress, setProgress] = useState(0);
    const [modelUrl, setModelUrl] = useState<string | null>(null);
    const [uploadedImage, setUploadedImage] = useState<string | null>(null);
    const [prompt, setPrompt] = useState("");

    // -- State: Viewer Controls --
    const [userScale, setUserScale] = useState([1]);
    const [isPlaying, setIsPlaying] = useState(true);
    const [showSkeleton, setShowSkeleton] = useState(false);
    const [animationsList, setAnimationsList] = useState<string[]>([]);
    const [currentAnim, setCurrentAnim] = useState<string>("");
    const [color, setColor] = useState<string>("");
    const [transformMode, setTransformMode] = useState<"translate" | "rotate" | null>(null);

    // -- Polling Logic --
    useEffect(() => {
        let interval: NodeJS.Timeout;

        if (taskId && (status === "QUEUED" || status === "RUNNING")) {
            interval = setInterval(async () => {
                try {
                    const res = await api.get(`/ai/status/${taskId}`);
                    const data = res.data;

                    if (data.status === "SUCCESS") {
                        // Tripo returns .glb usually
                        setModelUrl(data.result.model.url);
                        setStatus("SUCCESS");
                        setProgress(100);
                        clearInterval(interval);
                        toast.success("Model Generated Successfully!");
                    } else if (data.status === "FAILED" || data.status === "CANCELLED") {
                        setStatus("FAILED");
                        clearInterval(interval);
                        toast.error("Generation Failed: " + (data.error || "Unknown error"));
                    } else {
                        // Creating/Running
                        setStatus(data.status); // RUNNING or QUEUED
                        setProgress(data.progress || (status === "QUEUED" ? 10 : 50));
                    }
                } catch (e) {
                    console.error("Polling error", e);
                }
            }, 2000); // Poll every 2s
        }

        return () => clearInterval(interval);
    }, [taskId, status]);


    // -- Handlers --
    const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (!file) return;

        // Preview
        setUploadedImage(URL.createObjectURL(file));
        setStatus("UPLOADING");
        setProgress(0);
        setModelUrl(null);
        setTaskId(null);

        const formData = new FormData();
        formData.append("image", file);
        if (prompt) formData.append("prompt", prompt);

        try {
            const res = await api.post("/ai/generate", formData, {
                headers: { "Content-Type": "multipart/form-data" },
            });
            setTaskId(res.data.task_id);
            setStatus("QUEUED");
            toast.info("Upload complete. Starting generation...");
        } catch (err: any) {
            console.error(err);
            setStatus("FAILED");
            toast.error("Upload failed");
        }
    };

    const handleDownload = () => {
        if (!modelUrl) return;
        const link = document.createElement('a');
        link.href = modelUrl;
        link.download = `tripo-model-${taskId}.glb`;
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
    };

    const resetView = () => {
        setUserScale([1]);
        setColor("");
        setTransformMode(null);
    };

    return (
        <div className="flex h-[calc(100vh-4rem)] w-full bg-gray-900 text-white overflow-hidden">

            {/* --- Left Sidebar: Upload & Status --- */}
            <div className="w-80 bg-gray-950/50 backdrop-blur-md border-r border-white/10 p-5 flex flex-col gap-6 overflow-y-auto z-20">
                <div>
                    <h2 className="text-xl font-bold bg-gradient-to-r from-blue-400 to-purple-400 bg-clip-text text-transparent mb-1">3D AI Lab</h2>
                    <p className="text-xs text-gray-500">Powered by Tripo AI</p>
                </div>

                {/* Upload Card */}
                <Card className="bg-black/20 border-white/10">
                    <CardHeader className="p-4 pb-2">
                        <CardTitle className="text-sm font-medium text-gray-300">Generate 3D Model</CardTitle>
                    </CardHeader>
                    <CardContent className="p-4 space-y-4">

                        <div className="space-y-2">
                            <Label className="text-xs text-gray-400">Prompt (Optional)</Label>
                            <Input
                                placeholder="e.g. A futuristic robot..."
                                className="bg-black/40 border-white/10 text-xs h-8"
                                value={prompt}
                                onChange={(e) => setPrompt(e.target.value)}
                                disabled={status !== "IDLE" && status !== "SUCCESS" && status !== "FAILED"}
                            />
                        </div>

                        <div className="relative w-full aspect-square bg-black/40 rounded-lg border-2 border-dashed border-white/10 flex flex-col items-center justify-center overflow-hidden group hover:border-blue-500/50 transition-colors">
                            {uploadedImage ? (
                                <img src={uploadedImage} alt="Preview" className="w-full h-full object-cover" />
                            ) : (
                                <div className="text-center p-4">
                                    <Upload className="w-8 h-8 text-gray-600 mx-auto mb-2 group-hover:text-gray-400" />
                                    <span className="text-xs text-gray-500">Click to upload</span>
                                </div>
                            )}
                            <input
                                type="file"
                                accept="image/png, image/jpeg, image/jpg"
                                className="absolute inset-0 opacity-0 cursor-pointer"
                                onChange={handleFileUpload}
                                disabled={status === "UPLOADING" || status === "QUEUED" || status === "RUNNING"}
                            />
                        </div>

                        {/* Status Indicator */}
                        {status !== "IDLE" && (
                            <div className="space-y-2">
                                <div className="flex justify-between text-xs">
                                    <span className={
                                        status === "FAILED" ? "text-red-400" :
                                            status === "SUCCESS" ? "text-green-400" : "text-blue-400"
                                    }>{status}</span>
                                    <span>{progress}%</span>
                                </div>
                                <div className="h-1.5 w-full bg-gray-800 rounded-full overflow-hidden">
                                    <div
                                        className={`h-full transition-all duration-300 ${status === "FAILED" ? "bg-red-500" :
                                            status === "SUCCESS" ? "bg-green-500" : "bg-blue-500 animate-pulse"
                                            }`}
                                        style={{ width: `${progress}%` }}
                                    />
                                </div>
                            </div>
                        )}
                    </CardContent>
                </Card>

                {/* Model Actions (Only when Success) */}
                {status === "SUCCESS" && (
                    <div className="grid gap-2">
                        <Button className="w-full gap-2 bg-blue-600 hover:bg-blue-700" onClick={handleDownload}>
                            <Download className="w-4 h-4" /> Download GLB
                        </Button>
                        <p className="text-[10px] text-gray-500 text-center">Compatible with Unity, Godot, Blender</p>
                    </div>
                )}
            </div>

            {/* --- Center: 3D Viewport --- */}
            <div className="flex-1 relative bg-gray-900">
                {modelUrl ? (
                    <UnifiedModelViewer
                        url={modelUrl}
                        type="glb" // Tripo usually returns GLB
                        scale={userScale[0]}
                        color={color}
                        transformMode={transformMode}
                        showSkeleton={showSkeleton}
                        isPlaying={isPlaying}
                        activeAnimation={currentAnim}
                        onAnimationsLoaded={setAnimationsList}
                    />
                ) : (
                    <div className="h-full w-full flex flex-col items-center justify-center text-gray-600 space-y-4">
                        <Box className="w-16 h-16 opacity-20" />
                        <p>Upload an image to generate a 3D model</p>
                    </div>
                )}
            </div>

            {/* --- Right Sidebar: Controls (Only when Model is loaded) --- */}
            {modelUrl && (
                <div className="w-72 bg-gray-950/50 backdrop-blur-md border-l border-white/10 p-5 flex flex-col gap-6 overflow-y-auto z-20">
                    <div className="flex items-center justify-between">
                        <h3 className="text-sm font-medium text-gray-300">Model Controls</h3>
                        <Button size="icon" variant="ghost" className="h-6 w-6" onClick={resetView} title="Reset">
                            <RefreshCw className="w-3 h-3" />
                        </Button>
                    </div>

                    {/* Size */}
                    <div className="space-y-3">
                        <div className="flex justify-between text-xs text-gray-400">
                            <span>Scale</span>
                            <span>{userScale[0].toFixed(1)}x</span>
                        </div>
                        <Slider value={userScale} min={0.1} max={3} step={0.1} onValueChange={setUserScale} />
                    </div>

                    {/* Tools */}
                    <div className="space-y-3">
                        <Label className="text-xs text-gray-400">Transform Tool</Label>
                        <div className="flex bg-black/40 p-1 rounded-md">
                            <Button
                                variant={transformMode === null ? "secondary" : "ghost"}
                                size="sm" className="flex-1 h-7 text-xs"
                                onClick={() => setTransformMode(null)}
                            >
                                <MousePointer2 className="w-3 h-3" />
                            </Button>
                            <Button
                                variant={transformMode === 'translate' ? "secondary" : "ghost"}
                                size="sm" className="flex-1 h-7 text-xs"
                                onClick={() => setTransformMode('translate')}
                            >
                                <Move className="w-3 h-3" />
                            </Button>
                            <Button
                                variant={transformMode === 'rotate' ? "secondary" : "ghost"}
                                size="sm" className="flex-1 h-7 text-xs"
                                onClick={() => setTransformMode('rotate')}
                            >
                                <RotateCw className="w-3 h-3" />
                            </Button>
                        </div>
                    </div>

                    {/* Color */}
                    <div className="space-y-3">
                        <Label className="text-xs text-gray-400">Material Tint</Label>
                        <div className="flex gap-2">
                            <input
                                type="color"
                                className="h-8 w-full cursor-pointer rounded bg-transparent border border-white/10"
                                value={color || "#ffffff"}
                                onChange={(e) => setColor(e.target.value)}
                            />
                            {color && (
                                <Button size="icon" variant="outline" className="h-8 w-8" onClick={() => setColor("")}>
                                    <RefreshCw className="w-3 h-3" />
                                </Button>
                            )}
                        </div>
                    </div>

                    {/* Skeleton */}
                    <Button
                        variant="outline"
                        size="sm"
                        onClick={() => setShowSkeleton(!showSkeleton)}
                        className="justify-between border-white/10 text-xs"
                    >
                        <span>Show Skeleton</span>
                        <Bone className={`w-3 h-3 ${showSkeleton ? "text-blue-400" : "text-gray-600"}`} />
                    </Button>

                    {/* Animations (if any) */}
                    {animationsList.length > 0 && (
                        <div className="space-y-3 pt-4 border-t border-white/10">
                            <Label className="text-xs text-gray-400">Animations</Label>
                            <div className="flex gap-2">
                                <Button size="icon" variant="ghost" onClick={() => setIsPlaying(!isPlaying)}>
                                    {isPlaying ? <Pause className="w-4 h-4" /> : <Play className="w-4 h-4" />}
                                </Button>
                                <Select value={currentAnim} onValueChange={setCurrentAnim}>
                                    <SelectTrigger className="h-9 text-xs">
                                        <SelectValue placeholder="Anim" />
                                    </SelectTrigger>
                                    <SelectContent>
                                        {animationsList.map(a => <SelectItem key={a} value={a}>{a}</SelectItem>)}
                                    </SelectContent>
                                </Select>
                            </div>
                        </div>
                    )}
                </div>
            )}
        </div>
    );
}
