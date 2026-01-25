
import { GoogleGenAI, Type } from "@google/genai";
import { AiSuggestion } from "../types";

export const analyzeProductsWithGemini = async (products: { id: string; name: string; code: string }[]): Promise<AiSuggestion[]> => {
  // Always use process.env.API_KEY directly as per guidelines
  const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });
  
  const productList = products.map(p => `ID: ${p.id} | Name: ${p.name} | Code: ${p.code}`).join('\n');
  const prompt = `
    You are an expert Data Analyst for an ERP system (Odoo).
    Analyze the following list of products. 
    Your goal is to normalize the "Name" into a "Product Template Name" by extracting variant attributes (Color, Size, Material, Dimensions, etc.).
    
    Return a JSON array where each item matches the input ID.
    
    Products:
    ${productList}
  `;

  const response = await ai.models.generateContent({
    model: 'gemini-3-flash-preview',
    contents: prompt,
    config: {
        responseMimeType: "application/json",
        responseSchema: {
            type: Type.ARRAY,
            items: {
                type: Type.OBJECT,
                properties: {
                    id: { type: Type.STRING },
                    suggestedTemplate: { type: Type.STRING, description: "The cleaned product name without variant attributes" },
                    attributes: {
                        type: Type.ARRAY,
                        items: {
                            type: Type.OBJECT,
                            properties: {
                                name: { type: Type.STRING },
                                value: { type: Type.STRING }
                            },
                            required: ["name", "value"]
                        }
                    }
                },
                required: ["id", "suggestedTemplate", "attributes"]
            }
        }
    }
  });

  if (response.text) {
      try {
        return JSON.parse(response.text) as AiSuggestion[];
      } catch (e) {
          console.error("Failed to parse Gemini response", e);
          return [];
      }
  }
  return [];
};
