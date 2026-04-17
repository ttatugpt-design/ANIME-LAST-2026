export const generateBlurPlaceholder = async (file: File, customName?: string): Promise<File> => {
    return new Promise((resolve, reject) => {
        const img = new Image();
        const url = URL.createObjectURL(file);
        img.src = url;

        img.onload = () => {
            const canvas = document.createElement('canvas');
            const ctx = canvas.getContext('2d');
            if (!ctx) {
                reject(new Error("Canvas context not available"));
                return;
            }

            canvas.width = img.width;
            canvas.height = img.height;

            const blurAmount = Math.max(img.width, img.height) * 0.02;
            ctx.filter = `blur(${blurAmount}px)`;

            const margin = blurAmount * 2;
            ctx.drawImage(img, -margin, -margin, img.width + (margin * 2), img.height + (margin * 2));

            canvas.toBlob((blob) => {
                if (blob) {
                    // Use custom name if provided, otherwise use original filename
                    const baseName = customName || file.name.replace(/\.[^/.]+$/, "");
                    const newName = `${baseName}-blur.jpg`;

                    const blurFile = new File([blob], newName, {
                        type: 'image/jpeg',
                        lastModified: Date.now(),
                    });
                    resolve(blurFile);
                } else {
                    reject(new Error("Failed to generate blur blob"));
                }
                URL.revokeObjectURL(url);
            }, 'image/jpeg', 0.99);
        };

        img.onerror = (error) => {
            URL.revokeObjectURL(url);
            reject(error);
        };
    });
};

// Helper function to rename file with extension preservation
export const renameFile = (file: File, newName: string): File => {
    const ext = file.name.split('.').pop() || 'jpg';
    const fullName = newName.includes('.') ? newName : `${newName}.${ext}`;
    return new File([file], fullName, {
        type: file.type,
        lastModified: file.lastModified,
    });
};

export const getImageUrl = (path?: string | null) => {
    if (!path) return '';
    if (path.startsWith('http')) return path;
    const cleanPath = path.startsWith('/') ? path : `/${path}`;

    // If it's a local upload or custom emoji, prepend the API URL if available
    if (cleanPath.startsWith('/uploads/') || cleanPath.startsWith('/custom-emojis/')) {
        let apiUrl = import.meta.env.VITE_API_URL || '';
        if (apiUrl) {
            // Ensure no double slash and remove trailing /api since uploads are served at root
            apiUrl = apiUrl.replace(/\/api\/?$/, '');
            const base = apiUrl.endsWith('/') ? apiUrl.slice(0, -1) : apiUrl;
            return `${base}${cleanPath}`;
        }
    }

    return cleanPath;
};
