import { useEffect, useState, useCallback } from 'react';
import { useParams, useSearchParams, useNavigate } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import useApi from '../../hooks/useApi';
import {
  HiOutlineArrowLeft, HiOutlineDocumentDownload, HiOutlinePrinter,
  HiOutlineAcademicCap, HiOutlineStar,
} from 'react-icons/hi';
import toast from 'react-hot-toast';
import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';

const TERMS = ['Term 1', 'Term 2', 'Term 3'];

const gradeColor = (grade) => {
  if (!grade) return '';
  if (['D1', 'D2'].includes(grade)) return 'bg-emerald-100 text-emerald-700 border border-emerald-200';
  if (['C3', 'C4', 'C5', 'C6'].includes(grade)) return 'bg-blue-100 text-blue-700 border border-blue-200';
  if (['P7', 'P8'].includes(grade)) return 'bg-amber-100 text-amber-700 border border-amber-200';
  return 'bg-red-100 text-red-700 border border-red-200';
};

const gradeRemark = (grade) => {
  const map = { D1: 'Excellent', D2: 'Very Good', C3: 'Good', C4: 'Good', C5: 'Average', C6: 'Average', P7: 'Below Average', P8: 'Poor', F9: 'Fail' };
  return map[grade] || '';
};

const scoreBarColor = (score) => {
  if (score >= 80) return 'bg-emerald-500';
  if (score >= 60) return 'bg-blue-500';
  if (score >= 40) return 'bg-amber-500';
  return 'bg-red-500';
};

const overallGrade = (avg) => {
  if (avg >= 80) return { label: 'Distinction', color: 'text-emerald-600', bg: 'bg-emerald-50 border-emerald-200' };
  if (avg >= 60) return { label: 'Credit', color: 'text-blue-600', bg: 'bg-blue-50 border-blue-200' };
  if (avg >= 40) return { label: 'Pass', color: 'text-amber-600', bg: 'bg-amber-50 border-amber-200' };
  return { label: 'Needs Improvement', color: 'text-red-600', bg: 'bg-red-50 border-red-200' };
};

const API_BASE = import.meta.env.VITE_API_BASE_URL || (import.meta.env.DEV ? 'http://localhost:5000' : '');

/** Load an image URL as a data URL for embedding in PDF */
const loadImageAsDataUrl = async (url) => {
  if (!url) return null;
  try {
    const img = new Image();
    img.crossOrigin = 'anonymous';
    await new Promise((resolve, reject) => { img.onload = resolve; img.onerror = reject; img.src = url; });
    const canvas = document.createElement('canvas');
    canvas.width = img.naturalWidth;
    canvas.height = img.naturalHeight;
    canvas.getContext('2d').drawImage(img, 0, 0);
    return { dataUrl: canvas.toDataURL('image/png'), width: img.naturalWidth, height: img.naturalHeight };
  } catch { return null; }
};

const ReportCardPage = () => {
  const { pupilId } = useParams();
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const { user } = useAuth();
  const { get } = useApi();

  const [reportData, setReportData] = useState(null);
  const [term, setTerm] = useState(searchParams.get('term') || 'Term 1');
  const [year, setYear] = useState(searchParams.get('academic_year') || new Date().getFullYear().toString());
  const [generating, setGenerating] = useState(false);

  const fetchReport = useCallback(async () => {
    try {
      const params = {};
      if (term) params.term = term;
      if (year) params.academic_year = year;
      const res = await get(`/assessments/pupil/${pupilId}/report`, params);
      setReportData(res.data);
    } catch { /* handled */ }
  }, [get, pupilId, term, year]);

  useEffect(() => { fetchReport(); }, [fetchReport]);

  const handlePrint = () => window.print();

  const handleDownloadPDF = async () => {
    if (!reportData) return;
    setGenerating(true);
    try {
      const { pupil, assessments, summary } = reportData;
      const doc = new jsPDF();
      const pageWidth = doc.internal.pageSize.getWidth();
      const pageHeight = doc.internal.pageSize.getHeight();
      const schoolName = user?.school_name || 'School Manager';
      const isPremium = ['standard', 'pro'].includes(user?.plan_type);

      // ── Load school badge/logo ──
      let logo = null;
      if (user?.school_badge_url) {
        logo = await loadImageAsDataUrl(`${API_BASE}${user.school_badge_url}`);
      }

      // ── Decorative top bar ──
      doc.setFillColor(30, 58, 95);
      doc.rect(0, 0, pageWidth, 6, 'F');
      doc.setFillColor(240, 173, 78);
      doc.rect(0, 6, pageWidth, 2, 'F');

      let y = 14;

      // ── School badge/logo ──
      if (logo) {
        const maxH = 18;
        const ratio = logo.width / logo.height;
        const w = Math.min(maxH * ratio, 28);
        doc.addImage(logo.dataUrl, 'PNG', (pageWidth - w) / 2, y, w, maxH);
        y += maxH + 4;
      }

      // ── School name ──
      doc.setFontSize(20);
      doc.setFont('helvetica', 'bold');
      doc.setTextColor(30, 58, 95);
      doc.text(schoolName.toUpperCase(), pageWidth / 2, y + 5, { align: 'center' });
      y += 12;

      // ── Motto / subtitle ──
      doc.setFontSize(10);
      doc.setFont('helvetica', 'normal');
      doc.setTextColor(120);
      doc.text('STUDENT REPORT CARD', pageWidth / 2, y, { align: 'center' });
      y += 4;

      // ── Divider ──
      doc.setDrawColor(30, 58, 95);
      doc.setLineWidth(0.5);
      doc.line(30, y, pageWidth - 30, y);
      y += 6;

      // ── Pupil info box ──
      doc.setFillColor(245, 247, 250);
      doc.setDrawColor(220);
      doc.roundedRect(14, y, pageWidth - 28, 28, 3, 3, 'FD');

      doc.setFontSize(9);
      doc.setFont('helvetica', 'bold');
      doc.setTextColor(100);
      const col1 = 20, col2 = 80, col3 = 120, col4 = 165;
      const row1 = y + 8, row2 = y + 17;

      doc.text('NAME:', col1, row1);
      doc.text('CLASS:', col2, row1);
      doc.text('TERM:', col3, row1);
      doc.text('YEAR:', col4, row1);

      doc.setFont('helvetica', 'normal');
      doc.setTextColor(30);
      doc.text(`${pupil.first_name} ${pupil.last_name}`, col1, row1 + 5);
      doc.text(pupil.class_name || 'N/A', col2, row1 + 5);
      doc.text(term || 'All', col3, row1 + 5);
      doc.text(year || 'All', col4, row1 + 5);

      if (pupil.admission_number) {
        doc.setFont('helvetica', 'bold'); doc.setTextColor(100);
        doc.text('ADM. NO:', col1, row2 + 3);
        doc.setFont('helvetica', 'normal'); doc.setTextColor(30);
        doc.text(pupil.admission_number, col1 + 25, row2 + 3);
      }
      if (pupil.gender) {
        doc.setFont('helvetica', 'bold'); doc.setTextColor(100);
        doc.text('GENDER:', col2, row2 + 3);
        doc.setFont('helvetica', 'normal'); doc.setTextColor(30);
        doc.text(pupil.gender, col2 + 22, row2 + 3);
      }

      y += 34;

      // ── Grades table ──
      const tableData = assessments.map((a, i) => [
        i + 1,
        a.subject_name,
        a.score,
        a.grade || '—',
        gradeRemark(a.grade),
        a.remarks || '',
      ]);

      // Totals row
      tableData.push([
        '',
        'TOTAL / AVERAGE',
        summary.total_score,
        '',
        `Avg: ${summary.average_score}%`,
        `${summary.total_subjects} subject${summary.total_subjects !== 1 ? 's' : ''}`,
      ]);

      autoTable(doc, {
        startY: y,
        head: [['#', 'Subject', 'Score', 'Grade', 'Remark', 'Comments']],
        body: tableData,
        theme: 'grid',
        headStyles: {
          fillColor: [30, 58, 95],
          textColor: [255, 255, 255],
          fontSize: 9,
          fontStyle: 'bold',
          halign: 'center',
        },
        bodyStyles: { fontSize: 9, textColor: [40, 40, 40] },
        alternateRowStyles: { fillColor: [248, 250, 252] },
        columnStyles: {
          0: { cellWidth: 10, halign: 'center' },
          1: { fontStyle: 'bold' },
          2: { halign: 'center', cellWidth: 18 },
          3: { halign: 'center', cellWidth: 18 },
        },
        didParseCell(data) {
          // Bold & shade the totals row
          if (data.row.index === tableData.length - 1) {
            data.cell.styles.fontStyle = 'bold';
            data.cell.styles.fillColor = [30, 58, 95];
            data.cell.styles.textColor = [255, 255, 255];
          }
          // Color-code grades
          if (data.section === 'body' && data.column.index === 3 && data.row.index < tableData.length - 1) {
            const grade = data.cell.raw;
            if (['D1', 'D2'].includes(grade)) data.cell.styles.textColor = [5, 150, 105];
            else if (['C3', 'C4', 'C5', 'C6'].includes(grade)) data.cell.styles.textColor = [37, 99, 235];
            else if (['P7', 'P8'].includes(grade)) data.cell.styles.textColor = [217, 119, 6];
            else if (grade === 'F9') data.cell.styles.textColor = [220, 38, 38];
          }
        },
        margin: { left: 14, right: 14 },
      });

      // ── Summary section ──
      const finalY = doc.lastAutoTable?.finalY ? doc.lastAutoTable.finalY + 10 : y + 80;

      // Summary boxes
      const boxW = (pageWidth - 28 - 16) / 3;
      const boxes = [
        { label: 'Average Score', value: `${summary.average_score}%`, color: [30, 58, 95] },
        { label: 'Total Score', value: `${summary.total_score}`, color: [5, 150, 105] },
        { label: 'Subjects', value: `${summary.total_subjects}`, color: [217, 119, 6] },
      ];

      boxes.forEach((box, i) => {
        const bx = 14 + i * (boxW + 8);
        doc.setFillColor(...box.color);
        doc.roundedRect(bx, finalY, boxW, 18, 2, 2, 'F');
        doc.setFontSize(7);
        doc.setFont('helvetica', 'normal');
        doc.setTextColor(255);
        doc.text(box.label.toUpperCase(), bx + boxW / 2, finalY + 6, { align: 'center' });
        doc.setFontSize(14);
        doc.setFont('helvetica', 'bold');
        doc.text(box.value, bx + boxW / 2, finalY + 14, { align: 'center' });
      });

      // ── Teacher comments section ──
      const commY = finalY + 28;
      doc.setFontSize(9);
      doc.setFont('helvetica', 'bold');
      doc.setTextColor(30, 58, 95);
      doc.text("CLASS TEACHER'S COMMENT:", 14, commY);
      doc.setDrawColor(200);
      doc.line(14, commY + 8, pageWidth / 2 - 5, commY + 8);

      doc.text("HEAD TEACHER'S COMMENT:", pageWidth / 2 + 5, commY);
      doc.line(pageWidth / 2 + 5, commY + 8, pageWidth - 14, commY + 8);

      // ── Signatures ──
      const sigY = commY + 22;
      doc.setDrawColor(150);
      doc.setLineWidth(0.3);
      doc.line(14, sigY, 80, sigY);
      doc.setFontSize(8);
      doc.setFont('helvetica', 'normal');
      doc.setTextColor(120);
      doc.text("Class Teacher's Signature & Stamp", 14, sigY + 5);

      doc.line(pageWidth / 2 + 5, sigY, pageWidth - 14, sigY);
      doc.text("Head Teacher's Signature & Stamp", pageWidth / 2 + 5, sigY + 5);

      // ── Decorative bottom bar ──
      doc.setFillColor(240, 173, 78);
      doc.rect(0, pageHeight - 8, pageWidth, 2, 'F');
      doc.setFillColor(30, 58, 95);
      doc.rect(0, pageHeight - 6, pageWidth, 6, 'F');

      // ── Branded footer ──
      doc.setFontSize(7);
      doc.setFont('helvetica', 'italic');
      doc.setTextColor(255);
      const brandText = isPremium
        ? `Generated by ${schoolName} digital system on ${new Date().toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' })}`
        : `Generated by School Manager \u00A9 ${new Date().getFullYear()}`;
      doc.text(brandText, pageWidth / 2, pageHeight - 9, { align: 'center' });

      // Save
      const filename = `Report_Card_${pupil.first_name}_${pupil.last_name}_${term}_${year}.pdf`;
      doc.save(filename.replace(/\s+/g, '_'));
      toast.success('Report card PDF downloaded!');
    } catch {
      toast.error('Failed to generate PDF. Please try again.');
    } finally {
      setGenerating(false);
    }
  };

  if (!reportData) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-10 w-10 border-b-2 border-primary-500" />
      </div>
    );
  }

  const { pupil, assessments, summary } = reportData;
  const overall = overallGrade(summary.average_score);

  return (
    <div className="space-y-5 max-w-4xl mx-auto">
      {/* Header bar */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 print:hidden">
        <div className="flex items-center gap-3">
          <button onClick={() => navigate(-1)} className="p-2 rounded-lg hover:bg-gray-100 transition">
            <HiOutlineArrowLeft className="w-5 h-5 text-gray-500" />
          </button>
          <div>
            <h1 className="text-2xl font-bold text-gray-800">Report Card</h1>
            <p className="text-sm text-gray-500">{pupil.first_name} {pupil.last_name} — {pupil.class_name || 'No class'}</p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <button onClick={handlePrint} className="btn-secondary flex items-center gap-2 text-sm">
            <HiOutlinePrinter className="w-4 h-4" /> Print
          </button>
          <button onClick={handleDownloadPDF} disabled={generating} className="btn-primary flex items-center gap-2 text-sm">
            {generating ? (
              <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
            ) : (
              <HiOutlineDocumentDownload className="w-4 h-4" />
            )}
            {generating ? 'Generating…' : 'Download PDF'}
          </button>
        </div>
      </div>

      {/* Term/Year selector */}
      <div className="flex flex-wrap items-center gap-3 print:hidden">
        <select value={term} onChange={(e) => setTerm(e.target.value)} className="input-field text-sm w-auto">
          <option value="">All Terms</option>
          {TERMS.map((t) => <option key={t} value={t}>{t}</option>)}
        </select>
        <input
          value={year}
          onChange={(e) => setYear(e.target.value)}
          className="input-field text-sm w-28"
          placeholder="Year"
        />
      </div>

      {/* ═══════ Report Card ═══════ */}
      <div className="bg-white rounded-2xl shadow-lg border border-gray-100 overflow-hidden" id="report-card">
        {/* Top accent bar */}
        <div className="h-2 bg-gradient-to-r from-primary-600 via-primary-500 to-accent-400" />

        {/* School header */}
        <div className="text-center pt-8 pb-6 px-6 bg-gradient-to-b from-gray-50 to-white">
          <div className="flex items-center justify-center mb-4">
            {user?.school_badge_url ? (
              <img
                src={`${API_BASE}${user.school_badge_url}`}
                alt="School Badge"
                className="w-20 h-20 rounded-full object-cover border-4 border-white shadow-lg"
              />
            ) : (
              <div className="w-20 h-20 bg-gradient-to-br from-primary-500 to-primary-600 rounded-full flex items-center justify-center shadow-lg">
                <HiOutlineAcademicCap className="w-10 h-10 text-white" />
              </div>
            )}
          </div>
          <h2 className="text-2xl font-bold text-gray-800 tracking-wide">{user?.school_name || 'School Manager'}</h2>
          <div className="flex items-center justify-center gap-2 mt-2">
            <div className="w-8 h-px bg-primary-300" />
            <p className="text-xs font-semibold text-primary-600 uppercase tracking-widest">Student Report Card</p>
            <div className="w-8 h-px bg-primary-300" />
          </div>
        </div>

        <div className="px-6 pb-8">
          {/* Pupil info cards */}
          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3 mb-8">
            {[
              { label: 'Student Name', value: `${pupil.first_name} ${pupil.last_name}`, span: 'sm:col-span-2' },
              { label: 'Class', value: pupil.class_name || '—' },
              { label: 'Term', value: term || 'All' },
              { label: 'Academic Year', value: year || 'All' },
              ...(pupil.admission_number ? [{ label: 'Adm. No.', value: pupil.admission_number }] : []),
              ...(pupil.gender ? [{ label: 'Gender', value: pupil.gender }] : []),
            ].map((item, i) => (
              <div key={i} className={`bg-gray-50 rounded-xl p-3 border border-gray-100 ${item.span || ''}`}>
                <p className="text-[10px] text-gray-400 uppercase font-semibold tracking-wider">{item.label}</p>
                <p className="font-bold text-gray-800 text-sm mt-0.5">{item.value}</p>
              </div>
            ))}
          </div>

          {/* Grades table */}
          {assessments.length > 0 ? (
            <>
              <div className="overflow-x-auto rounded-xl border border-gray-200">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="bg-gradient-to-r from-primary-600 to-primary-700 text-white">
                      <th className="text-center p-3 w-10 font-semibold text-xs">#</th>
                      <th className="text-left p-3 font-semibold text-xs uppercase tracking-wider">Subject</th>
                      <th className="text-center p-3 w-24 font-semibold text-xs uppercase tracking-wider">Score</th>
                      <th className="text-center p-3 w-20 font-semibold text-xs uppercase tracking-wider">Grade</th>
                      <th className="text-left p-3 font-semibold text-xs uppercase tracking-wider">Remark</th>
                      <th className="text-left p-3 font-semibold text-xs uppercase tracking-wider hidden sm:table-cell">Comments</th>
                    </tr>
                  </thead>
                  <tbody>
                    {assessments.map((a, i) => (
                      <tr key={a.id} className={`border-b border-gray-100 ${i % 2 === 0 ? 'bg-white' : 'bg-gray-50/50'} hover:bg-blue-50/30 transition`}>
                        <td className="p-3 text-center text-gray-400 text-xs">{i + 1}</td>
                        <td className="p-3 font-semibold text-gray-800">{a.subject_name}</td>
                        <td className="p-3 text-center">
                          <div className="flex items-center justify-center gap-2">
                            <div className="w-12 bg-gray-200 rounded-full h-1.5 hidden sm:block">
                              <div className={`h-1.5 rounded-full ${scoreBarColor(parseFloat(a.score))}`} style={{ width: `${a.score}%` }} />
                            </div>
                            <span className="font-bold text-gray-800">{a.score}</span>
                          </div>
                        </td>
                        <td className="p-3 text-center">
                          <span className={`px-2.5 py-1 rounded-full text-xs font-bold ${gradeColor(a.grade)}`}>{a.grade}</span>
                        </td>
                        <td className="p-3 text-gray-600 text-xs font-medium">{gradeRemark(a.grade)}</td>
                        <td className="p-3 text-gray-400 text-xs hidden sm:table-cell">{a.remarks || '—'}</td>
                      </tr>
                    ))}
                    {/* Summary row */}
                    <tr className="bg-gradient-to-r from-primary-600 to-primary-700 text-white font-bold">
                      <td className="p-3"></td>
                      <td className="p-3 text-sm">TOTAL / AVERAGE</td>
                      <td className="p-3 text-center text-sm">{summary.total_score}</td>
                      <td className="p-3 text-center text-sm">{summary.average_score}%</td>
                      <td className="p-3 text-xs">{summary.total_subjects} subject{summary.total_subjects !== 1 ? 's' : ''}</td>
                      <td className="p-3 hidden sm:table-cell"></td>
                    </tr>
                  </tbody>
                </table>
              </div>

              {/* Summary cards */}
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 mt-8">
                <div className={`rounded-xl p-5 text-center border ${overall.bg}`}>
                  <HiOutlineStar className={`w-8 h-8 mx-auto mb-2 ${overall.color}`} />
                  <p className="text-[10px] text-gray-500 uppercase font-semibold tracking-wider">Overall</p>
                  <p className={`text-lg font-bold mt-1 ${overall.color}`}>{overall.label}</p>
                </div>
                <div className="bg-gradient-to-br from-primary-500 to-primary-600 rounded-xl p-5 text-center text-white shadow-md">
                  <p className="text-[10px] uppercase font-semibold tracking-wider text-white/70">Average</p>
                  <p className="text-3xl font-bold mt-1">{summary.average_score}%</p>
                </div>
                <div className="bg-gradient-to-br from-emerald-500 to-emerald-600 rounded-xl p-5 text-center text-white shadow-md">
                  <p className="text-[10px] uppercase font-semibold tracking-wider text-white/70">Total Score</p>
                  <p className="text-3xl font-bold mt-1">{summary.total_score}</p>
                </div>
                <div className="bg-gradient-to-br from-amber-500 to-amber-600 rounded-xl p-5 text-center text-white shadow-md">
                  <p className="text-[10px] uppercase font-semibold tracking-wider text-white/70">Subjects</p>
                  <p className="text-3xl font-bold mt-1">{summary.total_subjects}</p>
                </div>
              </div>

              {/* Comments section */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-6 mt-8">
                <div className="border border-gray-200 rounded-xl p-4">
                  <p className="text-xs font-bold text-primary-600 uppercase tracking-wider mb-3">Class Teacher's Comment</p>
                  <div className="h-16 border-b border-dashed border-gray-300" />
                </div>
                <div className="border border-gray-200 rounded-xl p-4">
                  <p className="text-xs font-bold text-primary-600 uppercase tracking-wider mb-3">Head Teacher's Comment</p>
                  <div className="h-16 border-b border-dashed border-gray-300" />
                </div>
              </div>

              {/* Signatures */}
              <div className="grid grid-cols-2 gap-8 mt-10 pt-6 border-t border-gray-200">
                <div>
                  <div className="border-b-2 border-gray-400 mb-2 h-10" />
                  <p className="text-xs font-semibold text-gray-500 uppercase tracking-wide">Class Teacher's Signature & Stamp</p>
                </div>
                <div>
                  <div className="border-b-2 border-gray-400 mb-2 h-10" />
                  <p className="text-xs font-semibold text-gray-500 uppercase tracking-wide">Head Teacher's Signature & Stamp</p>
                </div>
              </div>

              {/* Footer branding */}
              <div className="mt-8 pt-4 border-t border-gray-100 text-center">
                <p className="text-[10px] text-gray-400 italic">
                  {['standard', 'pro'].includes(user?.plan_type)
                    ? `Generated by ${user?.school_name} digital system on ${new Date().toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' })}`
                    : `Generated by School Manager \u00A9 ${new Date().getFullYear()}`
                  }
                </p>
              </div>
            </>
          ) : (
            <div className="text-center py-16">
              <div className="w-20 h-20 bg-gray-100 rounded-full flex items-center justify-center mx-auto mb-4">
                <HiOutlineAcademicCap className="w-10 h-10 text-gray-300" />
              </div>
              <p className="text-gray-500 font-medium">No assessments found for this term and year.</p>
              <p className="text-xs text-gray-400 mt-2">Try selecting a different term or academic year above.</p>
            </div>
          )}
        </div>

        {/* Bottom accent bar */}
        <div className="h-2 bg-gradient-to-r from-accent-400 via-primary-500 to-primary-600" />
      </div>
    </div>
  );
};

export default ReportCardPage;
