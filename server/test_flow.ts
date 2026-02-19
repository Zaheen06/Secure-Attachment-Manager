import axios from 'axios';

const BASE_URL = 'http://localhost:5000/api';

async function testFlow() {
  try {
    console.log('--- TEST FLOW START ---');

    // 1. Login as Teacher
    console.log('1. Logging in as Teacher...');
    const teacherRes = await axios.post(`${BASE_URL}/auth/login`, {
      email: 'teacher@campus.edu',
      password: 'teacher123'
    });
    const teacherToken = teacherRes.data.token;
    console.log('   Teacher Logged In. Token:', teacherToken.substring(0, 20) + '...');

    // 2. Create Session
    console.log('2. Creating Session...');
    const sessionRes = await axios.post(`${BASE_URL}/sessions`, {
      subject: 'Computer Science 101',
      startTime: new Date().toISOString(),
      // Use Campus Center location
      locationLat: 40.7128,
      locationLng: -74.0060,
      radius: 200
    }, {
      headers: { Authorization: `Bearer ${teacherToken}` }
    });
    const sessionId = sessionRes.data.id;
    console.log('   Session Created. ID:', sessionId);

    // 3. Generate QR Code
    console.log('3. Generating QR Code...');
    const qrRes = await axios.post(`${BASE_URL}/sessions/${sessionId}/qr`, {}, {
      headers: { Authorization: `Bearer ${teacherToken}` }
    });
    const qrToken = qrRes.data.token;
    console.log('   QR Token Generated:', qrToken.substring(0, 20) + '...');

    // 4. Login as Student
    console.log('4. Logging in as Student...');
    const studentRes = await axios.post(`${BASE_URL}/auth/login`, {
      email: 'student@campus.edu',
      password: 'student123'
    });
    const studentToken = studentRes.data.token;
    console.log('   Student Logged In. Token:', studentToken.substring(0, 20) + '...');

    // 5. Mark Attendance (Success)
    console.log('5. Marking Attendance (Success Case)...');
    try {
      const attendanceRes = await axios.post(`${BASE_URL}/attendance/mark`, {
        sessionId,
        qrToken,
        location: { lat: 40.7128, lng: -74.0060 }, // Exact location
        deviceFingerprint: 'device-123-abc'
      }, {
        headers: { Authorization: `Bearer ${studentToken}` }
      });
      console.log('   Attendance Marked:', attendanceRes.data.message);
    } catch (error: any) {
      console.error('   Attendance Failed (Unexpected):', error.response?.data || error.message);
    }

    // 6. Mark Attendance (Fail - Already Marked)
    console.log('6. Marking Attendance (Fail - Already Marked)...');
    try {
        await axios.post(`${BASE_URL}/attendance/mark`, {
            sessionId,
            qrToken,
            location: { lat: 40.7128, lng: -74.0060 },
            deviceFingerprint: 'device-123-abc'
        }, {
            headers: { Authorization: `Bearer ${studentToken}` }
        });
        console.log('   Attendance Marked (Unexpected)');
    } catch (error: any) {
        console.log('   Attendance Failed (Expected):', error.response?.data?.message);
    }

    // 7. Mark Attendance (Fail - Device Mismatch)
    console.log('7. Marking Attendance (Fail - Device Mismatch)...');
    try {
        await axios.post(`${BASE_URL}/attendance/mark`, {
            sessionId,
            qrToken,
            location: { lat: 40.7128, lng: -74.0060 },
            deviceFingerprint: 'device-999-xyz' // Different device
        }, {
            headers: { Authorization: `Bearer ${studentToken}` }
        });
        console.log('   Attendance Marked (Unexpected)');
    } catch (error: any) {
        console.log('   Attendance Failed (Expected):', error.response?.data?.message);
    }

    // 8. Mark Attendance (Fail - Location Mismatch)
    console.log('8. Marking Attendance (Fail - Location Mismatch)...');
    // Login as Admin to create a new student to test fresh attendance
    // Or just create a new student via register
    console.log('   Registering new student for location test...');
    const newStudentRes = await axios.post(`${BASE_URL}/auth/register`, {
        name: "Far Away Student",
        email: `faraway${Date.now()}@test.com`,
        password: "password123",
        role: "student"
    });
    
    // Login as new student
    const loginRes = await axios.post(`${BASE_URL}/auth/login`, {
        email: newStudentRes.data.email,
        password: "password123"
    });
    const newStudentToken = loginRes.data.token;

    try {
        await axios.post(`${BASE_URL}/attendance/mark`, {
            sessionId,
            qrToken,
            location: { lat: 41.0000, lng: -75.0000 }, // Far away
            deviceFingerprint: 'device-far-away'
        }, {
            headers: { Authorization: `Bearer ${newStudentToken}` }
        });
        console.log('   Attendance Marked (Unexpected)');
    } catch (error: any) {
        console.log('   Attendance Failed (Expected):', error.response?.data?.message);
    }

    console.log('--- TEST FLOW COMPLETE ---');

  } catch (error: any) {
    console.error('TEST FAILED:', error.response?.data || error.message);
  }
}

testFlow();
