import React, { useState, useEffect } from 'react';
import jsPDF from 'jspdf';
import html2canvas from 'html2canvas';
import type { ExtractedData, ProfessionalExperience, Education, Certification } from '../types';
import { EditableField } from './EditableField';
import { AddIcon } from './icons/AddIcon';
import { DeleteIcon } from './icons/DeleteIcon';

interface ResultsDisplayProps {
    data: ExtractedData;
    onReset: () => void;
}

const ReportHeader = () => (
    <div id="report-header" className="bg-black text-white p-4">
        <div className="font-bold text-xl leading-none tracking-widest text-center">
            <div>ALCOTT</div>
            <div>GLOBAL</div>
        </div>
    </div>
);

const ReportFooter = () => (
    <div id="report-footer" className="bg-black text-white p-4 mt-auto text-xs">
        <p className="text-gray-400 text-xs border-b border-gray-600 pb-2 mb-2">
            Interview of candidates referred by Alcott Global. shall be deemed acceptance of the standard terms of business and agreement to pay the relevant agency fee for such candidates employed by the organization to whom the referral was made or any other organization or person associated with it.
        </p>
        <div className="flex justify-between items-center">
            <div>
                <p className="font-bold">Alcott Global – Upgrading Value Chains, One Connection at a Time</p>
                <p className="text-gray-300">NORTH AMERICA | APAC | EUROPE | MIDDLE EAST | LATAM</p>
                <div className="flex items-center gap-4 mt-1">
                    <span>📧 contact@alcottglobal.com</span>
                    <span>🌐 www.alcottglobal.com</span>
                </div>
            </div>
            <div className="font-bold text-xl leading-none tracking-widest text-center">
                <div>ALCOTT</div>
                <div>GLOBAL</div>
            </div>
        </div>
    </div>
);

export const ResultsDisplay: React.FC<ResultsDisplayProps> = ({ data, onReset }) => {
    const [editableData, setEditableData] = useState<ExtractedData>(data);
    const [isGeneratingPdf, setIsGeneratingPdf] = useState(false);
    const [isPrinting, setIsPrinting] = useState(false);

    useEffect(() => {
        const savedData = localStorage.getItem('editableResumeData');
        if (savedData) {
            setEditableData(JSON.parse(savedData));
        } else {
            setEditableData(data);
        }
    }, [data]);

    const updateAndSaveData = (newData: ExtractedData) => {
        setEditableData(newData);
        localStorage.setItem('editableResumeData', JSON.stringify(newData));
    };

    const handlePrint = async () => {
        setIsPrinting(true);
        const headerEl = document.getElementById('report-header');
        const contentEl = document.getElementById('report-body');
        const footerEl = document.getElementById('report-footer');
    
        if (!headerEl || !contentEl || !footerEl) {
            console.error("Report elements not found for printing.");
            setIsPrinting(false);
            return;
        }

        const noPrintElements = Array.from(contentEl.querySelectorAll('.no-print')) as HTMLElement[];
        const spacers: HTMLElement[] = [];
    
        try {
            const pdf = new jsPDF({ orientation: 'p', unit: 'mm', format: 'a4' });
            const pdfWidth = pdf.internal.pageSize.getWidth();
            const pdfHeight = pdf.internal.pageSize.getHeight();

            const [headerCanvas, footerCanvas] = await Promise.all([
                html2canvas(headerEl, { scale: 2, useCORS: true, width: headerEl.scrollWidth, height: headerEl.scrollHeight }),
                html2canvas(footerEl, { scale: 2, useCORS: true, width: footerEl.scrollWidth, height: footerEl.scrollHeight }),
            ]);
    
            const headerHeight = (headerCanvas.height * pdfWidth) / headerCanvas.width;
            const footerHeight = (footerCanvas.height * pdfWidth) / footerCanvas.width;
            const contentHeightOnPage = pdfHeight - headerHeight - footerHeight;

            // Hide interactive elements for clean capture and measurement
            noPrintElements.forEach(el => el.style.display = 'none');
            
            // Calculate where page breaks would occur in pixels
            const pagePixelHeight = (contentHeightOnPage * contentEl.scrollWidth) / pdfWidth;
    
            if (pagePixelHeight > 0) {
                // This loop continues until no more page break adjustments are needed
                let continueChecking = true;
                while(continueChecking) {
                    continueChecking = false;
                    const experienceItems = Array.from(contentEl.querySelectorAll('.experience-item')) as HTMLElement[];
                    let currentPageBreakY = pagePixelHeight;
    
                    for (const item of experienceItems) {
                        const itemTop = item.offsetTop;
                        const itemBottom = itemTop + item.offsetHeight;
    
                        // Advance to the page break line relevant for this item
                        while (currentPageBreakY < itemTop) {
                            currentPageBreakY += pagePixelHeight;
                        }
    
                        if (itemBottom > currentPageBreakY) {
                            // Item crosses the page break. Insert a spacer and restart the check.
                            const spaceToFill = currentPageBreakY - itemTop;
                            if (spaceToFill > 0) {
                                const spacer = document.createElement('div');
                                spacer.style.height = `${spaceToFill}px`;
                                item.before(spacer);
                                spacers.push(spacer);
                                continueChecking = true; // DOM has changed, re-evaluate all items
                                break; 
                            }
                        }
                    }
                }
            }

            const contentCanvas = await html2canvas(contentEl, { scale: 2, useCORS: true, width: contentEl.scrollWidth, height: contentEl.scrollHeight });
    
            const totalScaledContentHeight = (contentCanvas.height * pdfWidth) / contentCanvas.width;
            const totalPages = Math.ceil(totalScaledContentHeight / contentHeightOnPage);
    
            for (let i = 0; i < totalPages; i++) {
                if (i > 0) pdf.addPage();
    
                // Add header and footer first
                pdf.addImage(headerCanvas.toDataURL('image/png'), 'PNG', 0, 0, pdfWidth, headerHeight);
                pdf.addImage(footerCanvas.toDataURL('image/png'), 'PNG', 0, pdfHeight - footerHeight, pdfWidth, footerHeight);

                // Create a clipping path for the content area to prevent overlap
                pdf.saveGraphicsState();
                pdf.rect(0, headerHeight, pdfWidth, contentHeightOnPage).clip();
                
                const yOffset = -i * contentHeightOnPage;
                // The content image is placed relative to the top of the page, but will be clipped to the rect above
                pdf.addImage(contentCanvas.toDataURL('image/png'), 'PNG', 0, headerHeight + yOffset, pdfWidth, totalScaledContentHeight);
                
                // Remove the clipping path so it doesn't affect subsequent operations or pages
                pdf.restoreGraphicsState();
            }
    
            const pdfBlob = pdf.output('blob');
            const pdfUrl = URL.createObjectURL(pdfBlob);
            
            const printWindow = window.open(pdfUrl, '_blank');
            if (printWindow) printWindow.focus();
            else alert("Please allow pop-ups for this site to print the report.");
    
        } catch (error) {
            console.error("Error generating printable PDF:", error);
            alert("Sorry, there was an error creating the print version of the report.");
        } finally {
            // Cleanup
            spacers.forEach(el => el.remove());
            noPrintElements.forEach(el => el.style.display = '');
            setIsPrinting(false);
        }
    };

    const handleDownloadPdf = async () => {
        setIsGeneratingPdf(true);
        const headerEl = document.getElementById('report-header');
        const contentEl = document.getElementById('report-body');
        const footerEl = document.getElementById('report-footer');

        if (!headerEl || !contentEl || !footerEl) {
            console.error("Report elements not found for downloading.");
            setIsGeneratingPdf(false);
            return;
        }

        const noPrintElements = Array.from(contentEl.querySelectorAll('.no-print')) as HTMLElement[];
        const spacers: HTMLElement[] = [];

        try {
            const pdf = new jsPDF({ orientation: 'p', unit: 'mm', format: 'a4' });
            const pdfWidth = pdf.internal.pageSize.getWidth();
            const pdfHeight = pdf.internal.pageSize.getHeight();

            const [headerCanvas, footerCanvas] = await Promise.all([
                html2canvas(headerEl, { scale: 2, useCORS: true, width: headerEl.scrollWidth, height: headerEl.scrollHeight }),
                html2canvas(footerEl, { scale: 2, useCORS: true, width: footerEl.scrollWidth, height: footerEl.scrollHeight }),
            ]);

            const headerHeight = (headerCanvas.height * pdfWidth) / headerCanvas.width;
            const footerHeight = (footerCanvas.height * pdfWidth) / footerCanvas.width;
            const contentHeightOnPage = pdfHeight - headerHeight - footerHeight;

            noPrintElements.forEach(el => el.style.display = 'none');
            
            const pagePixelHeight = (contentHeightOnPage * contentEl.scrollWidth) / pdfWidth;

            if (pagePixelHeight > 0) {
                let continueChecking = true;
                while(continueChecking) {
                    continueChecking = false;
                    const experienceItems = Array.from(contentEl.querySelectorAll('.experience-item')) as HTMLElement[];
                    let currentPageBreakY = pagePixelHeight;

                    for (const item of experienceItems) {
                        const itemTop = item.offsetTop;
                        const itemBottom = itemTop + item.offsetHeight;

                        while (currentPageBreakY < itemTop) {
                            currentPageBreakY += pagePixelHeight;
                        }

                        if (itemBottom > currentPageBreakY) {
                            const spaceToFill = currentPageBreakY - itemTop;
                            if (spaceToFill > 0) {
                                const spacer = document.createElement('div');
                                spacer.style.height = `${spaceToFill}px`;
                                item.before(spacer);
                                spacers.push(spacer);
                                continueChecking = true; 
                                break; 
                            }
                        }
                    }
                }
            }

            const contentCanvas = await html2canvas(contentEl, { scale: 2, useCORS: true, width: contentEl.scrollWidth, height: contentEl.scrollHeight });

            const totalScaledContentHeight = (contentCanvas.height * pdfWidth) / contentCanvas.width;
            const totalPages = Math.ceil(totalScaledContentHeight / contentHeightOnPage);

            for (let i = 0; i < totalPages; i++) {
                if (i > 0) pdf.addPage();

                pdf.addImage(headerCanvas.toDataURL('image/png'), 'PNG', 0, 0, pdfWidth, headerHeight);
                pdf.addImage(footerCanvas.toDataURL('image/png'), 'PNG', 0, pdfHeight - footerHeight, pdfWidth, footerHeight);

                pdf.saveGraphicsState();
                pdf.rect(0, headerHeight, pdfWidth, contentHeightOnPage).clip();
                
                const yOffset = -i * contentHeightOnPage;
                pdf.addImage(contentCanvas.toDataURL('image/png'), 'PNG', 0, headerHeight + yOffset, pdfWidth, totalScaledContentHeight);
                
                pdf.restoreGraphicsState();
            }

            pdf.save(`Report - ${editableData.candidateName || 'candidate'}.pdf`);

        } catch (error) {
            console.error("Error generating PDF for download:", error);
            alert("Sorry, there was an error creating the PDF report.");
        } finally {
            spacers.forEach(el => el.remove());
            noPrintElements.forEach(el => el.style.display = '');
            setIsGeneratingPdf(false);
        }
    };


    const handleFieldUpdate = (field: keyof Omit<ExtractedData, 'professionalExperience' | 'education' | 'certifications' | 'functionalEvaluation'>, value: string) => {
        const newData = { ...editableData, [field]: value };
        updateAndSaveData(newData);
    };
    
    const handleArrayItemUpdate = <T,>(arrayName: keyof ExtractedData, index: number, field: keyof T, value: any) => {
        const newArray = [...((editableData[arrayName] as T[] | undefined) || [])];
        if (newArray[index]) {
            newArray[index] = { ...newArray[index], [field]: value };
            updateAndSaveData({ ...editableData, [arrayName]: newArray });
        }
    };
    
    const addArrayItem = <T,>(arrayName: keyof ExtractedData, newItem: T) => {
        const newArray = [...((editableData[arrayName] as T[] | undefined) || []), newItem];
        updateAndSaveData({ ...editableData, [arrayName]: newArray });
    };

    const deleteArrayItem = (arrayName: keyof ExtractedData, index: number) => {
        const newArray = ((editableData[arrayName] as any[] | undefined) || []).filter((_, i) => i !== index);
        updateAndSaveData({ ...editableData, [arrayName]: newArray });
    };
    
    const handleQuestionAnswerUpdate = (categoryIndex: number, questionIndex: number, answer: string) => {
        const newFunctionalEvaluation = (editableData.functionalEvaluation || []).map((cat, cIndex) => {
            if (cIndex !== categoryIndex) {
                return cat;
            }
            const newQuestions = (cat.questions || []).map((q, qIndex) => {
                if (qIndex !== questionIndex) {
                    return q;
                }
                return { ...q, answer: answer };
            });
            return { ...cat, questions: newQuestions };
        });
        updateAndSaveData({ ...editableData, functionalEvaluation: newFunctionalEvaluation });
    };

    const handleDetailUpdate = (expIndex: number, detailIndex: number, value: string) => {
        const newExperience = [...(editableData.professionalExperience || [])];
        if(newExperience[expIndex]) {
            const newDetails = [...(newExperience[expIndex].details || [])];
            newDetails[detailIndex] = value;
            handleArrayItemUpdate<ProfessionalExperience>('professionalExperience', expIndex, 'details', newDetails);
        }
    };

    const addDetail = (expIndex: number) => {
        const newExperience = [...(editableData.professionalExperience || [])];
        if(newExperience[expIndex]) {
            const newDetails = [...(newExperience[expIndex].details || []), 'New detail'];
            handleArrayItemUpdate<ProfessionalExperience>('professionalExperience', expIndex, 'details', newDetails);
        }
    };

    const deleteDetail = (expIndex: number, detailIndex: number) => {
        const newExperience = [...(editableData.professionalExperience || [])];
        if(newExperience[expIndex]) {
            const newDetails = (newExperience[expIndex].details || []).filter((_, i) => i !== detailIndex);
            handleArrayItemUpdate<ProfessionalExperience>('professionalExperience', expIndex, 'details', newDetails);
        }
    };

    const handleResetClick = () => {
        localStorage.removeItem('editableResumeData');
        onReset();
    };

    if (!editableData) return null;

    const Section: React.FC<{ title: React.ReactNode; children: React.ReactNode; className?: string }> = ({ title, children, className = '' }) => (
        <div className={`mb-8 ${className}`}>
            <div className="text-xl font-bold text-gray-800 border-b-2 border-gray-300 pb-2 mb-4 flex items-center">
                {title}
            </div>
            {children}
        </div>
    );

    return (
        <div className="space-y-8 animate-fade-in">
            <div className="bg-white p-4 rounded-xl shadow-lg border border-gray-200 flex justify-center items-center gap-4 no-print">
                <button
                    onClick={handlePrint}
                    disabled={isPrinting}
                    className="px-4 py-2 text-sm font-medium text-white bg-primary-600 hover:bg-primary-700 rounded-lg transition-colors focus:outline-none focus:ring-2 focus:ring-primary-500 focus:ring-offset-2 disabled:bg-gray-400"
                >
                    {isPrinting ? 'Preparing Print...' : 'Print Report'}
                </button>
                 <button
                    onClick={handleDownloadPdf}
                    disabled={isGeneratingPdf}
                    className="px-4 py-2 text-sm font-medium text-white bg-green-600 hover:bg-green-700 rounded-lg transition-colors focus:outline-none focus:ring-2 focus:ring-green-500 focus:ring-offset-2 disabled:bg-gray-400"
                >
                    {isGeneratingPdf ? 'Generating PDF...' : 'Download PDF'}
                </button>
                <button
                    onClick={handleResetClick}
                    className="px-4 py-2 text-sm font-medium text-primary-600 bg-primary-100 hover:bg-primary-200 rounded-lg transition-colors focus:outline-none focus:ring-2 focus:ring-primary-500 focus:ring-offset-2 flex-shrink-0"
                >
                    Analyze Another
                </button>
            </div>
            
            <div id="report-container" className="bg-white shadow-lg">
                <div className="flex flex-col min-h-screen">
                    <ReportHeader />
                    <div id="report-body" className="p-8 flex-grow">
                        {/* Candidate Details */}
                        <div className="mb-8">
                             <EditableField
                                initialValue={editableData.candidateName || ''}
                                onSave={(val) => handleFieldUpdate('candidateName', val)}
                                className="text-4xl font-bold text-gray-900"
                                inputClassName="text-4xl font-bold"
                            />
                            <EditableField
                                initialValue={editableData.designation || ''}
                                onSave={(val) => handleFieldUpdate('designation', val)}
                                className="text-primary-600 font-medium text-xl mt-1"
                                inputClassName="text-primary-600 font-medium text-xl"
                            />
                            <div className="grid grid-cols-2 md:grid-cols-3 gap-x-8 gap-y-6 mt-6 border-t border-b py-4">
                                <div>
                                    <h4 className="text-sm font-semibold text-gray-500 uppercase tracking-wider">Current Employer</h4>
                                    <EditableField initialValue={editableData.employer || ''} onSave={(v) => handleFieldUpdate('employer', v)} className="text-gray-800 mt-1" />
                                </div>
                                <div>
                                    <h4 className="text-sm font-semibold text-gray-500 uppercase tracking-wider">Location</h4>
                                    <EditableField initialValue={editableData.location || ''} onSave={(v) => handleFieldUpdate('location', v)} className="text-gray-800 mt-1" />
                                </div>
                                <div>
                                    <h4 className="text-sm font-semibold text-gray-500 uppercase tracking-wider">Industry</h4>
                                    <EditableField initialValue={editableData.industry || ''} onSave={(v) => handleFieldUpdate('industry', v)} className="text-gray-800 mt-1" />
                                </div>
                                <div>
                                    <h4 className="text-sm font-semibold text-gray-500 uppercase tracking-wider">Function</h4>
                                    <EditableField initialValue={editableData.function || ''} onSave={(v) => handleFieldUpdate('function', v)} className="text-gray-800 mt-1" />
                                </div>
                                <div>
                                    <h4 className="text-sm font-semibold text-gray-500 uppercase tracking-wider">Languages</h4>
                                    <EditableField initialValue={editableData.language || ''} onSave={(v) => handleFieldUpdate('language', v)} className="text-gray-800 mt-1" />
                                </div>
                            </div>
                        </div>

                        {editableData.summary && (
                            <Section title="Summary">
                                <EditableField
                                    initialValue={editableData.summary}
                                    onSave={(val) => handleFieldUpdate('summary', val)}
                                    isTextarea={true}
                                    className="text-gray-600 leading-relaxed"
                                />
                            </Section>
                        )}

                        <div className="bg-black text-white text-center font-bold text-lg py-3 my-8 tracking-widest uppercase">
                            EDUCATION, PROFESSIONAL TRAININGS & CERTIFICATION
                        </div>

                        <div className="grid md:grid-cols-2 gap-8">
                            <Section title="Education">
                                <div className="space-y-4">
                                    {(editableData.education || []).map((edu, index) => (
                                        <div key={index} className="group/row flex items-start justify-between gap-2">
                                            <div className="flex-grow">
                                                <EditableField initialValue={edu.institution} onSave={(v) => handleArrayItemUpdate<Education>('education', index, 'institution', v)} className="font-bold text-gray-800" />
                                                <EditableField initialValue={edu.degree} onSave={(v) => handleArrayItemUpdate<Education>('education', index, 'degree', v)} className="text-gray-600" />
                                                <EditableField initialValue={edu.year} onSave={(v) => handleArrayItemUpdate<Education>('education', index, 'year', v)} className="text-gray-500 text-sm" />
                                            </div>
                                            <button onClick={() => deleteArrayItem('education', index)} className="no-print flex-shrink-0 p-1 text-red-500 hover:bg-red-100 rounded-full opacity-0 group-hover/row:opacity-100 transition-opacity" aria-label="Delete education"><DeleteIcon className="w-4 h-4" /></button>
                                        </div>
                                    ))}
                                </div>
                                <div className="flex justify-center">
                                    <button onClick={() => addArrayItem('education', { institution: 'Institution Name', degree: 'Degree', fieldOfStudy: '', year: 'Year' })} className="no-print mt-4 flex items-center gap-2 px-3 py-1.5 text-xs font-medium text-primary-600 hover:text-primary-800"><AddIcon className="w-4 h-4"/> Add Education</button>
                                </div>
                            </Section>

                            <Section title="Certifications">
                                 <div className="space-y-4">
                                    {(editableData.certifications || []).map((cert, index) => (
                                        <div key={index} className="group/row flex items-start justify-between gap-2">
                                            <div className="flex-grow">
                                                <EditableField initialValue={cert.name} onSave={(v) => handleArrayItemUpdate<Certification>('certifications', index, 'name', v)} className="font-bold text-gray-800" />
                                                <EditableField initialValue={cert.year} onSave={(v) => handleArrayItemUpdate<Certification>('certifications', index, 'year', v)} className="text-gray-500 text-sm" />
                                            </div>
                                            <button onClick={() => deleteArrayItem('certifications', index)} className="no-print flex-shrink-0 p-1 text-red-500 hover:bg-red-100 rounded-full opacity-0 group-hover/row:opacity-100 transition-opacity" aria-label="Delete certification"><DeleteIcon className="w-4 h-4" /></button>
                                        </div>
                                    ))}
                                </div>
                                <div className="flex justify-center">
                                    <button onClick={() => addArrayItem('certifications', { name: 'Certification Name', issuingOrganization: '', year: 'Year' })} className="no-print mt-4 flex items-center gap-2 px-3 py-1.5 text-xs font-medium text-primary-600 hover:text-primary-800"><AddIcon className="w-4 h-4"/> Add Certification</button>
                                </div>
                            </Section>
                        </div>

                        <div className="bg-black text-white text-center font-bold text-lg py-3 my-8 tracking-widest uppercase">
                            FUNCTIONAL EVALUATION FORM
                        </div>

                        <div className="space-y-8 mb-8">
                            {(editableData.functionalEvaluation || []).map((category, catIndex) => (
                                <div key={catIndex}>
                                    <h3 className="text-lg font-semibold text-gray-700 mb-4 uppercase tracking-wider">{category.category}</h3>
                                    <div className="space-y-6">
                                        {(category.questions || []).map((qa, qIndex) => (
                                            <div key={`${catIndex}-${qIndex}`} className="p-4 bg-gray-50 rounded-lg">
                                                <h4 className="font-semibold text-gray-800">{qa.question}</h4>
                                                <div className="mt-2">
                                                    <EditableField
                                                        initialValue={qa.answer}
                                                        onSave={(val) => handleQuestionAnswerUpdate(catIndex, qIndex, val)}
                                                        isTextarea={true}
                                                        className="text-gray-600"
                                                    />
                                                </div>
                                            </div>
                                        ))}
                                    </div>
                                </div>
                            ))}
                        </div>

                        <div className="bg-black text-white text-center font-bold text-lg py-3 my-8 tracking-widest uppercase">
                            PROFESSIONAL EXPERIENCE
                        </div>
                        <div className="space-y-6">
                            {(editableData.professionalExperience || []).map((exp, index) => (
                                <div key={index} className="experience-item relative pl-8 before:absolute before:left-2.5 before:top-2 before:w-2 before:h-2 before:bg-primary-500 before:rounded-full before:ring-4 before:ring-primary-100 after:absolute after:left-4 after:top-4 after:bottom-0 after:w-0.5 after:bg-gray-200 last:after:hidden group/exp">
                                    <div className="flex items-start justify-between gap-2">
                                        <div className="flex-grow">
                                            <EditableField initialValue={exp.position} onSave={(v) => handleArrayItemUpdate<ProfessionalExperience>('professionalExperience', index, 'position', v)} className="text-lg font-semibold text-gray-800" inputClassName="text-lg font-semibold" />
                                            <EditableField initialValue={exp.company} onSave={(v) => handleArrayItemUpdate<ProfessionalExperience>('professionalExperience', index, 'company', v)} className="text-md text-gray-600" inputClassName="text-md"/>
                                            <EditableField initialValue={exp.duration} onSave={(v) => handleArrayItemUpdate<ProfessionalExperience>('professionalExperience', index, 'duration', v)} className="text-sm text-gray-500 mt-1" inputClassName="text-sm"/>
                                            
                                            <ul className="mt-3 text-gray-600 space-y-1 pl-2">
                                                {(exp.details || []).map((detail, i) => (
                                                <li key={i} className="flex items-start gap-2 group/detail">
                                                    <span className="mt-1.5">&#8226;</span>
                                                    <EditableField initialValue={detail} onSave={(v) => handleDetailUpdate(index, i, v)} className="flex-grow" />
                                                    <button onClick={() => deleteDetail(index, i)} className="no-print p-1 text-red-400 hover:bg-red-100 rounded-full opacity-0 group-hover/detail:opacity-100 transition-opacity" aria-label="Delete detail"><DeleteIcon className="w-3 h-3" /></button>
                                                </li>

                                                ))}
                                                <li className="no-print"><button onClick={() => addDetail(index)} className="mt-2 flex items-center gap-1 text-xs text-primary-600 hover:text-primary-800"><AddIcon className="w-3 h-3"/> Add Detail</button></li>
                                            </ul>
                                        </div>
                                        <button onClick={() => deleteArrayItem('professionalExperience', index)} className="no-print flex-shrink-0 p-1 text-red-500 hover:bg-red-100 rounded-full opacity-0 group-hover/exp:opacity-100 transition-opacity" aria-label="Delete experience"><DeleteIcon className="w-4 h-4" /></button>
                                    </div>
                                </div>
                            ))}
                        </div>
                        <button onClick={() => addArrayItem('professionalExperience', { company: 'Company', position: 'Position', duration: 'Date Range', details: ['Responsibility'] })} className="no-print mt-6 flex items-center gap-2 px-3 py-1.5 text-sm font-medium text-primary-600 hover:text-primary-800"><AddIcon className="w-4 h-4"/> Add Experience</button>
                    </div>
                    <ReportFooter />
                </div>
            </div>
        </div>
    );
};