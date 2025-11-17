
import React, { useState, useCallback } from 'react';
import { FileUpload } from './components/FileUpload';
import { ResultsDisplay } from './components/ResultsDisplay';
import { Loader } from './components/Loader';
import { DocumentIcon } from './components/icons/DocumentIcon';
import type { ExtractedData } from './types';
import { extractResumeData } from './services/geminiService';

const App: React.FC = () => {
  const [file, setFile] = useState<File | null>(null);
  const [extractedData, setExtractedData] = useState<ExtractedData | null>(null);
  const [isLoading, setIsLoading] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);

  const handleFileChange = (selectedFile: File | null) => {
    setFile(selectedFile);
    setExtractedData(null);
    setError(null);
  };

  const handleAnalysis = useCallback(async () => {
    if (!file) {
      setError('Please select a file first.');
      return;
    }

    setIsLoading(true);
    setError(null);
    setExtractedData(null);

    try {
      const data = await extractResumeData(file);
      setExtractedData(data);
    } catch (err: any) {
      console.error('Extraction failed:', err);
      setError('Failed to analyze the document. The content may be invalid or the format is not supported. Please try again.');
    } finally {
      setIsLoading(false);
    }
  }, [file]);
  
  const handleReset = () => {
    setFile(null);
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
        <div className="max-w-4xl mx-auto">
          {extractedData ? (
             <ResultsDisplay data={extractedData} onReset={handleReset} />
          ) : (
            <div className="bg-white p-6 sm:p-8 rounded-xl shadow-lg border border-gray-200 text-center">
              <h2 className="text-xl font-semibold text-gray-800 mb-2">Upload Your Document</h2>
              <p className="text-gray-500 mb-6">Upload a resume (PDF or Word) to automatically extract key information.</p>
              
              <FileUpload onFileChange={handleFileChange} disabled={isLoading} />
              
              {file && !isLoading && (
                <div className="mt-6 text-center">
                    <p className="text-sm text-gray-600 mb-4">Ready to analyze: <span className="font-medium text-gray-800">{file.name}</span></p>
                    <button
                        onClick={handleAnalysis}
                        className="w-full sm:w-auto inline-flex items-center justify-center px-6 py-3 border border-transparent text-base font-medium rounded-md shadow-sm text-white bg-primary-600 hover:bg-primary-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-primary-500 transition-colors"
                    >
                        Analyze Resume
                    </button>
                </div>
              )}

              {isLoading && <Loader />}

              {error && (
                <div className="mt-6 text-red-600 bg-red-50 p-4 rounded-md">
                  <p className="font-semibold">Error</p>
                  <p>{error}</p>
                </div>
              )}
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