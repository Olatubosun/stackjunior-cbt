const { School, Class } = require('../models');

// GET /api/schools/:id/classes — classes belonging to a school
exports.getClassesForSchool = async (req, res, next) => {
  try {
    const schoolId = req.params.id;
    // Non-admins may only query their own school
    if (!['super_admin'].includes(req.user.role) && req.user.school !== schoolId) {
      return res.status(403).json({ error: 'Forbidden.' });
    }
    const classes = await Class.findAll({
      where: { schoolId, isActive: true },
      order: [['name', 'ASC']],
    });
    res.json({ classes });
  } catch (err) { next(err); }
};

// GET /api/schools/me/classes — convenience for the logged-in user
exports.getMyClasses = async (req, res, next) => {
  try {
    if (!req.user.school) return res.json({ classes: [] });
    const classes = await Class.findAll({
      where: { schoolId: req.user.school, isActive: true },
      order: [['name', 'ASC']],
    });
    res.json({ classes });
  } catch (err) { next(err); }
};

// GET /api/schools/me — current user's school
exports.getMySchool = async (req, res, next) => {
  try {
    if (!req.user.school) return res.json({ school: null });
    const school = await School.findByPk(req.user.school);
    res.json({ school });
  } catch (err) { next(err); }
};
