import React from 'react';

/**
 * Parses content string and replaces ![emoji](url) placeholders with rendered <img> tags.
 * @param content The string content containing emoji markdown.
 * @returns React nodes with rendered emojis.
 */
export const renderEmojiContent = (content: string | null | undefined) => {
    if (!content) return null;

    // Split by any ![emoji](...) pattern, case-insensitive, supporting one level of nested parentheses
    const parts = content.split(/(!\[emoji\]\s*\((?:[^)(]|\([^)(]*\))*\))/gi);

    return parts.map((part, index) => {
        // Match the specific pattern and capture the URL regardless of content
        // Supports one level of nesting (e.g. image(1).png)
        const match = part.match(/!\[emoji\]\s*\(((?:[^)(]|\([^)(]*\))*)\)/i);

        if (match) {
            let emojiUrl = match[1].trim();

            // 0. Handle Windows-style backslashes and normalize
            emojiUrl = emojiUrl.replace(/\\/g, '/');

            // 1. Strip predictable backend prefixes if present (e.g. http://localhost:8080/storage/...)
            // This is essential because emojis are hosted on the frontend public/custom-emojis
            if (emojiUrl.includes('/storage/')) {
                emojiUrl = emojiUrl.split('/storage/').pop() || '';
            } else if (emojiUrl.includes('/emojis/')) {
                emojiUrl = emojiUrl.split('/emojis/').pop() || '';
            } else if (emojiUrl.includes('/custom-emojis/')) {
                emojiUrl = emojiUrl.split('/custom-emojis/').pop() || '';
            }

            // 2. Ensure it starts with /custom-emojis/
            // Clean up the filename if it was part of a larger path
            const filename = emojiUrl.split('/').pop();
            emojiUrl = `/custom-emojis/${filename}`;

            // 3. Prevent double slashes
            emojiUrl = emojiUrl.replace(/\/+/g, '/');

            return (
                <img
                    key={`emoji-${index}`}
                    src={emojiUrl}
                    alt="emoji"
                    className="inline-block w-6 h-6 min-w-[1.5rem] align-middle mx-0.5 pointer-events-none select-none flex-shrink-0 object-contain"
                    draggable={false}
                    loading="eager"
                />
            );
        }

        return <span key={`text-${index}`}>{part}</span>;
    });
};


/**
 * Legacy support for raw HTML string replacement if needed (for dangerouslySetInnerHTML).
 */
export const replaceEmojiWithHtml = (content: string | null | undefined) => {
    if (!content) return '';
    return content.replace(
        /!\[emoji\]\s*\(((?:[^)(]|\([^)(]*\))*)\)/gi, // Supports one level of nested parentheses
        (match, url) => {
            let emojiUrl = url.trim();

            // 0. Handle Windows-style backslashes
            emojiUrl = emojiUrl.replace(/\\/g, '/');

            // 1. Strip predictable prefixes
            if (emojiUrl.includes('/storage/')) {
                emojiUrl = emojiUrl.split('/storage/').pop() || '';
            } else if (emojiUrl.includes('/emojis/')) {
                emojiUrl = emojiUrl.split('/emojis/').pop() || '';
            } else if (emojiUrl.includes('/custom-emojis/')) {
                emojiUrl = emojiUrl.split('/custom-emojis/').pop() || '';
            }

            // 2. Map to local path
            const filename = emojiUrl.split('/').pop();
            emojiUrl = `/custom-emojis/${filename}`;
            emojiUrl = emojiUrl.replace(/\/+/g, '/');

            return `<img src="${emojiUrl}" alt="emoji" class="inline-block w-6 h-6 min-w-[1.5rem] align-middle mx-0.5 flex-shrink-0 object-contain" draggable="false" loading="eager" />`;
        }
    );
};
