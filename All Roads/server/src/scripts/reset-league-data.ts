import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function resetLeagueData() {
  try {
    console.log('🔄 Resetting league data...');

    // Get the host user
    const hostUser = await prisma.user.findFirst({
      where: { email: 'host@muster.app' },
    });

    if (!hostUser) {
      throw new Error('Host user not found');
    }

    console.log(`✅ Found host user: ${hostUser.firstName} ${hostUser.lastName}`);

    // Delete all existing league-related data (in correct order due to foreign keys)
    console.log('🗑️  Deleting existing league data...');
    
    // First, clear team restrictions from events
    await prisma.event.updateMany({
      data: {
        eligibilityRestrictedToTeams: [],
        eligibilityRestrictedToLeagues: [],
      },
    });
    console.log('  ✓ Cleared team/league restrictions from events');
    
    // Delete team members first
    await prisma.teamMember.deleteMany({});
    console.log('  ✓ Deleted team members');
    
    // Delete teams
    await prisma.team.deleteMany({});
    console.log('  ✓ Deleted teams');
    
    // Delete league memberships
    await prisma.leagueMembership.deleteMany({});
    console.log('  ✓ Deleted league memberships');
    
    // Delete leagues
    await prisma.league.deleteMany({});
    console.log('  ✓ Deleted leagues');
    
    console.log('✅ Deleted all existing leagues, teams, and memberships');

    // Create "Men's Pickup Basketball" league (no teams)
    console.log('📝 Creating Men\'s Pickup Basketball league...');
    const basketballLeague = await prisma.league.create({
      data: {
        name: "Men's Pickup Basketball",
        description: 'Casual pickup basketball games for men',
        sportType: 'Basketball',
        skillLevel: 'All',
        organizerId: hostUser.id,
        isActive: true,
      },
    });
    console.log(`✅ Created league: ${basketballLeague.name} (no teams)`);

    // Create "No Bull Hockey League" with 4 teams
    console.log('📝 Creating No Bull Hockey League...');
    const hockeyLeague = await prisma.league.create({
      data: {
        name: 'No Bull Hockey League',
        description: 'Competitive hockey league',
        sportType: 'Hockey',
        skillLevel: 'Intermediate',
        organizerId: hostUser.id,
        isActive: true,
      },
    });
    console.log(`✅ Created league: ${hockeyLeague.name}`);

    // Create 4 teams for hockey league
    const teamNames = ['Duckballs', 'Ballsacks', 'Maggots', 'Donkeys'];
    
    console.log('📝 Creating hockey teams...');
    for (const teamName of teamNames) {
      const team = await prisma.team.create({
        data: {
          name: teamName,
          description: `${teamName} hockey team`,
          sportType: 'Hockey',
          skillLevel: 'Intermediate',
          maxMembers: 15,
          league: {
            connect: { id: hockeyLeague.id },
          },
        },
      });

      // Add host as captain of each team
      await prisma.teamMember.create({
        data: {
          teamId: team.id,
          userId: hostUser.id,
          role: 'captain',
        },
      });

      console.log(`✅ Created team: ${team.name} (Captain: ${hostUser.firstName})`);
    }

    console.log('\n✅ League data reset complete!');
    console.log('\nSummary:');
    console.log(`- Men's Pickup Basketball (no teams)`);
    console.log(`- No Bull Hockey League (4 teams: Duckballs, Ballsacks, Maggots, Donkeys)`);
    console.log(`- Host user is organizer of both leagues and captain of all hockey teams`);

  } catch (error) {
    console.error('❌ Error resetting league data:', error);
    throw error;
  } finally {
    await prisma.$disconnect();
  }
}

resetLeagueData()
  .then(() => {
    console.log('✅ Script completed successfully');
    process.exit(0);
  })
  .catch((error) => {
    console.error('❌ Script failed:', error);
    process.exit(1);
  });
