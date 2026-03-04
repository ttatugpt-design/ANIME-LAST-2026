import { useState, useEffect } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useNavigate } from "react-router-dom";
import api from "@/lib/api";
import { PageLoader } from "@/components/ui/page-loader";
import { Button } from "@/components/ui/button";
import { Trash, Box, Bone, Plus, ExternalLink, Pencil, Download } from "lucide-react";
import { toast } from "sonner";
import { Input } from "@/components/ui/input";
import UnifiedModelViewer, { UnifiedModelViewerProps } from "@/components/3d/UnifiedModelViewer";
import { Badge } from "@/components/ui/badge";
import { useInView } from "react-intersection-observer";
import { useModelLoaderStore } from "@/stores/model-loader-store";
import {
    Dialog,
    DialogContent,
    DialogDescription,
    DialogFooter,
    DialogHeader,
    DialogTitle,
    DialogTrigger,
} from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from "@/components/ui/select";
import { Card, CardContent, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { generateBlurPlaceholder, renameFile } from "@/utils/image-utils";

const BASE_URL = "";

// --- Lazy Loader Wrapper ---
interface LazyModelViewerProps extends UnifiedModelViewerProps {
    id: string;
}

function LazyModelViewer(props: LazyModelViewerProps) {
    const { id, ...viewerProps } = props;
    const { ref, inView } = useInView({
        triggerOnce: false,
        rootMargin: "200px 0px",
    });

    const { addToQueue, removeFromQueue, currentLoadingId, loadedIds, finishLoading } = useModelLoaderStore();

    useEffect(() => {
        if (inView) {
            addToQueue(id);
        } else {
            if (currentLoadingId !== id && !loadedIds.has(id)) {
                removeFromQueue(id);
            }
        }
    }, [inView, id, addToQueue, removeFromQueue, currentLoadingId, loadedIds]);

    const shouldLoad = loadedIds.has(id) || currentLoadingId === id;

    return (
        <div ref={ref} className="w-full h-full relative">
            {shouldLoad ? (
                <UnifiedModelViewer
                    {...viewerProps}
                    onLoaded={() => finishLoading(id)}
                />
            ) : (
                <div className="w-full h-full flex items-center justify-center bg-secondary/30">
                    <div className="flex flex-col items-center gap-2">
                        <Box className="w-8 h-8 text-muted-foreground opacity-20" />
                        {inView && !shouldLoad && (
                            <span className="text-xs text-muted-foreground animate-pulse">Waiting...</span>
                        )}
                    </div>
                </div>
            )}
        </div>
    );
}

export default function ModelsPage() {
    const queryClient = useQueryClient();
    const navigate = useNavigate();
    const [isUploading, setIsUploading] = useState(false);
    const [showSkeletons, setShowSkeletons] = useState(false);
    const [selectedModel, setSelectedModel] = useState<any>(null);
    const [isUploadModalOpen, setIsUploadModalOpen] = useState(false);
    const [isViewModalOpen, setIsViewModalOpen] = useState(false);

    // Upload Form State
    const [uploadFile, setUploadFile] = useState<File | null>(null);
    const [uploadImage, setUploadImage] = useState<File | null>(null);
    const [uploadCategory, setUploadCategory] = useState<string>("fbx");
    const [uploadTitle, setUploadTitle] = useState("");

    // Edit State
    const [isEditModalOpen, setIsEditModalOpen] = useState(false);
    const [editingModel, setEditingModel] = useState<any>(null);
    const [editFile, setEditFile] = useState<File | null>(null); // For replacing image
    const [editName, setEditName] = useState("");
    const [editTitle, setEditTitle] = useState("");
    const [editCategory, setEditCategory] = useState("fbx");

    const { data: models, isLoading } = useQuery({
        queryKey: ["models"],
        queryFn: async () => (await api.get("/models")).data,
        staleTime: 1000 * 60 * 5, // Cache for 5 minutes
    });


    const uploadMutation = useMutation({
        mutationFn: async () => {
            if (!uploadFile) throw new Error("No model file selected");

            const formData = new FormData();
            formData.append("file", uploadFile);
            formData.append("name", uploadFile.name);
            formData.append("title", uploadTitle);
            formData.append("category", uploadCategory);

            if (uploadImage) {
                // Rename original image to use title
                const renamedImage = renameFile(uploadImage, uploadTitle);
                formData.append("image", renamedImage);

                // Generate and append blurred mini version with title-blur name
                try {
                    const blurImage = await generateBlurPlaceholder(uploadImage, uploadTitle);
                    formData.append("mini_blur", blurImage);
                } catch (error) {
                    console.error("Failed to generate blur placeholder", error);
                }
            }

            return await api.post("/models", formData, {
                headers: { "Content-Type": "multipart/form-data" },
            });
        },
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ["models"] });
            toast.success("Model uploaded successfully");
            setIsUploading(false);
            setIsUploadModalOpen(false);
            // Reset form
            setUploadFile(null);
            setUploadImage(null);
            setUploadTitle("");
            setUploadCategory("fbx");
        },
        onError: (err: any) => {
            toast.error("Upload failed: " + (err.response?.data?.error || err.message));
            setIsUploading(false);
        },
    });

    const updateMutation = useMutation({
        mutationFn: async () => {
            if (!editingModel) return;

            const formData = new FormData();
            formData.append("name", editName);
            formData.append("title", editTitle);
            formData.append("category", editCategory);
            if (editFile) {
                // Rename original image to use title
                const renamedImage = renameFile(editFile, editTitle);
                formData.append("image", renamedImage);

                // Generate and append blurred mini version with title-blur name
                try {
                    const blurImage = await generateBlurPlaceholder(editFile, editTitle);
                    formData.append("mini_blur", blurImage);
                } catch (error) {
                    console.error("Failed to generate blur placeholder", error);
                }
            }

            return await api.put(`/models/${editingModel.id}`, formData, {
                headers: { "Content-Type": "multipart/form-data" },
            });
        },
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ["models"] });
            toast.success("Model updated successfully");
            setIsEditModalOpen(false);
            setEditingModel(null);
            setEditFile(null);
        },
        onError: (err: any) => {
            toast.error("Update failed: " + (err.response?.data?.error || err.message));
        }
    });

    const deleteMutation = useMutation({
        mutationFn: async (id: number) => {
            await api.delete(`/models/${id}`);
        },
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ["models"] });
            toast.success("Model deleted");
            // If deleting the currently viewed model, close the modal
            if (selectedModel?.id) {
                setIsViewModalOpen(false);
            }
        },
    });

    const handleUploadClick = () => {
        if (!uploadFile) {
            toast.error("Please select a model file (FBX/GLB)");
            return;
        }
        setIsUploading(true);
        uploadMutation.mutate();
    };

    const handleEditClick = (model: any, e: React.MouseEvent) => {
        e.stopPropagation();
        setEditingModel(model);
        setEditName(model.name);
        setEditTitle(model.title || "");
        setEditCategory(model.category || "fbx");
        setEditFile(null);
        setIsEditModalOpen(true);
    };

    const handleUpdateClick = () => {
        updateMutation.mutate();
    }

    const getModelUrl = (path: string) => {
        if (!path) return "";
        // Normalize: remove backward slashes and ensure leading slash
        const normalized = path.replace(/\\/g, "/");
        // Check if path implies relative or absolute
        return `${BASE_URL}/${normalized}`;
    };

    const handleModelClick = (model: any) => {
        setSelectedModel(model);
        setIsViewModalOpen(true);
    };

    if (isLoading) return <PageLoader />;

    return (
        <div className="space-y-6">
            <div className="flex items-center justify-between">
                <div>
                    <h2 className="text-3xl font-bold tracking-tight">3D Model Manager</h2>
                    <p className="text-muted-foreground">Upload and manage your 3D assets.</p>
                </div>
                <div className="flex items-center gap-2">
                    <Button
                        variant={showSkeletons ? "default" : "outline"}
                        onClick={() => setShowSkeletons(!showSkeletons)}
                        className="cursor-pointer"
                    >
                        <Bone className="mr-2 h-4 w-4" />
                        {showSkeletons ? "Hide Bones" : "Show Bones"}
                    </Button>

                    <Dialog open={isUploadModalOpen} onOpenChange={setIsUploadModalOpen}>
                        <DialogTrigger asChild>
                            <Button>
                                <Plus className="mr-2 h-4 w-4" />
                                Add Model
                            </Button>
                        </DialogTrigger>
                        <DialogContent className="sm:max-w-[425px]">
                            <DialogHeader>
                                <DialogTitle>Add New Model</DialogTitle>
                                <DialogDescription>
                                    Upload a new 3D model, set its preview image and category.
                                </DialogDescription>
                            </DialogHeader>
                            <div className="grid gap-4 py-4">
                                <div className="grid gap-2">
                                    <Label htmlFor="upload-title">Title (Optional)</Label>
                                    <Input
                                        id="upload-title"
                                        placeholder="Display Title"
                                        value={uploadTitle}
                                        onChange={(e) => setUploadTitle(e.target.value)}
                                    />
                                </div>
                                <div className="grid gap-2">
                                    <Label htmlFor="model-file">Model File (FBX, GLB)</Label>
                                    <Input
                                        id="model-file"
                                        type="file"
                                        accept=".fbx,.glb,.gltf,.bvh"
                                        onChange={(e) => setUploadFile(e.target.files?.[0] || null)}
                                    />
                                </div>
                                <div className="grid gap-2">
                                    <Label htmlFor="image-file">Preview Image (Optional)</Label>
                                    <Input
                                        id="image-file"
                                        type="file"
                                        accept="image/*"
                                        onChange={(e) => setUploadImage(e.target.files?.[0] || null)}
                                    />
                                </div>
                                <div className="grid gap-2">
                                    <Label htmlFor="category">Category</Label>
                                    <Select value={uploadCategory} onValueChange={setUploadCategory}>
                                        <SelectTrigger>
                                            <SelectValue placeholder="Select category" />
                                        </SelectTrigger>
                                        <SelectContent>
                                            <SelectItem value="fbx">FBX</SelectItem>
                                            <SelectItem value="fbx+animation">FBX + Animation</SelectItem>
                                            <SelectItem value="animation">Animation</SelectItem>
                                        </SelectContent>
                                    </Select>
                                </div>
                            </div>
                            <DialogFooter>
                                <Button variant="outline" onClick={() => setIsUploadModalOpen(false)}>Cancel</Button>
                                <Button onClick={handleUploadClick} disabled={isUploading}>
                                    {isUploading ? "Uploading..." : "Upload"}
                                </Button>
                            </DialogFooter>
                        </DialogContent>
                    </Dialog>

                    {/* Edit Modal */}
                    <Dialog open={isEditModalOpen} onOpenChange={setIsEditModalOpen}>
                        <DialogContent className="sm:max-w-[425px]">
                            <DialogHeader>
                                <DialogTitle>Edit Model</DialogTitle>
                                <DialogDescription>
                                    Update model details and preview image.
                                </DialogDescription>
                            </DialogHeader>
                            <div className="grid gap-4 py-4">
                                <div className="grid gap-2">
                                    <Label htmlFor="edit-title">Title</Label>
                                    <Input
                                        id="edit-title"
                                        placeholder="Display Title"
                                        value={editTitle}
                                        onChange={(e) => setEditTitle(e.target.value)}
                                    />
                                </div>
                                <div className="grid gap-2">
                                    <Label htmlFor="edit-name">Name (Filename)</Label>
                                    <Input
                                        id="edit-name"
                                        value={editName}
                                        onChange={(e) => setEditName(e.target.value)}
                                    />
                                </div>
                                <div className="grid gap-2">
                                    <Label htmlFor="edit-category">Category</Label>
                                    <Select value={editCategory} onValueChange={setEditCategory}>
                                        <SelectTrigger>
                                            <SelectValue placeholder="Select category" />
                                        </SelectTrigger>
                                        <SelectContent>
                                            <SelectItem value="fbx">FBX</SelectItem>
                                            <SelectItem value="fbx+animation">FBX + Animation</SelectItem>
                                            <SelectItem value="animation">Animation</SelectItem>
                                        </SelectContent>
                                    </Select>
                                </div>
                                <div className="grid gap-2">
                                    <Label htmlFor="edit-image">New Preview Image (Optional)</Label>
                                    <Input
                                        id="edit-image"
                                        type="file"
                                        accept="image/*"
                                        onChange={(e) => setEditFile(e.target.files?.[0] || null)}
                                    />
                                    <p className="text-[10px] text-muted-foreground">Leave empty to keep existing image</p>
                                </div>
                            </div>
                            <DialogFooter>
                                <Button variant="outline" onClick={() => setIsEditModalOpen(false)}>Cancel</Button>
                                <Button onClick={handleUpdateClick} disabled={updateMutation.isPending}>
                                    {updateMutation.isPending ? "Updating..." : "Save Changes"}
                                </Button>
                            </DialogFooter>
                        </DialogContent>
                    </Dialog>
                </div>
            </div>

            {/* Viewer Modal */}
            <Dialog open={isViewModalOpen} onOpenChange={setIsViewModalOpen}>
                <DialogContent className="max-w-4xl w-full h-[80vh] flex flex-col p-0 overflow-hidden">
                    <div className="flex-1 w-full h-full bg-slate-950 relative">
                        {selectedModel && (
                            <UnifiedModelViewer
                                url={getModelUrl(selectedModel.path)}
                                type={selectedModel.type}
                                scale={1}
                                autoRotate={true}
                                showSkeleton={showSkeletons || selectedModel.type === 'bvh'}
                                isPlaying={true}
                                interactive={true}
                                performanceMode={false}
                            />
                        )}
                    </div>
                    <div className="p-4 border-t flex items-center justify-between bg-background">
                        <div className="flex flex-col">
                            <h3 className="text-lg font-semibold">{selectedModel?.name}</h3>
                            <div className="flex items-center gap-2">
                                {selectedModel?.type && <Badge variant="outline">{selectedModel.type}</Badge>}
                                {selectedModel?.category && <Badge variant="secondary">{selectedModel.category}</Badge>}
                            </div>
                        </div>
                        <div className="flex items-center gap-2">
                            <Button
                                variant="outline"
                                onClick={() => {
                                    if (selectedModel) {
                                        navigate(`/models/${selectedModel.id}`, { state: { model: selectedModel } });
                                    }
                                }}
                            >
                                <ExternalLink className="mr-2 h-4 w-4" />
                                Show in Lab
                            </Button>
                            <Button variant="default" onClick={() => setIsViewModalOpen(false)}>Close</Button>
                        </div>
                    </div>
                </DialogContent>
            </Dialog>

            {/* Grid Layout */}
            <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4 md:gap-6">
                {models?.map((model: any) => (
                    <Card
                        key={model.id}
                        className="overflow-hidden cursor-pointer hover:shadow-lg transition-shadow group relative flex flex-col"
                        onClick={() => handleModelClick(model)}
                    >
                        {/* Taller Image: aspect-[3/4] */}
                        <div className="aspect-[3/4] w-full bg-secondary/30 relative flex items-center justify-center overflow-hidden">
                            {model.image ? (
                                <img
                                    src={getModelUrl(model.image)}
                                    alt={model.title || model.name}
                                    className="w-full h-full object-cover transition-transform group-hover:scale-105"
                                />
                            ) : (
                                <div className="flex flex-col items-center gap-2 text-muted-foreground opacity-50">
                                    <Box className="h-8 w-8 md:h-10 md:w-10" />
                                    <span className="text-[10px] md:text-xs">No Preview</span>
                                </div>
                            )}

                            <div className="absolute top-1 right-1 md:top-2 md:right-2 flex gap-1">
                                <Badge variant="secondary" className="bg-background/80 backdrop-blur text-[10px] px-1 md:text-xs md:px-2 h-5 md:h-auto">
                                    {model.type}
                                </Badge>
                            </div>
                        </div>

                        <CardHeader className="p-3 md:p-4 pb-0 md:pb-2">
                            {/* Display Title, fallback to Name */}
                            <CardTitle className="text-sm md:text-base truncate" title={model.title || model.name}>
                                {model.title || model.name}
                            </CardTitle>
                        </CardHeader>

                        <CardContent className="p-3 md:p-4 pt-0 md:pt-0 pb-2 flex-1">
                            <div className="flex items-center gap-2 mb-2">
                                {model.category && (
                                    <Badge variant="outline" className="font-normal text-[10px] md:text-xs px-1 md:px-2 h-5 md:h-auto">
                                        {model.category}
                                    </Badge>
                                )}
                            </div>
                            <div className="flex items-center justify-between text-[10px] md:text-xs text-muted-foreground mt-auto">
                                <span>{(model.size / 1024 / 1024).toFixed(1)} MB</span>
                            </div>
                        </CardContent>

                        <CardFooter className="p-3 md:p-4 pt-2 flex justify-end gap-2" onClick={(e) => e.stopPropagation()}>
                            {/* Download Button */}
                            <Button
                                variant="outline"
                                size="sm"
                                className="h-7 w-7 md:h-8 md:w-8 p-0 opacity-0 group-hover:opacity-100 transition-opacity"
                                onClick={async (e) => {
                                    e.stopPropagation();
                                    try {
                                        const response = await api.get(`/models/${model.id}/download`, {
                                            responseType: 'blob',
                                        });

                                        // Create a URL for the blob
                                        const url = window.URL.createObjectURL(new Blob([response.data]));
                                        const link = document.createElement('a');
                                        link.href = url;
                                        // Try to get filename from content-disposition header if available, otherwise fallback
                                        const contentDisposition = response.headers['content-disposition'];
                                        let filename = model.title ? `${model.title}.${model.type}` : `${model.name}`;
                                        if (contentDisposition) {
                                            const filenameMatch = contentDisposition.match(/filename="?(.+)"?/);
                                            if (filenameMatch && filenameMatch.length === 2)
                                                filename = filenameMatch[1];
                                        }

                                        link.setAttribute('download', filename);
                                        document.body.appendChild(link);
                                        link.click();

                                        // Cleanup
                                        link.remove();
                                        window.URL.revokeObjectURL(url);
                                    } catch (error) {
                                        toast.error("Failed to download model");
                                        console.error("Download error:", error);
                                    }
                                }}
                            >
                                <Download className="h-3 w-3 md:h-4 md:w-4" />
                            </Button>

                            <Button
                                variant="outline"
                                size="sm"
                                className="h-7 w-7 md:h-8 md:w-8 p-0 opacity-0 group-hover:opacity-100 transition-opacity"
                                onClick={(e) => handleEditClick(model, e)}
                            >
                                <Pencil className="h-3 w-3 md:h-4 md:w-4" />
                            </Button>
                            <Button
                                variant="destructive"
                                size="sm"
                                className="h-7 w-7 md:h-8 md:w-8 p-0 opacity-0 group-hover:opacity-100 transition-opacity"
                                onClick={(e) => {
                                    e.stopPropagation();
                                    if (confirm("Are you sure you want to delete this model?")) {
                                        deleteMutation.mutate(model.id);
                                    }
                                }}
                            >
                                <Trash className="h-3 w-3 md:h-4 md:w-4" />
                            </Button>
                        </CardFooter>
                    </Card>
                ))}
            </div>

            {models?.length === 0 && (
                <div className="flex flex-col items-center justify-center p-12 border-2 border-dashed rounded-lg bg-muted/10 col-span-full">
                    <Box className="h-10 w-10 text-muted-foreground mb-4" />
                    <p className="text-lg font-medium text-muted-foreground">No models found</p>
                    <p className="text-sm text-muted-foreground mb-4">Click "Add Model" to upload a .fbx or .glb file.</p>
                    <Button onClick={() => setIsUploadModalOpen(true)}>
                        <Plus className="mr-2 h-4 w-4" />
                        Add Model
                    </Button>
                </div>
            )}
        </div>
    );
}
