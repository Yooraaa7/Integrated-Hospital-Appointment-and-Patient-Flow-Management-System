const express = require('express');
const bcrypt = require('bcrypt');
const jwt = require('jsonwebtoken');
const pool = require('../config/database');
const {requireStaff} = require('../middleware/auth');
const router = express.Router();
router.post('/login', async (req,res) => {
  const {staff_id, password, department_id, counter_id} = req.body || {};
  if (!staff_id || !password || !Number.isInteger(Number(department_id)) || !Number.isInteger(Number(counter_id)))
    return res.status(400).json({success:false,message:'All login fields are required'});
  try {
    const result = await pool.query(`SELECT u.id,u.staff_id,u.full_name,u.password_hash,u.role,
        c.id AS counter_id,c.counter_number,c.department_id,d.department_name
        FROM users u JOIN counters c ON c.id=$2 AND c.department_id=$3 AND c.is_active=TRUE
        JOIN departments d ON d.id=c.department_id AND d.is_active=TRUE
        WHERE u.staff_id=$1 AND u.is_active=TRUE`,[String(staff_id).trim().toUpperCase(),counter_id,department_id]);
    const user=result.rows[0];
    if (!user || !user.password_hash || !(await bcrypt.compare(password,user.password_hash)))
      return res.status(401).json({success:false,message:'Invalid staff credentials or counter'});
    const role=user.role || 'STAFF';
    if (!['STAFF','ADMIN'].includes(role)) return res.status(403).json({success:false,message:'Role is not permitted'});
    const token=jwt.sign({sub:String(user.id),staff_id:user.staff_id,role,counter_id:user.counter_id,department_id:user.department_id},process.env.JWT_SECRET,{algorithm:'HS256',expiresIn:'8h'});
    res.json({success:true,token,staff:{staff_id:user.staff_id,name:user.full_name,role,department:user.department_name,counter:`Counter ${user.counter_number}`,counter_id:user.counter_id,department_id:user.department_id}});
  } catch(err) {console.error('Login failed',err);res.status(500).json({success:false,message:'Login unavailable'});}
});
router.get('/me', requireStaff, async(req,res)=>{
  const result=await pool.query('SELECT id,staff_id,full_name,is_active FROM users WHERE id=$1',[req.staff.sub]);
  if (!result.rows[0]?.is_active) return res.status(401).json({success:false,message:'Staff inactive'});
  res.json({success:true,staff:result.rows[0]});
});
module.exports=router;
