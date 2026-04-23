const { Exam } = require('../models');

/**
 * Loads req.exam and enforces school/class scoping.
 *
 * Students:        must share school AND class with the exam.
 * Teachers/admins: must share school with the exam.
 *
 * Use after `protect`. Reads `req.params.id` (exam id) by default; override
 * with `examAccess('examId')` if your route uses a different param name.
 */
module.exports = (paramName = 'id') => async (req, res, next) => {
  try {
    const exam = await Exam.findByPk(req.params[paramName]);
    if (!exam) return res.status(404).json({ error: 'Exam not found.' });

    const u = req.user;
    if (!u) return res.status(401).json({ error: 'Not authenticated.' });

    if (u.role === 'student') {
      if (!u.school) {
        return res.status(403).json({
          error: 'Your account is not linked to a school. Please log in via Stackjunior to refresh.',
        });
      }
      if (exam.school !== u.school) {
        return res.status(403).json({ error: 'You do not have access to this exam.' });
      }
      // Enforce class scoping only when we know the student's class
      if (u.classId && exam.classId && exam.classId !== u.classId) {
        return res.status(403).json({ error: 'This exam is not for your class.' });
      }
    } else {
      // Teachers / admins: same school
      if (u.school && exam.school && u.school !== exam.school) {
        return res.status(403).json({ error: 'Forbidden — exam belongs to another school.' });
      }
    }

    req.exam = exam;
    next();
  } catch (err) { next(err); }
};
