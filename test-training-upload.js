// Test training upload endpoint
import fs from 'fs';

async function testTrainingUpload() {
    try {
        // Create a simple test file
        const testContent = 'This is a test PDF content';
        fs.writeFileSync('./test-training.pdf', testContent);

        const formData = new FormData();
        const file = new File([testContent], 'test-training.pdf', { type: 'application/pdf' });
        
        formData.append('trainingFile', file);
        formData.append('title', 'Test Training Module');
        formData.append('type', 'PDF');
        formData.append('duration', '30 minutes');

        console.log('Testing training upload...');
        
        const response = await fetch('http://localhost:3001/api/training/upload', {
            method: 'POST',
            body: formData
        });

        console.log('Response status:', response.status);
        const result = await response.text();
        console.log('Response:', result);

        // Clean up
        if (fs.existsSync('./test-training.pdf')) {
            fs.unlinkSync('./test-training.pdf');
        }

    } catch (error) {
        console.error('Test error:', error);
    }
}

testTrainingUpload();