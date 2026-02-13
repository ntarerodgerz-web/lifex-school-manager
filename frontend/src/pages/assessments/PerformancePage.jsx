import { useEffect, useState, useCallback } from 'react';
import { Link } from 'react-router-dom';
import useApi from '../../hooks/useApi';
import { useAuth } from '../../context/AuthContext';
import toast from 'react-hot-toast';
import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';
import {
  HiOutlinePlus, HiOutlineX, HiOutlineFilter, HiOutlinePencil,
  HiOutlineTrash, HiOutlineDocumentReport, HiOutlineCalendar,
  HiOutlineDocumentDownload, HiOutlinePrinter, HiOutlineAcademicCap,
} from 'react-icons/hi';

const TERMS = ['Term 1', 'Term 2', 'Term 3'];
const API_BASE = import.meta.env.VITE_API_BASE_URL || 'http://localhost:5000';

const gradeFromScore = (score) => {
  if (score >= 80) return 'D1';
  if (score >= 70) return 'D2';
  if (score >= 60) return 'C3';
  if (score >= 55) return 'C4';
  if (score >= 50) return 'C5';
  if (score >= 45) return 'C6';
  if (score >= 40) return 'P7';
  if (score >= 35) return 'P8';
  return 'F9';
};

const gradeColor = (grade) => {
  if (!grade) return '';
  if (['D1', 'D2'].includes(grade)) return 'bg-emerald-100 text-emerald-700';
  if (['C3', 'C4', 'C5', 'C6'].includes(grade)) return 'bg-blue-100 text-blue-700';
  if (['P7', 'P8'].includes(grade)) return 'bg-amber-100 text-amber-700';
  return 'bg-red-100 text-red-700';
};

const gradeRemark = (grade) => {
  const map = { D1: 'Excellent', D2: 'Very Good', C3: 'Good', C4: 'Good', C5: 'Average', C6: 'Average', P7: 'Below Average', P8: 'Poor', F9: 'Fail' };
  return map[grade] || '';
};

/** Load an image URL as a data URL for PDF embedding */
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

const PerformancePage = () => {
  const { get, post, put, del, loading } = useApi();
  const { user } = useAuth();

  // Data
  const [assessments, setAssessments] = useState([]);
  const [classes, setClasses] = useState([]);
  const [subjects, setSubjects] = useState([]);
  const [pupils, setPupils] = useState([]);
  const [dataReady, setDataReady] = useState(false);

  // Filters
  const [filterClass, setFilterClass] = useState('');
  const [filterSubject, setFilterSubject] = useState('');
  const [filterTerm, setFilterTerm] = useState('');
  const [filterYear, setFilterYear] = useState(new Date().getFullYear().toString());

  // Form state
  const [showForm, setShowForm] = useState(false);
  const [editId, setEditId] = useState(null);
  const [form, setForm] = useState({
    pupil_id: '', subject_id: '', class_id: '', term: 'Term 1',
    academic_year: new Date().getFullYear().toString(), score: '', remarks: '',
  });

  // Bulk entry
  const [showBulk, setShowBulk] = useState(false);
  const [bulkClassId, setBulkClassId] = useState('');
  const [bulkSubjectId, setBulkSubjectId] = useState('');
  const [bulkTerm, setBulkTerm] = useState('Term 1');
  const [bulkYear, setBulkYear] = useState(new Date().getFullYear().toString());
  const [bulkScores, setBulkScores] = useState({});
  const [classPupils, setClassPupils] = useState([]);

  // Download/print state
  const [generating, setGenerating] = useState(false);

  const schoolName = user?.school_name || 'School Manager';
  const isPremium = ['standard', 'pro'].includes(user?.plan_type);
  const logoUrl = user?.school_badge_url ? `${API_BASE}${user.school_badge_url}` : null;

  // Load classes, subjects, and pupils once on mount
  useEffect(() => {
    let cancelled = false;
    const loadAll = async () => {
      try {
        const [classRes, subjectRes, pupilRes] = await Promise.all([
          get('/classes', null, { silent: true }),
          get('/subjects', null, { silent: true }),
          get('/pupils', { limit: 500 }, { silent: true }),
        ]);
        if (!cancelled) {
          setClasses(classRes.data || []);
          setSubjects(subjectRes.data || []);
          setPupils(pupilRes.data?.pupils || pupilRes.data || []);
          setDataReady(true);
        }
      } catch { /* handled by useApi */ }
    };
    loadAll();
    return () => { cancelled = true; };
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  const fetchAssessments = useCallback(async () => {
    const params = {};
    if (filterClass) params.class_id = filterClass;
    if (filterSubject) params.subject_id = filterSubject;
    if (filterTerm) params.term = filterTerm;
    if (filterYear) params.academic_year = filterYear;

    try {
      const res = await get('/assessments', params, { silent: true });
      setAssessments(res.data || []);
    } catch { /* handled by useApi */ }
  }, [get, filterClass, filterSubject, filterTerm, filterYear]);

  useEffect(() => { fetchAssessments(); }, [fetchAssessments]);

  // When bulk class changes, load pupils for that class
  useEffect(() => {
    if (!bulkClassId) { setClassPupils([]); return; }
    const cp = pupils.filter((p) => p.class_id === bulkClassId);
    setClassPupils(cp);
    const initial = {};
    cp.forEach((p) => { initial[p.id] = ''; });
    setBulkScores(initial);
  }, [bulkClassId, pupils]);

  const resetForm = () => {
    setForm({
      pupil_id: '', subject_id: '', class_id: '', term: 'Term 1',
      academic_year: new Date().getFullYear().toString(), score: '', remarks: '',
    });
    setEditId(null);
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    const score = parseFloat(form.score);
    const grade = gradeFromScore(score);
    try {
      if (editId) {
        await put(`/assessments/${editId}`, { score, grade, remarks: form.remarks || null, term: form.term, academic_year: form.academic_year });
        toast.success('Assessment updated');
      } else {
        await post('/assessments', { ...form, score, grade, class_id: form.class_id || null });
        toast.success('Assessment recorded');
      }
      setShowForm(false);
      resetForm();
      fetchAssessments();
    } catch { /* handled */ }
  };

  const handleEdit = (a) => {
    setEditId(a.id);
    setForm({
      pupil_id: a.pupil_id,
      subject_id: a.subject_id,
      class_id: a.class_id || '',
      term: a.term || 'Term 1',
      academic_year: a.academic_year || new Date().getFullYear().toString(),
      score: a.score,
      remarks: a.remarks || '',
    });
    setShowForm(true);
    setShowBulk(false);
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const handleDelete = async (id) => {
    if (!window.confirm('Delete this assessment?')) return;
    try {
      await del(`/assessments/${id}`);
      toast.success('Assessment deleted');
      fetchAssessments();
    } catch { /* handled */ }
  };

  const handleBulkSubmit = async (e) => {
    e.preventDefault();
    const records = [];
    for (const [pupilId, scoreStr] of Object.entries(bulkScores)) {
      const score = parseFloat(scoreStr);
      if (!isNaN(score) && score >= 0 && score <= 100) {
        records.push({
          pupil_id: pupilId,
          subject_id: bulkSubjectId,
          class_id: bulkClassId,
          term: bulkTerm,
          academic_year: bulkYear,
          score,
          grade: gradeFromScore(score),
        });
      }
    }
    if (records.length === 0) {
      toast.error('Enter at least one score');
      return;
    }
    try {
      await post('/assessments/bulk', { assessments: records });
      toast.success(`${records.length} assessments recorded`);
      setShowBulk(false);
      setBulkScores({});
      fetchAssessments();
    } catch { /* handled */ }
  };

  /* ═══════════════════════════════════════════
   *  PDF: Download All Grades by Class
   * ═══════════════════════════════════════════ */

  /** Draw the branded PDF header with school badge, returning the Y cursor position */
  const drawPdfHeader = (doc, logo, { title, subtitle }) => {
    const pageWidth = doc.internal.pageSize.getWidth();

    // Decorative top bar
    doc.setFillColor(30, 58, 95);
    doc.rect(0, 0, pageWidth, 6, 'F');
    doc.setFillColor(240, 173, 78);
    doc.rect(0, 6, pageWidth, 2, 'F');

    let y = 14;

    // School badge/logo
    if (logo) {
      const maxH = 16;
      const ratio = logo.width / logo.height;
      const w = Math.min(maxH * ratio, 24);
      doc.addImage(logo.dataUrl, 'PNG', (pageWidth - w) / 2, y, w, maxH);
      y += maxH + 3;
    }

    // School name
    doc.setFontSize(18);
    doc.setFont('helvetica', 'bold');
    doc.setTextColor(30, 58, 95);
    doc.text(schoolName.toUpperCase(), pageWidth / 2, y + 4, { align: 'center' });
    y += 10;

    // Title
    doc.setFontSize(11);
    doc.setFont('helvetica', 'normal');
    doc.setTextColor(80);
    doc.text(title, pageWidth / 2, y, { align: 'center' });
    y += 5;

    // Subtitle
    if (subtitle) {
      doc.setFontSize(9);
      doc.setTextColor(120);
      doc.text(subtitle, pageWidth / 2, y, { align: 'center' });
      y += 4;
    }

    // Divider
    doc.setDrawColor(30, 58, 95);
    doc.setLineWidth(0.5);
    doc.line(20, y, pageWidth - 20, y);
    y += 5;

    doc.setTextColor(0);
    return y;
  };

  /** Add branded footer + page numbers to every page */
  const addPdfFooters = (doc) => {
    const pageWidth = doc.internal.pageSize.getWidth();
    const pageHeight = doc.internal.pageSize.getHeight();
    const totalPages = doc.internal.getNumberOfPages();
    const brandText = isPremium
      ? `Generated by ${schoolName} digital system on ${new Date().toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' })}`
      : `Generated by School Manager \u00A9 ${new Date().getFullYear()}`;

    for (let i = 1; i <= totalPages; i++) {
      doc.setPage(i);
      // Bottom bar
      doc.setFillColor(240, 173, 78);
      doc.rect(0, pageHeight - 8, pageWidth, 2, 'F');
      doc.setFillColor(30, 58, 95);
      doc.rect(0, pageHeight - 6, pageWidth, 6, 'F');

      doc.setFontSize(7);
      doc.setFont('helvetica', 'italic');
      doc.setTextColor(255);
      doc.text(brandText, pageWidth / 2, pageHeight - 9, { align: 'center' });
      doc.text(`Page ${i} of ${totalPages}`, pageWidth / 2, pageHeight - 2, { align: 'center' });
    }
  };

  const handleDownloadAllPdf = async () => {
    setGenerating(true);
    try {
      // Fetch ALL assessments (with current filter for term/year but all classes)
      const params = {};
      if (filterTerm) params.term = filterTerm;
      if (filterYear) params.academic_year = filterYear;
      const res = await get('/assessments', params, { silent: true });
      const allAssessments = res.data || [];

      if (allAssessments.length === 0) {
        toast.error('No assessments found to export');
        setGenerating(false);
        return;
      }

      // Group by class
      const byClass = {};
      for (const a of allAssessments) {
        const cls = a.class_name || 'Unassigned';
        if (!byClass[cls]) byClass[cls] = [];
        byClass[cls].push(a);
      }
      // Sort class names
      const classNames = Object.keys(byClass).sort();

      // Load logo
      const logo = await loadImageAsDataUrl(logoUrl);

      const doc = new jsPDF();
      const pageWidth = doc.internal.pageSize.getWidth();
      const termLabel = filterTerm || 'All Terms';
      const yearLabel = filterYear || 'All Years';
      const subtitle = `${termLabel} — ${yearLabel}`;

      let isFirstClass = true;

      for (const className of classNames) {
        if (!isFirstClass) doc.addPage();
        isFirstClass = false;

        const classAssessments = byClass[className];

        // ── Header ──
        let y = drawPdfHeader(doc, logo, {
          title: 'PERFORMANCE REPORT BY CLASS',
          subtitle,
        });

        // ── Class title bar ──
        doc.setFillColor(30, 58, 95);
        doc.roundedRect(14, y, pageWidth - 28, 10, 2, 2, 'F');
        doc.setFontSize(11);
        doc.setFont('helvetica', 'bold');
        doc.setTextColor(255);
        doc.text(`CLASS: ${className}`, pageWidth / 2, y + 7, { align: 'center' });
        y += 14;

        // Group by pupil within class
        const byPupil = {};
        for (const a of classAssessments) {
          const key = a.pupil_id;
          if (!byPupil[key]) {
            byPupil[key] = {
              name: `${a.pupil_first_name} ${a.pupil_last_name}`,
              subjects: [],
              totalScore: 0,
            };
          }
          byPupil[key].subjects.push(a);
          byPupil[key].totalScore += parseFloat(a.score) || 0;
        }

        // Build table rows
        const tableRows = [];
        const pupilKeys = Object.keys(byPupil).sort((a, b) => byPupil[a].name.localeCompare(byPupil[b].name));
        let rank = 0;

        // Calculate averages and sort by average descending for ranking
        const pupilSummaries = pupilKeys.map((key) => {
          const p = byPupil[key];
          const avg = p.subjects.length > 0 ? p.totalScore / p.subjects.length : 0;
          return { key, ...p, average: avg };
        }).sort((a, b) => b.average - a.average);

        for (const p of pupilSummaries) {
          rank++;
          // One row per subject for this pupil
          for (let j = 0; j < p.subjects.length; j++) {
            const a = p.subjects[j];
            const isFirst = j === 0;
            const isLast = j === p.subjects.length - 1;
            tableRows.push({
              pupilName: isFirst ? p.name : '',
              subject: a.subject_name,
              score: a.score,
              grade: a.grade || '—',
              remark: gradeRemark(a.grade),
              average: isLast ? p.average.toFixed(1) : '',
              rank: isFirst ? `${rank}` : '',
              _isFirst: isFirst,
              _isLast: isLast,
              _pupilIdx: rank,
            });
          }
        }

        // Class summary
        const totalStudents = pupilSummaries.length;
        const classAvg = totalStudents > 0 ? pupilSummaries.reduce((s, p) => s + p.average, 0) / totalStudents : 0;

        autoTable(doc, {
          startY: y,
          head: [['#', 'Student Name', 'Subject', 'Score', 'Grade', 'Remark', 'Avg', 'Rank']],
          body: tableRows.map((r) => [
            r.rank,
            r.pupilName,
            r.subject,
            r.score,
            r.grade,
            r.remark,
            r.average,
            r.rank,
          ]),
          theme: 'grid',
          headStyles: {
            fillColor: [30, 58, 95],
            textColor: [255, 255, 255],
            fontSize: 8,
            fontStyle: 'bold',
            halign: 'center',
          },
          bodyStyles: { fontSize: 8, textColor: [40, 40, 40] },
          alternateRowStyles: { fillColor: [248, 250, 252] },
          columnStyles: {
            0: { cellWidth: 8, halign: 'center' },
            1: { cellWidth: 38, fontStyle: 'bold' },
            2: { cellWidth: 30 },
            3: { cellWidth: 14, halign: 'center' },
            4: { cellWidth: 14, halign: 'center' },
            5: { cellWidth: 28 },
            6: { cellWidth: 14, halign: 'center' },
            7: { cellWidth: 12, halign: 'center' },
          },
          margin: { left: 14, right: 14, bottom: 20 },
          didParseCell(data) {
            // Color-code grades
            if (data.section === 'body' && data.column.index === 4) {
              const grade = data.cell.raw;
              if (['D1', 'D2'].includes(grade)) data.cell.styles.textColor = [5, 150, 105];
              else if (['C3', 'C4', 'C5', 'C6'].includes(grade)) data.cell.styles.textColor = [37, 99, 235];
              else if (['P7', 'P8'].includes(grade)) data.cell.styles.textColor = [217, 119, 6];
              else if (grade === 'F9') data.cell.styles.textColor = [220, 38, 38];
            }
            // Bold average cells
            if (data.section === 'body' && data.column.index === 6 && data.cell.raw) {
              data.cell.styles.fontStyle = 'bold';
              data.cell.styles.textColor = [30, 58, 95];
            }
            // Bold rank cells
            if (data.section === 'body' && data.column.index === 7 && data.cell.raw) {
              data.cell.styles.fontStyle = 'bold';
            }
          },
          didDrawPage() {
            // We'll add footer later in bulk
          },
        });

        // Class summary box below table
        const finalY = doc.lastAutoTable?.finalY ? doc.lastAutoTable.finalY + 6 : y + 40;
        if (finalY + 22 < doc.internal.pageSize.getHeight() - 20) {
          const boxW = (pageWidth - 28 - 16) / 3;
          const boxes = [
            { label: 'Students', value: `${totalStudents}`, color: [30, 58, 95] },
            { label: 'Class Average', value: `${classAvg.toFixed(1)}%`, color: [5, 150, 105] },
            { label: 'Top Student', value: pupilSummaries.length > 0 ? pupilSummaries[0].name : '—', color: [217, 119, 6] },
          ];
          boxes.forEach((box, i) => {
            const bx = 14 + i * (boxW + 8);
            doc.setFillColor(...box.color);
            doc.roundedRect(bx, finalY, boxW, 16, 2, 2, 'F');
            doc.setFontSize(7);
            doc.setFont('helvetica', 'normal');
            doc.setTextColor(255);
            doc.text(box.label.toUpperCase(), bx + boxW / 2, finalY + 5, { align: 'center' });
            doc.setFontSize(10);
            doc.setFont('helvetica', 'bold');
            const displayVal = box.value.length > 20 ? box.value.substring(0, 18) + '…' : box.value;
            doc.text(displayVal, bx + boxW / 2, finalY + 12, { align: 'center' });
          });
        }
      }

      // Add footers on all pages
      addPdfFooters(doc);

      const filename = `${schoolName.replace(/[^a-zA-Z0-9 ]/g, '').trim().replace(/\s+/g, '_')}_Performance_By_Class_${termLabel.replace(/\s+/g, '_')}_${yearLabel}.pdf`;
      doc.save(filename);
      toast.success('All-class performance PDF downloaded!');
    } catch {
      toast.error('Failed to generate PDF. Please try again.');
    } finally {
      setGenerating(false);
    }
  };

  /** Print all by class — generates a PDF with each class on its own page */
  const handlePrintAll = async () => {
    setGenerating(true);
    toast('Generating performance report…', { icon: '🖨️', duration: 2000 });
    try {
      const params = {};
      if (filterTerm) params.term = filterTerm;
      if (filterYear) params.academic_year = filterYear;
      const res = await get('/assessments', params, { silent: true });
      const allAssessments = res.data || [];

      if (allAssessments.length === 0) {
        toast.error('No assessments found to print');
        setGenerating(false);
        return;
      }

      // Group by class
      const byClass = {};
      for (const a of allAssessments) {
        const cls = a.class_name || 'Unassigned';
        if (!byClass[cls]) byClass[cls] = [];
        byClass[cls].push(a);
      }
      const classNamesList = Object.keys(byClass).sort();
      const termLabel = filterTerm || 'All Terms';
      const yearLabel = filterYear || 'All Years';

      const logo = logoUrl ? await loadImageAsDataUrl(logoUrl) : null;
      const brandText = isPremium
        ? `Generated by ${schoolName} digital system on ${new Date().toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' })}`
        : `Generated by School Manager \u00A9 ${new Date().getFullYear()}`;

      const doc = new jsPDF('landscape');
      const pgW = doc.internal.pageSize.getWidth();
      const pgH = doc.internal.pageSize.getHeight();

      classNamesList.forEach((clsName, clsIdx) => {
        if (clsIdx > 0) doc.addPage();
        let y = 15;

        // Header bar
        doc.setFillColor(30, 58, 95);
        doc.rect(0, 0, pgW, 10, 'F');
        doc.setFillColor(240, 173, 78);
        doc.rect(0, 10, pgW, 2, 'F');

        if (logo) {
          const imgW = 16;
          const imgH = (logo.height / logo.width) * imgW;
          doc.addImage(logo.dataUrl, 'PNG', (pgW - imgW) / 2, y, imgW, imgH);
          y += imgH + 3;
        }

        doc.setFontSize(16);
        doc.setFont(undefined, 'bold');
        doc.setTextColor(30, 58, 95);
        doc.text(schoolName.toUpperCase(), pgW / 2, y, { align: 'center' });
        y += 6;
        doc.setFontSize(10);
        doc.setFont(undefined, 'normal');
        doc.setTextColor(100, 116, 139);
        doc.text(`PERFORMANCE REPORT — ${termLabel} — ${yearLabel}`, pgW / 2, y, { align: 'center' });
        y += 5;

        // Class title bar
        doc.setFillColor(30, 58, 95);
        doc.rect(14, y, pgW - 28, 8, 'F');
        doc.setFontSize(10);
        doc.setFont(undefined, 'bold');
        doc.setTextColor(255, 255, 255);
        doc.text(clsName, pgW / 2, y + 5.5, { align: 'center' });
        y += 12;

        // Group by pupil
        const byPupil = {};
        for (const a of byClass[clsName]) {
          if (!byPupil[a.pupil_id]) {
            byPupil[a.pupil_id] = { name: `${a.pupil_first_name} ${a.pupil_last_name}`, subjects: [], total: 0 };
          }
          byPupil[a.pupil_id].subjects.push(a);
          byPupil[a.pupil_id].total += parseFloat(a.score) || 0;
        }

        const sortedPupils = Object.values(byPupil).map((p) => ({
          ...p,
          average: p.subjects.length > 0 ? p.total / p.subjects.length : 0,
        })).sort((a, b) => b.average - a.average);

        // Build rows — one row per subject per pupil
        const rows = [];
        sortedPupils.forEach((p, pIdx) => {
          const rank = pIdx + 1;
          p.subjects.forEach((a, sIdx) => {
            const isFirst = sIdx === 0;
            const isLast = sIdx === p.subjects.length - 1;
            rows.push([
              isFirst ? String(rank) : '',
              isFirst ? p.name : '',
              a.subject_name,
              String(a.score),
              a.grade || '—',
              gradeRemark(a.grade),
              isLast ? p.average.toFixed(1) : '',
              isFirst ? String(rank) : '',
            ]);
          });
        });

        autoTable(doc, {
          startY: y,
          head: [['#', 'Student Name', 'Subject', 'Score', 'Grade', 'Remark', 'Avg', 'Rank']],
          body: rows,
          theme: 'grid',
          headStyles: { fillColor: [30, 58, 95], fontSize: 7, textColor: [255, 255, 255], halign: 'center' },
          bodyStyles: { fontSize: 7, textColor: [50, 50, 50] },
          columnStyles: {
            0: { cellWidth: 10, halign: 'center' },
            3: { halign: 'center', fontStyle: 'bold' },
            4: { halign: 'center' },
            6: { halign: 'center', fontStyle: 'bold', textColor: [30, 58, 95] },
            7: { halign: 'center', fontStyle: 'bold' },
          },
        });

        // Summary line
        const totalStudents = sortedPupils.length;
        const classAvg = totalStudents > 0 ? sortedPupils.reduce((s, p) => s + p.average, 0) / totalStudents : 0;
        const topStudent = sortedPupils.length > 0 ? sortedPupils[0].name : '—';
        const summaryY = doc.lastAutoTable.finalY + 6;
        doc.setFontSize(8);
        doc.setTextColor(30, 58, 95);
        doc.setFont(undefined, 'bold');
        doc.text(`Students: ${totalStudents}  |  Class Average: ${classAvg.toFixed(1)}%  |  Top Student: ${topStudent}`, pgW / 2, summaryY, { align: 'center' });

        // Footer bar
        doc.setFillColor(30, 58, 95);
        doc.rect(0, pgH - 10, pgW, 10, 'F');
        doc.setFillColor(240, 173, 78);
        doc.rect(0, pgH - 12, pgW, 2, 'F');
        doc.setFontSize(7);
        doc.setFont(undefined, 'normal');
        doc.setTextColor(255, 255, 255);
        doc.text(brandText, pgW / 2, pgH - 5, { align: 'center' });
      });

      doc.save(`${schoolName.replace(/[^a-zA-Z0-9 ]/g, '').trim().replace(/\s+/g, '_')}_Performance_Print_${termLabel.replace(/\s+/g, '_')}_${yearLabel}.pdf`);
    } catch {
      toast.error('Failed to generate print view.');
    } finally {
      setGenerating(false);
    }
  };

  // Filtered pupils for single form based on class
  const filteredPupils = form.class_id
    ? pupils.filter((p) => p.class_id === form.class_id)
    : pupils;

  return (
    <div className="space-y-5">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div>
          <h1 className="text-2xl font-bold text-gray-800 flex items-center gap-2">
            <HiOutlineDocumentReport className="w-7 h-7 text-primary-500" />
            Student Performance
          </h1>
          <p className="text-sm text-gray-500 mt-1">Record and manage student assessments &amp; grades</p>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          {/* Download / Print All by Class */}
          <button
            onClick={handlePrintAll}
            disabled={generating}
            className="btn-secondary flex items-center gap-2 text-sm"
            title="Print all student grades grouped by class"
          >
            <HiOutlinePrinter className="w-4 h-4" />
            <span className="hidden sm:inline">Print All</span>
          </button>
          <button
            onClick={handleDownloadAllPdf}
            disabled={generating}
            className="btn-secondary flex items-center gap-2 text-sm"
            title="Download PDF of all student grades grouped by class"
          >
            {generating ? (
              <div className="w-4 h-4 border-2 border-gray-400/30 border-t-gray-600 rounded-full animate-spin" />
            ) : (
              <HiOutlineDocumentDownload className="w-4 h-4" />
            )}
            <span className="hidden sm:inline">{generating ? 'Generating…' : 'Download All'}</span>
          </button>

          <div className="w-px h-6 bg-gray-200 hidden sm:block" />

          <button
            onClick={() => { setShowBulk(!showBulk); setShowForm(false); }}
            className="btn-secondary flex items-center gap-2 text-sm"
          >
            <HiOutlineCalendar className="w-4 h-4" />
            Bulk Entry
          </button>
          <button
            onClick={() => { setShowForm(!showForm); setShowBulk(false); resetForm(); }}
            className="btn-primary flex items-center gap-2 text-sm"
          >
            <HiOutlinePlus className="w-4 h-4" />
            Add Score
          </button>
        </div>
      </div>

      {/* Info banner for download/print */}
      {assessments.length > 0 && (
        <div className="bg-blue-50 border border-blue-200 rounded-xl p-3 flex items-start gap-3 text-sm">
          <HiOutlineAcademicCap className="w-5 h-5 text-blue-500 flex-shrink-0 mt-0.5" />
          <p className="text-blue-700">
            <strong>Download All</strong> or <strong>Print All</strong> will generate a comprehensive report of all students' performances and grades, organized by class.
            Use the filters below to narrow by term and year.
          </p>
        </div>
      )}

      {/* Single assessment form */}
      {showForm && (
        <form onSubmit={handleSubmit} className="card space-y-4 border-primary-200">
          <div className="flex items-center justify-between">
            <h3 className="font-semibold text-gray-800">{editId ? 'Edit Assessment' : 'Record Assessment'}</h3>
            <button type="button" onClick={() => { setShowForm(false); resetForm(); }} className="p-1 rounded hover:bg-gray-100">
              <HiOutlineX className="w-5 h-5 text-gray-400" />
            </button>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
            <div>
              <label className="label">Class</label>
              <select value={form.class_id} onChange={(e) => setForm({ ...form, class_id: e.target.value, pupil_id: '' })} className="input-field">
                <option value="">All classes</option>
                {classes.map((c) => <option key={c.id} value={c.id}>{c.name}</option>)}
              </select>
            </div>
            <div>
              <label className="label">Pupil *</label>
              <select
                value={form.pupil_id}
                onChange={(e) => setForm({ ...form, pupil_id: e.target.value })}
                className="input-field"
                required
                disabled={!!editId}
              >
                <option value="">
                  {!dataReady ? 'Loading pupils…' : filteredPupils.length === 0 ? 'No pupils found' : 'Select pupil…'}
                </option>
                {filteredPupils.map((p) => (
                  <option key={p.id} value={p.id}>
                    {p.first_name} {p.last_name}{p.class_name ? ` (${p.class_name})` : ''}
                  </option>
                ))}
              </select>
            </div>
            <div>
              <label className="label">Subject *</label>
              <select
                value={form.subject_id}
                onChange={(e) => setForm({ ...form, subject_id: e.target.value })}
                className="input-field"
                required
                disabled={!!editId}
              >
                <option value="">
                  {!dataReady ? 'Loading subjects…' : subjects.length === 0 ? 'No subjects found' : 'Select subject…'}
                </option>
                {subjects.map((s) => <option key={s.id} value={s.id}>{s.name}</option>)}
              </select>
            </div>
            <div>
              <label className="label">Term</label>
              <select value={form.term} onChange={(e) => setForm({ ...form, term: e.target.value })} className="input-field">
                {TERMS.map((t) => <option key={t} value={t}>{t}</option>)}
              </select>
            </div>
            <div>
              <label className="label">Academic Year</label>
              <input value={form.academic_year} onChange={(e) => setForm({ ...form, academic_year: e.target.value })} className="input-field" placeholder="e.g. 2026" />
            </div>
            <div>
              <label className="label">Score (0-100) *</label>
              <input type="number" min="0" max="100" value={form.score} onChange={(e) => setForm({ ...form, score: e.target.value })} className="input-field" required />
            </div>
            <div className="sm:col-span-2 lg:col-span-3">
              <label className="label">Remarks</label>
              <input value={form.remarks} onChange={(e) => setForm({ ...form, remarks: e.target.value })} className="input-field" placeholder="Optional comment" />
            </div>
          </div>
          <div className="flex gap-3 justify-end">
            <button type="button" onClick={() => { setShowForm(false); resetForm(); }} className="btn-secondary">Cancel</button>
            <button type="submit" disabled={loading} className="btn-primary">{loading ? 'Saving…' : editId ? 'Update' : 'Save'}</button>
          </div>
        </form>
      )}

      {/* Bulk entry form */}
      {showBulk && (
        <form onSubmit={handleBulkSubmit} className="card space-y-4 border-accent-200">
          <div className="flex items-center justify-between">
            <h3 className="font-semibold text-gray-800">Bulk Score Entry</h3>
            <button type="button" onClick={() => setShowBulk(false)} className="p-1 rounded hover:bg-gray-100">
              <HiOutlineX className="w-5 h-5 text-gray-400" />
            </button>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            <div>
              <label className="label">Class *</label>
              <select value={bulkClassId} onChange={(e) => setBulkClassId(e.target.value)} className="input-field" required>
                <option value="">Select class…</option>
                {classes.map((c) => <option key={c.id} value={c.id}>{c.name}</option>)}
              </select>
            </div>
            <div>
              <label className="label">Subject *</label>
              <select value={bulkSubjectId} onChange={(e) => setBulkSubjectId(e.target.value)} className="input-field" required>
                <option value="">Select subject…</option>
                {subjects.map((s) => <option key={s.id} value={s.id}>{s.name}</option>)}
              </select>
            </div>
            <div>
              <label className="label">Term</label>
              <select value={bulkTerm} onChange={(e) => setBulkTerm(e.target.value)} className="input-field">
                {TERMS.map((t) => <option key={t} value={t}>{t}</option>)}
              </select>
            </div>
            <div>
              <label className="label">Academic Year</label>
              <input value={bulkYear} onChange={(e) => setBulkYear(e.target.value)} className="input-field" placeholder="e.g. 2026" />
            </div>
          </div>

          {classPupils.length > 0 && (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="table-header">
                    <th className="text-left p-3">#</th>
                    <th className="text-left p-3">Pupil Name</th>
                    <th className="text-left p-3 w-32">Score (0-100)</th>
                    <th className="text-center p-3 w-20">Grade</th>
                  </tr>
                </thead>
                <tbody>
                  {classPupils.map((p, i) => {
                    const score = parseFloat(bulkScores[p.id]);
                    const grade = !isNaN(score) ? gradeFromScore(score) : '';
                    return (
                      <tr key={p.id} className="border-b border-gray-50">
                        <td className="p-3 text-gray-400">{i + 1}</td>
                        <td className="p-3 font-medium text-gray-800">{p.first_name} {p.last_name}</td>
                        <td className="p-3">
                          <input
                            type="number" min="0" max="100"
                            value={bulkScores[p.id] || ''}
                            onChange={(e) => setBulkScores({ ...bulkScores, [p.id]: e.target.value })}
                            className="input-field text-sm w-24"
                            placeholder="—"
                          />
                        </td>
                        <td className="p-3 text-center">
                          {grade && <span className={`px-2 py-0.5 rounded-full text-xs font-medium ${gradeColor(grade)}`}>{grade}</span>}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}

          {classPupils.length === 0 && bulkClassId && (
            <p className="text-sm text-gray-400 text-center py-4">No pupils found in this class.</p>
          )}

          <div className="flex gap-3 justify-end">
            <button type="button" onClick={() => setShowBulk(false)} className="btn-secondary">Cancel</button>
            <button type="submit" disabled={loading || classPupils.length === 0} className="btn-primary">
              {loading ? 'Saving…' : 'Save All Scores'}
            </button>
          </div>
        </form>
      )}

      {/* Filters */}
      <div className="card">
        <div className="flex items-center gap-2 mb-3">
          <HiOutlineFilter className="w-4 h-4 text-gray-400" />
          <span className="text-sm font-medium text-gray-600">Filters</span>
        </div>
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
          <select value={filterClass} onChange={(e) => setFilterClass(e.target.value)} className="input-field text-sm">
            <option value="">All Classes</option>
            {classes.map((c) => <option key={c.id} value={c.id}>{c.name}</option>)}
          </select>
          <select value={filterSubject} onChange={(e) => setFilterSubject(e.target.value)} className="input-field text-sm">
            <option value="">All Subjects</option>
            {subjects.map((s) => <option key={s.id} value={s.id}>{s.name}</option>)}
          </select>
          <select value={filterTerm} onChange={(e) => setFilterTerm(e.target.value)} className="input-field text-sm">
            <option value="">All Terms</option>
            {TERMS.map((t) => <option key={t} value={t}>{t}</option>)}
          </select>
          <input value={filterYear} onChange={(e) => setFilterYear(e.target.value)} className="input-field text-sm" placeholder="Year e.g. 2026" />
        </div>
      </div>

      {/* Assessments table */}
      <div className="card overflow-x-auto p-0">
        <table className="w-full text-sm">
          <thead>
            <tr className="table-header">
              <th className="text-left p-3">Pupil</th>
              <th className="text-left p-3">Subject</th>
              <th className="text-left p-3 hidden sm:table-cell">Class</th>
              <th className="text-center p-3">Score</th>
              <th className="text-center p-3">Grade</th>
              <th className="text-left p-3 hidden md:table-cell">Term</th>
              <th className="text-left p-3 hidden md:table-cell">Remarks</th>
              <th className="text-center p-3">Actions</th>
            </tr>
          </thead>
          <tbody>
            {assessments.length === 0 ? (
              <tr><td colSpan="8" className="text-center py-12 text-gray-400">No assessments found. Use the filters above or add new scores.</td></tr>
            ) : (
              assessments.map((a) => (
                <tr key={a.id} className="border-b border-gray-50 hover:bg-gray-50">
                  <td className="p-3">
                    <Link
                      to={`/report-card/${a.pupil_id}?term=${a.term || ''}&academic_year=${a.academic_year || ''}`}
                      className="font-medium text-primary-600 hover:text-primary-700 hover:underline"
                    >
                      {a.pupil_first_name} {a.pupil_last_name}
                    </Link>
                  </td>
                  <td className="p-3 text-gray-700">{a.subject_name}</td>
                  <td className="p-3 text-gray-500 hidden sm:table-cell">{a.class_name || '—'}</td>
                  <td className="p-3 text-center font-semibold text-gray-800">{a.score}</td>
                  <td className="p-3 text-center">
                    <span className={`px-2 py-0.5 rounded-full text-xs font-medium ${gradeColor(a.grade)}`}>{a.grade || '—'}</span>
                  </td>
                  <td className="p-3 text-gray-500 hidden md:table-cell">{a.term || '—'} {a.academic_year || ''}</td>
                  <td className="p-3 text-gray-400 hidden md:table-cell text-xs truncate max-w-[150px]">{a.remarks || '—'}</td>
                  <td className="p-3">
                    <div className="flex items-center justify-center gap-1">
                      <button onClick={() => handleEdit(a)} className="p-1.5 rounded-lg hover:bg-blue-50 text-gray-400 hover:text-blue-600" title="Edit">
                        <HiOutlinePencil className="w-4 h-4" />
                      </button>
                      <button onClick={() => handleDelete(a.id)} className="p-1.5 rounded-lg hover:bg-red-50 text-gray-400 hover:text-red-500" title="Delete">
                        <HiOutlineTrash className="w-4 h-4" />
                      </button>
                    </div>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
};

export default PerformancePage;
