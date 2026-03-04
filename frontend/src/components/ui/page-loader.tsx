import { Loader2 } from "lucide-react";

export const PageLoader = () => {
    return (
        <div className="flex h-full w-full items-center justify-center min-h-[60vh]">
            <Loader2 className="h-16 w-16 animate-spin text-black dark:text-white" />
        </div>
    );
};
