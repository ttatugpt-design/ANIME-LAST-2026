import { useState, useEffect } from 'react';
import { renderEmojiContent } from '@/utils/render-content';
import { useTranslation } from 'react-i18next';

import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import {
    Table, TableBody, TableCell, TableHead, TableHeader, TableRow
} from '@/components/ui/table';
import {
    MessageSquare, Trash2, ExternalLink, MessageCircle, User
} from 'lucide-react';
import api from '@/lib/api';
import { toast } from 'sonner';
import {
    AlertDialog,
    AlertDialogAction,
    AlertDialogCancel,
    AlertDialogContent,
    AlertDialogDescription,
    AlertDialogFooter,
    AlertDialogHeader,
    AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { Link } from 'react-router-dom';

interface User {
    id: number;
    name: string;
    avatar: string;
}

interface Episode {
    id: number;
    episode_number: number;
    anime?: {
        id: number;
        title: string;
        title_en: string;
    };
}

interface Comment {
    id: number;
    content: string;
    user: User;
    episode: Episode;
    parent?: {
        id: number;
        user: User;
    };
    created_at: string;
}

export default function DashboardCommentsPage() {
    const { t } = useTranslation();
    const [comments, setComments] = useState<Comment[]>([]);
    const [isLoading, setIsLoading] = useState(true);
    const [deleteId, setDeleteId] = useState<number | null>(null);

    useEffect(() => {
        fetchComments();
    }, []);

    const fetchComments = async () => {
        try {
            const response = await api.get('/dashboard/comments');
            setComments(response.data);
        } catch (error) {
            console.error('Failed to fetch comments:', error);
            toast.error('Failed to fetch comments');
        } finally {
            setIsLoading(false);
        }
    };

    const handleDelete = async () => {
        if (!deleteId) return;
        try {
            await api.delete(`/comments/${deleteId}`);
            toast.success(t('Comment deleted successfully'));
            setComments(comments.filter(c => c.id !== deleteId));
        } catch (error) {
            console.error('Failed to delete comment:', error);
            toast.error(t('Failed to delete comment'));
        } finally {
            setDeleteId(null);
        }
    };

    // Render content with custom emojis (Reused logic from CommentItem)
    // Using centralized renderEmojiContent


    return (
        <div className="space-y-6">
            <div className="flex items-center justify-between">
                <h1 className="text-3xl font-bold tracking-tight">{t('Comments')}</h1>
                <Button onClick={fetchComments} variant="outline" size="sm">
                    {t('Refresh')}
                </Button>
            </div>

            <Card className="border-border/40 bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60">
                <CardHeader>
                    <CardTitle className="text-xl flex items-center gap-2">
                        <MessageSquare className="w-5 h-5 text-primary" />
                        {t('Latest Comments & Replies')}
                    </CardTitle>
                </CardHeader>
                <CardContent>
                    <div className="rounded-md border border-border/40 overflow-hidden">
                        <Table>
                            <TableHeader className="bg-muted/50">
                                <TableRow>
                                    <TableHead className="w-[60px]">ID</TableHead>
                                    <TableHead>Author</TableHead>
                                    <TableHead>Content</TableHead>
                                    <TableHead>Episode</TableHead>
                                    <TableHead>Reply To</TableHead>
                                    <TableHead className="text-right">Action</TableHead>
                                </TableRow>
                            </TableHeader>
                            <TableBody>
                                {comments.length === 0 && !isLoading ? (
                                    <TableRow>
                                        <TableCell colSpan={6} className="h-24 text-center text-muted-foreground">
                                            No comments found.
                                        </TableCell>
                                    </TableRow>
                                ) : (
                                    comments.map((comment) => (
                                        <TableRow key={comment.id} className="hover:bg-muted/50">
                                            <TableCell className="font-mono text-xs">#{comment.id}</TableCell>
                                            <TableCell>
                                                <div className="flex items-center gap-2">
                                                    <div className="w-6 h-6 rounded-full bg-muted flex items-center justify-center overflow-hidden">
                                                        {comment.user.avatar ? (
                                                            <img src={comment.user.avatar} alt={comment.user.name} className="w-full h-full object-cover" />
                                                        ) : (
                                                            <User className="w-3 h-3 text-muted-foreground" />
                                                        )}
                                                    </div>
                                                    <span className="font-medium text-sm">{comment.user.name}</span>
                                                </div>
                                            </TableCell>
                                            <TableCell className="max-w-[300px]">
                                                <p className="truncate text-sm" title={comment.content}>
                                                    {renderEmojiContent(comment.content)}
                                                </p>
                                            </TableCell>

                                            <TableCell>
                                                <div className="flex flex-col">
                                                    <span className="font-medium text-sm">
                                                        {comment.episode.anime?.title || 'Unknown Anime'}
                                                    </span>
                                                    <span className="text-xs text-muted-foreground">
                                                        EP {comment.episode.episode_number}
                                                    </span>
                                                </div>
                                            </TableCell>
                                            <TableCell>
                                                {comment.parent ? (
                                                    <div className="flex items-center gap-1 text-xs text-muted-foreground">
                                                        <MessageCircle className="w-3 h-3" />
                                                        <span>{comment.parent.user.name}</span>
                                                    </div>
                                                ) : (
                                                    <span className="text-xs text-muted-foreground">-</span>
                                                )}
                                            </TableCell>
                                            <TableCell className="text-right">
                                                <div className="flex items-center justify-end gap-2">
                                                    <Button
                                                        variant="ghost"
                                                        size="sm"
                                                        className="h-8 w-8 p-0"
                                                        asChild
                                                    >
                                                        <Link to={`/watch/${comment.episode.anime?.id}/${comment.episode.episode_number}`} target="_blank">
                                                            <ExternalLink className="w-4 h-4" />
                                                        </Link>
                                                    </Button>
                                                    <Button
                                                        variant="ghost"
                                                        size="sm"
                                                        className="h-8 w-8 p-0 text-red-500 hover:text-red-600 hover:bg-red-500/10"
                                                        onClick={() => setDeleteId(comment.id)}
                                                    >
                                                        <Trash2 className="w-4 h-4" />
                                                    </Button>
                                                </div>
                                            </TableCell>
                                        </TableRow>
                                    ))
                                )}
                            </TableBody>
                        </Table>
                    </div>
                </CardContent>
            </Card>

            <AlertDialog open={!!deleteId} onOpenChange={(open) => !open && setDeleteId(null)}>
                <AlertDialogContent>
                    <AlertDialogHeader>
                        <AlertDialogTitle>{t('Are you sure?')}</AlertDialogTitle>
                        <AlertDialogDescription>
                            {t('This action cannot be undone. This will permanently delete the comment.')}
                        </AlertDialogDescription>
                    </AlertDialogHeader>
                    <AlertDialogFooter>
                        <AlertDialogCancel>{t('Cancel')}</AlertDialogCancel>
                        <AlertDialogAction onClick={handleDelete} className="bg-red-500 hover:bg-red-600">
                            {t('Delete')}
                        </AlertDialogAction>
                    </AlertDialogFooter>
                </AlertDialogContent>
            </AlertDialog>
        </div>
    );
}
