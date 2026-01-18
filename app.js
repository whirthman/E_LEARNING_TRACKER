// Learning Journal app.js
// Storage key
const STORAGE_KEY = 'learningSessions';

// init
function initLocalStorage(){
  if(!localStorage.getItem(STORAGE_KEY)) localStorage.setItem(STORAGE_KEY, JSON.stringify([]));
  // init categories and languages storage
  if(!localStorage.getItem('lj_categories')) localStorage.setItem('lj_categories', JSON.stringify(['Algorithms','Web','Mobile','ML','Networking','Systems','IoT']));
  if(!localStorage.getItem('lj_languages')) localStorage.setItem('lj_languages', JSON.stringify(['JavaScript','Python','C++','None']));
}

function loadSessions(){
  try{ return JSON.parse(localStorage.getItem(STORAGE_KEY) || '[]'); }catch(e){ return []; }
}

function saveSessions(sessions){
  localStorage.setItem(STORAGE_KEY, JSON.stringify(sessions));
}

function uid(){ return Date.now().toString(36) + Math.random().toString(36).slice(2,6); }

function nextSessionNumber(sessions){
  if(!sessions.length) return 1;
  const nums = sessions.map(s=>parseInt(s.sessionNumber||0)||0);
  return Math.max(...nums) + 1;
}

function calculateDuration(date, start, end){
  try{
    const s = new Date(`${date}T${start}`);
    const e = new Date(`${date}T${end}`);
    let diff = (e - s) / 60000;
    if(diff < 0) diff += 24*60;
    return Math.round(diff);
  }catch(e){return 0}
}

// Add session (internal use)
function addSession(session){
  const sessions = loadSessions();
  session.id = uid();
  session.createdAt = new Date().toISOString();
  session.updatedAt = session.createdAt;
  session.sessionNumber = nextSessionNumber(sessions);
  sessions.push(session);
  saveSessions(sessions);
  return session;
}

function updateSession(id, updated){
  const sessions = loadSessions();
  const idx = sessions.findIndex(s=>s.id===id);
  if(idx === -1) return null;
  updated.updatedAt = new Date().toISOString();
  sessions[idx] = {...sessions[idx], ...updated};
  saveSessions(sessions);
  return sessions[idx];
}

function deleteSession(id){
  if(!confirm('Delete this session?')) return false;
  let sessions = loadSessions();
  sessions = sessions.filter(s=>s.id!==id);
  saveSessions(sessions);
  renderSessions();
  return true;
}

// Render sessions table and analytics
function renderSessions(){
  const tbody = document.querySelector('#sessionsTable tbody');
  tbody.innerHTML = '';
  let sessions = loadSessions();

  // filters
  const q = (document.getElementById('search').value || '').toLowerCase();
  const cat = document.getElementById('filterCategory').value || '';
  const type = document.getElementById('filterType').value || '';

  sessions = sessions.filter(s => {
    if(q){ const text = (s.topicTitle + ' ' + (s.personalNotes||'') + ' ' + (s.category||'')).toLowerCase(); if(!text.includes(q)) return false; }
    if(cat && s.category !== cat) return false;
    if(type && s.sessionType !== type) return false;
    return true;
  });

  // sort by date desc then startTime
  sessions.sort((a,b)=>{ if(a.date === b.date) return (b.startTime||'').localeCompare(a.startTime||''); return b.date.localeCompare(a.date); });

  sessions.forEach(s=>{
    const tr = document.createElement('tr');
    const timeRange = (s.startTime || '') + (s.endTime ? ' — ' + s.endTime : '');
    const topic = escapeHtml(s.topicTitle) + (s.resourceTitle ? `<div class="resource-sub">${escapeHtml(s.resourceTitle)}</div>` : '');
    tr.innerHTML = `
      <td>${s.sessionNumber}</td>
      <td>${s.date}</td>
      <td>${timeRange}</td>
      <td>${topic}</td>
      <td>${s.durationMinutes} min</td>
      <td><span class="chip">${escapeHtml(s.category||'')}</span></td>
      <td>${escapeHtml(s.sessionType||'')}</td>
      <td>
        <button class="small view btn-icon" onclick="viewSessionDetails('${s.id}')" title="View full details"><svg viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg"><path d="M12 5c-4.5 0-8.5 3-10 7 1.5 4 5.5 7 10 7s8.5-3 10-7c-1.5-4-5.5-7-10-7z" stroke="currentColor" stroke-width="1.2" stroke-linecap="round" stroke-linejoin="round"/><circle cx="12" cy="12" r="2.5" stroke="currentColor" stroke-width="1.2"/></svg>View</button>
        <button class="small edit btn-icon" data-id="${s.id}" onclick="startEdit('${s.id}')" title="Edit session"><svg viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg"><path d="M4 21h4l11-11a2.8 2.8 0 0 0 0-4L19 2a2.8 2.8 0 0 0-4 0L4 13v8z" stroke="currentColor" stroke-width="1.2" stroke-linecap="round" stroke-linejoin="round"/></svg>Edit</button>
        <button class="small delete btn-icon" onclick="deleteSession('${s.id}')" title="Delete session"><svg viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg"><path d="M3 6h18" stroke="currentColor" stroke-width="1.2" stroke-linecap="round" stroke-linejoin="round"/><path d="M8 6v12a2 2 0 0 0 2 2h4a2 2 0 0 0 2-2V6" stroke="currentColor" stroke-width="1.2" stroke-linecap="round" stroke-linejoin="round"/><path d="M10 11v6M14 11v6" stroke="currentColor" stroke-width="1.2" stroke-linecap="round" stroke-linejoin="round"/></svg>Delete</button>
      </td>`;
    tbody.appendChild(tr);
  });

  calculateAnalytics();
  populateCategoryFilter();
}

function populateCategoryFilter(){
  const cats = JSON.parse(localStorage.getItem('lj_categories')||'[]');
  const sel = document.getElementById('filterCategory');
  sel.innerHTML = '<option value="">All Categories</option>' + cats.map(c=>`<option>${escapeHtml(c)}</option>`).join('');
}

function calculateAnalytics(){
  const sessions = loadSessions();
  document.getElementById('totalSessions').textContent = sessions.length;
  const totalMin = sessions.reduce((a,b)=>a + (parseInt(b.durationMinutes)||0),0);
  document.getElementById('totalTime').textContent = `${totalMin} min (${(totalMin/60).toFixed(1)} hrs)`;

  // sessions per category
  const counts = {};
  sessions.forEach(s=>{ counts[s.category] = (counts[s.category]||0) + 1; });
  const catDiv = document.getElementById('categoryCounts');
  catDiv.innerHTML = Object.keys(counts).length ? Object.entries(counts).map(([c,n])=>`${escapeHtml(c)}:${n}`).join(' • ') : '—';

  // streak (consecutive days with sessions)
  const days = [...new Set(sessions.map(s=>s.date))].sort().reverse();
  let streak = 0; let cur = new Date();
  for(let i=0;i<days.length;i++){
    const d = new Date(days[i]); const diff = Math.floor((stripTime(cur)-stripTime(d))/(24*60*60*1000));
    if(diff === streak) streak++; else if(diff > streak) break;
  }
  document.getElementById('streak').textContent = streak;
}

function stripTime(d){ return new Date(d.getFullYear(),d.getMonth(),d.getDate()); }

function viewSessionDetails(id){
  const sessions = loadSessions();
  const s = sessions.find(x=>x.id===id); if(!s) return;
  window.currentViewSessionId = id;
  
  const modal = document.getElementById('detailsModal');
  if(modal){
    document.getElementById('detailsSessionNumber').textContent = s.sessionNumber;
    document.getElementById('detailsDate').textContent = s.date + ' (' + (s.dayOfWeek || '') + ')';
    document.getElementById('detailsTime').textContent = (s.startTime || '') + (s.endTime ? ' — ' + s.endTime : '');
    document.getElementById('detailsTopic').textContent = s.topicTitle;
    document.getElementById('detailsCategory').textContent = s.category || '—';
    document.getElementById('detailsType').textContent = s.sessionType || '—';
    document.getElementById('detailsDuration').textContent = (s.durationMinutes || 0) + ' min';
    document.getElementById('detailsResource').textContent = s.resourceTitle ? s.resourceTitle + ' (' + (s.resourceType || '') + ')' : '—';
    document.getElementById('detailsLanguages').textContent = (Array.isArray(s.languageUsed) ? s.languageUsed : []).join(', ') || '—';
    document.getElementById('detailsModes').textContent = (Array.isArray(s.learningModes) ? s.learningModes : []).join(', ') || '—';
    document.getElementById('detailsTools').textContent = (Array.isArray(s.toolsUsed) ? s.toolsUsed : []).join(', ') || '—';
    document.getElementById('detailsStatus').textContent = s.completionStatus || '—';
    document.getElementById('detailsDifficulty').textContent = s.difficultyLevel || '—';
    document.getElementById('detailsFocus').textContent = s.focusLevel || '—';
    document.getElementById('detailsUnderstanding').textContent = s.understandingLevel || '—';
    document.getElementById('detailsInsights').textContent = s.keyInsights || '—';
    document.getElementById('detailsConfusions').textContent = s.confusions || '—';
    document.getElementById('detailsNotes').textContent = s.personalNotes || '—';
    document.getElementById('detailsMentalState').textContent = s.mentalState || '—';
    document.getElementById('detailsPhysicalState').textContent = s.physicalState || '—';
    document.getElementById('detailsEffort').textContent = s.mentalEffortScore || '—';
    modal.setAttribute('aria-hidden','false');
  }
}

function editFromDetails(){
  const id = window.currentViewSessionId;
  if(id){
    document.getElementById('detailsModal').setAttribute('aria-hidden','true');
    startEdit(id);
  }
}

function closeDetailsModalBtn(){
  document.getElementById('detailsModal').setAttribute('aria-hidden','true');
}

function startEdit(id){
  const sessions = loadSessions();
  const s = sessions.find(x=>x.id===id); if(!s) return;
  document.getElementById('id').value = s.id;
  document.getElementById('sessionNumber').value = s.sessionNumber;
  document.getElementById('date').value = s.date;
  document.getElementById('startTime').value = s.startTime;
  document.getElementById('endTime').value = s.endTime;
  document.getElementById('durationMinutes').value = s.durationMinutes;
  document.getElementById('topicTitle').value = s.topicTitle;
  // categories/populated select
  populateCategorySelect();
  document.getElementById('categorySelect').value = s.category;
  document.getElementById('sessionType').value = s.sessionType;
  document.getElementById('difficultyLevel').value = s.difficultyLevel;
  document.getElementById('focusLevel').value = s.focusLevel;
  document.getElementById('understandingLevel').value = s.understandingLevel;
  document.getElementById('completionStatus').value = s.completionStatus;
  document.getElementById('repeatNeeded').value = s.repeatNeeded ? 'true' : 'false';
  document.getElementById('resourceType').value = s.resourceType || '';
  document.getElementById('resourceTitle').value = s.resourceTitle || '';
  document.getElementById('resourcePlatform').value = s.resourcePlatform || '';
  document.getElementById('resourceLink').value = s.resourceLink || '';
  document.querySelectorAll('.mode').forEach(inp=> inp.checked = (s.learningModes||[]).includes(inp.value));
  document.getElementById('primaryMode').value = s.primaryMode || '';
  // languages multi-select
  populateLanguagesSelect();
  const langs = s.languageUsed || [];
  const sel = document.getElementById('languagesSelect');
  for(let i=0;i<sel.options.length;i++) sel.options[i].selected = langs.includes(sel.options[i].value);
  document.getElementById('toolsUsed').value = (s.toolsUsed||[]).join(', ');
  document.getElementById('conceptType').value = s.conceptType || '';
  document.getElementById('keyInsights').value = s.keyInsights || '';
  document.getElementById('confusions').value = s.confusions || '';
  document.getElementById('personalNotes').value = s.personalNotes || '';
  document.getElementById('mentalState').value = s.mentalState || '';
  document.getElementById('physicalState').value = s.physicalState || '';
  document.getElementById('mentalEffort').value = s.mentalEffortScore || '';
  // open modal for editing
  const modalEl = document.getElementById('modal'); if(modalEl) modalEl.setAttribute('aria-hidden','false');
}

function clearForm(){
  document.getElementById('sessionForm').reset();
  document.getElementById('id').value = '';
  document.getElementById('sessionNumber').value = '';
}

function submitForm(e){
  e.preventDefault();
  const id = document.getElementById('id').value;
  const date = document.getElementById('date').value;
  const startTime = document.getElementById('startTime').value;
  const endTime = document.getElementById('endTime').value;
  const duration = parseInt(document.getElementById('durationMinutes').value) || calculateDuration(date, startTime, endTime);
  const learningModes = [...document.querySelectorAll('.mode:checked')].map(i=>i.value);
  // languages selected
  const langSel = [...document.getElementById('languagesSelect').selectedOptions].map(o=>o.value);

  const rec = {
    sessionNumber: parseInt(document.getElementById('sessionNumber').value) || null,
    date: date,
    dayOfWeek: date ? new Date(date).toLocaleDateString(undefined,{weekday:'long'}) : '',
    startTime: startTime,
    endTime: endTime,
    durationMinutes: duration,
    topicTitle: document.getElementById('topicTitle').value,
    category: document.getElementById('categorySelect').value,
    sessionType: document.getElementById('sessionType').value,
    difficultyLevel: document.getElementById('difficultyLevel').value,
    focusLevel: document.getElementById('focusLevel').value,
    understandingLevel: document.getElementById('understandingLevel').value,
    completionStatus: document.getElementById('completionStatus').value,
    repeatNeeded: document.getElementById('repeatNeeded').value === 'true',
    resourceType: document.getElementById('resourceType').value,
    resourceTitle: document.getElementById('resourceTitle').value,
    resourcePlatform: document.getElementById('resourcePlatform').value,
    resourceLink: document.getElementById('resourceLink').value,
    learningModes: learningModes,
    primaryMode: document.getElementById('primaryMode').value,
    languageUsed: langSel,
    toolsUsed: (document.getElementById('toolsUsed').value || '').split(',').map(s=>s.trim()).filter(Boolean),
    conceptType: document.getElementById('conceptType').value,
    keyInsights: document.getElementById('keyInsights').value,
    confusions: document.getElementById('confusions').value,
    personalNotes: document.getElementById('personalNotes').value,
    mentalState: document.getElementById('mentalState').value,
    physicalState: document.getElementById('physicalState').value,
    mentalEffortScore: parseInt(document.getElementById('mentalEffort').value) || null,
    updatedAt: new Date().toISOString()
  };

  // create or update
  if(id){
    // update
    const sessions = loadSessions();
    const existing = sessions.find(s=>s.id===id);
    if(existing){ rec.sessionNumber = existing.sessionNumber; updateSession(id, {...existing, ...rec}); }
  } else {
    // ensure sessionNumber assigned
    const s = addSession(rec);
  }

  clearForm(); renderSessions();
}

// Categories and languages helpers
function populateCategorySelect(){
  const cats = JSON.parse(localStorage.getItem('lj_categories')||'[]');
  const sel = document.getElementById('categorySelect');
  sel.innerHTML = cats.map(c=>`<option>${escapeHtml(c)}</option>`).join('');
}

function addCategory(name){
  if(!name) return;
  const cats = JSON.parse(localStorage.getItem('lj_categories')||'[]');
  if(!cats.includes(name)){
    cats.push(name);
    localStorage.setItem('lj_categories', JSON.stringify(cats));
  }
  populateCategorySelect(); populateCategoryFilter();
}

function populateLanguagesSelect(){
  const langs = JSON.parse(localStorage.getItem('lj_languages')||'[]');
  const sel = document.getElementById('languagesSelect');
  sel.innerHTML = langs.map(l=>`<option>${escapeHtml(l)}</option>`).join('');
}

function addLanguage(name){
  if(!name) return;
  const langs = JSON.parse(localStorage.getItem('lj_languages')||'[]');
  if(!langs.includes(name)){
    langs.push(name);
    localStorage.setItem('lj_languages', JSON.stringify(langs));
  }
  populateLanguagesSelect();
}

// CSV export/import
function exportCSV(){
  const sessions = loadSessions();
  const headers = [
    'id','sessionNumber','date','dayOfWeek','startTime','endTime','durationMinutes','topicTitle','category','sessionType','difficultyLevel','focusLevel','understandingLevel','completionStatus','repeatNeeded','resourceType','resourceTitle','resourcePlatform','resourceLink','learningModes','primaryMode','languageUsed','toolsUsed','conceptType','keyInsights','confusions','personalNotes','mentalState','physicalState','mentalEffortScore','createdAt','updatedAt'
  ];
  let csv = headers.join(',') + '\n';
  sessions.forEach(s=>{
    const row = headers.map(h => '"' + ((s[h]===undefined||s[h]===null)? '': (Array.isArray(s[h])? s[h].join(';') : s[h]).toString().replace(/"/g,'""')) + '"');
    csv += row.join(',') + '\n';
  });
  const blob = new Blob([csv], {type:'text/csv'});
  const url = URL.createObjectURL(blob); const a = document.createElement('a'); a.href = url; a.download = `learning_sessions_${new Date().toISOString().slice(0,10)}.csv`; a.click();
}

function importCSV(event){
  const file = event.target.files[0]; if(!file) return;
  const reader = new FileReader();
  reader.onload = e => {
    const text = e.target.result;
    const lines = text.split(/\r?\n/).filter(Boolean);
    if(lines.length < 2) return alert('CSV empty');
    const headers = lines[0].split(',').map(h=>h.replace(/^"|"$/g,''));
    const newSessions = [];
    for(let i=1;i<lines.length;i++){
      const cols = parseCSVLine(lines[i]);
      const obj = {};
      headers.forEach((h,idx)=>{
        let val = cols[idx] || '';
        // arrays stored as semicolon
        if(['learningModes','toolsUsed'].includes(h)) val = val ? val.split(';').map(s=>s.trim()).filter(Boolean) : [];
        if(h==='repeatNeeded') val = val.toLowerCase()==='true';
        obj[h] = val;
      });
      if(!obj.id) obj.id = uid();
      obj.createdAt = obj.createdAt || new Date().toISOString(); obj.updatedAt = new Date().toISOString();
      newSessions.push(obj);
    }
    const sessions = loadSessions().concat(newSessions);
    saveSessions(sessions);
    renderSessions();
    alert('Imported ' + newSessions.length + ' sessions');
  };
  reader.readAsText(file);
}

function parseCSVLine(line){
  const res = []; let cur=''; let inQuotes=false;
  for(let i=0;i<line.length;i++){
    const ch = line[i];
    if(ch === '"'){ if(inQuotes && line[i+1] === '"'){ cur += '"'; i++; } else inQuotes = !inQuotes; }
    else if(ch === ',' && !inQuotes){ res.push(cur); cur=''; }
    else cur += ch;
  }
  res.push(cur);
  return res.map(s=>s.replace(/^"|"$/g,''));
}

function escapeHtml(s){ return (s||'').toString().replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;'); }

// wire UI
document.addEventListener('DOMContentLoaded', ()=>{
  initLocalStorage();
  renderSessions();
  populateCategorySelect();
  populateLanguagesSelect();

  // Hamburger menu toggle
  const hamburger = document.getElementById('hamburger');
  const navMenu = document.getElementById('navMenu');
  if(hamburger){
    hamburger.addEventListener('click', ()=>{
      navMenu.classList.toggle('active');
      hamburger.classList.toggle('active');
    });
    // Close menu when clicking outside
    document.addEventListener('click', (e)=>{
      if(!e.target.closest('.top')){
        navMenu.classList.remove('active');
        hamburger.classList.remove('active');
      }
    });
  }

  // Category filter toggle
  const categoryToggle = document.getElementById('categoryToggle');
  const categoryDropdown = document.getElementById('categoryDropdown');
  const expandBtn = document.getElementById('expandCategories');
  
  if(categoryToggle){
    categoryToggle.addEventListener('click', ()=>{
      categoryDropdown.classList.toggle('active');
      categoryToggle.classList.toggle('active');
    });
  }

  if(expandBtn){
    expandBtn.addEventListener('click', (e)=>{
      e.stopPropagation();
      const select = document.getElementById('filterCategory');
      const isExpanded = select.size > 1;
      if(isExpanded){
        select.size = 1;
        expandBtn.textContent = 'Show More';
      } else {
        const optionCount = select.options.length;
        select.size = Math.min(optionCount, 8);
        expandBtn.textContent = 'Show Less';
      }
    });
  }

  // new session button / modal wiring
  const modal = document.getElementById('modal');
  const detailsModal = document.getElementById('detailsModal');
  const newBtn = document.getElementById('newBtn');
  const closeModal = document.getElementById('closeModal');
  const closeDetailsModal = document.getElementById('closeDetailsModal');
  newBtn.addEventListener('click', ()=>{
    navMenu.classList.remove('active');
    hamburger.classList.remove('active');
    clearForm();
    document.getElementById('sessionNumber').value = nextSessionNumber(loadSessions());
    document.getElementById('date').value = (new Date()).toISOString().slice(0,10);
    document.getElementById('startTime').value = new Date().toTimeString().slice(0,5);
    modal.setAttribute('aria-hidden','false');
    const t = document.getElementById('topicTitle'); if(t) t.focus();
  });
  closeModal.addEventListener('click', ()=>{ modal.setAttribute('aria-hidden','true'); clearForm(); });
  closeDetailsModal.addEventListener('click', ()=>{ detailsModal.setAttribute('aria-hidden','true'); });
  window.addEventListener('click', (e)=>{ if(e.target==modal){ modal.setAttribute('aria-hidden','true'); clearForm(); } if(e.target==detailsModal){ detailsModal.setAttribute('aria-hidden','true'); } });

  // add category / language buttons
  const addCatBtn = document.getElementById('addCategoryBtn');
  if(addCatBtn) addCatBtn.addEventListener('click', ()=>{ const v = document.getElementById('newCategoryInput').value.trim(); if(v){ addCategory(v); document.getElementById('newCategoryInput').value=''; } });
  const addLangBtn = document.getElementById('addLanguageBtn');
  if(addLangBtn) addLangBtn.addEventListener('click', ()=>{ const v = document.getElementById('newLanguageInput').value.trim(); if(v){ addLanguage(v); document.getElementById('newLanguageInput').value=''; } });

  document.getElementById('sessionForm').addEventListener('submit', submitForm);
  document.getElementById('clearForm').addEventListener('click', clearForm);
  document.getElementById('exportBtn').addEventListener('click', exportCSV);
  document.getElementById('csvFile').addEventListener('change', importCSV);
  document.getElementById('importBtn').addEventListener('click', ()=>document.getElementById('csvFile').click());
  const clearDataBtn = document.getElementById('clearDataBtn');
  if(clearDataBtn) clearDataBtn.addEventListener('click', ()=>{
    if(!confirm('Clear all Learning Journal data? This cannot be undone.')) return;
    localStorage.removeItem(STORAGE_KEY);
    localStorage.removeItem('lj_categories');
    localStorage.removeItem('lj_languages');
    initLocalStorage();
    renderSessions();
    alert('All data cleared');
  });
  document.getElementById('search').addEventListener('input', renderSessions);
  document.getElementById('filterCategory').addEventListener('change', renderSessions);
  document.getElementById('filterType').addEventListener('change', renderSessions);
});

// Expose functions required by spec
window.initLocalStorage = initLocalStorage;
window.addSession = addSession;
window.updateSession = updateSession;
window.deleteSession = deleteSession;
window.renderSessions = renderSessions;
window.calculateAnalytics = calculateAnalytics;
window.viewSessionDetails = viewSessionDetails;
window.editFromDetails = editFromDetails;
window.closeDetailsModalBtn = closeDetailsModalBtn;
