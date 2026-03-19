import fetch from 'node-fetch';

async function testSlotsForEventAPI() {
  try {
    const facilityId = 'b3dcf1e0-e86b-435f-a303-900caeda1a52'; // Rowe
    const courtId = 'ad9b71a8-614c-442a-b728-4c673fd5c1b6'; // Court 1
    const userId = 'd85bc42c-2368-4337-a486-8d88ff31ccfb'; // host@muster.app
    const startDate = '2026-03-11';
    const endDate = '2026-03-11';

    const url = `http://localhost:3000/api/facilities/${facilityId}/courts/${courtId}/slots-for-event?userId=${userId}&startDate=${startDate}&endDate=${endDate}`;

    console.log('\nTesting API endpoint:');
    console.log(url);
    console.log('');

    const response = await fetch(url);
    const data = await response.json();

    console.log('Response status:', response.status);
    console.log('\nResponse data:');
    console.log(JSON.stringify(data, null, 2));

    if (data.slots) {
      console.log(`\n\nTotal slots: ${data.slots.length}`);
      console.log(`Selectable slots: ${data.selectableSlots}`);
      
      const userRentals = data.slots.filter((s: any) => s.isUserRental);
      console.log(`User rentals: ${userRentals.length}`);
      
      if (userRentals.length > 0) {
        console.log('\nUser rental slots:');
        userRentals.forEach((slot: any) => {
          console.log(`  - ${slot.startTime}-${slot.endTime}: ${slot.isSelectable ? 'SELECTABLE' : 'NOT SELECTABLE'} (${slot.selectabilityReason || 'OK'})`);
        });
      }
    }
  } catch (error) {
    console.error('Error:', error);
  }
}

testSlotsForEventAPI();
