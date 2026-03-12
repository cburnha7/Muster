import axios from 'axios';

const API_URL = 'http://localhost:3000/api';

async function testBookingsAPI() {
  try {
    console.log('🧪 Testing bookings API...\n');

    // Test for player@muster.app (the user with the Skating booking)
    const playerUserId = 'a6e3e977-0cea-4374-9008-047de0b0618c';
    
    console.log('📋 Fetching bookings for player@muster.app...');
    const response = await axios.get(`${API_URL}/users/bookings`, {
      params: {
        status: 'upcoming',
        page: 1,
        limit: 20,
      },
      headers: {
        'x-user-id': playerUserId, // Using the fallback header for testing
      },
    });

    console.log(`\n✅ Response status: ${response.status}`);
    console.log(`📊 Total bookings: ${response.data.data.length}`);
    console.log(`📄 Pagination:`, response.data.pagination);
    
    console.log('\n📋 Bookings:');
    response.data.data.forEach((booking: any) => {
      console.log(`\n  Booking ID: ${booking.id}`);
      console.log(`  Event: ${booking.event?.title || 'N/A'}`);
      console.log(`  Event ID: ${booking.eventId}`);
      console.log(`  Status: ${booking.status}`);
      console.log(`  Payment Status: ${booking.paymentStatus}`);
      console.log(`  Start Time: ${booking.event?.startTime}`);
      console.log(`  Has event data: ${!!booking.event}`);
    });

    // Test events API
    console.log('\n\n🎯 Fetching all events...');
    const eventsResponse = await axios.get(`${API_URL}/events`, {
      params: {
        page: 1,
        limit: 20,
      },
    });

    console.log(`\n✅ Response status: ${eventsResponse.status}`);
    console.log(`📊 Total events: ${eventsResponse.data.data.length}`);
    
    console.log('\n🎯 Events:');
    eventsResponse.data.data.forEach((event: any) => {
      console.log(`\n  Event ID: ${event.id}`);
      console.log(`  Title: ${event.title}`);
      console.log(`  Start Time: ${event.startTime}`);
      console.log(`  Participants: ${event.currentParticipants}/${event.maxParticipants}`);
    });

    // Check if Skating event is in the list
    const skatingEvent = eventsResponse.data.data.find((e: any) => 
      e.title.toLowerCase().includes('skat')
    );
    
    if (skatingEvent) {
      console.log('\n\n🛹 Found Skating event in events list:');
      console.log(`  ID: ${skatingEvent.id}`);
      console.log(`  Title: ${skatingEvent.title}`);
    } else {
      console.log('\n\n❌ Skating event NOT found in events list');
    }

  } catch (error: any) {
    console.error('❌ Error:', error.message);
    if (error.response) {
      console.error('Response data:', error.response.data);
    }
  }
}

testBookingsAPI();
