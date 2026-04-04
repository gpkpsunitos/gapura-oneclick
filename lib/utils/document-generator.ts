/**
 * @file
 * Dibuat oleh Claude
 * 
 * File ini berisi fungsi-fungsi untuk generate dokumen PDF dan Word dari data report
 * Digunakan untuk membuat laporan irregularity dalam format PDF dan DOCX
 */

import { saveAs } from 'file-saver';
import { Report } from '@/types';

/**
 * Fungsi helper untuk memformat tanggal ke format Indonesia
 * 
 * @param dateString - String tanggal yang akan diformat (ISO format)
 * @returns String tanggal yang diformat dalam format Indonesia (DD MMM YYYY)
 * @example
 * ```typescript
 * formatDate('2024-01-15') // '15 JAN 2024'
 * ```
 */
const formatDate = (dateString?: string) => {
    if (!dateString) return '-';
    return new Date(dateString).toLocaleDateString('id-ID', {
        day: '2-digit',
        month: 'short',
        year: 'numeric'
    }).toUpperCase();
};

/**
 * Fungsi helper untuk mendapatkan nama bulan dalam format singkat Indonesia
 * 
 * @param date - Objek Date
 * @returns String nama bulan dalam format 3 huruf (JAN, FEB, MAR, dll)
 * @example
 * ```typescript
 * const date = new Date('2024-01-15');
 * getMonthName(date) // 'JAN'
 * ```
 */
const getMonthName = (date: Date) => {
    const months = ['JAN', 'FEB', 'MAR', 'APR', 'MAY', 'JUN', 'JUL', 'AUG', 'SEP', 'OCT', 'NOV', 'DEC'];
    return months[date.getMonth()];
};

/**
 * Fungsi helper untuk menghasilkan nomor referensi laporan
 * Format: CABANG {branch}/LK/       /       / {month}/{year}
 * 
 * @param report - Object data report
 * @returns String nomor referensi
 * @example
 * ```typescript
 * generateRefNo({ branch: 'CGK', date_of_event: '2024-01-15' })
 * // 'CABANG CGK/LK/       /       / JAN/2024'
 * ```
 */
const generateRefNo = (report: Report) => {
    const date = report.date_of_event ? new Date(report.date_of_event) : new Date();
    const branch = report.branch || report.station_code || 'CGK';
    const month = getMonthName(date);
    const year = date.getFullYear();
    
    return `CABANG ${branch}/LK/       /       / ${month}/${year}`;
};

/**
 * Menghasilkan dokumen PDF dari data report
 * PDF berisi formulir laporan irregularity lengkap dengan signature
 * 
 * @param report - Object data report yang akan dijadikan PDF
 * @param signatureDataUrl - Data URL untuk gambar tanda tangan (optional)
 * @returns Promise yang resolve setelah PDF dibuat dan di-download
 * @throws Error jika library jsPDF atau jspdf-autotable gagal di-load
 * @example
 * ```typescript
 * await generatePDF(report, signatureDataUrl);
 * ```
 */
export const generatePDF = async (report: Report, signatureDataUrl?: string | null) => {
    const { default: jsPDF } = await import('jspdf');
    const { default: autoTable } = await import('jspdf-autotable');
    const doc = new jsPDF();
    
    const marginX = 14;
    let currentY = 14;
    const pageWidth = doc.internal.pageSize.getWidth();
    const contentWidth = pageWidth - (marginX * 2);

    // Title Section - Load logo dynamically
    try {
        const logoResponse = await fetch('/logo.png');
        if (logoResponse.ok) {
            const logoBuffer = await logoResponse.arrayBuffer();
            doc.addImage(new Uint8Array(logoBuffer), 'PNG', marginX, currentY, 45, 25);
        }
    } catch (error) {
        console.error("Failed to load logo", error);
    }
    
    doc.setFontSize(14);
    doc.setFont('helvetica', 'bold');
    doc.text('IRREGULARITY REPORT FORM', marginX + 45, currentY + 12);
    
    currentY += 28;

    // Header Table
    autoTable(doc, {
        startY: currentY,
        body: [
            ['REFERENCE NO', ':', generateRefNo(report)],
            ['TO', ':', `SQC ${report.airlines || report.airline || ''} on duty`],
            ['FROM', ':', 'GAPURA OPERATION STAFF'],
            ['CC', ':', 'STATION MANAGER'],
            ['SUBJECT', ':', report.title || 'Irregularity Report'],
            ['ATTACHMENT', ':', report.evidence_urls?.length || report.evidence_url ? `${report.evidence_urls?.length || 1} Files` : '-']
        ],
        theme: 'grid',
        styles: { fontSize: 10, cellPadding: 2, font: 'helvetica', lineColor: [0, 0, 0], lineWidth: 0.5 },
        columnStyles: {
            0: { cellWidth: contentWidth * 0.25, fontStyle: 'bold' },
            1: { cellWidth: contentWidth * 0.05, halign: 'center' },
            2: { cellWidth: contentWidth * 0.70 }
        },
        margin: { left: marginX, right: marginX }
    });

    // @ts-ignore
    currentY = doc.lastAutoTable.finalY + 8;

    // Section I
    doc.setFontSize(10);
    doc.setFont('helvetica', 'bold');
    doc.text('I. FLIGHT DATA', marginX, currentY);
    currentY += 4;

    autoTable(doc, {
        startY: currentY,
        body: [
            ['Date Of Occurrence', ':', formatDate(report.date_of_event || report.created_at)],
            ['Branch', ':', report.branch || report.station_code || '-'],
            ['Flight Number', ':', report.flight_number || '-'],
            ['Aircraft Registration', ':', report.aircraft_reg || '-'],
            ['Route', ':', report.route || '-'],
            ['STD/ATD', ':', '-'],
            ['PAX', ':', '-'],
            ['BGE', ':', '-'],
            ['Gate/Parking Stand', ':', report.location || '-'],
            ['Delay (Code/Duration)', ':', (report.delay_code || report.delay_duration) ? `${report.delay_code || '-'} / ${report.delay_duration || '-'}` : '-']
        ],
        theme: 'grid',
        styles: { fontSize: 10, cellPadding: 2, font: 'helvetica', lineColor: [0, 0, 0], lineWidth: 0.5 },
        columnStyles: {
            0: { cellWidth: contentWidth * 0.40, fontStyle: 'bold' },
            1: { cellWidth: contentWidth * 0.05, halign: 'center' },
            2: { cellWidth: contentWidth * 0.55 }
        },
        margin: { left: marginX, right: marginX }
    });

    // @ts-ignore
    currentY = doc.lastAutoTable.finalY + 8;

    // Section II
    doc.setFontSize(10);
    doc.setFont('helvetica', 'bold');
    doc.text('II. OFFICER(S) ON DUTY', marginX, currentY);
    currentY += 4;

    const officersData = [];
    if (report.reporter_name) {
        officersData.push(['1', report.reporter_name, '', '']);
    }
    for (let i = officersData.length + 1; i <= 10; i++) {
        officersData.push([i.toString(), '', '', '']);
    }

    autoTable(doc, {
        startY: currentY,
        head: [['NO', 'NAME', 'COMPANY', 'FUNCTION']],
        body: officersData,
        theme: 'grid',
        headStyles: { fillColor: [255, 255, 255], textColor: 0, fontStyle: 'bold', lineColor: [0, 0, 0], lineWidth: 0.5 },
        styles: { fontSize: 10, cellPadding: 2, font: 'helvetica', lineColor: [0, 0, 0], lineWidth: 0.5 },
        columnStyles: {
            0: { cellWidth: contentWidth * 0.10, halign: 'center' },
            1: { cellWidth: contentWidth * 0.40 },
            2: { cellWidth: contentWidth * 0.20 },
            3: { cellWidth: contentWidth * 0.30 }
        },
        margin: { left: marginX, right: marginX }
    });

    // @ts-ignore
    currentY = doc.lastAutoTable.finalY + 4;

    // Section III
    doc.setFontSize(10);
    doc.setFont('helvetica', 'bold');
    doc.text('III. CHRONOLOGY OF EVENT', marginX, currentY);
    currentY += 4;

    const chronologyData = [];
    if (report.description) {
        chronologyData.push(['', report.description]);
    }
    for (let i = 0; i < 8; i++) {
        chronologyData.push(['', '']);
    }

    autoTable(doc, {
        startY: currentY,
        head: [['TIME IN LOCAL', 'DESCRIPTION/REMARK']],
        body: chronologyData,
        theme: 'grid',
        headStyles: { fillColor: [255, 255, 255], textColor: 0, fontStyle: 'bold', lineColor: [0, 0, 0], lineWidth: 0.5 },
        styles: { fontSize: 10, cellPadding: 2, minCellHeight: 8, font: 'helvetica', lineColor: [0, 0, 0], lineWidth: 0.5 },
        columnStyles: {
            0: { cellWidth: contentWidth * 0.25, halign: 'center' },
            1: { cellWidth: contentWidth * 0.75 }
        },
        margin: { left: marginX, right: marginX }
    });

    // @ts-ignore
    currentY = doc.lastAutoTable.finalY + 8;

    // Helper for Sections IV and V
    const addBoxSection = (title, content) => {
        // @ts-ignore
        if (currentY > doc.internal.pageSize.getHeight() - 40) {
            doc.addPage();
            currentY = marginX;
        }
        
        doc.setFontSize(10);
        doc.setFont('helvetica', 'bold');
        doc.text(title, marginX, currentY);
        currentY += 4;

        autoTable(doc, {
            startY: currentY,
            body: [[content || '']],
            theme: 'grid',
            styles: { fontSize: 10, cellPadding: 3, minCellHeight: 20, font: 'helvetica', lineColor: [0, 0, 0], lineWidth: 0.5 },
            margin: { left: marginX, right: marginX }
        });
        
        // @ts-ignore
        currentY = doc.lastAutoTable.finalY + 8;
    };

    addBoxSection('IV. POTENTIAL/ROOT CAUSE(S)', report.root_caused || report.root_cause || '');
    addBoxSection('V. CORRECTIVE ACTION(S)', report.action_taken || '');
    addBoxSection('VI. PREVENTIVE ACTION(S)', report.preventive_action || '');

    // Signature Area
    // @ts-ignore
    if (currentY > doc.internal.pageSize.getHeight() - 80) {
        doc.addPage();
        currentY = marginX;
    }

    doc.setLineWidth(0.5);
    doc.rect(marginX, currentY, contentWidth, 50); // Outer box for signatures

    // Inner line for top section
    doc.line(marginX, currentY + 15, marginX + contentWidth, currentY + 15);
    
    // Middle vertical line
    doc.line(marginX + (contentWidth / 2), currentY + 15, marginX + (contentWidth / 2), currentY + 50);

    doc.setFontSize(10);
    
    // Top Section
    doc.setFont('helvetica', 'bold');
    doc.text('Location: ', marginX + 5, currentY + 6);
    doc.setFont('helvetica', 'normal');
    doc.text(report.location || report.branch || '.........................', marginX + 25, currentY + 6);

    doc.setFont('helvetica', 'bold');
    doc.text('Date of Prepared: ', marginX + (contentWidth / 2) + 5, currentY + 6);
    doc.setFont('helvetica', 'normal');
    doc.text(formatDate(report.date_of_event || new Date().toISOString()), marginX + (contentWidth / 2) + 38, currentY + 6);

    // Bottom Left (Prepared by)
    doc.text('Prepared by,', marginX + 5, currentY + 22);
    doc.text('Controller Operation Airside ', marginX + 5, currentY + 30);
    doc.setLineWidth(0.2);
    doc.line(marginX + 45, currentY + 31, marginX + 85, currentY + 31);
    
    if (signatureDataUrl) {
        doc.addImage(signatureDataUrl, 'PNG', marginX + 35, currentY + 32, 30, 10);
    }
    doc.setFont('helvetica', 'bold');
    doc.text('(' + (report.reporter_name || '...................') + ')', marginX + 5, currentY + 45);

    // Bottom Right (Acknowledged by)
    const rightMargin = marginX + (contentWidth / 2) + 5;

    doc.setFont('helvetica', 'normal');
    // For right alignment calculations
    doc.text('Acknowlegde by,', marginX + contentWidth - 5, currentY + 22, { align: 'right' });
    doc.text('Manager of Airside Service', marginX + contentWidth - 5, currentY + 30, { align: 'right' });
    
    doc.setFont('helvetica', 'bold');
    doc.text('( ........................ )', marginX + contentWidth - 5, currentY + 45, { align: 'right' });

    currentY += 55;
    
    doc.setFontSize(8);
    doc.setFont('helvetica', 'normal');
    doc.text('*) Additional Information (if required/if existing)', marginX, currentY);

    currentY += 10;
    doc.setFont('helvetica', 'bold');
    doc.text('F-OP-02', marginX, currentY);

    // Save
    doc.save(`Irregularity_Report_${report.flight_number || 'Ref'}.pdf`);
};

/**
 * Menghasilkan dokumen Word (.docx) dari data report
 * Word berisi formulir laporan irregularity lengkap dengan signature
 * 
 * @param report - Object data report yang akan dijadikan Word
 * @param signatureDataUrl - Data URL untuk gambar tanda tangan (optional)
 * @returns Promise yang resolve setelah Word dibuat dan di-download
 * @throws Error jika library docx gagal di-load
 * @example
 * ```typescript
 * await generateWord(report, signatureDataUrl);
 * ```
 */
export const generateWord = async (report: Report, signatureDataUrl?: string | null) => {
    const { Document, Packer, Paragraph, Table, TableRow, TableCell, TextRun, WidthType, HeadingLevel, AlignmentType, BorderStyle, ImageRun } = await import('docx');
    const refNo = generateRefNo(report);
    
    const createBoldText = (text: string) => new TextRun({ text, bold: true });

    // Custom function to create a cell with consistent margins
    const createTextCell = (text: string, isBold: boolean = false, options: any = {}) => {
        return new TableCell({
            children: [new Paragraph({
                children: isBold ? [createBoldText(text)] : [new TextRun(text)],
                spacing: { before: 40, after: 40 },
                alignment: options.alignment || AlignmentType.LEFT
            })],
            margins: { top: 50, bottom: 50, left: 100, right: 100 },
            ...options
        });
    };
    
    // Title Section
    const titleSection = [];

    try {
        const imageResponse = await fetch('/logo.png');
        if (imageResponse.ok) {
            const imageBuffer = await imageResponse.arrayBuffer();
            titleSection.push(
                new Paragraph({
                    children: [
                        new ImageRun({
                            data: imageBuffer,
                            transformation: {
                                width: 140,
                                height: 79,
                            },
                            type: 'png'
                        })
                    ],
                    alignment: AlignmentType.LEFT,
                    spacing: { after: 200 }
                })
            );
        }
    } catch (error) {
        console.error("Failed to load logo", error);
    }

    titleSection.push(
        new Paragraph({
            children: [createBoldText('IRREGULARITY REPORT FORM')],
            alignment: AlignmentType.CENTER,
            heading: HeadingLevel.HEADING_2,
            spacing: { after: 100 }
        })
    );

    // --- Header Table ---
    const headerTable = new Table({
        width: { size: 100, type: WidthType.PERCENTAGE },
        rows: [
            new TableRow({
                children: [
                    createTextCell("REFERENCE NO", true, { width: { size: 25, type: WidthType.PERCENTAGE } }),
                    createTextCell(refNo, false, { width: { size: 75, type: WidthType.PERCENTAGE } }),
                ]
            }),
            new TableRow({
                children: [
                    createTextCell("TO", true),
                    createTextCell(`SQC ${report.airlines || report.airline || ''} on duty`),
                ]
            }),
            new TableRow({
                children: [
                    createTextCell("FROM", true),
                    createTextCell("GAPURA OPERATION STAFF"),
                ]
            }),
            new TableRow({
                children: [
                    createTextCell("CC", true),
                    createTextCell(""),
                ]
            }),
            new TableRow({
                children: [
                    createTextCell("SUBJECT", true),
                    createTextCell(report.title || ""),
                ]
            }),
            new TableRow({
                children: [
                    createTextCell("ATTACHMENT", true),
                    createTextCell((report.evidence_urls?.length || (report.evidence_url ? 1 : 0)) ? `${report.evidence_urls?.length || (report.evidence_url ? 1 : 0)} Files` : ""),
                ]
            }),
        ],
    });

    const sectionI = [
        new Paragraph({ text: "" }),
        new Paragraph({
            children: [createBoldText('I. FLIGHT DATA')],
            spacing: { before: 100, after: 100 }
        })
    ];

    const flightDataRows = [
        ['Date Of Occurrence', formatDate(report.date_of_event || report.created_at)],
        ['Branch', report.branch || report.station_code || '-'],
        ['Flight Number', report.flight_number || '-'],
        ['Aircraft Registration', report.aircraft_reg || '-'],
        ['Route', report.route || '-'],
        ['STD/ATD', ''],
        ['PAX', ''],
        ['BGE', ''],
        ['Gate/Parking Stand', report.location || '-'],
        ['Delay (Code/Duration)*', (report.delay_code || report.delay_duration) ? `${report.delay_code || '-'} / ${report.delay_duration || '-'}` : '-']
    ];

    const flightTable = new Table({
        width: { size: 100, type: WidthType.PERCENTAGE },
        rows: flightDataRows.map(([label, value]) => 
            new TableRow({
                children: [
                    createTextCell(label, false, { width: { size: 30, type: WidthType.PERCENTAGE } }),
                    createTextCell(value, false, { width: { size: 70, type: WidthType.PERCENTAGE } }),
                ]
            })
        )
    });

    const sectionII = [
        new Paragraph({ text: "" }),
        new Paragraph({
            children: [createBoldText('II. OFFICER(S) ON DUTY')],
            spacing: { before: 100, after: 100 }
        })
    ];

    const officerRows = [];
    officerRows.push(new TableRow({
        children: [
            createTextCell("NO", true, { width: { size: 10, type: WidthType.PERCENTAGE }, alignment: AlignmentType.CENTER }),
            createTextCell("NAME", true, { width: { size: 30, type: WidthType.PERCENTAGE }, alignment: AlignmentType.CENTER }),
            createTextCell("COMPANY", true, { width: { size: 30, type: WidthType.PERCENTAGE }, alignment: AlignmentType.CENTER }),
            createTextCell("FUNCTION", true, { width: { size: 30, type: WidthType.PERCENTAGE }, alignment: AlignmentType.CENTER }),
        ]
    }));

    officerRows.push(new TableRow({
        children: [
            createTextCell("1", false, { alignment: AlignmentType.CENTER }),
            createTextCell(report.reporter_name || "-"),
            createTextCell("..................."),
            createTextCell("..................."),
        ]
    }));

    for (let i = 2; i <= 10; i++) {
        officerRows.push(new TableRow({
            children: [
                 createTextCell(`${i}`, false, { alignment: AlignmentType.CENTER }),
                 createTextCell(""),
                 createTextCell("..................."),
                 createTextCell(""),
            ]
        }));
    }

    const officersTable = new Table({
        width: { size: 100, type: WidthType.PERCENTAGE },
        rows: officerRows
    });

    const noteSectionII = [
        new Paragraph({
            children: [new TextRun({ text: "*) Additional Information (if required/if existing)", size: 18 })],
            spacing: { before: 50, after: 200 }
        })
    ];

    const sectionIII = [
        new Paragraph({ text: "" }),
        new Paragraph({
            children: [createBoldText('III. CHRONOLOGY OF EVENT')],
            spacing: { before: 100, after: 100 }
        })
    ];

    const chronologyRows = [];
    chronologyRows.push(new TableRow({
        children: [
            createTextCell("TIME IN LOCAL", true, { width: { size: 25, type: WidthType.PERCENTAGE }, alignment: AlignmentType.CENTER }),
            createTextCell("DESCRIPTION/REMARK", true, { width: { size: 75, type: WidthType.PERCENTAGE }, alignment: AlignmentType.CENTER }),
        ]
    }));
    
    chronologyRows.push(new TableRow({
        children: [
            createTextCell(""),
            createTextCell(report.description || ""), 
        ]
    }));

    for (let i=0; i<8; i++) {
        chronologyRows.push(new TableRow({
            children: [
                createTextCell(""),
                createTextCell(""),
            ]
        }));
    }

    const chronologyTable = new Table({
         width: { size: 100, type: WidthType.PERCENTAGE },
         rows: chronologyRows
    });

    const sectionIV = [
        new Paragraph({ text: "" }),
        new Paragraph({
            children: [createBoldText('IV. POTENTIAL/ROOT CAUSE(S)')],
            spacing: { before: 100, after: 100 }
        })
    ];

    const rootCauseTable = new Table({
        width: { size: 100, type: WidthType.PERCENTAGE },
        rows: [
            new TableRow({
                children: [
                    createTextCell(report.root_caused || report.root_cause || "\n\n", false)
                ]
            })
        ]
    });

    const sectionV = [
        new Paragraph({ text: "" }),
        new Paragraph({
            children: [createBoldText('V. CORRECTIVE ACTION(S)')],
            spacing: { before: 100, after: 100 }
        })
    ];

    const correctiveActionTable = new Table({
        width: { size: 100, type: WidthType.PERCENTAGE },
        rows: [
            new TableRow({
                children: [
                   new TableCell({
                        children: [
                            new Paragraph({
                                children: [new TextRun({ text: report.action_taken ? `1. ${report.action_taken}` : "\n\n" })],
                                spacing: { before: 40, after: 40 }
                            })
                        ],
                        margins: { top: 50, bottom: 50, left: 100, right: 100 }
                    })
                ]
            })
        ]
    });

    const sectionVI = [
        new Paragraph({ text: "" }),
        new Paragraph({
            children: [createBoldText('VI. PREVENTIVE ACTION(S)')],
            spacing: { before: 100, after: 100 }
        })
    ];

    const preventiveActionTable = new Table({
        width: { size: 100, type: WidthType.PERCENTAGE },
        rows: [
            new TableRow({
                children: [
                   new TableCell({
                        children: [
                            new Paragraph({
                                children: [new TextRun({ text: report.preventive_action ? `1. ${report.preventive_action}` : "\n\n" })],
                                spacing: { before: 40, after: 40 }
                            })
                        ],
                        margins: { top: 50, bottom: 50, left: 100, right: 100 }
                    })
                ]
            })
        ]
    });

    let signatureRun: InstanceType<typeof ImageRun> | undefined = undefined;
    if (signatureDataUrl) {
        try {
            const base64Data = signatureDataUrl.split(',')[1];
            const binaryString = atob(base64Data);
            const bytes = new Uint8Array(binaryString.length);
            for (let i = 0; i < binaryString.length; i++) {
                bytes[i] = binaryString.charCodeAt(i);
            }
            signatureRun = new ImageRun({
                data: bytes,
                transformation: {
                    width: 140,
                    height: 50,
                },
                type: 'png'
            });
        } catch(e) {
            console.error("Failed to parse signature image", e);
        }
    }

    const signatureTable = new Table({
        width: { size: 100, type: WidthType.PERCENTAGE },
        rows: [
            new TableRow({
                children: [
                    new TableCell({
                        children: [
                            new Paragraph({
                                children: [
                                    new TextRun({ text: "Location: ", bold: true, font: "Arial", size: 24 }),
                                    new TextRun({ text: report.location || report.branch || '.........................', font: "Arial", size: 24 })
                                ],
                                spacing: { after: 100 }
                            }),
                            new Paragraph({
                                children: [
                                    new TextRun({ text: "Date of Prepared: ", bold: true, font: "Arial", size: 24 }),
                                    new TextRun({ text: formatDate(report.date_of_event || new Date().toISOString()), font: "Arial", size: 24 })
                                ],
                                spacing: { after: 200 }
                            }),
                        ],
                        columnSpan: 2,
                        borders: { top: { style: BorderStyle.SINGLE, size: 4 }, bottom: { style: BorderStyle.NONE, size: 4 }, left: { style: BorderStyle.SINGLE, size: 4 }, right: { style: BorderStyle.SINGLE, size: 4 } },
                        margins: { top: 50, bottom: 50, left: 100, right: 100 }
                    })
                ]
            }),
            new TableRow({
                children: [
                    new TableCell({
                        children: [
                            new Paragraph({ text: "Prepared by,", spacing: { after: 50 }, alignment: AlignmentType.CENTER }),
                            new Paragraph({
                                children: [
                                    new TextRun({ text: "Controller Operation Airside", font: "Arial", size: 24 }),
                                ],
                                alignment: AlignmentType.CENTER
                            }),
                            new Paragraph({
                                children: signatureRun ? [signatureRun] : [],
                                spacing: signatureRun ? { before: 10, after: 10 } : { before: 500, after: 100 },
                                alignment: AlignmentType.CENTER
                            }),
                            new Paragraph({
                                children: [
                                    new TextRun({ text: "(  ", bold: true, font: "Arial", size: 24 }),
                                    new TextRun({ text: `${report.reporter_name || '...................' }`, bold: true, underline: { type: "single" }, font: "Arial", size: 24 }),
                                    new TextRun({ text: "  )", bold: true, font: "Arial", size: 24 }),
                                ],
                                alignment: AlignmentType.CENTER
                            }),
                        ],
                        width: { size: 50, type: WidthType.PERCENTAGE },
                        borders: { top: { style: BorderStyle.NONE, size: 4 }, bottom: { style: BorderStyle.SINGLE, size: 4 }, left: { style: BorderStyle.SINGLE, size: 4 }, right: { style: BorderStyle.NONE, size: 4 } },
                        margins: { top: 100, bottom: 100, left: 100, right: 100 }
                    }),
                    new TableCell({
                        children: [
                            new Paragraph({ text: "Acknowledge by,", spacing: { after: 50 }, alignment: AlignmentType.CENTER }),
                            new Paragraph({
                                children: [
                                    new TextRun({ text: "Manager of Airside Service", font: "Arial", size: 24 })
                                ],
                                alignment: AlignmentType.CENTER
                            }),
                            new Paragraph({ text: "", spacing: { before: 500, after: 100 } }),
                            new Paragraph({
                                children: [
                                    new TextRun({ text: "( ", bold: true, font: "Arial", size: 24 }),
                                    new TextRun({ text: " ........................ ", bold: true, underline: { type: "single" }, font: "Arial", size: 24 }),
                                    new TextRun({ text: " )", bold: true, font: "Arial", size: 24 }),
                                ],
                                alignment: AlignmentType.CENTER
                            }),
                        ],
                        width: { size: 50, type: WidthType.PERCENTAGE },
                        borders: { top: { style: BorderStyle.NONE, size: 4 }, bottom: { style: BorderStyle.SINGLE, size: 4 }, left: { style: BorderStyle.NONE, size: 4 }, right: { style: BorderStyle.SINGLE, size: 4 } },
                        margins: { top: 100, bottom: 100, left: 100, right: 100 }
                    })
                ]
            })
        ],
    });

    const doc = new Document({
        styles: {
            default: {
                document: {
                    run: {
                        size: 24,
                        font: "Arial"
                    },
                    paragraph: {
                        spacing: {
                            line: 240,
                            lineRule: "auto"
                        }
                    }
                }
            }
        },
        sections: [{
            properties: {
                page: {
                    margin: {
                        top: 720,
                        right: 720,
                        bottom: 720,
                        left: 720,
                        header: 720,
                        footer: 720,
                    }
                }
            },
            children: [
                ...titleSection,
                headerTable,
                ...sectionI,
                flightTable,
                ...sectionII,
                officersTable,
                ...noteSectionII,
                ...sectionIII,
                chronologyTable,
                ...sectionIV,
                rootCauseTable,
                ...sectionV,
                correctiveActionTable,
                ...sectionVI,
                preventiveActionTable,
                new Paragraph({ text: "", spacing: { before: 200, after: 200 } }),
                signatureTable,
                new Paragraph({ 
                    children: [new TextRun({ text: "*) Additional Information (if required/if existing)", font: "Arial", size: 20 })],
                    spacing: { before: 100 }
                }),
                new Paragraph({ 
                    children: [new TextRun({ text: "F-OP-02", font: "Arial", size: 20, bold: true })],
                    spacing: { before: 800 } 
                })
            ],
        }],
    });

    const blob = await Packer.toBlob(doc);
    saveAs(blob, `Irregularity_Report_${report.flight_number || 'Ref'}.docx`);
};
