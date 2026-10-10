/* PostgreSQL-backed bridge. Existing QMS read helpers use the in-memory server snapshot,
   not browser localStorage; all mutations are HTTP requests. */
(() => {
  const base = '/api';
  const token = () => sessionStorage.getItem('qmsToken');
  const departments = new Map();
  const counters = new Map();
  let busy = false;
  async function request(path, options={}) {
    const headers = {'Content-Type':'application/json', ...(options.headers||{})};
    if (token()) headers.Authorization = `Bearer ${token()}`;
    const response = await fetch(base+path,{...options,headers});
    let data;
    try {data=await response.json();} catch { throw Error('Invalid server response'); }
    if (!response.ok || !data.success) {
      if (response.status===401 && !path.startsWith('/auth/login') && location.pathname.endsWith('/dashboard.html')) {
        QMS.clearSession(); location.replace('login.html');
      }
      throw Error(data.message||`Request failed: ${response.status}`);
    }
    return data;
  }
  const post = (url, body) => request(url,{method:'POST',body:JSON.stringify(body)});
  const mapQueue = q => ({
    id:q.id, queueNumber:q.queue_number, department:q.department_name,
    type:q.queue_type==='APPOINTMENT'?'Appointment':'Walk-In',
    status:q.status,counter:q.counter_number==null?null:`Counter ${q.counter_number}`,
    issuedTime:q.issued_at,calledTime:q.called_at,holdTime:q.hold_at,
    completedTime:q.completed_at,lastActionTime:q.updated_at||q.issued_at,
    recallCount:q.recall_count||0, calledBy:q.staff_id||null,
    priority:q.priority, history:[{type:'ISSUED',timestamp:q.issued_at},...(q.history||[])]
  });
  async function metadata() {
    const [ds,cs]=await Promise.all([request('/departments'),request('/counters')]);
    departments.clear(); counters.clear();
    ds.departments.forEach(d=>departments.set(d.department_name,d));
    cs.counters.forEach(c=>counters.set(`${c.department_name}|Counter ${c.counter_number}`,c));
    return ds.departments;
  }
  async function refresh() {
    if (busy) return;
    busy=true;
    try {
      const data=await request('/queues');
      window.QMS_REMOTE_ROWS=data.queues.map(mapQueue);
    } catch(err) {console.error('Queue refresh failed:',err);}
    finally {busy=false;}
  }
  function staffContext(dept, counter) {
    const c=counters.get(`${dept}|${counter}`);
    if(!c) throw Error('Counter is not configured in PostgreSQL');
    return {counter_id:c.id};
  }
  async function act(action, queue, dept, counter) {
    if(!queue) return {success:false,message:'Queue not found'};
    try {
      const data=await post(`/queues/${queue.id}/${action}`,staffContext(dept,counter));
      await refresh();
      return {success:true,message:data.message,queue:mapQueue({...data.queue,department_name:dept,counter_number:Number(counter.replace('Counter ',''))})};
    }catch(err){return {success:false,message:err.message};}
  }
  const originals = {getSession:QMS.getSession,clearSession:QMS.clearSession};
  QMS.clearSession=()=>{originals.clearSession();sessionStorage.removeItem('qmsToken');};
  QMS.getSession=()=>token()?originals.getSession():{department:null,counter:null,staffID:null};
  QMS.createWalkInQueue=async dept=>{
    if(!departments.size) await metadata();
    const d=departments.get(dept);
    if(!d) throw Error('Department not found in database');
    const data=await post('/queues/walk-in',{department_id:d.id});
    await refresh();
    return mapQueue({...data.queue,department_name:dept});
  };
  QMS.callQueue=async (number,dept,counter)=>act('call',QMS.getQueueByNumber(number),dept,counter);
  QMS.recallCurrent=async (dept,counter)=>act('recall',QMS.getCurrentServing(dept,counter),dept,counter);
  QMS.holdCurrent=async (dept,counter)=>act('hold',QMS.getCurrentServing(dept,counter),dept,counter);
  QMS.completeCurrent=async (dept,counter)=>act('complete',QMS.getCurrentServing(dept,counter),dept,counter);
  window.QMS_API={request,post,metadata,refresh,departments,counters};
  metadata().then(refresh).catch(err=>console.error('QMS database initialization failed:',err));
  setInterval(refresh,2500);
})();
