const form=document.getElementById('loginForm');
const departmentSelect=document.getElementById('department');
const counterSelect=document.getElementById('counter');
const errorLabel=document.getElementById('loginError');
async function setupLogin(){
 try {
   const departments=await QMS_API.metadata();
   departmentSelect.innerHTML='<option value="">Select Department</option>';
   departments.forEach(d=>departmentSelect.add(new Option(d.department_name,d.id)));
   departmentSelect.addEventListener('change',()=>{
     counterSelect.innerHTML='<option value="">Select Counter</option>';
     for(const c of QMS_API.counters.values()) if(String(c.department_id)===departmentSelect.value)
       counterSelect.add(new Option(`Counter ${c.counter_number}`,c.id));
     counterSelect.disabled=!departmentSelect.value;
   });
 }catch(err){errorLabel.textContent='Cannot load departments: '+err.message;}
}
form.addEventListener('submit',async e=>{
 e.preventDefault();errorLabel.textContent='';
 try {
   const data=await QMS_API.post('/auth/login',{
     staff_id:document.getElementById('staffID').value.trim(),
     password:document.getElementById('password').value,
     department_id:Number(departmentSelect.value),counter_id:Number(counterSelect.value)
   });
   sessionStorage.setItem('qmsToken',data.token);
   sessionStorage.setItem('staffID',data.staff.staff_id);
   sessionStorage.setItem('department',data.staff.department);
   sessionStorage.setItem('counter',data.staff.counter);
   location.href='dashboard.html';
 }catch(err){errorLabel.textContent=err.message;}
});
setupLogin();
