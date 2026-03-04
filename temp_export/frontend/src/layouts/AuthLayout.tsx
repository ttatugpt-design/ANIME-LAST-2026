import { Outlet } from 'react-router-dom';

export const AuthLayout = () => {
    return (
        <div className="flex min-h-screen items-center justify-center bg-gray-50 dark:bg-background">
            <div className="w-full max-w-md p-4">
                <Outlet />
            </div>
        </div>
    );
};
