class ContractDashboard {
    constructor() {
        this.data = [];
        this.processedData = [];
        this.chart = null;
        this.currentDate = new Date();
        
        this.init();
    }

    init() {
        this.setupEventListeners();
        this.displayCurrentDate();
    }

    setupEventListeners() {
        const fileInput = document.getElementById('fileInput');
        const fileUploadArea = document.getElementById('fileUploadArea');
        const processDataBtn = document.getElementById('processDataBtn');
        const searchInput = document.getElementById('searchInput');

        fileInput.addEventListener('change', (e) => this.handleFileSelect(e));
        
        fileUploadArea.addEventListener('dragover', (e) => {
            e.preventDefault();
            fileUploadArea.classList.add('dragover');
        });
        
        fileUploadArea.addEventListener('dragleave', (e) => {
            e.preventDefault();
            fileUploadArea.classList.remove('dragover');
        });
        
        fileUploadArea.addEventListener('drop', (e) => {
            e.preventDefault();
            fileUploadArea.classList.remove('dragover');
            const files = e.dataTransfer.files;
            if (files.length > 0) {
                this.processFile(files[0]);
            }
        });

        processDataBtn.addEventListener('click', () => this.processContractData());

        if (searchInput) {
            searchInput.addEventListener('input', (e) => this.filterTable(e.target.value));
        }
    }

    displayCurrentDate() {
        const options = { 
            weekday: 'long', 
            year: 'numeric', 
            month: 'long', 
            day: 'numeric' 
        };
        document.getElementById('currentDate').textContent = 
            this.currentDate.toLocaleDateString('en-US', options);
    }

    handleFileSelect(event) {
        const file = event.target.files[0];
        if (file) {
            this.processFile(file);
        }
    }

    processFile(file) {
        if (!file.name.match(/\.(xlsx|xls)$/)) {
            this.showError('Please upload a valid Excel file (.xlsx or .xls)');
            return;
        }

        const reader = new FileReader();
        reader.onload = (e) => {
            try {
                const workbook = XLSX.read(e.target.result, { type: 'binary' });
                const firstSheetName = workbook.SheetNames[0];
                const worksheet = workbook.Sheets[firstSheetName];
                const data = XLSX.utils.sheet_to_json(worksheet);
                
                this.data = data;
                this.showFileInfo(file, data.length);
                this.populateColumnSelect(data);
                this.hideError();
                
            } catch (error) {
                this.showError('Error reading Excel file: ' + error.message);
            }
        };
        reader.readAsBinaryString(file);
    }

    showFileInfo(file, rowCount) {
        const fileInfo = document.getElementById('fileInfo');
        fileInfo.innerHTML = `
            <strong>File loaded:</strong> ${file.name}<br>
            <strong>Rows:</strong> ${rowCount}
        `;
        fileInfo.classList.remove('hidden');
    }

    populateColumnSelect(data) {
        if (data.length === 0) return;
        
        const select = document.getElementById('dateColumnSelect');
        const columns = Object.keys(data[0]);
        
        select.innerHTML = '<option value="">Choose a column...</option>';
        
        columns.forEach(column => {
            const option = document.createElement('option');
            option.value = column;
            option.textContent = column;
            select.appendChild(option);
        });
        
        select.addEventListener('change', () => {
            const processBtn = document.getElementById('processDataBtn');
            processBtn.disabled = !select.value;
        });
        
        document.getElementById('columnSection').classList.remove('hidden');
    }

    // 🔧 FIXED: Smart date parsing function that handles multiple formats
    parseDate(dateStr) {
        if (!dateStr) return null;
        
        // Handle Excel numeric dates (days since 1900-01-01)
        if (typeof dateStr === 'number') {
            return new Date((dateStr - 25569) * 86400 * 1000);
        }
        
        // Convert to string and clean it
        dateStr = String(dateStr).trim();
        
        // Try different date formats
        let date = null;
        
        // Format 1: DD-MM-YYYY or DD/MM/YYYY
        if (dateStr.match(/^\d{1,2}[-\/]\d{1,2}[-\/]\d{4}$/)) {
            const parts = dateStr.split(/[-\/]/);
            const day = parseInt(parts[0], 10);
            const month = parseInt(parts[1], 10);
            const year = parseInt(parts[2], 10);
            
            // Validate date components
            if (day >= 1 && day <= 31 && month >= 1 && month <= 12 && year >= 1900) {
                date = new Date(year, month - 1, day); // month is 0-indexed
            }
        }
        
        // Format 2: YYYY-MM-DD (ISO format)
        else if (dateStr.match(/^\d{4}-\d{1,2}-\d{1,2}$/)) {
            date = new Date(dateStr);
        }
        
        // Format 3: MM/DD/YYYY (US format)
        else if (dateStr.match(/^\d{1,2}\/\d{1,2}\/\d{4}$/)) {
            date = new Date(dateStr);
        }
        
        // Format 4: Try standard Date parsing as fallback
        else {
            date = new Date(dateStr);
        }
        
        // Check if date is valid
        if (date && !isNaN(date.getTime())) {
            return date;
        }
        
        return null;
    }

    processContractData() {
        const selectedColumn = document.getElementById('dateColumnSelect').value;
        if (!selectedColumn) return;

        try {
            this.processedData = [];
            
            this.data.forEach((row, index) => {
                const expiryDateStr = row[selectedColumn];
                const expiryDate = this.parseDate(expiryDateStr);
                
                if (!expiryDate) {
                    throw new Error(`Invalid date in row ${index + 1}: ${expiryDateStr}. Please use DD-MM-YYYY, DD/MM/YYYY, or YYYY-MM-DD format.`);
                }
                
                const daysLeft = Math.ceil((expiryDate - this.currentDate) / (1000 * 60 * 60 * 24));
                const bucket = this.categorizeContract(daysLeft);
                
                this.processedData.push({
                    ...row,
                    expiry_date: expiryDate.toLocaleDateString(),
                    days_left: daysLeft,
                    bucket: bucket,
                    priority: this.getPriority(bucket)
                });
            });
            
            this.updateDashboard();
            this.hideError();
            
        } catch (error) {
            this.showError('Error processing data: ' + error.message);
        }
    }

    categorizeContract(daysLeft) {
        if (daysLeft < 0) return 'Expired';
        if (daysLeft <= 90) return '0-90 days';
        if (daysLeft <= 180) return '91-180 days';
        return '>180 days';
    }

    getPriority(bucket) {
        const priorities = {
            'Expired': 'expired',
            '0-90 days': 'urgent',
            '91-180 days': 'medium',
            '>180 days': 'low'
        };
        return priorities[bucket];
    }

    updateDashboard() {
        this.updateSummaryCards();
        this.updateChart();
        this.updateTable();
        
        document.getElementById('dashboardSection').classList.remove('hidden');
    }

    updateSummaryCards() {
        const counts = {
            expired: 0,
            urgent: 0,
            medium: 0,
            low: 0
        };
        
        this.processedData.forEach(row => {
            counts[row.priority]++;
        });
        
        document.getElementById('expiredCount').textContent = counts.expired;
        document.getElementById('urgentCount').textContent = counts.urgent;
        document.getElementById('mediumCount').textContent = counts.medium;
        document.getElementById('lowCount').textContent = counts.low;
    }

    updateChart() {
        const ctx = document.getElementById('contractChart').getContext('2d');
        
        if (this.chart) {
            this.chart.destroy();
        }
        
        const bucketCounts = {};
        this.processedData.forEach(row => {
            bucketCounts[row.bucket] = (bucketCounts[row.bucket] || 0) + 1;
        });
        
        const colors = {
            'Expired': '#dc2626',
            '0-90 days': '#f59e0b',
            '91-180 days': '#d97706',
            '>180 days': '#059669'
        };
        
        this.chart = new Chart(ctx, {
            type: 'bar',
            data: {
                labels: Object.keys(bucketCounts),
                datasets: [{
                    label: 'Number of Contracts',
                    data: Object.values(bucketCounts),
                    backgroundColor: Object.keys(bucketCounts).map(bucket => colors[bucket])
                }]
            },
            options: {
                responsive: true,
                plugins: {
                    legend: {
                        display: false
                    }
                }
            }
        });
    }

    updateTable() {
        const tbody = document.getElementById('tableBody');
        tbody.innerHTML = '';
        
        this.processedData.forEach(row => {
            const tr = document.createElement('tr');
            
            // Get first column that's not the date fields we added
            const firstColumn = Object.keys(row).find(key => 
                key !== 'expiry_date' && key !== 'days_left' && key !== 'bucket' && key !== 'priority'
            );
            
            tr.innerHTML = `
                <td>${row[firstColumn] || 'N/A'}</td>
                <td>${row.expiry_date}</td>
                <td>${row.days_left}</td>
                <td><span class="priority-badge priority-${row.priority}">${row.bucket}</span></td>
            `;
            tbody.appendChild(tr);
        });
    }

    filterTable(searchTerm) {
        const rows = document.querySelectorAll('#tableBody tr');
        rows.forEach(row => {
            const text = row.textContent.toLowerCase();
            const visible = text.includes(searchTerm.toLowerCase());
            row.style.display = visible ? '' : 'none';
        });
    }

    showError(message) {
        document.getElementById('errorMessage').textContent = message;
        document.getElementById('errorSection').classList.remove('hidden');
    }

    hideError() {
        document.getElementById('errorSection').classList.add('hidden');
    }
}

// Initialize the dashboard when page loads
document.addEventListener('DOMContentLoaded', () => {
    new ContractDashboard();
});
