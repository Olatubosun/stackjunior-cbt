const jwt = require('jsonwebtoken');
const crypto = require('crypto');
const { Op } = require('sequelize');
const { User, School, Class } = require('../models');

const STACKJUNIOR_BASE_URL =
  process.env.STACKJUNIOR_BASE_URL || 'https://stackjunior.com/api';
const STACKJUNIOR_LOGIN_URL =
  process.env.STACKJUNIOR_LOGIN_URL || `${STACKJUNIOR_BASE_URL}/login`;
const STACKJUNIOR_CLASSES_URL =
  process.env.STACKJUNIOR_CLASSES_URL || `${STACKJUNIOR_BASE_URL}/v2/school-admin/classes`;
const STACKJUNIOR_STUDENTS_URL =
  process.env.STACKJUNIOR_STUDENTS_URL || `${STACKJUNIOR_BASE_URL}/v2/school-admin/students`;
const STACKJUNIOR_TIMEOUT_MS = Number(process.env.STACKJUNIOR_TIMEOUT_MS || 10000);

const isEmail = (s) => typeof s === 'string' && /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(s);

const signToken = (id) =>
  jwt.sign({ id }, process.env.JWT_SECRET, { expiresIn: process.env.JWT_EXPIRES_IN });

// Preliminary classification from the login response alone. The login
// response only reveals student vs school-side; distinguishing school /
// admin / teacher / exam-officer requires a follow-up call to
// /v2/school-admin/school/user/info.
const getPreliminaryUserType = (u) => {
  if (u?.is_parent && !u?.is_school) return 'parent';
  if (u?.is_school === true)         return 'school_side'; // needs follow-up
  return 'student';
};

// Map a Stackjunior `school_user_type` string to our local CBT role.
// Stackjunior returns:  "school" | "admin" | "teacher" | "exam officer"
//                     | "student" | "parent"
// (Note the space in "exam officer".)
const mapStackjuniorTypeToRole = (sjType) => {
  switch (String(sjType || '').trim().toLowerCase()) {
    case 'school':       return 'school_admin';
    case 'admin':        return 'school_admin';
    case 'teacher':      return 'class_teacher';
    case 'exam officer':
    case 'exam_officer': return 'exam_officer';
    case 'student':      return 'student';
    case 'parent':       return null;
    default:             return null;
  }
};

const validateLoginInput = (identifier, password) => {
  if (typeof identifier !== 'string' || !identifier.trim())
    return 'Email or username is required.';
  if (identifier.length > 254)
    return 'Email or username is too long.';
  if (typeof password !== 'string' || !password)
    return 'Password is required.';
  if (password.length > 256)
    return 'Password is too long.';
  return null;
};

// POST to Stackjunior with a timeout. Returns a structured result.
const tryStackjuniorLogin = async (identifier, password) => {
  const ctrl = new AbortController();
  const timeoutId = setTimeout(() => ctrl.abort(), STACKJUNIOR_TIMEOUT_MS);
  try {
    const res = await fetch(STACKJUNIOR_LOGIN_URL, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Accept: 'application/json' },
      body: JSON.stringify({ email: identifier, password }),
      signal: ctrl.signal,
    });

    let payload = null;
    try { payload = await res.json(); } catch { /* non-JSON body */ }

    if (res.status >= 500) {
      console.error(`[stackjunior] upstream ${res.status} for identifier prefix=${identifier.slice(0, 3)}***`);
      return { ok: false, kind: 'server_error', status: res.status,
        message: 'Authentication service error. Please try again later.' };
    }
    if (!res.ok) {
      return { ok: false, kind: 'invalid', status: res.status,
        message: payload?.message || 'Invalid credentials.' };
    }
    if (payload?.status === 'success' && payload?.data?.token) {
      return { ok: true, data: payload };
    }
    return { ok: false, kind: 'invalid',
      message: payload?.message || 'Invalid credentials.' };
  } catch (err) {
    const aborted = err.name === 'AbortError';
    console.error(`[stackjunior] ${aborted ? 'timeout' : 'network error'}: ${err.message}`);
    return {
      ok: false, kind: 'unreachable',
      message: aborted
        ? 'Authentication service timed out. Please try again.'
        : 'Authentication service is currently unavailable.',
    };
  } finally {
    clearTimeout(timeoutId);
  }
};

// Light profile endpoint — authoritative source of school_user_type.
//   GET /api/v2/school-admin/school/user/info
// Returns { data: { id, ..., school_user_type, admin_school_id,
//                   is_school_admin, school_admin_class_id } }
const fetchStackjuniorUserInfo = async (jwt) => {
  const url = `${STACKJUNIOR_BASE_URL}/v2/school-admin/school/user/info`;
  const ctrl = new AbortController();
  const timeoutId = setTimeout(() => ctrl.abort(), STACKJUNIOR_TIMEOUT_MS);
  try {
    const res = await fetch(url, {
      method: 'GET',
      headers: { Authorization: `Bearer ${jwt}`, Accept: 'application/json' },
      signal: ctrl.signal,
    });
    if (!res.ok) {
      console.error(`[stackjunior] school/user/info ${res.status}`);
      return null;
    }
    const payload = await res.json().catch(() => null);
    return payload?.data || null;
  } catch (err) {
    console.error(`[stackjunior] school/user/info error: ${err.message}`);
    return null;
  } finally {
    clearTimeout(timeoutId);
  }
};

// Heavier details endpoint — use when we want the school display name + stats.
//   GET /api/v2/school-admin/user-school-details
// Returns { data: { user: {...}, school: { id, name, email, stats }, ... } }
const fetchStackjuniorSchoolDetails = async (jwt) => {
  const url = `${STACKJUNIOR_BASE_URL}/v2/school-admin/user-school-details`;
  const ctrl = new AbortController();
  const timeoutId = setTimeout(() => ctrl.abort(), STACKJUNIOR_TIMEOUT_MS);
  try {
    const res = await fetch(url, {
      method: 'GET',
      headers: { Authorization: `Bearer ${jwt}`, Accept: 'application/json' },
      signal: ctrl.signal,
    });
    if (!res.ok) {
      console.error(`[stackjunior] user-school-details ${res.status}`);
      return null;
    }
    return await res.json().catch(() => null);
  } catch (err) {
    console.error(`[stackjunior] user-school-details error: ${err.message}`);
    return null;
  } finally {
    clearTimeout(timeoutId);
  }
};

// Pull the school display name out of user-school-details (primary path)
// with defensive fallbacks.
const extractSchoolName = (payload) => {
  if (!payload) return null;
  const candidates = [
    payload?.data?.school?.name,  // documented path
    payload?.school?.name,
    payload?.data?.user?.school?.name,
    payload?.data?.school_name,
    payload?.school_name,
  ];
  return candidates.find(v => typeof v === 'string' && v.trim()) || null;
};

// Fetch the admin's classes from Stackjunior using their just-issued JWT.
// Returns an array (possibly empty) or null on any failure.
const fetchStackjuniorClasses = async (jwt) => {
  const ctrl = new AbortController();
  const timeoutId = setTimeout(() => ctrl.abort(), STACKJUNIOR_TIMEOUT_MS);
  try {
    const res = await fetch(STACKJUNIOR_CLASSES_URL, {
      method: 'GET',
      headers: { Authorization: `Bearer ${jwt}`, Accept: 'application/json' },
      signal: ctrl.signal,
    });
    if (!res.ok) {
      console.error(`[stackjunior] classes fetch ${res.status}`);
      return null;
    }
    const payload = await res.json().catch(() => null);
    // Tolerate a few common shapes: { data: [...] } / { data: { data: [...] } } / [...]
    if (Array.isArray(payload)) return payload;
    if (Array.isArray(payload?.data)) return payload.data;
    if (Array.isArray(payload?.data?.data)) return payload.data.data;
    if (Array.isArray(payload?.data?.classes)) return payload.data.classes;
    return [];
  } catch (err) {
    console.error(`[stackjunior] classes fetch error: ${err.message}`);
    return null;
  } finally {
    clearTimeout(timeoutId);
  }
};

const fullName = (obj) =>
  obj?.name || obj?.full_name
  || [obj?.first_name, obj?.last_name].filter(Boolean).join(' ').trim()
  || null;

// Resolve the school's external id + initial display name.
//   sjType = "school"                  → the user IS the school → u.id
//   sjType = "admin" | "teacher" | "exam officer" → u.admin_school_id (from info call)
//   sjType = "student"                 → u.parent (or u.parent_id)
const resolveSchoolForUser = (u, sjType, infoUser) => {
  if (sjType === 'school') {
    return { externalId: String(u.id ?? '').trim() || null, name: fullName(u) };
  }
  if (['admin', 'teacher', 'exam officer', 'exam_officer'].includes(sjType)) {
    const sid = infoUser?.admin_school_id ?? u?.admin_school_id;
    return {
      externalId: sid != null ? String(sid).trim() : null,
      // Name comes from user-school-details later; use placeholder for now
      name: null,
    };
  }
  // student
  const p = u?.parent || null;
  return {
    externalId: String(p?.id ?? u?.parent_id ?? '').trim() || null,
    name: fullName(p),
  };
};

// Upsert a single School row.
const upsertSchool = async ({ externalId, name }) => {
  if (!externalId) return null;
  let school = await School.findOne({ where: { externalId } });
  if (!school) {
    school = await School.create({
      externalId,
      name: name || `School ${externalId}`,
    });
  } else if (name && school.name !== name) {
    school.name = name;
    await school.save();
  }
  return school;
};

// Fetch the school's students from Stackjunior using an admin's JWT.
const fetchStackjuniorStudents = async (jwt) => {
  const ctrl = new AbortController();
  const timeoutId = setTimeout(() => ctrl.abort(), STACKJUNIOR_TIMEOUT_MS);
  try {
    const res = await fetch(STACKJUNIOR_STUDENTS_URL, {
      method: 'GET',
      headers: { Authorization: `Bearer ${jwt}`, Accept: 'application/json' },
      signal: ctrl.signal,
    });
    if (!res.ok) {
      console.error(`[stackjunior] students fetch ${res.status}`);
      return null;
    }
    const payload = await res.json().catch(() => null);
    if (Array.isArray(payload)) return payload;
    if (Array.isArray(payload?.data)) return payload.data;
    if (Array.isArray(payload?.data?.data)) return payload.data.data;
    return [];
  } catch (err) {
    console.error(`[stackjunior] students fetch error: ${err.message}`);
    return null;
  } finally {
    clearTimeout(timeoutId);
  }
};

/**
 * Sync the student roster: for each student returned by Stackjunior,
 * upsert a local user with their school + classId set.
 *
 * Requires that classes have already been upserted (so we can resolve
 * student.school_class_id to a local Class.id).
 */
const upsertStudentsForSchool = async (schoolId, externalStudents) => {
  if (!Array.isArray(externalStudents) || !externalStudents.length) return 0;

  // Build a lookup table: external class id → local class id
  const localClasses = await Class.findAll({ where: { schoolId } });
  const classMap = new Map(
    localClasses
      .filter(c => c.externalId)
      .map(c => [String(c.externalId), c.id])
  );

  let synced = 0;
  for (const s of externalStudents) {
    const usernameLc = s?.username ? String(s.username).toLowerCase() : null;
    const realEmail  = s?.email && isEmail(s.email) ? s.email.toLowerCase() : null;
    if (!usernameLc && !realEmail) continue;

    const emailForLocal = realEmail || `${usernameLc}@stackjunior.local`;

    // Resolve class
    const externalClassId = String(s.school_class_id ?? s.class?.id ?? '').trim();
    const localClassId    = externalClassId ? classMap.get(externalClassId) || null : null;

    const displayName =
      s.name || s.full_name
      || [s.first_name, s.last_name].filter(Boolean).join(' ').trim()
      || usernameLc || emailForLocal.split('@')[0];

    const orClauses = [{ email: emailForLocal }];
    if (usernameLc) orClauses.push({ username: usernameLc });
    let user = await User.findOne({ where: { [Op.or]: orClauses } });

    if (!user) {
      try {
        await User.create({
          name:     displayName,
          email:    emailForLocal,
          username: usernameLc,
          password: crypto.randomBytes(24).toString('hex'),
          role:     'student',
          school:   schoolId,
          classId:  localClassId,
          isActive: true,
        });
        synced++;
      } catch (err) {
        // Unique-constraint clashes (e.g. duplicate synthetic email) — skip
        console.error(`[stackjunior] sync student ${usernameLc}: ${err.message}`);
      }
    } else {
      const updates = {};
      if (usernameLc && !user.username)              updates.username = usernameLc;
      if (schoolId   && user.school !== schoolId)    updates.school   = schoolId;
      if (localClassId && user.classId !== localClassId) updates.classId = localClassId;
      if (user.role !== 'student' && !['school_admin','super_admin'].includes(user.role))
        updates.role = 'student';
      if (displayName && user.name !== displayName)  updates.name     = displayName;
      if (Object.keys(updates).length) {
        try { await user.update(updates); synced++; }
        catch (err) { console.error(`[stackjunior] update student ${usernameLc}: ${err.message}`); }
      }
    }
  }
  return synced;
};

// Upsert classes returned by Stackjunior for the given school.
// Classes are unique per school on BOTH externalId and name, and Stackjunior
// can return duplicate class names — so each row is upserted defensively and a
// row that can't be saved is skipped rather than aborting the whole sync
// (which would also skip the student roster that runs afterwards).
const upsertClassesForSchool = async (schoolId, externalClasses) => {
  if (!Array.isArray(externalClasses) || !externalClasses.length) return [];
  const results = [];
  for (const raw of externalClasses) {
    const externalId = String(raw?.id ?? raw?.class_id ?? '').trim();
    const name       = raw?.name || raw?.class_name || raw?.title;
    if (!externalId && !name) continue;
    try {
      // Match on externalId first, then fall back to name (both unique/school).
      let cls = externalId
        ? await Class.findOne({ where: { schoolId, externalId } })
        : null;
      if (!cls && name) cls = await Class.findOne({ where: { schoolId, name } });
      if (!cls) {
        cls = await Class.create({
          schoolId,
          externalId: externalId || null,
          name:       name || `Class ${externalId}`,
        });
      } else if (externalId && !cls.externalId) {
        await cls.update({ externalId });
      }
      results.push(cls);
    } catch (err) {
      // e.g. a duplicate class name — skip this one and keep going.
      console.error(`[stackjunior] sync class ${externalId || name}: ${err.message}`);
    }
  }
  return results;
};

/**
 * Create or refresh the local user mirror for someone authenticated through
 * Stackjunior. Also upserts the School and (for admins) the full class list.
 *
 * @param identifier   whatever the user typed (email or username)
 * @param payload      full login response payload { status, data: { token, user } }
 */
const upsertExternalUser = async (identifier, payload) => {
  const u   = payload?.data?.user || {};
  const jwt = payload?.data?.token;

  const realEmail    = u.email && isEmail(u.email) ? u.email.toLowerCase() : null;
  const realUsername = u.username || (!isEmail(identifier) ? identifier : null);
  const usernameLc   = realUsername ? String(realUsername).toLowerCase() : null;

  const emailForLocal =
    realEmail
    || (isEmail(identifier) ? identifier.toLowerCase() : null)
    || (usernameLc ? `${usernameLc}@stackjunior.local` : null);

  if (!emailForLocal) {
    throw new Error('External payload did not include enough info to create a local user.');
  }

  // ── Step 1: determine preliminary user type from login response ──
  const prelim = getPreliminaryUserType(u);
  if (prelim === 'parent') {
    const err = new Error('Parent accounts are not supported on this platform.');
    err.statusCode = 403;
    throw err;
  }

  // ── Step 2: for school-side users, call /school/user/info to resolve ──
  // the authoritative school_user_type (school | admin | teacher | exam officer).
  let sjType   = prelim === 'student' ? 'student' : null;
  let infoUser = null;
  if (prelim === 'school_side' && jwt) {
    infoUser = await fetchStackjuniorUserInfo(jwt);
    sjType = infoUser?.school_user_type || null;
    if (!sjType) {
      // Follow-up failed — log and bail so we don't mis-assign a role.
      const err = new Error(
        'Unable to resolve your account role from Stackjunior. Please try again.'
      );
      err.statusCode = 502;
      throw err;
    }
  }

  // ── Step 3: map to local CBT role ──
  const role = mapStackjuniorTypeToRole(sjType);
  if (!role) {
    const err = new Error('Your account role is not supported on this platform.');
    err.statusCode = 403;
    throw err;
  }

  // ── Step 4: upsert the school record ──
  const schoolIdent = resolveSchoolForUser(u, sjType, infoUser);
  const school      = await upsertSchool(schoolIdent);
  const schoolId    = school?.id || null;

  // ── Step 5: for admins/teachers/exam-officers, fetch the real school name ──
  if (schoolId && jwt && ['admin', 'teacher', 'exam officer', 'exam_officer'].includes(sjType)) {
    try {
      const details  = await fetchStackjuniorSchoolDetails(jwt);
      const realName = extractSchoolName(details);
      if (realName && school && school.name !== realName) {
        school.name = realName;
        await school.save();
      }
    } catch (err) {
      console.error(`[stackjunior] school name refresh failed: ${err.message}`);
    }
  }

  // ── Step 6: sync classes + roster for staff roles ──
  let teacherClassId = null;
  if (schoolId && jwt && ['school_admin', 'class_teacher', 'exam_officer'].includes(role)) {
    try {
      const classes = await fetchStackjuniorClasses(jwt);
      if (classes) await upsertClassesForSchool(schoolId, classes);

      // Only school/admin types sync the full student roster
      if (sjType === 'school' || sjType === 'admin') {
        const students = await fetchStackjuniorStudents(jwt);
        if (students) {
          const synced = await upsertStudentsForSchool(schoolId, students);
          if (synced) console.log(`[stackjunior] synced ${synced} student(s) for school ${schoolId}`);
        }
      }

      // For teachers, their assigned class id lives in school_admin_class_id
      const teacherExternalClassId =
        infoUser?.school_admin_class_id ?? u?.school_admin_class_id;
      if (sjType === 'teacher' && teacherExternalClassId != null) {
        const teacherClass = await Class.findOne({
          where: { schoolId, externalId: String(teacherExternalClassId) },
        });
        teacherClassId = teacherClass?.id || null;
      }
    } catch (err) {
      console.error(`[stackjunior] roster sync failed: ${err.message}`);
    }
  }

  const orClauses = [{ email: emailForLocal }];
  if (usernameLc) orClauses.push({ username: usernameLc });
  let user = await User.findOne({ where: { [Op.or]: orClauses } });

  const displayName =
    u.name || u.full_name
    || [u.first_name, u.last_name].filter(Boolean).join(' ').trim()
    || realUsername || emailForLocal.split('@')[0];

  if (!user) {
    user = await User.create({
      name:     displayName,
      email:    emailForLocal,
      username: usernameLc,
      password: crypto.randomBytes(24).toString('hex'),
      role,
      school:   schoolId,
      classId:  teacherClassId, // populated only for class teachers
      isActive: true,
    });
  } else {
    const updates = {};
    if (usernameLc && !user.username)                 updates.username = usernameLc;
    if (schoolId   && user.school !== schoolId)        updates.school   = schoolId;
    if (role       && user.role !== role)              updates.role     = role;
    if (displayName && user.name !== displayName)      updates.name     = displayName;
    if (teacherClassId && user.classId !== teacherClassId)
      updates.classId = teacherClassId;
    if (Object.keys(updates).length) await user.update(updates);
  }
  return user;
};

const issueLocalSession = async (user, source, externalExpiresIn) => {
  const token = signToken(user.id);
  const decoded = jwt.decode(token);
  const expiresIn = decoded?.exp ? decoded.exp - Math.floor(Date.now() / 1000) : null;

  let schoolName = null;
  if (user.school) {
    const school = await School.findByPk(user.school, { attributes: ['name'] });
    schoolName = school?.name || null;
  }

  return {
    token,
    tokenType: 'bearer',
    expiresIn: externalExpiresIn ?? expiresIn,
    user: {
      id:    user.id,
      name:  user.name,
      email: user.email,
      role:  user.role,
      schoolName,
    },
    source,
  };
};

exports.register = async (req, res, next) => {
  try {
    const { name, email, password, role, school, classLevel, examNumber } = req.body;
    const exists = await User.findOne({ where: { email } });
    if (exists) return res.status(400).json({ error: 'Email already registered.' });
    const user = await User.create({
      name, email, password, role, school,
      class: classLevel, examNumber,
    });
    res.status(201).json(await issueLocalSession(user, 'local'));
  } catch (err) { next(err); }
};

exports.login = async (req, res, next) => {
  const identifier = (req.body.identifier || req.body.email || req.body.username || '').trim();
  const password   = req.body.password || '';

  const validationError = validateLoginInput(identifier, password);
  if (validationError) return res.status(400).json({ error: validationError });

  const idLc = identifier.toLowerCase();
  const looksLikeEmail = isEmail(idLc);

  try {
    // 1. Try local
    const localUser = await User.findOne({
      where: looksLikeEmail
        ? { email: idLc }
        : { [Op.or]: [{ username: idLc }, { email: idLc }] },
    });

    if (localUser && (await localUser.matchPassword(password))) {
      if (!localUser.isActive)
        return res.status(401).json({ error: 'Account is inactive.' });
      return res.json(await issueLocalSession(localUser, 'local'));
    }

    // 2. Fall back to Stackjunior
    const external = await tryStackjuniorLogin(identifier, password);

    if (external.ok) {
      let user;
      try {
        user = await upsertExternalUser(identifier, external.data);
      } catch (err) {
        if (err.statusCode === 403) {
          return res.status(403).json({ error: err.message });
        }
        throw err;
      }
      if (!user.isActive)
        return res.status(401).json({ error: 'Account is inactive.' });
      return res.json(await issueLocalSession(user, 'stackjunior', external.data?.data?.expires_in));
    }

    if (external.kind === 'server_error') {
      return res.status(502).json({ error: external.message });
    }
    if (external.kind === 'unreachable') {
      return res.status(localUser ? 401 : 503).json({
        error: localUser ? 'Invalid credentials.' : external.message,
      });
    }
    return res.status(401).json({ error: external.message || 'Invalid credentials.' });
  } catch (err) {
    console.error('[auth.login] unexpected error:', err.message);
    next(err);
  }
};

/**
 * SSO entry — exchange a StackJunior-issued JWT for a local CBT session.
 *
 * Used when StackJunior redirects an already-authenticated web user to the CBT
 * (e.g. /cbt?token=...). There is no password: the StackJunior JWT itself is
 * the proof of identity. We validate it against StackJunior's authoritative
 * profile endpoint, then reuse the exact same provisioning path as password
 * login (upsertExternalUser → issueLocalSession).
 *
 * NOTE (verify on UAT): provisioning relies on the identity fields present in
 * the /school/user/info response. Staff (school/admin/teacher/exam-officer)
 * are fully resolved there; the student-token field shape (parent → school,
 * class linkage) must be confirmed against the live StackJunior API before
 * prod — see [[stackjunior-cbt-integration]].
 */
exports.ssoLogin = async (req, res, next) => {
  const token = (req.body.token || req.query.token || '').trim();
  if (!token) return res.status(400).json({ error: 'Missing SSO token.' });

  try {
    // Validate the token and resolve the authoritative account type. A null
    // result means the token is invalid/expired or the service is unreachable.
    const infoUser = await fetchStackjuniorUserInfo(token);
    if (!infoUser) {
      return res.status(401).json({ error: 'Invalid or expired single sign-on session.' });
    }

    const identifier = infoUser.email || infoUser.username || '';
    if (!identifier) {
      return res.status(502).json({ error: 'Could not resolve your account from StackJunior.' });
    }

    // Reuse the password-login provisioning by synthesising the login-response
    // shape it expects. is_school routes school-side users through the
    // authoritative /school/user/info classification inside upsertExternalUser;
    // students (no school_user_type and no admin_school_id) take the student path.
    const sjType    = String(infoUser.school_user_type || '').trim().toLowerCase();
    const isStudent = sjType === 'student' || (!sjType && infoUser.admin_school_id == null);
    const syntheticPayload = {
      data: {
        token,
        user: { ...infoUser, is_school: !isStudent, is_parent: false },
      },
    };

    let user;
    try {
      user = await upsertExternalUser(identifier, syntheticPayload);
    } catch (err) {
      if (err.statusCode === 403) return res.status(403).json({ error: err.message });
      throw err;
    }
    if (!user.isActive) return res.status(401).json({ error: 'Account is inactive.' });

    return res.json(await issueLocalSession(user, 'stackjunior-sso'));
  } catch (err) {
    console.error('[auth.ssoLogin] unexpected error:', err.message);
    next(err);
  }
};

exports.getMe = async (req, res) => {
  let schoolName = null;
  if (req.user?.school) {
    const school = await School.findByPk(req.user.school, { attributes: ['name'] });
    schoolName = school?.name || null;
  }
  res.json({ user: { ...req.user.toJSON?.() || req.user, schoolName } });
};
