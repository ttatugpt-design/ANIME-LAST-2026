import React from 'react';
import { customEmojis } from '@/lib/customEmojis';

// Create a Set for O(1) emoji lookup
const emojiIdSet = new Set(customEmojis.map(e => e.id));

// Character segmenter to correctly handle ZWJ sequences and modifiers
const segmenter = typeof Intl !== 'undefined' && (Intl as any).Segmenter 
    ? new (Intl as any).Segmenter('en', { granularity: 'grapheme' }) 
    : null;

/**
 * Converts a string (potentially an emoji) to its hex representation format used in filenames.
 * e.g., 😍 -> emoji_u1f60d
 */
const getEmojiId = (char: string): string => {
    const codePoints = [...char].map(c => c.codePointAt(0)?.toString(16).toLowerCase());
    return `emoji_u${codePoints.join('_')}`;
};

/**
 * Parses content string and replaces ![emoji](url) placeholders with rendered <img> tags.
 * @param content The string content containing emoji markdown.
 * @returns React nodes with rendered emojis.
 */
export const renderEmojiContent = (content: string | null | undefined) => {
    if (!content) return null;

    // 1. Split by any ![emoji](...) pattern
    const parts = content.split(/(!\[emoji\]\s*\((?:[^)(]|\([^)(]*\))*\))/gi);

    const result: React.ReactNode[] = [];

    parts.forEach((part, index) => {
        const match = part.match(/!\[emoji\]\s*\(((?:[^)(]|\([^)(]*\))*)\)/i);

        if (match) {
            // Handle markdown emoji
            let emojiUrl = match[1].trim();
            emojiUrl = emojiUrl.replace(/\\/g, '/');
            if (emojiUrl.includes('/storage/')) emojiUrl = emojiUrl.split('/storage/').pop() || '';
            else if (emojiUrl.includes('/emojis/')) emojiUrl = emojiUrl.split('/emojis/').pop() || '';
            else if (emojiUrl.includes('/custom-emojis/')) emojiUrl = emojiUrl.split('/custom-emojis/').pop() || '';

            const filename = emojiUrl.split('/').pop();
            const finalUrl = `/custom-emojis/${filename}`.replace(/\/+/g, '/');

            result.push(
                <img
                    key={`emoji-md-${index}`}
                    src={finalUrl}
                    alt="emoji"
                    className="inline-block w-[7vw] max-w-[44px] sm:w-7 sm:h-7 align-middle mx-0.5 pointer-events-none select-none flex-shrink-0 object-contain"
                    draggable={false}
                    loading="eager"
                />
            );
        } else {
            // Handle plain text and Unicode emojis
            if (segmenter) {
                const segments = segmenter.segment(part);
                let textBuffer = '';

                for (const { segment } of segments) {
                    const id = getEmojiId(segment);
                    if (emojiIdSet.has(id)) {
                        // Flush text buffer
                        if (textBuffer) {
                            result.push(<span key={`text-${index}-${result.length}`}>{textBuffer}</span>);
                            textBuffer = '';
                        }
                        // Add emoji image
                        result.push(
                            <img
                                key={`emoji-uni-${index}-${result.length}`}
                                src={`/custom-emojis/${id}.png`}
                                alt={segment}
                                title={segment}
                                className="inline-block w-[7vw] max-w-[44px] sm:w-7 sm:h-7 align-middle mx-0.5 pointer-events-none select-none flex-shrink-0 object-contain"
                                draggable={false}
                                loading="eager"
                            />
                        );
                    } else {
                        textBuffer += segment;
                    }
                }
                if (textBuffer) {
                    result.push(<span key={`text-${index}-${result.length}`}>{textBuffer}</span>);
                }
            } else {
                // Fallback if Segmenter is not available
                result.push(<span key={`text-${index}`}>{part}</span>);
            }
        }
    });

    return result;
};


/**
 * Legacy support for raw HTML string replacement if needed (for dangerouslySetInnerHTML).
 */
export const replaceEmojiWithHtml = (content: string | null | undefined) => {
    if (!content) return '';

    // First replace markdown emojis
    let html = content.replace(
        /!\[emoji\]\s*\(((?:[^)(]|\([^)(]*\))*)\)/gi,
        (match, url) => {
            let emojiUrl = url.trim().replace(/\\/g, '/');
            if (emojiUrl.includes('/storage/')) emojiUrl = emojiUrl.split('/storage/').pop() || '';
            else if (emojiUrl.includes('/emojis/')) emojiUrl = emojiUrl.split('/emojis/').pop() || '';
            else if (emojiUrl.includes('/custom-emojis/')) emojiUrl = emojiUrl.split('/custom-emojis/').pop() || '';

            const filename = emojiUrl.split('/').pop();
            const finalUrl = `/custom-emojis/${filename}`.replace(/\/+/g, '/');
            return `<img src="${finalUrl}" alt="emoji" class="inline-block w-[7vw] max-w-[44px] sm:w-7 sm:h-7 align-middle mx-0.5 flex-shrink-0 object-contain" draggable="false" loading="eager" />`;
        }
    );

    // Then replace Unicode emojis if Segmenter is available
    if (segmenter) {
        const segments = segmenter.segment(html);
        let finalHtml = '';
        for (const { segment } of segments) {
            const id = getEmojiId(segment);
            if (emojiIdSet.has(id)) {
                finalHtml += `<img src="/custom-emojis/${id}.png" alt="${segment}" class="inline-block w-[7vw] max-w-[44px] sm:w-7 sm:h-7 align-middle mx-0.5 flex-shrink-0 object-contain" draggable="false" loading="eager" />`;
            } else {
                finalHtml += segment;
            }
        }
        return finalHtml;
    }

    return html;
};
