import React, { useRef, useEffect, forwardRef, useImperativeHandle } from 'react';
import { replaceEmojiWithHtml } from '@/utils/render-content';
import { useTranslation } from 'react-i18next';

interface RichTextInputProps {
    value: string;
    onChange: (value: string) => void;
    onFocus?: () => void;
    onBlur?: () => void;
    onKeyDown?: (e: React.KeyboardEvent) => void;
    onEnter?: () => void;
    placeholder?: string;
    className?: string;
}

export const RichTextInput = forwardRef<HTMLDivElement, RichTextInputProps>(({
    value,
    onChange,
    onFocus,
    onBlur,
    onKeyDown,
    onEnter,
    placeholder,
    className
}, ref) => {
    const { i18n } = useTranslation();
    const lang = i18n.language;
    const editorRef = useRef<HTMLDivElement>(null);
    const isUpdatingRef = useRef(false);
    const savedRangeRef = useRef<Range | null>(null);

    const saveSelection = () => {
        const selection = window.getSelection();
        if (selection && selection.rangeCount > 0 && editorRef.current) {
            const range = selection.getRangeAt(0);
            if (editorRef.current.contains(range.commonAncestorContainer)) {
                savedRangeRef.current = range.cloneRange();
            }
        }
    };

    // Save selection on global mousedown so the cursor position is captured
    // the instant the user clicks away (before blur fires and browser moves focus).
    useEffect(() => {
        const handleMouseDown = (e: MouseEvent) => {
            // Only relevant when the editor currently has focus
            if (document.activeElement === editorRef.current) {
                saveSelection();
            }
        };
        document.addEventListener('mousedown', handleMouseDown, true);
        return () => document.removeEventListener('mousedown', handleMouseDown, true);
    }, []);

    // Render content with emoji images (Fallback, usually replaceEmojiWithHtml is used)
    const renderContent = (content: string) => {
        if (!content) return '';
        return replaceEmojiWithHtml(content);
    };

    // Extract plain text with emoji markers from HTML
    const extractContent = (html: string): string => {
        const temp = document.createElement('div');
        temp.innerHTML = html;

        // Convert <img> tags back to ![emoji](url) format
        const images = temp.querySelectorAll('img');
        images.forEach(img => {
            let src = img.getAttribute('src');
            const isEmoji = img.classList.contains('inline-block') || img.alt === 'emoji' || (src && (src.includes('/custom-emojis/') || src.includes('/storage/')));

            if (src && isEmoji) {
                let cleanSrc = src;
                if (cleanSrc.includes('/custom-emojis/')) {
                    cleanSrc = '/custom-emojis/' + cleanSrc.split('/custom-emojis/').pop();
                } else if (cleanSrc.includes('/storage/')) {
                    cleanSrc = '/' + cleanSrc.split('/storage/').pop();
                }

                const placeholder = document.createTextNode(`![emoji](${cleanSrc})`);
                img.replaceWith(placeholder);
            }
        });

        // Handle newlines for <div> (Chrome style) and <br>
        const processNode = (node: Node): string => {
            let text = '';
            node.childNodes.forEach((child) => {
                if (child.nodeType === Node.TEXT_NODE) {
                    text += child.textContent;
                } else if (child.nodeType === Node.ELEMENT_NODE) {
                    const el = child as HTMLElement;
                    if (el.tagName === 'BR') {
                        text += '\n';
                    } else if (el.tagName === 'DIV' || el.tagName === 'P') {
                        const content = processNode(el);
                        if (content) text += '\n' + content;
                        else text += '\n';
                    } else {
                        text += processNode(el);
                    }
                }
            });
            return text;
        };

        const result = processNode(temp).replace(/^\n/, ''); // Remove leading newline if any
        console.log('Extracted content:', result);
        return result;
    };

    // Update editor content when value changes externally
    useEffect(() => {
        if (editorRef.current && !isUpdatingRef.current) {
            const currentContent = extractContent(editorRef.current.innerHTML);
            if (currentContent !== value) {
                const rendered = replaceEmojiWithHtml(value);
                editorRef.current.innerHTML = rendered || '';
            }
        }
    }, [value]);

    const handleInput = () => {
        if (editorRef.current) {
            isUpdatingRef.current = true;
            const content = extractContent(editorRef.current.innerHTML);
            onChange(content);
            setTimeout(() => {
                isUpdatingRef.current = false;
            }, 0);
        }
    };

    const handlePaste = (e: React.ClipboardEvent) => {
        e.preventDefault();
        const text = e.clipboardData.getData('text/plain');
        document.execCommand('insertText', false, text);
    };

    // Expose methods via ref
    useImperativeHandle(ref, () => ({
        insertEmoji: (emojiUrl: string) => {
            if (editorRef.current) {
                const img = document.createElement('img');
                img.src = emojiUrl;
                img.alt = 'emoji';
                img.className = 'inline-block w-6 h-6 align-middle mx-0.5';
                img.draggable = false;

                // Focus the editor first
                editorRef.current.focus();

                const selection = window.getSelection();
                let range = savedRangeRef.current;

                // Validate or get current selection
                if (!range || !editorRef.current.contains(range.commonAncestorContainer)) {
                    if (selection && selection.rangeCount > 0 && editorRef.current.contains(selection.getRangeAt(0).commonAncestorContainer)) {
                        range = selection.getRangeAt(0);
                    } else {
                        // Create a range at the end if none exists
                        range = document.createRange();
                        range.selectNodeContents(editorRef.current);
                        range.collapse(false);
                    }
                }

                if (range) {
                    try {
                        range.deleteContents();
                        range.insertNode(img);
                        
                        // Create new range precisely after the image
                        const newRange = document.createRange();
                        newRange.setStartAfter(img);
                        newRange.collapse(true);
                        
                        selection?.removeAllRanges();
                        selection?.addRange(newRange);
                        savedRangeRef.current = newRange.cloneRange();
                        
                        // Force focus again to ensure cursor is visible
                        editorRef.current.focus();
                    } catch (e) {
                        console.error("Error inserting emoji", e);
                        editorRef.current.appendChild(img);
                    }
                }

                handleInput();
            }
        },
        insertText: (text: string) => {
            if (editorRef.current) {
                editorRef.current.focus();
                
                const selection = window.getSelection();
                let range = savedRangeRef.current;

                if (range && selection) {
                    selection.removeAllRanges();
                    selection.addRange(range);
                }
                
                document.execCommand('insertText', false, text);
                
                if (selection && selection.rangeCount > 0) {
                    savedRangeRef.current = selection.getRangeAt(0).cloneRange();
                }
                
                editorRef.current.focus();
                handleInput();
            }
        },
        focus: () => {
            if (editorRef.current) {
                editorRef.current.focus();
            }
        },
        focusAtEnd: () => {
            if (editorRef.current) {
                editorRef.current.focus();
                const el = editorRef.current;
                const range = document.createRange();
                const sel = window.getSelection();
                range.selectNodeContents(el);
                range.collapse(false); // false = collapse to end
                sel?.removeAllRanges();
                sel?.addRange(range);
            }
        }
    } as any));

    return (
        <div
            ref={editorRef}
            contentEditable
            dir="auto"
            onInput={handleInput}
            onFocus={(e) => {
                saveSelection();
                if (onFocus) onFocus();
            }}
            onBlur={(e) => {
                saveSelection();
                if (onBlur) onBlur();
            }}
            onKeyDown={(e) => {
                saveSelection();
                if (e.key === 'Enter' && !e.shiftKey) {
                    e.preventDefault();
                    if (onEnter) onEnter();
                    return;
                }
                if (onKeyDown) onKeyDown(e);
            }}
            onKeyUp={saveSelection}
            onMouseUp={saveSelection}
            onPaste={handlePaste}
            data-placeholder={placeholder}
            className={`${className} outline-none focus:outline-none [&:empty:before]:content-[attr(data-placeholder)] [&:empty:before]:text-gray-500 [&:empty:before]:dark:text-gray-600`}
            style={{ overflowY: 'auto' }}
        />
    );
});

RichTextInput.displayName = 'RichTextInput';
