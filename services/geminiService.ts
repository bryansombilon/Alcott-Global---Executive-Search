
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
    summary: { type: Type.STRING, description: "A tailored professional summary highlighting fit for the JD" },
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
            description: "Bulleted list of responsibilities and achievements, focused on relevance to the JD requirements",
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
    throw new Error("API_KEY environment variable not set");
  }
  const ai = new GoogleGenAI({ apiKey: API_KEY });

  const resumePart = await fileToGenerativePart(resumeFile);
  const parts: any[] = [{ inlineData: resumePart.inlineData }];
  
  let jdPromptAddition = "";
  if (jdFile) {
      const jdPart = await fileToGenerativePart(jdFile);
      parts.push({ inlineData: jdPart.inlineData });
      jdPromptAddition = `A Job Description (JD) has been provided as the second document. When extracting details and answering questions, please align the candidate's experience with the requirements and skills mentioned in the JD. Specifically, highlight relevant achievements in the professional experience section and summary that demonstrate suitability for the specific role described in the JD.`;
  }
  
  const prompt = `You are an expert Executive Search consultant at Alcott Global. 
  
  TASK:
  Analyze the provided Candidate Resume and ${jdFile ? 'align it with the provided Job Description' : 'extract key professional details'}.
  
  INSTRUCTIONS:
  1. Extract information precisely according to the JSON schema provided.
  2. ${jdPromptAddition}
  3. Answer the following "Functional Evaluation" questions based on the resume content. Group the answers by the specified categories. Match the category and question text exactly from this list:
  ${categorizedQuestionList}
  4. In the 'Summary' section, write a high-level 3-4 sentence professional pitch of the candidate ${jdFile ? 'explaining why they are a strong fit for the specific JD provided' : 'summarizing their career'}.
  5. For the 'Professional Experience' section, list key responsibilities and achievements as concise bullet points, prioritizing those most relevant to supply chain, logistics, and operations.

  If any specific information is missing from the documents for a required field, use "Not specified" or an empty array. Do not hallucinate data.`;

  parts.push({ text: prompt });

  const response = await ai.models.generateContent({
    model: 'gemini-3-pro-preview', // Upgraded to Pro for complex cross-document alignment
    contents: [
        { parts: parts },
    ],
    config: {
        responseMimeType: 'application/json',
        responseSchema: schema,
        thinkingConfig: { thinkingBudget: 4000 } // Enable thinking for better reasoning between JD and CV
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
    throw new Error("The AI returned an invalid data format. Please try again.");
  }
};
