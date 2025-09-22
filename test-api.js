// Test the verify API endpoint
async function testVerifyAPI() {
    try {
        const response = await fetch('http://localhost:3001/api/documents/2/status', {
            method: 'PUT',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({ status: 'Verified' })
        });

        console.log('Response status:', response.status);
        const result = await response.text();
        console.log('Response body:', result);

        // Check if document was updated
        const checkResponse = await fetch('http://localhost:3001/api/documents/user/6');
        const docs = await checkResponse.json();
        console.log('Documents after update:', docs);

    } catch (error) {
        console.error('Error:', error);
    }
}

testVerifyAPI();