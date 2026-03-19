import axios from 'axios';

const API_URL = 'http://localhost:3000/api';

async function testDeleteEvent() {
  try {
    // First, get all events to find one to delete
    console.log('📋 Fetching events...');
    const eventsResponse = await axios.get(`${API_URL}/events`);
    const events = eventsResponse.data.data;
    
    if (events.length === 0) {
      console.log('❌ No events found to test delete');
      return;
    }

    const eventToDelete = events[0];
    console.log('🎯 Found event to delete:', {
      id: eventToDelete.id,
      title: eventToDelete.title,
      organizerId: eventToDelete.organizerId,
    });

    // Try to delete the event
    console.log('🗑️ Attempting to delete event...');
    const deleteResponse = await axios.delete(`${API_URL}/events/${eventToDelete.id}`);
    
    console.log('✅ Delete successful!');
    console.log('Response status:', deleteResponse.status);
    console.log('Response data:', deleteResponse.data);

    // Verify event is deleted
    console.log('🔍 Verifying event is deleted...');
    try {
      await axios.get(`${API_URL}/events/${eventToDelete.id}`);
      console.log('❌ Event still exists after delete!');
    } catch (err: any) {
      if (err.response?.status === 404) {
        console.log('✅ Event successfully deleted (404 returned)');
      } else {
        console.log('❓ Unexpected error:', err.message);
      }
    }

  } catch (error: any) {
    console.error('❌ Test failed:', error.message);
    if (error.response) {
      console.error('Response status:', error.response.status);
      console.error('Response data:', error.response.data);
    }
  }
}

testDeleteEvent();
