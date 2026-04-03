const fs = require('fs');
const schemaPath = 'c:\\Users\\admin\\Documents\\CONTRACT\\prisma\\schema.prisma';
let content = fs.readFileSync(schemaPath, 'utf8');

const atsModels = `
// --- ATS (APPLICANT TRACKING SYSTEM) MODULES ---

model JobRequisition {
  id          String   @id @default(cuid())
  title       String
  department  String
  position    String
  headcount   Int      @default(1)
  budget      String?
  description String?  @db.LongText
  status      String   @default("PENDING") // PENDING, APPROVED, REJECTED
  
  requesterId String
  requester   User     @relation("Requester", fields: [requesterId], references: [id])
  
  approverId  String?
  approver    User?    @relation("Approver", fields: [approverId], references: [id])
  
  jobPostings JobPosting[]
  candidates  Candidate[]
  interviews  Interview[]
  
  createdAt   DateTime @default(now())
  updatedAt   DateTime @updatedAt
}

model JobPosting {
  id            String         @id @default(cuid())
  title         String
  content       String         @db.LongText
  channels      String         @default("Website")
  status        String         @default("DRAFT") // DRAFT, PUBLISHED, CLOSED
  
  requisitionId String
  requisition   JobRequisition @relation(fields: [requisitionId], references: [id], onDelete: Cascade)
  
  posterId      String?
  poster        User?          @relation("Poster", fields: [posterId], references: [id])
  
  createdAt     DateTime       @default(now())
  updatedAt     DateTime       @updatedAt
}

model Candidate {
  id            String         @id @default(cuid())
  name          String
  email         String
  phone         String?
  source        String         @default("WEBSITE")
  status        String         @default("SOURCED") // SOURCED, SCREENING, INTERVIEW, OFFER, HIRED, REJECTED
  cvUrl         String?        @db.LongText
  
  requisitionId String
  requisition   JobRequisition @relation(fields: [requisitionId], references: [id])
  
  interviews    Interview[]
  
  createdAt     DateTime       @default(now())
  updatedAt     DateTime       @updatedAt
}

model Interview {
  id            String         @id @default(cuid())
  scheduledAt   DateTime
  type          String         @default("ONLINE") // ONLINE, OFFLINE
  location      String?
  status        String         @default("SCHEDULED") // SCHEDULED, COMPLETED, CANCELLED
  notes         String?        @db.LongText
  
  candidateId   String
  candidate     Candidate      @relation(fields: [candidateId], references: [id], onDelete: Cascade)
  
  requisitionId String
  requisition   JobRequisition @relation(fields: [requisitionId], references: [id], onDelete: Cascade)
  
  interviewers  InterviewInterviewer[]
  evaluations   InterviewEvaluation[]
  
  createdAt     DateTime       @default(now())
  updatedAt     DateTime       @updatedAt
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

if (!content.includes('model JobPosting')) {
    // We already have the User relations from our git checkout + append-core-hr-v2.
    // Wait, let's inject ONLY if they are not inside User yet.
    const userMatch = content.match(/model User\s*\{[\s\S]*?\n\}/);
    if (!userMatch[0].includes('jobPostings')) {
         const newRelations = \`
  // ATS Module
  jobRequisitions          JobRequisition[]       @relation("Requester")
  jobRequisitionApprovals  JobRequisition[]       @relation("Approver")
  jobPostings              JobPosting[]           @relation("Poster")
  atsInterviews            InterviewInterviewer[] @relation("Interviewers")
  atsEvaluations           InterviewEvaluation[]  @relation("Evaluations")
  
  // Core HR Module\`;
         content = content.replace('// Core HR Module', newRelations);
    }
    content += atsModels;
    fs.writeFileSync(schemaPath, content, 'utf8');
    console.log("Restored ATS schemas to schema.prisma");
} else {
    console.log("ATS already present!");
}
