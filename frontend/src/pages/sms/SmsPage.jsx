import { useEffect, useState, useCallback, useRef } from 'react';
import useApi from '../../hooks/useApi';
import { useAuth } from '../../context/AuthContext';
import toast from 'react-hot-toast';
import {
  HiOutlineMail,
  HiOutlinePaperAirplane,
  HiOutlineUserGroup,
  HiOutlineClipboardList,
  HiOutlineLockClosed,
  HiOutlineArrowUp,
  HiOutlineCheckCircle,
  HiOutlineExclamationCircle,
  HiOutlineClock,
  HiOutlinePhotograph,
  HiOutlineEmojiHappy,
} from 'react-icons/hi';

const SmsPage = () => {
  const { planType, user } = useAuth();
  const isPro = planType === 'pro';
  const { get, post, loading } = useApi();

  // Tab state
  const [activeTab, setActiveTab] = useState('send');

  // Send email state
  const [recipients, setRecipients] = useState('');
  const [subject, setSubject] = useState('');
  const [message, setMessage] = useState('');

  // Bulk email state
  const [bulkRole, setBulkRole] = useState('all');
  const [bulkSubject, setBulkSubject] = useState('');
  const [bulkMessage, setBulkMessage] = useState('');

  // Logs state
  const [logs, setLogs] = useState([]);

  // Message editor ref
  const messageRef = useRef(null);
  const bulkMessageRef = useRef(null);

  const fetchLogs = useCallback(async () => {
    try {
      const res = await get('/sms/logs', { limit: 50 }, { silent: true });
      if (res?.data) {
        setLogs(Array.isArray(res.data) ? res.data : []);
      }
    } catch {
      /* handled by useApi */
    }
  }, [get]);

  useEffect(() => {
    if (isPro) {
      fetchLogs();
    }
  }, [isPro, fetchLogs]);

  const handleSendEmail = async (e) => {
    e.preventDefault();
    if (!recipients.trim() || !message.trim()) {
      toast.error('Please enter at least one email address and a message');
      return;
    }
    const emails = recipients
      .split(/[,;\n]+/)
      .map((e) => e.trim())
      .filter(Boolean);

    if (emails.length === 0) {
      toast.error('No valid email addresses found');
      return;
    }

    try {
      await post('/sms/send', { to: emails, subject: subject || 'School Notification', message });
      toast.success(`Email sent to ${emails.length} recipient(s)!`);
      setRecipients('');
      setSubject('');
      setMessage('');
      fetchLogs();
    } catch {
      /* handled by useApi */
    }
  };

  const handleSendBulk = async (e) => {
    e.preventDefault();
    if (!bulkMessage.trim()) {
      toast.error('Please enter a message');
      return;
    }
    try {
      const res = await post('/sms/send-bulk', {
        role: bulkRole,
        subject: bulkSubject || 'School Notification',
        message: bulkMessage,
      });
      toast.success(res?.message || 'Bulk email sent!');
      setBulkSubject('');
      setBulkMessage('');
      fetchLogs();
    } catch {
      /* handled by useApi */
    }
  };

  // Insert formatting into textarea
  const insertFormatting = (ref, setter, currentVal, prefix, suffix = '') => {
    const el = ref.current;
    if (!el) return;
    const start = el.selectionStart;
    const end = el.selectionEnd;
    const selected = currentVal.substring(start, end);
    const before = currentVal.substring(0, start);
    const after = currentVal.substring(end);
    const newText = `${before}${prefix}${selected}${suffix}${after}`;
    setter(newText);
    setTimeout(() => {
      el.focus();
      el.selectionStart = start + prefix.length;
      el.selectionEnd = start + prefix.length + selected.length;
    }, 0);
  };

  const statusIcon = (status) => {
    if (status === 'sent' || status === 'delivered')
      return <HiOutlineCheckCircle className="w-4 h-4 text-emerald-500" />;
    if (status === 'failed')
      return <HiOutlineExclamationCircle className="w-4 h-4 text-red-500" />;
    return <HiOutlineClock className="w-4 h-4 text-amber-500" />;
  };

  const formatDate = (dateStr) => {
    if (!dateStr) return '—';
    return new Date(dateStr).toLocaleString('en-GB', {
      day: 'numeric',
      month: 'short',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    });
  };

  const formatRecipients = (recipients) => {
    if (!recipients) return '—';
    if (Array.isArray(recipients)) return recipients.join(', ');
    return String(recipients);
  };

  // Reusable email compose area
  const EmailComposeBox = ({ textareaRef, value, onChange, placeholder, charLimit = 5000 }) => (
    <div className="border border-gray-200 rounded-xl overflow-hidden focus-within:border-primary-400 focus-within:ring-2 focus-within:ring-primary-100 transition-all">
      {/* Toolbar */}
      <div className="flex items-center gap-1 px-3 py-2 bg-gray-50 border-b border-gray-200">
        <button
          type="button"
          onClick={() => insertFormatting(textareaRef, onChange, value, '**', '**')}
          className="p-1.5 rounded hover:bg-gray-200 text-gray-500 hover:text-gray-700 transition-colors"
          title="Bold"
        >
          <span className="text-xs font-bold">B</span>
        </button>
        <button
          type="button"
          onClick={() => insertFormatting(textareaRef, onChange, value, '_', '_')}
          className="p-1.5 rounded hover:bg-gray-200 text-gray-500 hover:text-gray-700 transition-colors"
          title="Italic"
        >
          <span className="text-xs italic font-medium">I</span>
        </button>
        <button
          type="button"
          onClick={() => insertFormatting(textareaRef, onChange, value, '\n• ')}
          className="p-1.5 rounded hover:bg-gray-200 text-gray-500 hover:text-gray-700 transition-colors"
          title="Bullet point"
        >
          <span className="text-xs">• List</span>
        </button>
        <div className="w-px h-4 bg-gray-300 mx-1" />
        <button
          type="button"
          onClick={() => insertFormatting(textareaRef, onChange, value, '\n---\n')}
          className="p-1.5 rounded hover:bg-gray-200 text-gray-500 hover:text-gray-700 transition-colors"
          title="Horizontal line"
        >
          <span className="text-xs">— Line</span>
        </button>
        <button
          type="button"
          onClick={() => insertFormatting(textareaRef, onChange, value, '😊')}
          className="p-1.5 rounded hover:bg-gray-200 text-gray-500 hover:text-gray-700 transition-colors"
          title="Insert emoji"
        >
          <HiOutlineEmojiHappy className="w-4 h-4" />
        </button>
      </div>

      {/* Text area */}
      <textarea
        ref={textareaRef}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        className="w-full px-4 py-3 text-sm text-gray-700 placeholder-gray-400 resize-none focus:outline-none min-h-[180px]"
        maxLength={charLimit}
        placeholder={placeholder}
        required
        style={{ lineHeight: '1.7' }}
      />

      {/* Bottom bar */}
      <div className="flex items-center justify-between px-4 py-2 bg-gray-50 border-t border-gray-100">
        <p className="text-xs text-gray-400">
          Plain text email • Line breaks will be preserved
        </p>
        <p className={`text-xs font-medium ${value.length > charLimit * 0.9 ? 'text-amber-500' : 'text-gray-400'}`}>
          {value.length.toLocaleString()} / {charLimit.toLocaleString()}
        </p>
      </div>
    </div>
  );

  // ─── PRO-ONLY LOCK SCREEN ───
  if (!isPro) {
    return (
      <div className="space-y-4">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Email Notifications</h1>
          <p className="text-sm text-gray-500 mt-1">Send email messages to parents, teachers, and staff</p>
        </div>
        <div className="card text-center py-16">
          <div className="w-16 h-16 bg-amber-100 rounded-full flex items-center justify-center mx-auto mb-4">
            <HiOutlineLockClosed className="w-8 h-8 text-amber-600" />
          </div>
          <h2 className="text-xl font-bold text-gray-800 mb-2">Pro Plan Feature</h2>
          <p className="text-gray-500 max-w-md mx-auto mb-6">
            Email Notifications is available on the <span className="font-semibold text-primary-600">Pro plan</span>.
            Upgrade to send individual and bulk emails to parents, teachers, and all school contacts directly from your dashboard.
          </p>
          <a
            href="/subscribe"
            className="inline-flex items-center gap-2 btn-primary px-6 py-2.5"
          >
            <HiOutlineArrowUp className="w-5 h-5" />
            Upgrade to Pro
          </a>
          <div className="mt-8 grid grid-cols-1 sm:grid-cols-3 gap-4 max-w-lg mx-auto text-left">
            <div className="bg-gray-50 rounded-lg p-3">
              <HiOutlinePaperAirplane className="w-5 h-5 text-primary-500 mb-1" />
              <p className="text-xs font-medium text-gray-700">Send to individual emails</p>
            </div>
            <div className="bg-gray-50 rounded-lg p-3">
              <HiOutlineUserGroup className="w-5 h-5 text-primary-500 mb-1" />
              <p className="text-xs font-medium text-gray-700">Bulk email to all parents/teachers</p>
            </div>
            <div className="bg-gray-50 rounded-lg p-3">
              <HiOutlineClipboardList className="w-5 h-5 text-primary-500 mb-1" />
              <p className="text-xs font-medium text-gray-700">Full delivery logs</p>
            </div>
          </div>
        </div>
      </div>
    );
  }

  // ─── PRO USERS: FULL EMAIL NOTIFICATIONS PAGE ───
  return (
    <div className="space-y-5">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Email Notifications</h1>
          <p className="text-sm text-gray-500 mt-1">
            Compose and send emails to parents, teachers, and staff
          </p>
        </div>
        <div className="hidden sm:flex items-center gap-2 text-xs text-gray-400 bg-gray-50 rounded-full px-3 py-1.5">
          <div className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
          Sending as {user?.school_name || 'your school'}
        </div>
      </div>

      {/* Tabs */}
      <div className="flex gap-1 bg-gray-100 rounded-lg p-1 w-fit">
        {[
          { key: 'send', label: 'Compose', icon: HiOutlineMail },
          { key: 'bulk', label: 'Bulk Email', icon: HiOutlineUserGroup },
          { key: 'logs', label: 'Sent', icon: HiOutlineClipboardList },
        ].map((tab) => (
          <button
            key={tab.key}
            onClick={() => setActiveTab(tab.key)}
            className={`flex items-center gap-1.5 px-4 py-2 rounded-md text-sm font-medium transition-colors ${
              activeTab === tab.key
                ? 'bg-white text-primary-600 shadow-sm'
                : 'text-gray-500 hover:text-gray-700'
            }`}
          >
            <tab.icon className="w-4 h-4" />
            {tab.label}
          </button>
        ))}
      </div>

      {/* ─── TAB: Compose Email ─── */}
      {activeTab === 'send' && (
        <form onSubmit={handleSendEmail} className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden">
          {/* Email header bar */}
          <div className="bg-gradient-to-r from-gray-50 to-white px-6 py-4 border-b border-gray-100">
            <h2 className="font-semibold text-gray-800 flex items-center gap-2">
              <HiOutlineMail className="w-5 h-5 text-primary-500" />
              New Email
            </h2>
          </div>

          <div className="p-6 space-y-4">
            {/* To */}
            <div className="flex items-start gap-3">
              <label className="text-sm font-medium text-gray-500 pt-2.5 w-16 text-right shrink-0">To</label>
              <div className="flex-1">
                <textarea
                  value={recipients}
                  onChange={(e) => setRecipients(e.target.value)}
                  className="w-full px-3 py-2.5 text-sm border border-gray-200 rounded-lg focus:outline-none focus:border-primary-400 focus:ring-2 focus:ring-primary-100 transition-all resize-none"
                  rows={2}
                  placeholder="parent@example.com, teacher@school.com"
                  required
                />
                <p className="text-xs text-gray-400 mt-1">
                  Separate multiple emails with commas, semicolons, or new lines
                </p>
              </div>
            </div>

            {/* Subject */}
            <div className="flex items-center gap-3">
              <label className="text-sm font-medium text-gray-500 w-16 text-right shrink-0">Subject</label>
              <input
                type="text"
                value={subject}
                onChange={(e) => setSubject(e.target.value)}
                className="flex-1 px-3 py-2.5 text-sm border border-gray-200 rounded-lg focus:outline-none focus:border-primary-400 focus:ring-2 focus:ring-primary-100 transition-all"
                placeholder="School Notification"
              />
            </div>

            {/* Divider */}
            <div className="border-t border-gray-100 pt-2" />

            {/* Message */}
            <div>
              <EmailComposeBox
                textareaRef={messageRef}
                value={message}
                onChange={setMessage}
                placeholder="Write your email message here...&#10;&#10;Dear Parents,&#10;&#10;We would like to inform you that...&#10;&#10;Best regards,&#10;School Administration"
              />
            </div>
          </div>

          {/* Send bar */}
          <div className="px-6 py-4 bg-gray-50 border-t border-gray-100 flex items-center justify-between">
            <p className="text-xs text-gray-400">
              Email will include your school logo and branding automatically
            </p>
            <button
              type="submit"
              disabled={loading || !recipients.trim() || !message.trim()}
              className="btn-primary flex items-center gap-2 px-5 py-2.5 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              <HiOutlinePaperAirplane className="w-4 h-4 rotate-90" />
              {loading ? 'Sending...' : 'Send Email'}
            </button>
          </div>
        </form>
      )}

      {/* ─── TAB: Bulk Email ─── */}
      {activeTab === 'bulk' && (
        <form onSubmit={handleSendBulk} className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden">
          {/* Header */}
          <div className="bg-gradient-to-r from-gray-50 to-white px-6 py-4 border-b border-gray-100">
            <h2 className="font-semibold text-gray-800 flex items-center gap-2">
              <HiOutlineUserGroup className="w-5 h-5 text-primary-500" />
              Bulk Email
            </h2>
            <p className="text-sm text-gray-500 mt-1">
              Send one message to all parents, teachers, or everyone at once
            </p>
          </div>

          <div className="p-6 space-y-4">
            {/* Audience */}
            <div className="flex items-center gap-3">
              <label className="text-sm font-medium text-gray-500 w-16 text-right shrink-0">To</label>
              <div className="flex-1 flex gap-2">
                {[
                  { value: 'all', label: 'Everyone', icon: '👥' },
                  { value: 'parents', label: 'Parents', icon: '👨‍👩‍👧' },
                  { value: 'teachers', label: 'Teachers', icon: '👩‍🏫' },
                ].map((opt) => (
                  <button
                    key={opt.value}
                    type="button"
                    onClick={() => setBulkRole(opt.value)}
                    className={`flex items-center gap-2 px-4 py-2.5 rounded-lg text-sm font-medium border transition-all ${
                      bulkRole === opt.value
                        ? 'bg-primary-50 border-primary-300 text-primary-700 shadow-sm'
                        : 'bg-white border-gray-200 text-gray-600 hover:bg-gray-50'
                    }`}
                  >
                    <span>{opt.icon}</span>
                    {opt.label}
                  </button>
                ))}
              </div>
            </div>

            {/* Subject */}
            <div className="flex items-center gap-3">
              <label className="text-sm font-medium text-gray-500 w-16 text-right shrink-0">Subject</label>
              <input
                type="text"
                value={bulkSubject}
                onChange={(e) => setBulkSubject(e.target.value)}
                className="flex-1 px-3 py-2.5 text-sm border border-gray-200 rounded-lg focus:outline-none focus:border-primary-400 focus:ring-2 focus:ring-primary-100 transition-all"
                placeholder="School Notification"
              />
            </div>

            {/* Divider */}
            <div className="border-t border-gray-100 pt-2" />

            {/* Message */}
            <div>
              <EmailComposeBox
                textareaRef={bulkMessageRef}
                value={bulkMessage}
                onChange={setBulkMessage}
                placeholder="Write your message to all recipients...&#10;&#10;Dear Parents and Staff,&#10;&#10;We are pleased to announce...&#10;&#10;Thank you,&#10;School Administration"
              />
            </div>
          </div>

          {/* Send bar */}
          <div className="px-6 py-4 bg-gray-50 border-t border-gray-100 flex items-center justify-between">
            <div className="flex items-center gap-2">
              <div className="w-2 h-2 rounded-full bg-amber-400" />
              <p className="text-xs text-gray-500">
                Sending to <span className="font-semibold">{bulkRole === 'all' ? 'all contacts' : `all ${bulkRole}`}</span> in your school
              </p>
            </div>
            <button
              type="submit"
              disabled={loading || !bulkMessage.trim()}
              className="btn-primary flex items-center gap-2 px-5 py-2.5 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              <HiOutlinePaperAirplane className="w-4 h-4 rotate-90" />
              {loading ? 'Sending...' : 'Send to All'}
            </button>
          </div>
        </form>
      )}

      {/* ─── TAB: Sent / Logs ─── */}
      {activeTab === 'logs' && (
        <div className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden">
          <div className="flex items-center justify-between px-6 py-4 border-b border-gray-100">
            <h2 className="font-semibold text-gray-800 flex items-center gap-2">
              <HiOutlineClipboardList className="w-5 h-5 text-primary-500" />
              Sent Emails
            </h2>
            <button
              onClick={fetchLogs}
              disabled={loading}
              className="text-sm text-primary-600 hover:text-primary-700 font-medium transition-colors"
            >
              {loading ? 'Refreshing...' : 'Refresh'}
            </button>
          </div>

          {logs.length > 0 ? (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="bg-gray-50">
                    <th className="text-left py-3 px-4 text-xs font-medium text-gray-500 uppercase tracking-wider">To</th>
                    <th className="text-left py-3 px-4 text-xs font-medium text-gray-500 uppercase tracking-wider">Message</th>
                    <th className="text-left py-3 px-4 text-xs font-medium text-gray-500 uppercase tracking-wider">Status</th>
                    <th className="text-left py-3 px-4 text-xs font-medium text-gray-500 uppercase tracking-wider">Sent By</th>
                    <th className="text-left py-3 px-4 text-xs font-medium text-gray-500 uppercase tracking-wider">Date</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-50">
                  {logs.map((log) => (
                    <tr key={log.id} className="hover:bg-gray-50 transition-colors">
                      <td className="py-3 px-4 text-xs text-gray-700 max-w-[200px] truncate">
                        {formatRecipients(log.recipients)}
                      </td>
                      <td className="py-3 px-4 text-gray-600 max-w-xs truncate">{log.message || '—'}</td>
                      <td className="py-3 px-4">
                        <span className="inline-flex items-center gap-1.5 px-2 py-0.5 rounded-full text-xs font-medium bg-gray-50">
                          {statusIcon(log.status)}
                          <span className="capitalize">{log.status || 'pending'}</span>
                        </span>
                      </td>
                      <td className="py-3 px-4 text-xs text-gray-500">{log.sent_by_name || '—'}</td>
                      <td className="py-3 px-4 text-xs text-gray-400">{formatDate(log.created_at)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          ) : (
            <div className="text-center py-16 text-gray-400">
              <HiOutlineMail className="w-14 h-14 mx-auto mb-3 text-gray-300" />
              <p className="font-medium text-gray-500">No emails sent yet</p>
              <p className="text-xs mt-1">Sent emails and their delivery status will appear here</p>
            </div>
          )}
        </div>
      )}
    </div>
  );
};

export default SmsPage;
