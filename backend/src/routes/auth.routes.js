const router = require('express').Router();
const { register, login, ssoLogin, getMe } = require('../controllers/auth.controller');
const { protect } = require('../middleware/auth.middleware');

router.post('/register', register);
router.post('/login',    login);
router.post('/sso',      ssoLogin);
router.get('/me',        protect, getMe);

module.exports = router;
