
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
      setError('A candidate resume is required for analysis.');
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
      setError('An error occurred during analysis. Please ensure the files are readable and try again.');
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
    <div className="min-h-screen bg-gray-50 text-gray-800 antialiased font-sans">
      <header className="bg-white border-b border-gray-200 no-print sticky top-0 z-50">
        <div className="container mx-auto px-4 sm:px-6 lg:px-8 py-4 flex items-center justify-between">
          <div className="flex items-center space-x-3">
            <div className="bg-primary-600 p-2 rounded-lg">
              <DocumentIcon className="h-6 w-6 text-white" />
            </div>
            <h1 className="text-xl font-bold text-gray-900 tracking-tight">AI Resume Alignment System</h1>
          </div>
          <div className="hidden sm:block text-xs font-semibold text-gray-400 uppercase tracking-widest">
            Alcott Global Professional Services
          </div>
        </div>
      </header>

      <main className="container mx-auto px-4 sm:px-6 lg:px-8 py-10">
        <div className="max-w-5xl mx-auto">
          {extractedData ? (
             <ResultsDisplay data={extractedData} onReset={handleReset} />
          ) : (
            <div className="space-y-8">
              <div className="bg-white p-8 sm:p-10 rounded-2xl shadow-xl border border-gray-100 transition-all">
                <div className="max-w-2xl mx-auto text-center mb-10">
                  <h2 className="text-3xl font-extrabold text-gray-900 mb-4 italic">Tailored Candidate Analysis</h2>
                  <p className="text-lg text-gray-500 leading-relaxed">
                    Upload the candidate's CV and the target Job Description to generate a context-aware suitability report.
                  </p>
                </div>
                
                <div className="grid grid-cols-1 md:grid-cols-2 gap-10">
                  {/* Step 1: CV */}
                  <div className="space-y-4">
                    <div className="flex items-center gap-3 mb-2">
                      <span className="flex items-center justify-center w-8 h-8 rounded-full bg-primary-600 text-white font-bold text-sm">1</span>
                      <h3 className="text-lg font-bold text-gray-800 uppercase tracking-wide">Candidate CV</h3>
                    </div>
                    <FileUpload 
                      onFileChange={setResumeFile} 
                      disabled={isLoading} 
                      placeholder="Upload Resume / CV"
                    />
                    {resumeFile && (
                      <div className="flex items-center justify-between animate-in fade-in slide-in-from-top-2 bg-green-50 border border-green-200 p-3 rounded-xl shadow-sm">
                        <div className="flex items-center gap-3 overflow-hidden">
                          <div className="bg-green-600 p-1.5 rounded-md text-white">
                            <DocumentIcon className="w-4 h-4" />
                          </div>
                          <span className="text-sm font-semibold text-green-800 truncate">{resumeFile.name}</span>
                        </div>
                        <button onClick={() => setResumeFile(null)} className="text-xs text-green-600 hover:text-green-800 font-bold uppercase p-1">Change</button>
                      </div>
                    )}
                  </div>

                  {/* Step 2: JD */}
                  <div className="space-y-4">
                    <div className="flex items-center gap-3 mb-2">
                      <span className="flex items-center justify-center w-8 h-8 rounded-full bg-indigo-600 text-white font-bold text-sm">2</span>
                      <h3 className="text-lg font-bold text-gray-800 uppercase tracking-wide">Job Description</h3>
                    </div>
                    <FileUpload 
                      onFileChange={setJdFile} 
                      disabled={isLoading} 
                      placeholder="Upload Job Description"
                    />
                    {jdFile && (
                      <div className="flex items-center justify-between animate-in fade-in slide-in-from-top-2 bg-indigo-50 border border-indigo-200 p-3 rounded-xl shadow-sm">
                        <div className="flex items-center gap-3 overflow-hidden">
                          <div className="bg-indigo-600 p-1.5 rounded-md text-white">
                            <DocumentIcon className="w-4 h-4" />
                          </div>
                          <span className="text-sm font-semibold text-indigo-800 truncate">{jdFile.name}</span>
                        </div>
                        <button onClick={() => setJdFile(null)} className="text-xs text-indigo-600 hover:text-indigo-800 font-bold uppercase p-1">Change</button>
                      </div>
                    )}
                  </div>
                </div>
                
                <div className="mt-12 pt-8 border-t border-gray-100 flex flex-col items-center">
                  {!isLoading ? (
                    <div className="w-full flex flex-col items-center">
                      <button
                          onClick={handleAnalysis}
                          disabled={!resumeFile}
                          className={`group relative overflow-hidden w-full sm:w-80 px-8 py-4 text-lg font-bold rounded-2xl shadow-lg transition-all transform active:scale-95 ${
                            !resumeFile 
                              ? 'bg-gray-200 text-gray-400 cursor-not-allowed' 
                              : 'bg-black text-white hover:bg-gray-900 hover:shadow-2xl'
                          }`}
                      >
                        <span className="relative z-10">
                          {jdFile ? 'Analyze with Alignment' : 'Analyze Resume Only'}
                        </span>
                      </button>
                      {!resumeFile && (
                        <p className="mt-4 text-sm text-gray-400 italic">Please upload at least a resume to begin.</p>
                      )}
                    </div>
                  ) : (
                    <div className="w-full">
                      <Loader />
                    </div>
                  )}

                  {error && (
                    <div className="mt-8 max-w-md w-full animate-bounce-short">
                      <div className="bg-red-50 border-l-4 border-red-500 p-4 rounded-r-lg shadow-sm">
                        <div className="flex">
                          <div className="flex-shrink-0">
                            <svg className="h-5 w-5 text-red-400" viewBox="0 0 20 20" fill="currentColor">
                              <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z" clipRule="evenodd" />
                            </svg>
                          </div>
                          <div className="ml-3">
                            <p className="text-sm font-bold text-red-800">Analysis Error</p>
                            <p className="text-xs text-red-700 mt-1">{error}</p>
                          </div>
                        </div>
                      </div>
                    </div>
                  )}
                </div>
              </div>

              <div className="bg-blue-50 border border-blue-100 p-6 rounded-2xl flex items-start gap-4">
                <div className="bg-blue-600 p-2 rounded-lg mt-1">
                  <svg className="w-5 h-5 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                  </svg>
                </div>
                <div>
                  <h4 className="font-bold text-blue-900">How Alignment Works</h4>
                  <p className="text-sm text-blue-800 mt-1 leading-relaxed">
                    Our AI evaluates the candidate's skills, regional experience, and project history against the specific requirements of the job description. The resulting summary and experience highlights are tailored to show exactly how the candidate fits (or lacks) the role criteria.
                  </p>
                </div>
              </div>
            </div>
          )}
        </div>
      </main>

      <footer className="mt-auto border-t border-gray-200 py-10 no-print">
        <div className="container mx-auto px-4 text-center">
          <p className="text-gray-400 text-xs font-medium uppercase tracking-widest">
            &copy; {new Date().getFullYear()} Alcott Global Executive Search. Proprietary Alignment Engine.
          </p>
        </div>
      </footer>
    </div>
  );
};

export default App;
