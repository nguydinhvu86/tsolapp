const fs = require('fs');
let schema = fs.readFileSync('prisma/schema.prisma', 'utf8');

schema = schema.replace(/model Ecatalog \{[\s\S]*?\}/, `model Ecatalog {
  id              String         @id @default(uuid())
  code            String         @unique
  name            String
  date            DateTime       @default(now())
  validUntil      DateTime?
  customerId      String?
  customer        Customer?      @relation(fields: [customerId], references: [id])
  creatorId       String
  creator         User           @relation("EcatalogCreator", fields: [creatorId], references: [id])
  subTotal        Float          @default(0)
  taxAmount       Float          @default(0)
  totalAmount     Float          @default(0)
  status          String         @default("DRAFT")
  templateType    String         @default("STANDARD")
  notes           String?        @db.Text
  tags            String?
  salespersonId   String?
  salesperson     User?          @relation("EcatalogSalesperson", fields: [salespersonId], references: [id])
  leadId          String?
  lead            Lead?          @relation(fields: [leadId], references: [id], onDelete: SetNull)
  customerSignature    String?    @db.LongText
  customerSignedAt     DateTime?
  customerSignIP       String?
  customerSignDevice   String?
  customerSignLocation String?    @db.Text
  companySignature     String?    @db.LongText
  companySignedAt      DateTime?
  companySignerId      String?
  projects             Project[]
  items           EcatalogItem[]
  activityLogs    EcatalogActivityLog[]
  createdAt       DateTime       @default(now())
  updatedAt       DateTime       @updatedAt

  tasks           Task[]
  EmailLog        EmailLog[]
  managers        User[]         @relation("EcatalogManagers")

  @@index([customerId])
  @@index([creatorId])
}`);

// Also add to User if not present
if (!schema.includes('ecatalogsCreated      Ecatalog[]             @relation("EcatalogCreator")')) {
    schema = schema.replace('model User {', 'model User {\n  ecatalogsCreated      Ecatalog[]             @relation("EcatalogCreator")');
}
if (!schema.includes('ecatalogsSalesperson  Ecatalog[]             @relation("EcatalogSalesperson")')) {
    schema = schema.replace('model User {', 'model User {\n  ecatalogsSalesperson  Ecatalog[]             @relation("EcatalogSalesperson")');
}

fs.writeFileSync('prisma/schema.prisma', schema);
console.log('Done replacement');
