import axios from 'axios';

const BASE_URL = 'http:"Far Away Student",
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
