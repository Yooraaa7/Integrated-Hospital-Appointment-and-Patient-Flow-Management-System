const jwt = require('jsonwebtoken');
const pool = require('../config/database');
async function requireStaff(req, res, next) {
  const header = req.get('authorization') || '';
  const match = /^Bearer (.+)$/i.exec(header);
  if (!match) return res.status(401).json({success:false,message:'Please log in'});
  try {
    req.staff = jwt.verify(match[1], process.env.JWT_SECRET, {algorithms:['HS256']});
    if (req.staff.role !== 'STAFF' && req.staff.role !== 'ADMIN') throw Error('Invalid role');
    const result = await pool.query('SELECT id,is_active,role FROM users WHERE id=$1',[req.staff.sub]);
    if (!result.rows[0]?.is_active || result.rows[0].role !== req.staff.role)
      return res.status(401).json({success:false,message:'Staff access revoked'});
    next();
  } catch (err) { console.error('Auth validation error', err.message); res.status(401).json({success:false,message:'Session expired or invalid'}); }
}
module.exports = {requireStaff};
