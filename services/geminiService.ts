import { GoogleGenAI, Type } from "@google/genai";
import type { ExtractedData } from "../types";

const fileToGenerativePart = async (file: File) => {
  const base64EncodedData = await new Promise<string>((resolve, reject) => {
    const reader = new FileReader();
    reader.onloadend = () => resolve((reader.result as string).split(',')[1]);
    reader.onerror = (err) => reject(err);
    reader.readAsDataURL(file);
  });

  return {
    inlineData: {
      data: base64EncodedData,
      mimeType: file.type,
    },
  };
};

const questionCategories = {
    "SCOPE & COMPANY": [
        "Tell us about your Supply Chain functions and responsibilities in your last two roles.",
        "What was your supply chain budget and how much percentage was allocated to logistics spend?",
        "Which country/region(s) have you managed in your last 2 roles?",
        "How long is your experience in US distribution?",
        "How about planning?",
        "Can you share 2 examples of big projects that you have undertaken/oversaw in logistics.",
        "Have you managed reverse logistics?",
        "If yes, for how long and when (in which company/companies)?",
        "Does your previous role manage logistics internally or outsourced? If outsourced, please provide the functions being managed externally."
    ],
    "SYSTEM": [
        "What system or software have you used in the last 2 employment?"
    ],
    "REPORTING & MANAGEMENT": [
        "How many direct and indirect reports in your most recent role?",
        "What role/function do you report to?",
        "What is your method for analyzing your team’s performance?",
        "Who are your internal and external stakeholders?"
    ],
    "KPI": [
        "What are the Key Performance Indicators in your most recent role"
    ],
    "COMPENSATION": [
        "What is your Notice Period?"
    ],
    "MOTIVATION": [
        "Why do you think the Director, Operations Customer Service USA will be the right move for you?"
    ]
};

const categorizedQuestionList = Object.entries(questionCategories)
  .map(([category, questions]) => {
    const questionItems = questions.map(q => `- ${q}`).join('\n');
    return `Category: ${category}\n${questionItems}`;
  })
  .join('\n\n');


const schema = {
  type: Type.OBJECT,
  properties: {
    candidateName: { type: Type.STRING },
    employer: { type: Type.STRING, description: "Current or most recent employer" },
    designation: { type: Type.STRING, description: "Current or most recent job title" },
    location: { type: Type.STRING },
    industry: { type: Type.STRING },
    function: { type: Type.STRING, description: "Job function, e.g., Supply Chain, Logistics" },
    language: { type: Type.STRING, description: "Languages spoken by the candidate" },
    summary: { type: Type.STRING, description: "A brief professional summary from the resume" },
    education: {
      type: Type.ARRAY,
      items: {
        type: Type.OBJECT,
        properties: {
          institution: { type: Type.STRING },
          degree: { type: Type.STRING },
          fieldOfStudy: { type: Type.STRING },
          year: { type: Type.STRING, description: "Graduation year or period of study" },
        },
        required: ["institution", "degree", "year"]
      }
    },
    certifications: {
      type: Type.ARRAY,
      items: {
        type: Type.OBJECT,
        properties: {
          name: { type: Type.STRING },
          issuingOrganization: { type: Type.STRING },
          year: { type: Type.STRING },
        },
        required: ["name"]
      }
    },
    professionalExperience: {
      type: Type.ARRAY,
      items: {
        type: Type.OBJECT,
        properties: {
          company: { type: Type.STRING },
          position: { type: Type.STRING },
          duration: { type: Type.STRING, description: "e.g., 'Jan 2020 - Present' or '3 years'" },
          details: {
            type: Type.ARRAY,
            description: "Bulleted list of responsibilities and achievements",
            items: { type: Type.STRING }
          }
        },
        required: ["company", "position", "duration", "details"]
      }
    },
    functionalEvaluation: {
      type: Type.ARRAY,
      items: {
        type: Type.OBJECT,
        properties: {
          category: { type: Type.STRING },
          questions: {
            type: Type.ARRAY,
            items: {
              type: Type.OBJECT,
              properties: {
                question: { type: Type.STRING },
                answer: { type: Type.STRING }
              },
              required: ["question", "answer"]
            }
          }
        },
        required: ["category", "questions"]
      }
    }
  },
  required: ["candidateName", "professionalExperience", "functionalEvaluation"]
};


export const extractResumeData = async (file: File): Promise<ExtractedData> => {
  const API_KEY = process.env.API_KEY;
  if (!API_KEY) {
    throw new Error("API_KEY environment variable not set");
  }
  const ai = new GoogleGenAI({ apiKey: API_KEY });

  const filePart = await fileToGenerativePart(file);
  
  const prompt = `You are an expert HR assistant specializing in parsing resumes. Analyze the provided resume document and extract the information precisely according to the JSON schema I've provided.

Answer the following questions based on the resume content. Place the answers in the 'functionalEvaluation' array in the JSON output, grouped by the specified categories. Match the category and question text exactly from this list:
${categorizedQuestionList}

For the professional experience section, summarize the key responsibilities and achievements for each role into a list of concise bullet points.

If any information is not found in the document, please use "Not specified" or an empty array where appropriate.`;

  const response = await ai.models.generateContent({
    model: 'gemini-2.5-flash',
    contents: [
        { parts: [filePart] },
        { parts: [{ text: prompt }] },
    ],
    config: {
        responseMimeType: 'application/json',
        responseSchema: schema,
    },
  });

  const jsonText = response.text;
  if (!jsonText) {
      throw new Error("Received an empty response from the API.");
  }
  
  try {
    return JSON.parse(jsonText) as ExtractedData;
  } catch (e) {
    console.error("Failed to parse JSON response:", jsonText);
    throw new Error("The API returned an invalid data format.");
  }
};