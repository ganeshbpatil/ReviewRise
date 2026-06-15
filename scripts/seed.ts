import { PrismaClient } from "@prisma/client";
import { hash } from "bcryptjs";

const prisma = new PrismaClient();

async function main() {
  console.log("Seeding database...");

  // Create agency
  const agency = await prisma.agency.upsert({
    where: { slug: "demo-agency" },
    update: {},
    create: {
      name: "Demo Agency",
      slug: "demo-agency",
      email: "admin@demo.agency",
      phone: "+1 (555) 000-0000",
      website: "https://demo.agency",
      country: "US",
      timezone: "America/New_York",
    },
  });

  // Create super admin
  const adminPassword = await hash("Password123!", 12);
  const admin = await prisma.user.upsert({
    where: { email: "admin@demo.agency" },
    update: {},
    create: {
      email: "admin@demo.agency",
      name: "Agency Admin",
      passwordHash: adminPassword,
      role: "AGENCY_OWNER",
      agencyId: agency.id,
      isActive: true,
    },
  });

  // Create agency settings
  await prisma.agencySettings.upsert({
    where: { agencyId: agency.id },
    update: {},
    create: {
      agencyId: agency.id,
      defaultReplyTone: "professional",
      autoReplyEnabled: false,
      notifyOnNegative: true,
      weeklyReportEnabled: true,
    },
  });

  // Create demo clients
  const clients = await Promise.all([
    prisma.client.upsert({
      where: { agencyId_slug: { agencyId: agency.id, slug: "smiths-dental" } },
      update: {},
      create: {
        agencyId: agency.id,
        name: "Smith's Dental",
        slug: "smiths-dental",
        industry: "Dental",
        website: "https://smithsdental.com",
        email: "info@smithsdental.com",
        phone: "+1 (555) 100-2000",
      },
    }),
    prisma.client.upsert({
      where: { agencyId_slug: { agencyId: agency.id, slug: "city-law-group" } },
      update: {},
      create: {
        agencyId: agency.id,
        name: "City Law Group",
        slug: "city-law-group",
        industry: "Legal",
        website: "https://citylawgroup.com",
        email: "info@citylawgroup.com",
        phone: "+1 (555) 200-3000",
      },
    }),
    prisma.client.upsert({
      where: { agencyId_slug: { agencyId: agency.id, slug: "greenleaf-spa" } },
      update: {},
      create: {
        agencyId: agency.id,
        name: "Greenleaf Spa & Wellness",
        slug: "greenleaf-spa",
        industry: "Beauty & Wellness",
        website: "https://greenleafspa.com",
        email: "info@greenleafspa.com",
        phone: "+1 (555) 300-4000",
      },
    }),
  ]);

  // Create locations for first client
  const location = await prisma.location.upsert({
    where: { id: "loc-smiths-main" },
    update: {},
    create: {
      id: "loc-smiths-main",
      agencyId: agency.id,
      clientId: clients[0].id,
      name: "Smith's Dental - Main Office",
      address: "123 Main Street",
      city: "Chicago",
      state: "IL",
      country: "US",
      postalCode: "60601",
      phone: "+1 (555) 100-2000",
      isPrimary: true,
    },
  });

  // Create sample AI recommendations
  await prisma.aiRecommendation.createMany({
    data: [
      {
        agencyId: agency.id,
        clientId: clients[0].id,
        title: "Reply to 12 pending reviews",
        description: "You have 12 unanswered reviews. Responding within 48 hours improves reputation score by 15%.",
        category: "review_response",
        priority: "high",
        impactScore: 9.5,
        estimatedResult: "+15% reputation score",
      },
      {
        agencyId: agency.id,
        clientId: clients[0].id,
        title: "Launch a review campaign",
        description: "Send review requests to last month's customers. Industry average: 8% conversion rate.",
        category: "campaign",
        priority: "high",
        impactScore: 8.8,
        estimatedResult: "20-40 new reviews",
      },
      {
        agencyId: agency.id,
        clientId: clients[1].id,
        title: "Optimize Google Business Profile",
        description: "Update business description, add 10 recent photos, and add service areas.",
        category: "profile_optimization",
        priority: "medium",
        impactScore: 7.2,
        estimatedResult: "+25% profile views",
      },
    ],
    skipDuplicates: true,
  });

  console.log("Seeding complete!");
  console.log(`Admin login: admin@demo.agency / Password123!`);
}

main()
  .catch(console.error)
  .finally(() => prisma.$disconnect());
