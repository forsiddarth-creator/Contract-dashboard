class ContractDashboard {
  constructor() {
    this.data = [];
    this.processedData = [];
    this.chart = null;
    this.currentDate = new Date();
    this.activeFilter = null;
    this.displayColumn = null;
    this.init();
  }

  init() {
    if (typeof XLSX === 'undefined' || typeof Chart === 'undefined') {
      setTimeout(() => this.init(), 500);
      return;
    }
    this.setupEventListeners();
    this.displayCurrentDate();
  }

  setupEventListeners() {
    const fileInput = document.getElementById('fileInput');
    const fileArea = document.getElementById('fileUploadArea');
    const processBtn = document.getElementById('processDataBtn');
    const searchInput = document.getElementById('searchInput');

    fileInput.addEventListener('change', e => this.handleFileSelect(e).catch(err => this.showError(err.message)));
    fileArea.addEventListener('dragover', e => { e.preventDefault(); fileArea.classList.add('dragover'); });
    fileArea.addEventListener('dragleave', e => { e.preventDefault(); fileArea.classList.remove('dragover'); });
    fileArea.addEventListener('drop', e => {
      e.preventDefault(); fileArea.classList.remove('dragover');
      if (e.dataTransfer.files.length) this.processFile(e.dataTransfer.files[0]).catch(err => this.showError(err.message));
    });

    processBtn.addEventListener('click', () => this.processContractData().catch(err => this.showError(err.message)));
    searchInput.addEventListener('input', e => this.filterTable(e.target.value));
  }

  displayCurrentDate() {
    const opts = { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' };
    document.getElementById('currentDate').textContent = this.currentDate.toLocaleDateString('en-US', opts);
  }

  async handleFileSelect(e) {
    const file = e.target.files[0];
    if (file) await this.processFile(file);
  }

  async processFile(file) {
    if (!file.name.match(/\.(xlsx|xls)$/)) throw new Error('Invalid file');
    const reader = new FileReader();
    return new Promise((res, rej) => {
      reader.onload = () => {
        const wb = XLSX.read(reader.result, { type: 'binary' });
        const ws = wb.Sheets[wb.SheetNames[0]];
        const data = XLSX.utils.sheet_to_json(ws);
        if (!data.length) rej(new Error('No data'));
        this.data = data;
        this.showFileInfo(file.name, data.length);
        this.populateColumnSelects(data);
        res();
      };
      reader.onerror = () => rej(new Error('Read error'));
      reader.readAsBinaryString(file);
    });
  }

  showFileInfo(name, rows) {
    const fi = document.getElementById('fileInfo');
    fi.innerHTML = `<strong>File:</strong> ${name}<br><strong>Rows:</strong> ${rows}`;
    fi.classList.remove('hidden');
  }

  populateColumnSelects(data) {
    if (!data.length) return;
    const dateSel = document.getElementById('dateColumnSelect');
    const dispSel = document.getElementById('displayColumnSelect');
    dateSel.innerHTML = '<option value="">Choose expiry date column...</option>';
    dispSel.innerHTML = '<option value="">Choose what to display...</option>';
    Object.keys(data[0]).forEach(col => {
      dateSel.innerHTML += `<option>${col}</option>`;
      dispSel.innerHTML += `<option>${col}</option>`;
    });
    const validate = () => {
      document.getElementById('processDataBtn').disabled = !(dateSel.value && dispSel.value);
    };
    dateSel.onchange = validate;
    dispSel.onchange = validate;
    document.getElementById('columnSection').classList.remove('hidden');
  }

  parseDate(s) {
    if (typeof s === 'number') return new Date((s-25569)*86400*1000);
    const str = String(s).trim();
    if (/^\d{1,2}[-\/]\d{1,2}[-\/]\d{4}$/.test(str)) {
      const [d,m,y] = str.split(/[-\/]/).map(Number);
      return new Date(y,m-1,d);
    }
    const dt = new Date(str);
    return isNaN(dt) ? null : dt;
  }

  async processContractData() {
    const dateCol = document.getElementById('dateColumnSelect').value;
    const dispCol = document.getElementById('displayColumnSelect').value;
    if (!dateCol || !dispCol) throw new Error('Select columns');
    this.displayColumn = dispCol;
    this.processedData = this.data.map((row,i) => {
      const d = this.parseDate(row[dateCol]);
      const days = d?Math.ceil((d-this.currentDate)/(86400000)):NaN;
      const bucket = days<0?'Expired':days<=90?'0-90 days':days<=180?'91-180 days':'>180 days';
      return {
        sl_no:i+1,
        display_value:row[dispCol]||'N/A',
        expiry_date:d?d.toLocaleDateString():'Invalid',
        days_left:isNaN(days)?0:days,
        bucket,
        priority:bucket==='Expired'?'expired':bucket==='0-90 days'?'urgent':bucket==='91-180 days'?'medium':'low'
      };
    });
    this.updateTableHeader();
    this.activeFilter = null;
    this.updateDashboard();
  }

  updateTableHeader() {
    document.getElementById('dynamicHeader').textContent = this.displayColumn;
  }

  updateSummaryCards() {
    const cnt = {expired:0,urgent:0,medium:0,low:0};
    this.processedData.forEach(r=>cnt[r.priority]++);
    ['expiredCount','urgentCount','mediumCount','lowCount']
      .forEach(id=>document.getElementById(id).textContent=cnt[id.replace('Count','')]);
  }

  updateChart() {
    const ctx = document.getElementById('contractChart').getContext('2d');
    if (this.chart) this.chart.destroy();
    const order=['>180 days','91-180 days','0-90 days','Expired'];
    const cnt={'Expired':0,'0-90 days':0,'91-180 days':0,'>180 days':0};
    this.processedData.forEach(r=>cnt[r.bucket]++);
    const data=order.map(o=>cnt[o]);
    const colors={'Expired':'#dc2626','0-90 days':'#f59e0b','91-180 days':'#d97706','>180 days':'#059669'};
    this.chart=new Chart(ctx,{
      type:'bar',
      data:{labels:order,datasets:[{data,backgroundColor:order.map(o=>colors[o])}]},
      options:{
        responsive:true,
        plugins:{legend:{display:false}},
        onClick:(_,elems)=>{
          if(elems.length){
            const cat=order[elems[0].index];
            this.activeFilter=this.activeFilter===cat?null:cat;
            this.updateTable();
          }
        },
        scales:{y:{beginAtZero:true}}
      }
    });
  }

  updateTable() {
    const tbody=document.getElementById('tableBody');
    tbody.innerHTML='';
    let rows=this.activeFilter?
      this.processedData.filter(r=>r.bucket===this.activeFilter):
      [...this.processedData];
    if(this.activeFilter) rows.sort((a,b)=>a.days_left-b.days_left);
    rows.forEach((r,i)=>{
      const tr=document.createElement('tr');
      tr.innerHTML=`
        <td>${i+1}</td>
        <td>${r.display_value}</td>
        <td>${r.expiry_date}</td>
        <td>${r.days_left}</td>
        <td><span class="priority-badge priority-${r.priority}">${r.bucket}</span></td>
      `;
      tbody.appendChild(tr);
    });
    const hdr=document.querySelector('.table-section h3');
    hdr.textContent=this.activeFilter?
      `${this.activeFilter} Contracts (${rows.length}) - Sorted Asc`:
      `All Contracts (${this.processedData.length}) - Click chart bars`;
  }

  filterTable(term) {
    document.querySelectorAll('#tableBody tr').forEach(row=>{
      row.style.display=row.textContent.toLowerCase().includes(term.toLowerCase())?'':'none';
    });
  }

  updateDashboard() {
    document.getElementById('dashboardSection').classList.remove('hidden');
    this.updateSummaryCards();
    this.updateChart();
    this.updateTable();
  }

  showError(msg) {
    document.getElementById('errorMessage').textContent=msg;
    document.getElementById('errorSection').classList.remove('hidden');
  }

  hideError() {
    document.getElementById('errorSection').classList.add('hidden');
  }
}

document.addEventListener('DOMContentLoaded',()=>new ContractDashboard());
window.addEventListener('unhandledrejection',e=>e.preventDefault());
