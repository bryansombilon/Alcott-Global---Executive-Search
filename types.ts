
export interface Education {
    institution: string;
    degree: string;
    fieldOfStudy: string;
    year: string;
}

export interface Certification {
    name: string;
    issuingOrganization: string;
    year: string;
}

export interface ProfessionalExperience {
    company: string;
    position: string;
    duration: string;
    details: string[];
}

export interface QuestionAndAnswer {
    question: string;
    answer: string;
}

export interface QuestionCategory {
    category: string;
    questions: QuestionAndAnswer[];
}

export interface ExtractedData {
    candidateName: string;
    employer: string;
    designation: string;
    location: string;
    industry: string;
    function: string;
    language: string;
    summary: string;
    education: Education[];
    certifications: Certification[];
    professionalExperience: ProfessionalExperience[];
    functionalEvaluation: QuestionCategory[];
}