const pool=require('../config/database');
const bcrypt=require('bcrypt');
(async()=>{
 const [staffId,password]=process.argv.slice(2);
 if(!staffId || !password || password.length<12) throw Error('Usage: node scripts/set-password.js STAFF_ID "password of 12+ chars"');
 const hash=await bcrypt.hash(password,12);
 const result=await pool.query('UPDATE users SET password_hash=$1 WHERE staff_id=$2 RETURNING staff_id',[hash,staffId.toUpperCase()]);
 if(!result.rowCount) throw Error('Staff ID does not exist in users');
 console.log('Password set for',result.rows[0].staff_id);
})().catch(e=>{console.error(e.message);process.exitCode=1;}).finally(()=>pool.end());
