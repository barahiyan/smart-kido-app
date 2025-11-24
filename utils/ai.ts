
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
            throw new ApiKeyNotFoundError("API Key not found in process.env");
        }

        const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });

        const fullPrompt = `
        Wewe ni mchambuzi wa biashara wa 'Smart Kido'.
        Jibu swali la mtumiaji kwa KISWAHILI fasaha.

        MAAGIZO MUHIMU YA MPANGILIO (FORMATTING):
        1. Jibu liwe FUPI na la MOJA KWA MOJA. Usiweke utangulizi mrefu au maelezo yasiyo ya lazima.
        2. Usitumie nyota nyota (**). Tumia <b>tag ya bold</b> kwa vichwa vya habari tu.
        3. Tumia HTML tags kupangilia jibu lako:
           - Tumia <table>, <tr>, <th>, <td> kuonyesha data au namba. Weka border="1" kwenye table.
           - Tumia <ul> na <li> kwa orodha.
           - Tumia <p> kwa aya.
           - Tumia <b> kwa msisitizo kwenye namba muhimu.
        4. Ukilinganisha vitu au ukitoa ripoti ya mauzo, LAZIMA utumie JEDWALI (Table).

        Data ya biashara ni hii hapa:
        ${dataContext}

        Swali la mtumiaji:
        "${prompt}"
        `;

        const response = await ai.models.generateContent({
            model: 'gemini-2.5-flash',
            contents: fullPrompt,
        });

        return response.text || "Samahani, sikuweza kupata jibu.";

    } catch (error) {
        console.error("Error getting AI response:", error);
        if (error instanceof Error && (error.message.includes("API key not valid") || error.message.includes("Requested entity was not found."))) {
             // Throw the custom error to be handled by the UI.
            throw new ApiKeyNotFoundError("API Key is invalid or not found.");
        }
        // For any other error, including ApiKeyNotFoundError, re-throw it to be handled by the UI.
        throw error;
    }
}
