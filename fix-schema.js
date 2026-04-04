const fs = require('fs');

const schemaPath = 'c:\\Users\\admin\\Documents\\CONTRACT\\prisma\\schema.prisma';
let content = fs.readFileSync(schemaPath, 'utf8');

// The issue was: inside the User model, after `docNotes DocumentNote[] @relation("DocumentNoter")`, there's a duplicate of the entire start of the file.

const marker1 = `  // Documents (Library/Knowledge Base)
  documents   Document[]        @relation("DocumentCreator")
  docComments DocumentComment[] @relation("DocumentCommenter")
  docNotes    DocumentNote[]    @relation("DocumentNoter")`;

// Find where marker1 is in the file.
const index1 = content.indexOf(marker1);
if (index1 !== -1) {
    // The duplicate starts right after marker1 (or after some lines).
    const startOfDuplicate = content.indexOf('datasource db {', index1);
    
    if (startOfDuplicate !== -1) {
        // Find the END of the duplicate User model.
        // It ends with:
        //   atsInterviews            InterviewInterviewer[] @relation("Interviewers")
        //   type      String   @default("INFO") // INFO, WARNING, SUCCESS, ERROR
        // wait, I also messed up the end of User model.
    }
}

// Alternatively, let's just do a clean string replacement to fix the relations inside User.
// We can find the "model User {" block and just manually construct the correct one.
// Actually, it's safer to just split by "model User {" and rebuild.

// Let's use Regex to find the duplicate "datasource db {" ... up to the "atsInterviews ... @relation(\"Interviewers\")\n"
// Let's look at the bad part.
const badPattern = /datasource db \{[\s\S]*?atsInterviews\s+InterviewInterviewer\[\]\s+@relation\("Interviewers"\)\n/;

content = content.replace(badPattern, 
`  // Salesperson relations
  salespersonEstimates SalesEstimate[]       @relation("EstimateSalesperson")
  salespersonInvoices  SalesInvoice[]        @relation("InvoiceSalesperson")
  LeadCommentReaction  LeadCommentReaction[]
  ChatMessageReaction  ChatMessageReaction[]

  // ATS Module
  jobRequisitions          JobRequisition[]       @relation("Requester")
  jobRequisitionApprovals  JobRequisition[]       @relation("Approver")
  jobPostings              JobPosting[]           @relation("Poster")
  atsInterviews            InterviewInterviewer[] @relation("Interviewers")
  atsEvaluations           InterviewEvaluation[]  @relation("Evaluations")

  // Core HR Module
  employeeProfile          EmployeeProfile?
  laborContracts           LaborContract[]
  createdLaborContracts    LaborContract[]        @relation("ContractCreatorHr")
  payrolls                 Payroll[]
}

model SystemSetting {
  id          String   @id @default(cuid())
  key         String   @unique // vd: COMPANY_NAME, COMPANY_LOGO
  value       String   @db.Text // Giá trị cấu hình
  description String?  @db.Text
  updatedAt   DateTime @updatedAt
}

model Notification {
  id        String   @id @default(cuid())
  userId    String
  title     String   @default("Thông báo mới")
  message   String   @db.Text
`);

fs.writeFileSync(schemaPath, content, 'utf8');
console.log('Fixed schema!');
