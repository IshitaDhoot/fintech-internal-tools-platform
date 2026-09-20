import { PrismaClient, ApplicationStatus } from "@prisma/client";

const prisma = new PrismaClient();

const records: Array<{
  fullName: string;
  email: string;
  riskScore: number;
  status: ApplicationStatus;
  ssnLast4: string;
  dateOfBirth: string;
  address: string;
  idDocument: string;
  daysAgo: number;
}> = [
  { fullName: "Amara Okafor", email: "amara.okafor@example.com", riskScore: 12, status: "PENDING", ssnLast4: "4821", dateOfBirth: "1991-03-14", address: "412 Beacon St, Boston, MA 02115", idDocument: "US Passport", daysAgo: 1 },
  { fullName: "Diego Fernandez", email: "d.fernandez@example.com", riskScore: 67, status: "PENDING", ssnLast4: "9034", dateOfBirth: "1985-11-02", address: "88 Grove Ave, Austin, TX 78701", idDocument: "Driver's License", daysAgo: 2 },
  { fullName: "Priya Raman", email: "priya.raman@example.com", riskScore: 34, status: "APPROVED", ssnLast4: "2210", dateOfBirth: "1994-07-19", address: "15 Hill St, Seattle, WA 98109", idDocument: "State ID", daysAgo: 9 },
  { fullName: "Marcus Chen", email: "marcus.chen@example.com", riskScore: 88, status: "FLAGGED", ssnLast4: "7756", dateOfBirth: "1979-01-25", address: "903 Elm Dr, Chicago, IL 60614", idDocument: "Driver's License", daysAgo: 3 },
  { fullName: "Sofia Petrova", email: "sofia.petrova@example.com", riskScore: 55, status: "PENDING", ssnLast4: "1188", dateOfBirth: "1998-05-30", address: "27 Palm Ct, Miami, FL 33139", idDocument: "US Passport", daysAgo: 1 },
  { fullName: "James Whitfield", email: "j.whitfield@example.com", riskScore: 91, status: "REJECTED", ssnLast4: "3302", dateOfBirth: "1972-09-08", address: "1400 Ridge Rd, Denver, CO 80210", idDocument: "State ID", daysAgo: 12 },
  { fullName: "Layla Haddad", email: "layla.haddad@example.com", riskScore: 22, status: "PENDING", ssnLast4: "6645", dateOfBirth: "1996-12-11", address: "501 Birch Ln, Portland, OR 97205", idDocument: "US Passport", daysAgo: 0 },
  { fullName: "Tommy Nguyen", email: "tommy.nguyen@example.com", riskScore: 48, status: "FLAGGED", ssnLast4: "5519", dateOfBirth: "1988-04-03", address: "76 Canal St, New Orleans, LA 70130", idDocument: "Driver's License", daysAgo: 5 },
  { fullName: "Ingrid Larsen", email: "ingrid.larsen@example.com", riskScore: 8, status: "APPROVED", ssnLast4: "8090", dateOfBirth: "1993-08-22", address: "19 Fjord Way, Minneapolis, MN 55401", idDocument: "US Passport", daysAgo: 14 },
  { fullName: "Kwame Mensah", email: "kwame.mensah@example.com", riskScore: 79, status: "PENDING", ssnLast4: "4471", dateOfBirth: "1983-02-17", address: "233 Peachtree St, Atlanta, GA 30303", idDocument: "Driver's License", daysAgo: 2 },
  { fullName: "Hana Yoshida", email: "hana.yoshida@example.com", riskScore: 39, status: "PENDING", ssnLast4: "9923", dateOfBirth: "1999-10-05", address: "8 Sunset Blvd, Los Angeles, CA 90028", idDocument: "State ID", daysAgo: 4 },
  { fullName: "Robert Delgado", email: "robert.delgado@example.com", riskScore: 62, status: "FLAGGED", ssnLast4: "1367", dateOfBirth: "1976-06-28", address: "410 Mesa Ave, Phoenix, AZ 85004", idDocument: "Driver's License", daysAgo: 6 },
  { fullName: "Emily Sorensen", email: "emily.sorensen@example.com", riskScore: 18, status: "APPROVED", ssnLast4: "2745", dateOfBirth: "1995-01-09", address: "62 Lake St, Salt Lake City, UT 84101", idDocument: "US Passport", daysAgo: 10 },
  { fullName: "Andrei Volkov", email: "andrei.volkov@example.com", riskScore: 95, status: "FLAGGED", ssnLast4: "7054", dateOfBirth: "1980-03-21", address: "12 Harbor View, San Francisco, CA 94111", idDocument: "State ID", daysAgo: 2 },
  { fullName: "Fatima Al-Sayed", email: "fatima.alsayed@example.com", riskScore: 44, status: "PENDING", ssnLast4: "5178", dateOfBirth: "1990-09-16", address: "305 Cedar Ave, Detroit, MI 48226", idDocument: "US Passport", daysAgo: 3 },
  { fullName: "Lucas Moreau", email: "lucas.moreau@example.com", riskScore: 71, status: "REJECTED", ssnLast4: "8812", dateOfBirth: "1987-07-07", address: "97 River Rd, Nashville, TN 37201", idDocument: "Driver's License", daysAgo: 8 },
  { fullName: "Nia Thompson", email: "nia.thompson@example.com", riskScore: 29, status: "PENDING", ssnLast4: "0633", dateOfBirth: "1997-04-12", address: "148 Magnolia Dr, Raleigh, NC 27601", idDocument: "State ID", daysAgo: 0 },
];

async function main() {
  const existing = await prisma.userApplication.count();
  if (existing > 0 && process.env.SEED_FORCE !== "1") {
    console.log(`Database already has ${existing} applications — skipping seed (set SEED_FORCE=1 to reseed).`);
    return;
  }
  await prisma.auditLog.deleteMany();
  await prisma.userApplication.deleteMany();

  for (const r of records) {
    const submittedAt = new Date(Date.now() - r.daysAgo * 24 * 60 * 60 * 1000);
    const app = await prisma.userApplication.create({
      data: {
        fullName: r.fullName,
        email: r.email,
        riskScore: r.riskScore,
        status: r.status,
        ssnLast4: r.ssnLast4,
        dateOfBirth: r.dateOfBirth,
        address: r.address,
        idDocument: r.idDocument,
        submittedAt,
      },
    });

    // Seed plausible audit history for non-pending records
    if (r.status === "FLAGGED") {
      await prisma.auditLog.create({
        data: {
          resourceType: "UserApplication",
          resourceId: app.id,
          actorEmail: "standard.user@fintech.internal",
          actorRole: "standard",
          previousState: "PENDING",
          newState: "FLAGGED",
          reason: "Elevated risk score requires admin review",
          timestamp: new Date(submittedAt.getTime() + 3600_000),
        },
      });
    } else if (r.status === "APPROVED" || r.status === "REJECTED") {
      await prisma.auditLog.create({
        data: {
          resourceType: "UserApplication",
          resourceId: app.id,
          actorEmail: "admin@fintech.internal",
          actorRole: "admin",
          previousState: "PENDING",
          newState: r.status,
          reason: r.status === "REJECTED" ? "Failed document verification" : "All checks passed",
          timestamp: new Date(submittedAt.getTime() + 7200_000),
        },
      });
    }
  }

  const count = await prisma.userApplication.count();
  console.log(`Seeded ${count} applications`);
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
