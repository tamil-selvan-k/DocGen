import prisma from './prisma';

async function main() {
  const repos = await prisma.repository.findMany();
  const orgs = await prisma.organization.findMany();
  console.log("Organizations in DB:", JSON.stringify(orgs, null, 2));
  console.log("Repositories in DB:", JSON.stringify(repos, null, 2));
}

main().catch(console.error).finally(() => prisma.$disconnect());
