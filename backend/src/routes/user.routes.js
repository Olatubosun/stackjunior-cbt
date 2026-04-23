const router = require('express').Router();
const { protect, authorise } = require('../middleware/auth.middleware');
const { User } = require('../models');

router.use(protect);

// GET all users (admin only)
router.get('/', authorise('super_admin', 'school_admin'), async (req, res, next) => {
  try {
    const users = await User.findAll({
      where: { school: req.user.school },
      attributes: { exclude: ['password'] },
    });
    res.json({ users });
  } catch (err) { next(err); }
});

// GET single user
router.get('/:id', async (req, res, next) => {
  try {
    const user = await User.findByPk(req.params.id, {
      attributes: { exclude: ['password'] },
    });
    if (!user) return res.status(404).json({ error: 'User not found.' });
    res.json({ user });
  } catch (err) { next(err); }
});

module.exports = router;
