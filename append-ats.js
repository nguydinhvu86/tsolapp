const fs = require('fs');
const schema = `

// --- ATS MODULE ---

model JobRequisition {
  id              String         @id @default(cuid())
  code            String         @unique
  title           String
  department      String?
  headcount       Int            @default(1)
  budget          Float?
  description     String         @db.LongText
  requirements    String?        @db.LongText
  status          String         @default("PENDING") // PENDING, APPROVED, REJECTED, CLOSED
  
  requesterId     String
  requester       User           @relation("Requester", fields: [requesterId], references: [id])
  
  approverId      String?
  approver        User?          @relation("Approver", fields: [approverId], references: [id])
  
  jobPostings     JobPosting[]
  applications    JobApplication[]
  
  createdAt       DateTime       @default(now())
  updatedAt       DateTime       @updatedAt
}

model JobPosting {
  id              String         @id @default(cuid())
  requisitionId   String
  requisition     JobRequisition @relation(fields: [requisitionId], references: [id], onDelete: Cascade)
  
  title           String
  content         String         @db.LongText
  channels        String?        // e.g., "Website, LinkedIn, Facebook"
  status          String         @default("DRAFT") // DRAFT, PUBLISHED, CLOSED
  
  posterId        String
  poster          User           @relation("Poster", fields: [posterId], references: [id])
  
  createdAt       DateTime       @default(now())
  updatedAt       DateTime       @updatedAt
}

model AtsCandidate {
  id              String         @id @default(cuid())
  fullName        String
  email           String?
  phone           String?
  source          String?        // Email, LinkedIn, Facebook, Referral, etc.
  skills          String?        @db.Text
  experienceYears Float?
  notes           String?        @db.Text
  cvUrl           String?        @db.LongText
  portfolioUrl    String?        @db.Text
  
  applications    JobApplication[]
  
  createdAt       DateTime       @default(now())
  updatedAt       DateTime       @updatedAt
}

model JobApplication {
  id              String         @id @default(cuid())
  candidateId     String
  candidate       AtsCandidate   @relation(fields: [candidateId], references: [id], onDelete: Cascade)
  
  requisitionId   String
  requisition     JobRequisition @relation(fields: [requisitionId], references: [id], onDelete: Cascade)
  
  stage           String         @default("SOURCED") // SOURCED, SCREENING, INTERVIEW, OFFER, HIRED, REJECTED
  status          String         @default("ACTIVE") // ACTIVE, WITHDRAWN, DISQUALIFIED
  appliedAt       DateTime       @default(now())
  
  interviews      Interview[]
  
  createdAt       DateTime       @default(now())
  updatedAt       DateTime       @updatedAt
}

model Interview {
  id              String            @id @default(cuid())
  applicationId   String
  application     JobApplication    @relation(fields: [applicationId], references: [id], onDelete: Cascade)
  
  title           String
  scheduledAt     DateTime
  durationMinutes Int               @default(60)
  location        String?           // Room or Video Link
  status          String            @default("SCHEDULED") // SCHEDULED, COMPLETED, CANCELLED
  
  interviewers    InterviewInterviewer[]
  evaluations     InterviewEvaluation[]
  
  createdAt       DateTime          @default(now())
  updatedAt       DateTime          @updatedAt
}

model InterviewInterviewer {
  interviewId   String
  userId        String
  interview     Interview   @relation(fields: [interviewId], references: [id], onDelete: Cascade)
  user          User        @relation("Interviewers", fields: [userId], references: [id], onDelete: Cascade)

  @@id([interviewId, userId])
}

model InterviewEvaluation {
  id            String      @id @default(cuid())
  interviewId   String
  evaluatorId   String
  interview     Interview   @relation(fields: [interviewId], references: [id], onDelete: Cascade)
  evaluator     User        @relation("Evaluations", fields: [evaluatorId], references: [id])
  
  score         Int?        // 1-10 or 1-100
  notes         String?     @db.LongText
  decision      String?     // RECOMMEND, REJECT, NEUTRAL
  
  createdAt     DateTime    @default(now())
  updatedAt     DateTime    @updatedAt
}
`;

fs.appendFileSync('prisma/schema.prisma', schema);
console.log('Appended to schema!');
