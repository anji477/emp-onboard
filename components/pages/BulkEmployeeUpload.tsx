import React, { useState, useRef } from 'react';
import Card from '../common/Card';
import Button from '../common/Button';
import Icon from '../common/Icon';
import Modal from '../common/Modal';

interface UploadResult {
  row: number;
  data: any;
  error?: string;
  id?: number;
}

interface BulkUploadResponse {
  message: string;
  summary: {
    total: number;
    successful: number;
    errors: number;
    duplicates: number;
  };
  results: {
    success: UploadResult[];
    errors: UploadResult[];
    duplicates: UploadResult[];
  };
}

const BulkEmployeeUpload: React.FC = () => {
  const [file, setFile] = useState<File | null>(null);
  const [uploading, setUploading] = useState(false);
  const [uploadResult, setUploadResult] = useState<BulkUploadResponse | null>(null);
  const [showResults, setShowResults] = useState(false);
  const [dragActive, setDragActive] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleDrag = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    if (e.type === 'dragenter' || e.type === 'dragover') {
      setDragActive(true);
    } else if (e.type === 'dragleave') {
      setDragActive(false);
    }
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setDragActive(false);
    
    if (e.dataTransfer.files && e.dataTransfer.files[0]) {
      const droppedFile = e.dataTransfer.files[0];
      if (droppedFile.type === 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' || 
          droppedFile.type === 'application/vnd.ms-excel' ||
          droppedFile.name.endsWith('.xlsx') || 
          droppedFile.name.endsWith('.xls')) {
        setFile(droppedFile);
      } else {
        alert('Please select an Excel file (.xlsx or .xls)');
      }
    }
  };

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      setFile(e.target.files[0]);
    }
  };

  const downloadTemplate = async () => {
    try {
      const response = await fetch('/api/employees/template');
      if (response.ok) {
        const blob = await response.blob();
        const url = window.URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = 'employee_template.xlsx';
        document.body.appendChild(a);
        a.click();
        window.URL.revokeObjectURL(url);
        document.body.removeChild(a);
      } else {
        alert('Failed to download template');
      }
    } catch (error) {
      console.error('Error downloading template:', error);
      alert('Error downloading template');
    }
  };

  const handleUpload = async () => {
    if (!file) {
      alert('Please select a file first');
      return;
    }

    setUploading(true);
    const formData = new FormData();
    formData.append('employeeFile', file);

    try {
      const response = await fetch('/api/employees/bulk-upload', {
        method: 'POST',
        body: formData,
      });

      const result = await response.json();
      
      if (response.ok) {
        setUploadResult(result);
        setShowResults(true);
        setFile(null);
        if (fileInputRef.current) {
          fileInputRef.current.value = '';
        }
      } else {
        alert(result.error || 'Upload failed');
      }
    } catch (error) {
      console.error('Upload error:', error);
      alert('Upload failed. Please try again.');
    } finally {
      setUploading(false);
    }
  };

  const resetUpload = () => {
    setFile(null);
    setUploadResult(null);
    setShowResults(false);
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-3xl font-bold text-gray-800 dark:text-white">Bulk Employee Upload</h1>
          <p className="text-gray-600 dark:text-gray-300 mt-1">Upload multiple employees using Excel file</p>
        </div>
        <Button
          onClick={downloadTemplate}
          variant="outline"
          className="flex items-center gap-2"
        >
          <Icon name="download" className="w-4 h-4" />
          Download Template
        </Button>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Upload Section */}
        <Card>
          <div className="p-6">
            <h2 className="text-xl font-semibold text-gray-800 dark:text-white mb-4">Upload Excel File</h2>
            
            {/* Drag and Drop Area */}
            <div
              className={`border-2 border-dashed rounded-lg p-8 text-center transition-colors ${
                dragActive
                  ? 'border-indigo-500 bg-indigo-50 dark:bg-indigo-900/20'
                  : 'border-gray-300 dark:border-gray-600 hover:border-gray-400 dark:hover:border-gray-500'
              }`}
              onDragEnter={handleDrag}
              onDragLeave={handleDrag}
              onDragOver={handleDrag}
              onDrop={handleDrop}
            >
              <Icon name="cloud-upload" className="w-12 h-12 text-gray-400 mx-auto mb-4" />
              <p className="text-lg font-medium text-gray-700 dark:text-gray-300 mb-2">
                Drop your Excel file here, or click to browse
              </p>
              <p className="text-sm text-gray-500 dark:text-gray-400 mb-4">
                Supports .xlsx and .xls files (max 10MB)
              </p>
              
              <input
                ref={fileInputRef}
                type="file"
                accept=".xlsx,.xls"
                onChange={handleFileSelect}
                className="hidden"
              />
              
              <Button
                onClick={() => fileInputRef.current?.click()}
                variant="outline"
                className="mb-4"
              >
                Select File
              </Button>
              
              {file && (
                <div className="mt-4 p-3 bg-gray-50 dark:bg-gray-700 rounded-md">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <Icon name="document" className="w-5 h-5 text-green-500" />
                      <span className="text-sm font-medium text-gray-700 dark:text-gray-300">
                        {file.name}
                      </span>
                      <span className="text-xs text-gray-500">
                        ({(file.size / 1024 / 1024).toFixed(2)} MB)
                      </span>
                    </div>
                    <button
                      onClick={() => setFile(null)}
                      className="text-red-500 hover:text-red-700"
                    >
                      <Icon name="x" className="w-4 h-4" />
                    </button>
                  </div>
                </div>
              )}
            </div>

            <div className="mt-6 flex gap-3">
              <Button
                onClick={handleUpload}
                disabled={!file || uploading}
                className="flex-1"
              >
                {uploading ? (
                  <>
                    <Icon name="spinner" className="w-4 h-4 mr-2 animate-spin" />
                    Processing...
                  </>
                ) : (
                  <>
                    <Icon name="upload" className="w-4 h-4 mr-2" />
                    Upload Employees
                  </>
                )}
              </Button>
              
              <Button
                onClick={resetUpload}
                variant="outline"
                disabled={uploading}
              >
                Reset
              </Button>
            </div>
          </div>
        </Card>

        {/* Instructions */}
        <Card>
          <div className="p-6">
            <h2 className="text-xl font-semibold text-gray-800 dark:text-white mb-4">Instructions</h2>
            
            <div className="space-y-4">
              <div className="flex items-start gap-3">
                <div className="w-6 h-6 bg-indigo-100 dark:bg-indigo-900 text-indigo-600 dark:text-indigo-400 rounded-full flex items-center justify-center text-sm font-semibold flex-shrink-0">
                  1
                </div>
                <div>
                  <h3 className="font-medium text-gray-800 dark:text-white">Download Template</h3>
                  <p className="text-sm text-gray-600 dark:text-gray-400">
                    Click "Download Template" to get the Excel file with required column headers.
                  </p>
                </div>
              </div>
              
              <div className="flex items-start gap-3">
                <div className="w-6 h-6 bg-indigo-100 dark:bg-indigo-900 text-indigo-600 dark:text-indigo-400 rounded-full flex items-center justify-center text-sm font-semibold flex-shrink-0">
                  2
                </div>
                <div>
                  <h3 className="font-medium text-gray-800 dark:text-white">Fill Employee Data</h3>
                  <p className="text-sm text-gray-600 dark:text-gray-400">
                    Add employee information following the template format. Required fields: Name, Email.
                  </p>
                </div>
              </div>
              
              <div className="flex items-start gap-3">
                <div className="w-6 h-6 bg-indigo-100 dark:bg-indigo-900 text-indigo-600 dark:text-indigo-400 rounded-full flex items-center justify-center text-sm font-semibold flex-shrink-0">
                  3
                </div>
                <div>
                  <h3 className="font-medium text-gray-800 dark:text-white">Upload File</h3>
                  <p className="text-sm text-gray-600 dark:text-gray-400">
                    Drag and drop or select your completed Excel file to upload.
                  </p>
                </div>
              </div>
            </div>

            <div className="mt-6 p-4 bg-yellow-50 dark:bg-yellow-900/20 border border-yellow-200 dark:border-yellow-800 rounded-md">
              <div className="flex items-start gap-2">
                <Icon name="exclamation-triangle" className="w-5 h-5 text-yellow-600 dark:text-yellow-400 flex-shrink-0 mt-0.5" />
                <div>
                  <h4 className="font-medium text-yellow-800 dark:text-yellow-200">Important Notes</h4>
                  <ul className="text-sm text-yellow-700 dark:text-yellow-300 mt-1 space-y-1">
                    <li>• Duplicate emails will be skipped</li>
                    <li>• Invalid data will be reported</li>
                    <li>• Default password is "temp123" if not provided</li>
                    <li>• Valid roles: Employee, Admin, HR</li>
                  </ul>
                </div>
              </div>
            </div>
          </div>
        </Card>
      </div>

      {/* Results Modal */}
      {showResults && uploadResult && (
        <Modal
          isOpen={true}
          onClose={() => setShowResults(false)}
          title="Upload Results"
          size="large"
        >
          <div className="space-y-6">
            {/* Summary */}
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              <div className="text-center p-4 bg-blue-50 dark:bg-blue-900/20 rounded-lg">
                <div className="text-2xl font-bold text-blue-600 dark:text-blue-400">
                  {uploadResult.summary.total}
                </div>
                <div className="text-sm text-blue-600 dark:text-blue-400">Total</div>
              </div>
              <div className="text-center p-4 bg-green-50 dark:bg-green-900/20 rounded-lg">
                <div className="text-2xl font-bold text-green-600 dark:text-green-400">
                  {uploadResult.summary.successful}
                </div>
                <div className="text-sm text-green-600 dark:text-green-400">Successful</div>
              </div>
              <div className="text-center p-4 bg-red-50 dark:bg-red-900/20 rounded-lg">
                <div className="text-2xl font-bold text-red-600 dark:text-red-400">
                  {uploadResult.summary.errors}
                </div>
                <div className="text-sm text-red-600 dark:text-red-400">Errors</div>
              </div>
              <div className="text-center p-4 bg-yellow-50 dark:bg-yellow-900/20 rounded-lg">
                <div className="text-2xl font-bold text-yellow-600 dark:text-yellow-400">
                  {uploadResult.summary.duplicates}
                </div>
                <div className="text-sm text-yellow-600 dark:text-yellow-400">Duplicates</div>
              </div>
            </div>

            {/* Detailed Results */}
            <div className="space-y-4 max-h-96 overflow-y-auto">
              {/* Successful Records */}
              {uploadResult.results.success.length > 0 && (
                <div>
                  <h3 className="font-medium text-green-600 dark:text-green-400 mb-2">
                    ✅ Successfully Created ({uploadResult.results.success.length})
                  </h3>
                  <div className="space-y-2">
                    {uploadResult.results.success.map((record, index) => (
                      <div key={index} className="p-3 bg-green-50 dark:bg-green-900/20 rounded border border-green-200 dark:border-green-800">
                        <div className="text-sm">
                          <strong>Row {record.row}:</strong> {record.data.Name} ({record.data.Email})
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Error Records */}
              {uploadResult.results.errors.length > 0 && (
                <div>
                  <h3 className="font-medium text-red-600 dark:text-red-400 mb-2">
                    ❌ Errors ({uploadResult.results.errors.length})
                  </h3>
                  <div className="space-y-2">
                    {uploadResult.results.errors.map((record, index) => (
                      <div key={index} className="p-3 bg-red-50 dark:bg-red-900/20 rounded border border-red-200 dark:border-red-800">
                        <div className="text-sm">
                          <strong>Row {record.row}:</strong> {record.data.Name || 'N/A'} ({record.data.Email || 'N/A'})
                        </div>
                        <div className="text-xs text-red-600 dark:text-red-400 mt-1">
                          Error: {record.error}
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Duplicate Records */}
              {uploadResult.results.duplicates.length > 0 && (
                <div>
                  <h3 className="font-medium text-yellow-600 dark:text-yellow-400 mb-2">
                    ⚠️ Duplicates Skipped ({uploadResult.results.duplicates.length})
                  </h3>
                  <div className="space-y-2">
                    {uploadResult.results.duplicates.map((record, index) => (
                      <div key={index} className="p-3 bg-yellow-50 dark:bg-yellow-900/20 rounded border border-yellow-200 dark:border-yellow-800">
                        <div className="text-sm">
                          <strong>Row {record.row}:</strong> {record.data.Name} ({record.data.Email})
                        </div>
                        <div className="text-xs text-yellow-600 dark:text-yellow-400 mt-1">
                          {record.error}
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>

            <div className="flex justify-end gap-3 pt-4 border-t">
              <Button onClick={() => setShowResults(false)} variant="outline">
                Close
              </Button>
            </div>
          </div>
        </Modal>
      )}
    </div>
  );
};

export default BulkEmployeeUpload;