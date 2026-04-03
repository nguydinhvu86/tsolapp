const fs = require('fs');
const schemaPath = 'c:\\Users\\admin\\Documents\\CONTRACT\\prisma\\schema.prisma';
let content = fs.readFileSync(schemaPath, 'utf8');

// The marker where we started appending ATS in the last step
const splitMarker = '// --- ATS (APPLICANT TRACKING SYSTEM) MODULES ---';

if (content.includes(splitMarker)) {
    content = content.substring(0, content.indexOf(splitMarker));
}

const newAtsModels = `
// --- ATS (APPLICANT TRACKING SYSTEM) MODULES ---

model JobRequisition {
  id          String   @id @default(cuid())
  title       String
  department  String
  position    String
  headcount   Int      @default(1)
  budget      String?
  description String?  @db.LongText
  status      String   @default("PENDING") 
  
  requesterId String
  requester   User     @relation("Requester", fields: [requesterId], references: [id])
  
  approverId  String?
  approver    User?    @relation("Approver", fields: [approverId], references: [id])
  
  jobPostings   JobPosting[]
  applications  JobApplication[]
  
  createdAt   DateTime @default(now())
  updatedAt   DateTime @updatedAt
}

model JobPosting {
  id            String         @id @default(cuid())
  title         String
  content       String         @db.LongText
  channels      String         @default("Website")
  status        String         @default("DRAFT") 
  
  requisitionId String
  requisition   JobRequisition @relation(fields: [requisitionId], references: [id], onDelete: Cascade)
  
  posterId      String?
  poster        User?          @relation("Poster", fields: [posterId], references: [id])
  
  createdAt     DateTime       @default(now())
  updatedAt     DateTime       @updatedAt
}

model AtsCandidate {
  id            String         @id @default(cuid())
  fullName      String
  email         String?
  phone         String?
  source        String         @default("WEBSITE")
  skills        String?        @db.Text
  notes         String?        @db.Text
  cvUrl         String?        @db.LongText
  
  applications  JobApplication[]
  
  createdAt     DateTime       @default(now())
  updatedAt     DateTime       @updatedAt
}

model JobApplication {
  id            String         @id @default(cuid())
  
  candidateId   String
  candidate     AtsCandidate   @relation(fields: [candidateId], references: [id], onDelete: Cascade)
  
  requisitionId String
  requisition   JobRequisition @relation(fields: [requisitionId], references: [id], onDelete: Cascade)
  
  stage         String         @default("SOURCED")
  
  interviews    Interview[]
  
  createdAt     DateTime       @default(now())
  updatedAt     DateTime       @updatedAt
}

model Interview {
  id              String         @id @default(cuid())
  
  applicationId   String
  application     JobApplication @relation(fields: [applicationId], references: [id], onDelete: Cascade)
  
  title           String
  scheduledAt     DateTime
  durationMinutes Int            @default(60)
  location        String?
  
  status          String         @default("SCHEDULED") 
  notes           String?        @db.LongText
  
  interviewers    InterviewInterviewer[]
  evaluations     InterviewEvaluation[]
  
  createdAt       DateTime       @default(now())
  updatedAt       DateTime       @updatedAt
}

model InterviewInterviewer {
  id          String    @id @default(cuid())
  interviewId String
  userId      String
  isPrimary   Boolean   @default(false)
  
  interview   Interview @relation(fields: [interviewId], references: [id], onDelete: Cascade)
  user        User      @relation("Interviewers", fields: [userId], references: [id], onDelete: Cascade)
  
  createdAt   DateTime  @default(now())
  updatedAt   DateTime  @updatedAt

  @@unique([interviewId, userId])
}

model InterviewEvaluation {
  id          String    @id @default(cuid())
  interviewId String
  evaluatorId String
  score       Float     @default(0)
  feedback    String    @db.LongText
  
  interview   Interview @relation(fields: [interviewId], references: [id], onDelete: Cascade)
  evaluator   User      @relation("Evaluations", fields: [evaluatorId], references: [id], onDelete: Cascade)
  
  createdAt   DateTime  @default(now())
  updatedAt   DateTime  @updatedAt

  @@unique([interviewId, evaluatorId])
}
`;

content += newAtsModels;
fs.writeFileSync(schemaPath, content, 'utf8');
console.log("Restored perfectly!");
