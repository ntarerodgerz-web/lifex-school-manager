const notificationService = require('./service');
const { success } = require('../../utils/response');

/**
 * POST /notifications/send — Send email to specific addresses
 */
const send = async (req, res, next) => {
  try {
    const { to, subject, message } = req.body;
    const result = await notificationService.sendNotification({
      schoolId: req.schoolId,
      to: Array.isArray(to) ? to : [to],
      subject,
      message,
      sentBy: req.user.id,
    });
    return success(res, { message: 'Email sent successfully', data: result });
  } catch (err) {
    next(err);
  }
};

/**
 * POST /notifications/send-bulk — Send email to all parents, teachers, or all users
 */
const sendBulk = async (req, res, next) => {
  try {
    const { role, subject, message } = req.body;
    const result = await notificationService.sendBulkToRole({
      schoolId: req.schoolId,
      role: role || 'all',
      subject,
      message,
      sentBy: req.user.id,
    });
    return success(res, { message: `Email sent to ${result.totalRecipients} recipients`, data: result });
  } catch (err) {
    next(err);
  }
};

/**
 * GET /notifications/logs — Get notification delivery logs
 */
const logs = async (req, res, next) => {
  try {
    const data = await notificationService.getLogs(req.schoolId, parseInt(req.query.limit) || 50);
    return success(res, { data });
  } catch (err) {
    next(err);
  }
};

module.exports = { send, sendBulk, logs };
