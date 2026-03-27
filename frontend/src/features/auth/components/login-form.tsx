import { useState } from "react"
import { useForm } from "react-hook-form"
import { zodResolver } from "@hookform/resolvers/zod"
import * as z from "zod"
import { useNavigate, Link } from "react-router-dom"
import { useTranslation } from "react-i18next"
import api from "@/lib/api"
import { useAuthStore } from "@/stores/auth-store"
import { Button } from "@/components/ui/button"
import {
    Form,
    FormControl,
    FormField,
    FormItem,
    FormLabel,
    FormMessage,
} from "@/components/ui/form"
import { Input } from "@/components/ui/input"
import { Card, CardContent, CardFooter } from "@/components/ui/card"
import { toast } from "sonner"
import { Loader2 } from "lucide-react"

export function LoginForm() {
    const navigate = useNavigate()
    const { t, i18n } = useTranslation()
    const lang = i18n.language
    const isRtl = lang === 'ar'

    // Schema with translated error messages could be implemented here
    const formSchema = z.object({
        name: z.string().min(3, { message: lang === 'ar' ? 'اسم المستخدم أو البريد الإلكتروني يجب أن يكون 3 أحرف على الأقل' : 'Username or Email must be at least 3 characters' }),
        password: z.string().min(6),
    })

    const setAccessToken = useAuthStore((state) => state.setAccessToken)
    const setUser = useAuthStore((state) => state.setUser)
    const [isLoading, setIsLoading] = useState(false)

    const form = useForm<z.infer<typeof formSchema>>({
        resolver: zodResolver(formSchema),
        defaultValues: {
            name: "",
            password: "",
        },
    })

    async function onSubmit(values: z.infer<typeof formSchema>) {
        setIsLoading(true)
        try {
            const response = await api.post("/auth/login", values)
            setAccessToken(response.data.access_token)
            setUser(response.data.user)
            toast.success(lang === 'ar' ? "تم تسجيل الدخول بنجاح" : "Logged in successfully")

            const targetLang = i18n.language || 'en';
            window.location.assign(`/${targetLang}`);
        } catch (error: any) {
            if (error.response?.status === 401) {
                toast.error(lang === 'ar' ? "البيانات المدخلة غير صحيحة" : "Invalid email/username or password");
            } else {
                toast.error(lang === 'ar' ? "فشل تسجيل الدخول. يرجى المحاولة مرة أخرى." : "Login failed. Please try again.");
            }
            console.error(error);
        } finally {
            setIsLoading(false)
        }
    }

    return (
        <Card className="w-full border-0 shadow-none bg-transparent">
            {/* Removed CardHeader/Title since it's handled in the parent page for better layout control */}
            <CardContent className="p-0">
                <Form {...form}>
                    <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
                        <FormField
                            control={form.control}
                            name="name"
                            render={({ field }) => (
                                <FormItem>
                                    <FormLabel className="text-lg">
                                        {lang === 'ar' ? 'اسم المستخدم أو البريد الإلكتروني' : 'Username or Email'}
                                    </FormLabel>
                                    <FormControl>
                                        <Input
                                            placeholder={lang === 'ar' ? "user123 أو user@example.com" : "user123 or user@example.com"}
                                            {...field}
                                            disabled={isLoading}
                                            className="rounded-none h-14 text-lg border-gray-300 dark:border-gray-700 focus:ring-1 focus:ring-primary"
                                        />
                                    </FormControl>
                                    <FormMessage className="text-red-500" />
                                </FormItem>
                            )}
                        />
                        <FormField
                            control={form.control}
                            name="password"
                            render={({ field }) => (
                                <FormItem>
                                    <FormLabel className="text-lg">
                                        {lang === 'ar' ? 'كلمة المرور' : 'Password'}
                                    </FormLabel>
                                    <FormControl>
                                        <Input
                                            type="password"
                                            {...field}
                                            disabled={isLoading}
                                            className="rounded-none h-14 text-lg border-gray-300 dark:border-gray-700 focus:ring-1 focus:ring-primary"
                                        />
                                    </FormControl>
                                    <FormMessage className="text-red-500" />
                                </FormItem>
                            )}
                        />
                        <Button
                            className="w-full h-14 rounded-none text-xl font-bold mt-4 bg-black dark:bg-white text-white dark:text-black hover:bg-neutral-800 dark:hover:bg-neutral-200 transition-all shadow-lg"
                            type="submit"
                            disabled={isLoading}
                        >
                            {isLoading && <Loader2 className="w-10 h-10 animate-spin text-white" />}
                            {lang === 'ar' ? 'تسجيل الدخول' : 'Sign in'}
                        </Button>
                    </form>
                </Form>
            </CardContent>
            <CardFooter className="flex flex-col gap-4 mt-6 p-0 text-center">
                <div className="text-muted-foreground text-lg">
                    {lang === 'ar' ? "ليس لديك حساب؟" : "Don't have an account?"}{" "}
                    <Link
                        to={`/${lang}/auth/register`}
                        className="text-primary hover:underline font-bold"
                    >
                        {lang === 'ar' ? "سجّل الآن" : "Sign up"}
                    </Link>
                </div>
            </CardFooter>
        </Card>
    )
}
