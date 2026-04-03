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
  status      String   @default("PENDING") 
  
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
  status        String         @default("DRAFT") 
  
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
  status        String         @default("SOURCED") 
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
  type          String         @default("ONLINE") 
  location      String?
  status        String         @default("SCHEDULED") 
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
    const hrMarker = '// Core HR Module';
    if (content.includes(hrMarker)) {
        const relations = "  // ATS Module\n" +
                          "  jobRequisitions          JobRequisition[]       @relation(\"Requester\")\n" +
                          "  jobRequisitionApprovals  JobRequisition[]       @relation(\"Approver\")\n" +
                          "  jobPostings              JobPosting[]           @relation(\"Poster\")\n" +
                          "  atsInterviews            InterviewInterviewer[] @relation(\"Interviewers\")\n" +
                          "  atsEvaluations           InterviewEvaluation[]  @relation(\"Evaluations\")\n\n  // Core HR Module";
        content = content.replace(hrMarker, relations);
    }
    
    content += "\n\n" + atsModels;
    fs.writeFileSync(schemaPath, content, 'utf8');
    console.log("Restored gracefully!");
}
