import { GoogleGenAI, Type } from "@google/genai";
import type { ExtractedData } from "../types";

const fileToGenerativePart = async (file: File) => {
  const base64EncodedData = await new Promise<string>((resolve, reject) => {
    const reader = new FileReader();
    reader.onloadend = () => resolve((reader.result as string).split(',')[1]);
    reader.onerror = (err) => reject(err);
    reader.readAsDataURL(file);
  });

  // Ensure we have a valid mimeType, falling back based on extension if necessary
  let mimeType = file.type;
  if (!mimeType) {
    const name = file.name.toLowerCase();
    if (name.endsWith('.pdf')) mimeType = 'application/pdf';
    else if (name.endsWith('.docx')) mimeType = 'application/vnd.openxmlformats-officedocument.wordprocessingml.document';
    else if (name.endsWith('.doc')) mimeType = 'application/msword';
    else mimeType = 'application/octet-stream';
  }

  return {
    inlineData: {
      data: base64EncodedData,
      mimeType: mimeType,
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
    summary: { type: Type.STRING, description: "A highly tailored professional summary. If a JD is provided, focus on the candidate's 'Right Fit' for that role." },
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
            description: "Bulleted list of responsibilities. If JD is provided, emphasize experience that maps directly to JD requirements.",
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


export const extractResumeData = async (resumeFile: File, jdFile: File | null): Promise<ExtractedData> => {
  const API_KEY = process.env.API_KEY;
  if (!API_KEY) {
    throw new Error("API Key is missing. Please contact support.");
  }

  try {
    const ai = new GoogleGenAI({ apiKey: API_KEY });

    const resumePart = await fileToGenerativePart(resumeFile);
    const parts: any[] = [resumePart];
    
    let jdPromptAddition = "";
    if (jdFile) {
        const jdPart = await fileToGenerativePart(jdFile);
        parts.push(jdPart);
        jdPromptAddition = `
        CRITICAL REQUIREMENT: A Job Description (JD) is provided as the second document. 
        You MUST evaluate the Candidate Resume specifically for its alignment with this JD.
        - SUMMARY: Write a "Pitch for the Role" summarizing why this specific candidate matches the JD's requirements (years of experience, specific skills, regional exposure).
        - EXPERIENCE: Filter and prioritize professional experience details that prove the candidate can perform the duties listed in the JD.
        - EVALUATION: When answering the functional questions, draw connections between the candidate's past work and the JD requirements where appropriate.`;
    }
    
    const prompt = `You are a world-class Executive Search Consultant specializing in Supply Chain and Logistics. 
    
    TASK:
    1. Carefully read the Candidate Resume (Document 1).
    2. ${jdFile ? 'Carefully read the Job Description (Document 2).' : 'Analyze the resume profile.'}
    3. Extract details and perform a candidate assessment.
    
    INSTRUCTIONS:
    - Extract information according to the JSON schema.
    - ${jdPromptAddition}
    - Answer the "Functional Evaluation" questions below using only the candidate's actual data. If the data is not in the resume, state "Information not available in resume".
    - Match these categories and questions exactly:
    ${categorizedQuestionList}
    
    Tone: Professional, objective, and analytical. Focus on hard data and specific achievements.`;

    parts.push({ text: prompt });

    const response = await ai.models.generateContent({
      model: 'gemini-3-pro-preview',
      contents: { parts },
      config: {
          responseMimeType: 'application/json',
          responseSchema: schema,
          // Removed explicit thinking budget to improve stability with standard token limits
      },
    });

    const jsonText = response.text;
    if (!jsonText) {
        throw new Error("The AI returned an empty response. This might be due to safety filters or a transient error.");
    }
    
    try {
      return JSON.parse(jsonText) as ExtractedData;
    } catch (e) {
      console.error("Failed to parse JSON response:", jsonText);
      throw new Error("The AI failed to format the data correctly. Please try again.");
    }
  } catch (error: any) {
    console.error("Gemini API Error:", error);
    if (error.message?.includes("429") || error.message?.includes("quota")) {
      throw new Error("Rate limit exceeded. Please wait a moment before trying again.");
    }
    if (error.message?.includes("400")) {
      throw new Error("The files provided might be too large or incompatible with the analysis model.");
    }
    throw new Error(error.message || "An unexpected error occurred during analysis.");
  }
};
