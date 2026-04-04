const fs = require('fs');

const schemaPath = 'c:\\Users\\admin\\Documents\\CONTRACT\\prisma\\schema.prisma';
let content = fs.readFileSync(schemaPath, 'utf8');

if (!content.includes('model EmployeeProfile')) {
    // 1. Inject inside model User
    // Find the closing brace of model User
    // Note: User model ends with `atsEvaluations           InterviewEvaluation[]  @relation("Evaluations")` usually in Phase 6, but we'll just find the closing brace.
    const userMatch = content.match(/model User\s*\{[\s\S]*?\n\}/);
    if (!userMatch) throw new Error("Could not find model User");

    const userBlock = userMatch[0];
    const newRelations = `
  // Core HR Module
  employeeProfile          EmployeeProfile?
  laborContracts           LaborContract[]        @relation("UserLaborContracts")
  createdLaborContracts    LaborContract[]        @relation("ContractCreatorHr")
  payrolls                 Payroll[]
}`;
    const modifiedUserBlock = userBlock.replace(/\n\}/, newRelations);
    
    content = content.replace(userBlock, modifiedUserBlock);

    // 2. Append new models at the bottom
    const newModels = `
// --- CORE HR (PROFILE, CONTRACT, PAYROLL) MODULES ---

model EmployeeProfile {
  id              String    @id @default(cuid())
  userId          String    @unique
  user            User      @relation(fields: [userId], references: [id], onDelete: Cascade)
  
  identityNumber  String?   @unique
  taxCode         String?
  bankAccount     String?
  bankName        String?
  
  dob             DateTime?
  gender          String?   @default("OTHER") // MALE, FEMALE, OTHER
  address         String?   @db.Text
  phoneNumber     String?
  
  department      String?
  position        String?
  startDate       DateTime?
  baseSalary      Float     @default(0)
  
  createdAt       DateTime  @default(now())
  updatedAt       DateTime  @updatedAt
}

model LaborContract {
  id              String    @id @default(cuid())
  userId          String
  user            User      @relation("UserLaborContracts", fields: [userId], references: [id], onDelete: Cascade)
  
  contractNumber  String    @unique
  type            String    @default("PROBATION") // PROBATION, FULL_TIME, PART_TIME, TEMPORARY
  startDate       DateTime
  endDate         DateTime?
  status          String    @default("ACTIVE") // ACTIVE, EXPIRED, TERMINATED
  fileUrl         String?   @db.LongText
  
  creatorId       String
  creator         User      @relation("ContractCreatorHr", fields: [creatorId], references: [id])
  
  createdAt       DateTime  @default(now())
  updatedAt       DateTime  @updatedAt
}

model Payroll {
  id              String    @id @default(cuid())
  userId          String
  user            User      @relation(fields: [userId], references: [id], onDelete: Cascade)
  
  month           Int
  year            Int
  
  baseSalary      Float     @default(0)
  workDays        Float     @default(0)
  latePenalties   Float     @default(0)
  bonus           Float     @default(0)
  deductions      Float     @default(0)
  netSalary       Float     @default(0)
  status          String    @default("DRAFT") // DRAFT, APPROVED, PAID
  
  createdAt       DateTime  @default(now())
  updatedAt       DateTime  @updatedAt

  @@unique([userId, month, year])
}
`;

    content += newModels;
    fs.writeFileSync(schemaPath, content, 'utf8');
    console.log("Successfully injected Core HR structures into schema.prisma");
} else {
    console.log("Schema already modified!");
}
