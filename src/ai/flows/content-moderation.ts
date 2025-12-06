'use server';

/**
 * @fileOverview This flow moderates audio or video content for inappropriate material.
 *
 * - moderateContent -  A function that moderates content and returns a warning if it is inappropriate.
 * - ModerateContentInput - The input type for the moderateContent function.
 * - ModerateContentOutput - The return type for the moderateContent function.
 */

import {ai} from '@/ai/genkit';
import {z} from 'genkit';

const ModerateContentInputSchema = z.object({
  contentDataUri: z
    .string()
    .describe(
      "A data URI of the content (audio or video) to be moderated. Must include a MIME type and use Base64 encoding. Expected format: 'data:<mimetype>;base64,<encoded_data>'."
    ),
  contentType: z.enum(['audio', 'video']).describe('The type of content being moderated.'),
});
export type ModerateContentInput = z.infer<typeof ModerateContentInputSchema>;

const ModerateContentOutputSchema = z.object({
  isFlagged: z.boolean().describe('Whether the content is flagged as inappropriate.'),
  reason: z
    .string()
    .optional()
    .describe('The reason the content was flagged, if applicable.'),
});
export type ModerateContentOutput = z.infer<typeof ModerateContentOutputSchema>;

export async function moderateContent(input: ModerateContentInput): Promise<ModerateContentOutput> {
  return moderateContentFlow(input);
}

const moderateContentPrompt = ai.definePrompt({
  name: 'moderateContentPrompt',
  input: {schema: ModerateContentInputSchema},
  output: {schema: ModerateContentOutputSchema},
  prompt: `You are an AI content moderator responsible for identifying inappropriate content in audio and video streams.

  Your task is to analyze the provided content and determine if it contains any of the following:
  - Adult content
  - Violence
  - Misinformation

  Based on your analysis, provide a boolean value for 'isFlagged'. If the content is flagged, provide a detailed 'reason' explaining why.

  Content Type: {{{contentType}}}
  Content: {{media url=contentDataUri}}`,
});

const moderateContentFlow = ai.defineFlow(
  {
    name: 'moderateContentFlow',
    inputSchema: ModerateContentInputSchema,
    outputSchema: ModerateContentOutputSchema,
  },
  async input => {
    const {output} = await moderateContentPrompt(input);
    return output!;
  }
);

