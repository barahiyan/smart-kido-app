// This file encapsulates the logic for interacting with the Google AI SDK.
// It uses dynamic import() to load the library only when needed,
// which is crucial for preventing the app from crashing on startup.

export class ApiKeyNotFoundError extends Error {
    constructor(message: string) {
        super(message);
        this.name = "ApiKeyNotFoundError";
    }
}

export async function getAiResponse(prompt: string, dataContext: string): Promise<string> {
    try {
        // Dynamically import the GoogleGenAI class from the library.
        const { GoogleGenAI } = await import('@google/genai');
    
        // The API key is injected by the environment and must be present.
        if (!process.env.API_KEY) {
            return "Ufunguo wa API (API Key) haupatikani. Tafadhali chagua moja ili uendelee.";
        }

        const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });

        const fullPrompt = `
        You are an expert business analyst for a small business in Tanzania.
        Your responses MUST be in Swahili.
        You will be given the business's data as a JSON string.
        Based on this data, answer the user's question.
        Provide insightful, helpful, and concise analysis.
        Use Markdown for formatting, especially for lists or tables.

        Here is the business data:
        ${dataContext}

        Here is the user's question:
        "${prompt}"
        `;

        const response = await ai.models.generateContent({
            model: 'gemini-2.5-flash',
            contents: fullPrompt,
        });

        return response.text;

    } catch (error) {
        console.error("Error getting AI response:", error);
        if (error instanceof Error && (error.message.includes("API key not valid") || error.message.includes("Requested entity was not found."))) {
             // Throw the custom error to be handled by the UI.
            throw new ApiKeyNotFoundError("API Key is invalid or not found.");
        }
        // Provide a user-friendly error message in Swahili.
        return "Samahani, tatizo la mtandao au la kimfumo limetokea. Tafadhali jaribu tena baada ya muda mfupi.";
    }
}
