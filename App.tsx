
import React, { useState, useCallback } from 'react';
import { FileUpload } from './components/FileUpload';
import { ResultsDisplay } from './components/ResultsDisplay';
import { Loader } from './components/Loader';
import { DocumentIcon } from './components/icons/DocumentIcon';
import type { ExtractedData } from './types';
import { extractResumeData } from './services/geminiService';

const App: React.FC = () => {
  const [resumeFile, setResumeFile] = useState<File | null>(null);
  const [jdFile, setJdFile] = useState<File | null>(null);
  const [extractedData, setExtractedData] = useState<ExtractedData | null>(null);
  const [isLoading, setIsLoading] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);

  const handleAnalysis = useCallback(async () => {
    if (!resumeFile) {
      setError('Please upload a candidate resume first.');
      return;
    }

    setIsLoading(true);
    setError(null);
    setExtractedData(null);

    try {
      const data = await extractResumeData(resumeFile, jdFile);
      setExtractedData(data);
    } catch (err: any) {
      console.error('Extraction failed:', err);
      setError('Failed to analyze the documents. Please ensure they are valid PDF or Word files and try again.');
    } finally {
      setIsLoading(false);
    }
  }, [resumeFile, jdFile]);
  
  const handleReset = () => {
    setResumeFile(null);
    setJdFile(null);
    setExtractedData(null);
    setError(null);
    setIsLoading(false);
  };

  return (
    <div className="min-h-screen bg-gray-50 text-gray-800 antialiased">
      <header className="bg-white shadow-sm no-print">
        <div className="container mx-auto px-4 sm:px-6 lg:px-8 py-4 flex items-center justify-between">
          <div className="flex items-center space-x-3">
            <DocumentIcon className="h-8 w-8 text-primary-600" />
            <h1 className="text-2xl font-bold text-gray-900 tracking-tight">AI Resume Extractor</h1>
          </div>
        </div>
      </header>

      <main className="container mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="max-w-5xl mx-auto">
          {extractedData ? (
             <ResultsDisplay data={extractedData} onReset={handleReset} />
          ) : (
            <div className="bg-white p-6 sm:p-8 rounded-xl shadow-lg border border-gray-200">
              <div className="text-center mb-8">
                <h2 className="text-2xl font-semibold text-gray-800 mb-2">Analyze Candidate Suitability</h2>
                <p className="text-gray-500">Upload both the candidate's resume and the job description for a tailored analysis.</p>
              </div>
              
              <div className="grid grid-cols-1 md:grid-cols-2 gap-8 mb-8">
                <div className="space-y-3">
                  <label className="block text-sm font-bold text-gray-700 uppercase tracking-wide">1. Candidate Resume (Required)</label>
                  <FileUpload 
                    onFileChange={setResumeFile} 
                    disabled={isLoading} 
                    placeholder="Drop CV here"
                  />
                  {resumeFile && (
                    <div className="flex items-center gap-2 text-sm text-green-600 bg-green-50 p-2 rounded border border-green-100">
                      <DocumentIcon className="w-4 h-4" />
                      <span className="font-medium truncate">{resumeFile.name}</span>
                    </div>
                  )}
                </div>

                <div className="space-y-3">
                  <label className="block text-sm font-bold text-gray-700 uppercase tracking-wide">2. Job Description (Optional)</label>
                  <FileUpload 
                    onFileChange={setJdFile} 
                    disabled={isLoading} 
                    placeholder="Drop JD here"
                  />
                  {jdFile && (
                    <div className="flex items-center gap-2 text-sm text-primary-600 bg-primary-50 p-2 rounded border border-primary-100">
                      <DocumentIcon className="w-4 h-4" />
                      <span className="font-medium truncate">{jdFile.name}</span>
                    </div>
                  )}
                </div>
              </div>
              
              <div className="flex flex-col items-center">
                {!isLoading && (
                  <button
                      onClick={handleAnalysis}
                      disabled={!resumeFile}
                      className={`w-full sm:w-auto inline-flex items-center justify-center px-10 py-4 border border-transparent text-lg font-bold rounded-xl shadow-md text-white transition-all ${
                        !resumeFile 
                          ? 'bg-gray-300 cursor-not-allowed' 
                          : 'bg-primary-600 hover:bg-primary-700 focus:outline-none focus:ring-4 focus:ring-primary-300'
                      }`}
                  >
                      {jdFile ? 'Analyze Against JD' : 'Analyze Resume Only'}
                  </button>
                )}

                {isLoading && <Loader />}

                {error && (
                  <div className="mt-6 w-full text-red-600 bg-red-50 p-4 rounded-lg border border-red-100 text-center">
                    <p className="font-bold mb-1">Analysis Error</p>
                    <p className="text-sm">{error}</p>
                  </div>
                )}
              </div>
            </div>
          )}
        </div>
      </main>

      <footer className="text-center py-6 text-sm text-gray-500 no-print">
        <p>&copy; {new Date().getFullYear()} AI Resume Extractor. All rights reserved.</p>
      </footer>
    </div>
  );
};

export default App;
