import XLSX from 'xlsx';
import bcrypt from 'bcrypt';
import path from 'path';
import fs from 'fs';

class BulkUploadController {
  constructor(db) {
    this.db = db;
  }

  // Generate sample Excel template
  async downloadTemplate(req, res) {
    try {
      const sampleData = [
        {
          EmployeeID: 'EMP001',
          Name: 'John Doe',
          Email: 'john.doe@company.com',
          Role: 'Employee',
          Department: 'Engineering',
          JobTitle: 'Software Developer',
          JoiningDate: '2024-01-15',
          Password: process.env.SAMPLE_PASSWORD || '[CHANGE_ME]'
        },
        {
          EmployeeID: 'EMP002',
          Name: 'Jane Smith',
          Email: 'jane.smith@company.com',
          Role: 'HR',
          Department: 'Human Resources',
          JobTitle: 'HR Manager',
          JoiningDate: '2024-01-20',
          Password: process.env.SAMPLE_PASSWORD || '[CHANGE_ME]'
        }
      ];

      const worksheet = XLSX.utils.json_to_sheet(sampleData);
      const workbook = XLSX.utils.book_new();
      XLSX.utils.book_append_sheet(workbook, worksheet, 'Employees');

      // Set column widths
      worksheet['!cols'] = [
        { wch: 12 }, // EmployeeID
        { wch: 20 }, // Name
        { wch: 25 }, // Email
        { wch: 12 }, // Role
        { wch: 18 }, // Department
        { wch: 20 }, // JobTitle
        { wch: 15 }, // JoiningDate
        { wch: 12 }  // Password
      ];

      const buffer = XLSX.write(workbook, { type: 'buffer', bookType: 'xlsx' });

      res.setHeader('Content-Disposition', 'attachment; filename=employee_template.xlsx');
      res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
      res.send(buffer);
    } catch (error) {
      console.error('Error generating template:', error);
      res.status(500).json({ error: 'Failed to generate template' });
    }
  }

  // Process bulk upload
  async processBulkUpload(req, res) {
    try {
      if (!req.file) {
        return res.status(400).json({ error: 'No file uploaded' });
      }

      const workbook = XLSX.readFile(req.file.path);
      const sheetName = workbook.SheetNames[0];
      const worksheet = workbook.Sheets[sheetName];
      const employees = XLSX.utils.sheet_to_json(worksheet);

      if (employees.length === 0) {
        return res.status(400).json({ error: 'Excel file is empty' });
      }

      const results = {
        success: [],
        errors: [],
        duplicates: []
      };

      for (let i = 0; i < employees.length; i++) {
        const employee = employees[i];
        const rowNumber = i + 2; // Excel row number (accounting for header)

        try {
          // Validate required fields
          const validation = this.validateEmployee(employee, rowNumber);
          if (!validation.isValid) {
            results.errors.push({
              row: rowNumber,
              data: employee,
              error: validation.error
            });
            continue;
          }

          // Check for duplicate email
          const [existingUser] = await this.db.execute(
            'SELECT id, email FROM users WHERE email = ?',
            [employee.Email]
          );

          if (existingUser.length > 0) {
            results.duplicates.push({
              row: rowNumber,
              data: employee,
              error: 'Email already exists in database'
            });
            continue;
          }

          // Hash password
          const defaultPassword = process.env.DEFAULT_EMPLOYEE_PASSWORD || 'TempPass123!';
          const hashedPassword = await bcrypt.hash(employee.Password || defaultPassword, 10);

          // Insert employee
          const [result] = await this.db.execute(
            `INSERT INTO users (name, email, password_hash, role, team, job_title, start_date, onboarding_progress, avatar_url) 
             VALUES (?, ?, ?, ?, ?, ?, ?, 0, ?)`,
            [
              employee.Name,
              employee.Email,
              hashedPassword,
              employee.Role || 'Employee',
              employee.Department || '',
              employee.JobTitle || '',
              employee.JoiningDate ? new Date(employee.JoiningDate).toISOString().split('T')[0] : null,
              `https://ui-avatars.com/api/?name=${encodeURIComponent(employee.Name)}&background=6366f1&color=fff`
            ]
          );

          results.success.push({
            row: rowNumber,
            data: employee,
            id: result.insertId
          });

        } catch (error) {
          console.error(`Error processing row ${rowNumber}:`, error);
          results.errors.push({
            row: rowNumber,
            data: employee,
            error: error.message
          });
        }
      }

      // Clean up uploaded file
      fs.unlinkSync(req.file.path);

      res.json({
        message: 'Bulk upload processed',
        summary: {
          total: employees.length,
          successful: results.success.length,
          errors: results.errors.length,
          duplicates: results.duplicates.length
        },
        results
      });

    } catch (error) {
      console.error('Bulk upload error:', error);
      
      // Clean up file if it exists
      if (req.file && fs.existsSync(req.file.path)) {
        fs.unlinkSync(req.file.path);
      }
      
      res.status(500).json({ error: 'Failed to process bulk upload', details: error.message });
    }
  }

  validateEmployee(employee, rowNumber) {
    const errors = [];

    // Required fields validation
    if (!employee.Name || employee.Name.toString().trim() === '') {
      errors.push('Name is required');
    }

    if (!employee.Email || employee.Email.toString().trim() === '') {
      errors.push('Email is required');
    } else {
      // Email format validation
      const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
      if (!emailRegex.test(employee.Email)) {
        errors.push('Invalid email format');
      }
    }

    // Role validation
    const validRoles = process.env.ALLOWED_ROLES ? process.env.ALLOWED_ROLES.split(',') : ['Employee', 'Admin', 'HR'];
    if (employee.Role && !validRoles.includes(employee.Role)) {
      errors.push('Role must be one of: Employee, Admin, HR');
    }

    // Date validation
    if (employee.JoiningDate) {
      const date = new Date(employee.JoiningDate);
      if (isNaN(date.getTime())) {
        errors.push('Invalid joining date format');
      }
    }

    return {
      isValid: errors.length === 0,
      error: errors.join(', ')
    };
  }
}

export default BulkUploadController;