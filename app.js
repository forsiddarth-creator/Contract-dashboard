class ContractDashboard {
  constructor() {
    this.data = [];
    this.processedData = [];
    this.chart = null;
    this.currentDate = new Date();
    this.activeFilter = null;

    this.init();
  }

  init() {
    // Wait for libraries to load before initializing
    if (typeof XLSX === "undefined" || typeof Chart === "undefined") {
      console.log("Waiting for libraries to load...");
      setTimeout(() => this.init(), 500);
      return;
    }

    this.setupEventListeners();
    this.displayCurrentDate();
    console.log("Dashboard initialized successfully!");
  }

  setupEventListeners() {
    try {
      const fileInput = document.getElementById("fileInput");
      const fileUploadArea = document.getElementById("fileUploadArea");
      const processDataBtn = document.getElementById("processDataBtn");
      const searchInput = document.getElementById("searchInput");

      if (!fileInput || !fileUploadArea || !processDataBtn) {
        console.error("Required elements not found");
        return;
      }

      fileInput.addEventListener("change", (e) =>
        this.handleFileSelect(e).catch((err) =>
          this.showError("File selection error: " + err.message)
        )
      );

      fileUploadArea.addEventListener("dragover", (e) => {
        e.preventDefault();
        fileUploadArea.classList.add("dragover");
      });

      fileUploadArea.addEventListener("dragleave", (e) => {
        e.preventDefault();
        fileUploadArea.classList.remove("dragover");
      });

      fileUploadArea.addEventListener("drop", (e) => {
        e.preventDefault();
        fileUploadArea.classList.remove("dragover");
        const files = e.dataTransfer.files;
        if (files.length > 0) {
          this.processFile(files[0]).
