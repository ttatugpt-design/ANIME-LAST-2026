import api from './api';

export interface ExportResult {
    filename: string;
    file_size: number;
    download_url: string;
    created_at: string;
}

/**
 * Export character with retargeted animation using Blender on server
 */
export async function exportCharacterWithAnimation(
    characterFile: File,
    animationFile: File,
    onProgress?: (progress: number) => void
): Promise<ExportResult> {
    const formData = new FormData();
    formData.append('character', characterFile);
    formData.append('animation', animationFile);

    // Simulate progress (real progress would require WebSocket)
    if (onProgress) {
        const progressInterval = setInterval(() => {
            // Fake progress
        }, 100);

        try {
            const response = await api.post<ExportResult>('/export/retarget', formData, {
                headers: {
                    'Content-Type': 'multipart/form-data',
                },
            });

            clearInterval(progressInterval);
            if (onProgress) onProgress(100);

            return response.data;
        } catch (error) {
            clearInterval(progressInterval);
            throw error;
        }
    } else {
        const response = await api.post<ExportResult>('/export/retarget', formData, {
            headers: {
                'Content-Type': 'multipart/form-data',
            },
        });

        return response.data;
    }
}

/**
 * Download exported file
 */
export function downloadExport(filename: string): string {
    return `/api/export/download/${filename}`;
}

// Auto Rig function
export async function autoRigCharacter(
    characterFile: File
): Promise<ExportResult> {
    const formData = new FormData();
    formData.append("character", characterFile);

    const response = await api.post<ExportResult>("/export/autorig", formData, {
        headers: {
            "Content-Type": "multipart/form-data",
        },
    });

    return response.data;
}

// Sprint Generation function
export async function generateSprintAnimation(
    characterFile: File
): Promise<ExportResult> {
    const formData = new FormData();
    formData.append("character", characterFile);

    const response = await api.post<ExportResult>("/export/sprint", formData, {
        headers: {
            "Content-Type": "multipart/form-data",
        },
    });

    return response.data;
}
