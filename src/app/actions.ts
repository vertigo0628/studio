"use server";

import { moderateContent } from "@/ai/flows/content-moderation";

// This is a placeholder for a base64 encoded silent audio file.
// In a real app, you would get this from a file upload.
const MOCK_SAFE_AUDIO_DATA_URI = "data:audio/mp3;base64,SUQzBAAAAAABEVRYWFgAAAAtAAADY29tbWVudABCaWdTb3VuZEJhbmsuY29tIC8gTGliAv4AP'8AAAAAAA==";

// This is a placeholder that might trigger the moderation.
// A real file would be needed to test the model properly. This is just for demonstration.
const MOCK_POTENTIALLY_UNSAFE_VIDEO_DATA_URI = "data:video/mp4;base64,AAAAHGZ0eXBtcDQyAAAAAm1wNDJpc29tYXZjMQAAAZhtdmhkAAAAAAAAAAAAAAAAAAABAAADWAAACgAAAABAAAAAAAAAAAAAAAABAAAAAAAAAAAAAAAAAAAAAQAAAAAAAAAAAAAAAAAAQAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAIAAABidWR0YQAAAFptZXRhAAAAAAAAACFoZGxyAAAAAAAAAABtZGlyYXBwbAAAAAAAAAAAAAAAAC1pbHN0AAAAJql0b28AAAAdZGF0YQAAAAEAAAAATGF2ZjU4LjI5LjEwMA==";

export async function handleContentModeration(contentType: 'audio' | 'video') {
    "use server";

    try {
        const input = {
            contentType,
            // For demonstration, we'll use a safe audio URI and a potentially unsafe video URI
            // to showcase both outcomes of the moderation.
            contentDataUri: contentType === 'audio' ? MOCK_SAFE_AUDIO_DATA_URI : MOCK_POTENTIALLY_UNSAFE_VIDEO_DATA_URI,
        };

        const result = await moderateContent(input);

        // For this demo, we will force the video to be flagged to show the UI.
        // The real `moderateContent` function may or may not flag the mock data.
        if (contentType === 'video') {
            return {
                isFlagged: true,
                reason: 'Potential violence detected in video stream.',
            };
        }
        
        // For audio, we'll let the actual result pass through.
        return result;

    } catch (error) {
        console.error("Error in content moderation flow:", error);
        // In case of an error with the AI flow, we'll be cautious and flag the content.
        return {
            isFlagged: true,
            reason: 'Could not perform content moderation. Sharing is blocked as a precaution.',
        };
    }
}
