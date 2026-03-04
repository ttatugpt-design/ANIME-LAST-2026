import { useState, useEffect } from "react";
import { useIntersectionObserver } from "@/hooks/use-intersection-observer";
import { useTranslation } from "react-i18next";
import { useQuery } from "@tanstack/react-query";
import api from "@/lib/api";
import { Card, CardContent, CardHeader, CardTitle, CardFooter } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Box, Download, ExternalLink, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useNavigate } from "react-router-dom";
import { toast } from "sonner";
import {
    Dialog,
    DialogContent,
} from "@/components/ui/dialog";
import UnifiedModelViewer from "@/components/3d/UnifiedModelViewer";
import CrunchyrollSkeleton from "@/components/skeleton/CrunchyrollSkeleton";

const BASE_URL = import.meta.env.VITE_API_URL || '';

const getModelUrl = (path: string) => {
    if (!path) return '';
    if (path.startsWith('http')) return path;
    const cleanPath = path.startsWith('/') ? path : `/${path}`;
    return `${BASE_URL}${cleanPath}`;
};

export default function HomePage() {
    const navigate = useNavigate();
    const { i18n } = useTranslation();
    const [selectedModel, setSelectedModel] = useState<any>(null);
    const [isViewModalOpen, setIsViewModalOpen] = useState(false);
    const [isModelLoading, setIsModelLoading] = useState(false);
    const [initialLoading, setInitialLoading] = useState(true);

    useEffect(() => {
        if (initialLoading) {
            const timer = setTimeout(() => {
                setInitialLoading(false);
            }, 800);
            return () => clearTimeout(timer);
        }
    }, [initialLoading]);

    const handleModelClick = (model: any) => {
        setSelectedModel(model);
        setIsModelLoading(true);
        setIsViewModalOpen(true);
    };

    const handleModelLoaded = () => {
        setIsModelLoading(false);
    };

    const normalizeCategory = (cat: string) => {
        if (!cat) return '';
        return cat.toLowerCase().replace(/\s+/g, '');
    };

    // ModelGrid Component with Lazy Loading
    const ModelGrid = ({ title, category }: { title: string, category: string }) => {
        const { elementRef, hasIntersected } = useIntersectionObserver({ threshold: 0.1 });

        const { data: allModels, isLoading: isQueryLoading } = useQuery({
            queryKey: ["models", category],
            queryFn: async () => {
                // Try to pass category param, but fallback to client filtering if needed
                return (await api.get("/models", { params: { category } })).data;
            },
            enabled: hasIntersected, // Only fetch when scrolled into view
            staleTime: 5 * 60 * 1000,
        });

        // Client-side filtering as a fallback (or primary mechanism if backend ignores params)
        const items = Array.isArray(allModels) ? allModels.filter((m: any) => normalizeCategory(m.category) === category) : [];

        // Show loading if query is expected but running, OR if we haven't intersected yet (skeleton placeholder)
        const isLoading = !hasIntersected || isQueryLoading;

        return (
            <div ref={elementRef as any} className="mb-12 min-h-[300px]">
                <h2 className="text-2xl font-bold mb-6 flex items-center gap-2">
                    <span className="w-1 h-8 bg-black dark:bg-white inline-block" style={{ borderRadius: 0 }}></span>
                    {title}
                </h2>
                {isLoading ? (
                    <CrunchyrollSkeleton count={12} />
                ) : items.length === 0 ? (
                    <div className="flex flex-col items-center justify-center p-8 border-2 border-dashed bg-muted/10 opacity-70" style={{ borderRadius: 0 }}>
                        <Box className="h-8 w-8 text-muted-foreground mb-2" />
                        <p className="text-sm text-muted-foreground">No models in this category</p>
                    </div>
                ) : (
                    <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6 gap-4">
                        {items.map((model: any) => (
                            <Card
                                key={model.id}
                                className="overflow-hidden cursor-pointer hover:shadow-xl group border-border/50 hover:border-black dark:hover:border-white"
                                style={{ borderRadius: 0, transition: 'box-shadow 0.3s' }}
                                onClick={() => handleModelClick(model)}
                            >
                                <div className="w-full bg-secondary/30 relative flex items-center justify-center overflow-hidden" style={{ aspectRatio: '2/3' }}>
                                    {model.image ? (
                                        <img
                                            src={getModelUrl(model.image)}
                                            alt={model.title || model.name}
                                            className="w-full h-full object-cover group-hover:scale-105"
                                            style={{ transition: 'transform 0.5s' }}
                                        />
                                    ) : (
                                        <div className="flex flex-col items-center gap-2 text-muted-foreground opacity-50">
                                            <Box className="h-10 w-10" />
                                            <span className="text-xs">No Preview</span>
                                        </div>
                                    )}
                                    <div className="absolute top-2 right-2">
                                        <Badge variant="secondary" className="bg-background/80 backdrop-blur" style={{ borderRadius: 0 }}>
                                            {model.type}
                                        </Badge>
                                    </div>
                                </div>

                                <CardHeader className="p-4 pb-2">
                                    <CardTitle className="text-base truncate" title={model.title || model.name}>
                                        {model.title || model.name}
                                    </CardTitle>
                                </CardHeader>

                                <CardContent className="p-4 pt-0 pb-2">
                                    <div className="flex items-center justify-between text-xs text-muted-foreground">
                                        <span>{(model.size / 1024 / 1024).toFixed(1)} MB</span>
                                    </div>
                                </CardContent>

                                <CardFooter className="p-4 pt-2 flex justify-end">
                                    <Button
                                        variant="secondary"
                                        size="sm"
                                        className="w-full gap-2 opacity-0 group-hover:opacity-100"
                                        style={{ borderRadius: 0, transition: 'opacity 0.3s' }}
                                        onClick={async (e) => {
                                            e.stopPropagation();
                                            try {
                                                const response = await api.get(`/models/${model.id}/download`, {
                                                    responseType: 'blob',
                                                });
                                                const url = window.URL.createObjectURL(new Blob([response.data]));
                                                const link = document.createElement('a');
                                                link.href = url;
                                                const contentDisposition = response.headers['content-disposition'];
                                                let filename = model.title ? `${model.title}.${model.type}` : `${model.name}`;
                                                if (contentDisposition) {
                                                    const filenameMatch = contentDisposition.match(/filename="?(.+)"?/);
                                                    if (filenameMatch && filenameMatch.length === 2) filename = filenameMatch[1];
                                                }
                                                link.setAttribute('download', filename);
                                                document.body.appendChild(link);
                                                link.click();
                                                link.remove();
                                                window.URL.revokeObjectURL(url);
                                            } catch (error) {
                                                toast.error("Failed to download");
                                            }
                                        }}
                                    >
                                        <Download className="h-4 w-4" />
                                        Download
                                    </Button>
                                </CardFooter>
                            </Card>
                        ))}
                    </div>
                )}
            </div>
        );
    };

    return (
        <div className="max-w-7xl mx-auto space-y-8 relative">
            {/* Initial Loading Spinner Overlay */}
            {initialLoading && (
                <div className="fixed inset-0 z-50 flex items-center justify-center bg-background/60 backdrop-blur-xl transition-all duration-500">
                    <div className="relative w-20 h-20">
                        <div className="absolute inset-0 border-8 border-gray-200 dark:border-gray-800 rounded-full"></div>
                        <div className="absolute inset-0 border-8 border-t-black dark:border-t-white border-r-transparent border-b-transparent border-l-transparent rounded-full animate-spin"></div>
                    </div>
                </div>
            )}

            {/* Viewer Dialog */}
            <Dialog open={isViewModalOpen} onOpenChange={setIsViewModalOpen}>
                <DialogContent className="max-w-4xl h-[80vh] flex flex-col p-0 gap-0 bg-background/95 backdrop-blur-xl border-border/50" style={{ borderRadius: 0 }}>
                    <div className="flex-1 w-full relative bg-black/5 overflow-hidden" style={{ borderRadius: 0 }}>
                        {isModelLoading && (
                            <div className="absolute inset-0 z-10 flex flex-col items-center justify-center bg-background/50 backdrop-blur-sm">
                                <Loader2 className="w-12 h-12 animate-spin text-black dark:text-white" />
                                <span className="text-sm text-muted-foreground font-medium">Loading 3D Model...</span>
                            </div>
                        )}
                        {selectedModel && isViewModalOpen && (
                            <UnifiedModelViewer
                                url={getModelUrl(selectedModel.path)}
                                type={selectedModel.type}
                                // showGrid={true}
                                showSkeleton={selectedModel.type === 'bvh'}
                                isPlaying={true}
                                interactive={true}
                                onLoaded={handleModelLoaded}
                            />
                        )}
                    </div>
                    <div className="p-4 border-t flex items-center justify-between bg-background">
                        <div className="flex flex-col">
                            <h3 className="text-lg font-semibold">{selectedModel?.title || selectedModel?.name}</h3>
                            <div className="flex items-center gap-2">
                                {selectedModel?.type && <Badge variant="outline" style={{ borderRadius: 0 }}>{selectedModel.type}</Badge>}
                                {selectedModel?.category && <Badge variant="secondary" style={{ borderRadius: 0 }}>{selectedModel.category}</Badge>}
                            </div>
                        </div>
                        <div className="flex items-center gap-2">
                            <Button
                                variant="outline"
                                style={{ borderRadius: 0 }}
                                onClick={() => {
                                    if (selectedModel) {
                                        navigate(`/${i18n.language}/models/${selectedModel.id}`, { state: { model: selectedModel } });
                                    }
                                }}
                            >
                                <ExternalLink className="mr-2 h-4 w-4" />
                                Show in Lab
                            </Button>
                            <Button variant="default" style={{ borderRadius: 0 }} onClick={() => setIsViewModalOpen(false)}>Close</Button>
                        </div>
                    </div>
                </DialogContent>
            </Dialog>

            {/* Header Content - Blurred when initialLoading is true */}
            <div className={initialLoading ? 'blur-sm' : ''}>
                {/* Partner Logos */}
                <div className="flex justify-center items-center gap-8 mb-16 pt-8">
                    {[
                        { src: "/partners/godot.png", alt: "Godot Engine" },
                        { src: "/partners/unity.svg", alt: "Unity" },
                        { src: "/partners/unreal.svg", alt: "Unreal Engine" },
                    ].map((logo, i) => (
                        <div key={i} className="bg-white shadow-lg shadow-primary/5 p-8 w-48 h-48 flex items-center justify-center border border-border/50 hover:scale-110 cursor-pointer" style={{ borderRadius: 0, transition: 'transform 0.3s' }}>
                            <img src={logo.src} alt={logo.alt} className="max-w-full max-h-full object-contain" />
                        </div>
                    ))}
                </div>

                {/* Description Text */}
                <div className="text-center mb-16 max-w-4xl mx-auto px-4">
                    <p className="text-lg md:text-2xl text-black dark:text-white font-medium leading-relaxed" dir={i18n.language === 'ar' ? 'rtl' : 'ltr'}>
                        {i18n.language === 'ar'
                            ? "منصة متخصصة في توفير مجسمات ثلاثية الأبعاد وحركات أنيميشن وأدوات مساعدة، تهدف إلى دعم المطورين والمستخدمين وتسريع إنجاز المشاريع بجودة ومرونة عالية."
                            : "A platform specialized in providing 3D models, animation motions, and auxiliary tools, aiming to support developers and users and accelerate project completion with high quality and flexibility."}
                    </p>
                </div>
            </div>

            {/* Content Sections - Independent Lazy Loading */}
            <ModelGrid title="FBX Models" category="fbx" />
            <ModelGrid title="FBX + Animation" category="fbx+animation" />
            <ModelGrid title="Animations" category="animation" />
        </div>
    );
}
